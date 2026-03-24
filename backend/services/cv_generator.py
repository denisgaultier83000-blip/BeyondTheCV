from fastapi import APIRouter, HTTPException, Body, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid
import json
import asyncio
from datetime import datetime, timezone
from database import db

# Import du service IA (situé dans le même dossier backend/services/)
# L'import relatif '.' fonctionne car les deux fichiers sont dans le même package
from .ai_generator import ai_service


# Import des tâches unifiées
from .tasks import (
    process_cv_analysis_in_background,
    process_research_in_background,
    process_salary_in_background,
    process_pitch_in_background,
    process_questions_in_background,
    process_gap_analysis_in_background,
    process_completeness_in_background,
    process_career_radar_in_background,
    process_executive_summary_in_background,
    process_recruiter_view_in_background,
    process_oneliner_in_background,
    process_career_gps_in_background,
    process_reality_check_in_background,
    process_market_strategy_in_background,
    update_task_status_sync,
    run_gap_analysis_and_get_result
)
from .utils import normalize_language, clean_ai_json_response, load_prompt
from .tasks import get_prompt_path # Réutilisation du helper de chemin

# Import du validateur de sécurité
from security import get_current_user

router = APIRouter(
    prefix="/api/cv",
    tags=["CV Generator"]
)

# --- Modèles de données (Schemas) ---

class ExperienceRequest(BaseModel):
    role: str = Field(..., description="Intitulé du poste")
    company: str = Field(..., description="Nom de l'entreprise")
    description: str = Field(..., description="Description brute des tâches effectuées")
    provider: Optional[str] = Field(None, description="Choix du modèle IA: 'openai' ou 'gemini'")
    target_language: Optional[str] = "fr"

class SummaryRequest(BaseModel):
    target_job: str
    skills: List[str]
    years_of_experience: int
    provider: Optional[str] = None
    target_language: Optional[str] = "fr"

class SkillExtractionRequest(BaseModel):
    raw_text: str
    provider: Optional[str] = None
    target_language: Optional[str] = "fr"

class SimulationRequest(BaseModel):
    candidate_data: Dict[str, Any]
    simulation_action: str
    provider: Optional[str] = None

class PersonalInfo(BaseModel):
    first_name: Optional[str] = Field(None, description="Prénom du candidat")
    last_name: Optional[str] = Field(None, description="Nom de famille")
    email: Optional[str] = Field(None, description="Email professionnel", pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: Optional[str] = Field(None, description="Numéro de téléphone", pattern=r"^\+?[0-9\s\-\(\).]{6,25}$")
    address: Optional[str] = Field(None, description="Adresse postale (facultative)")
    city: Optional[str] = Field(None, description="Ville de résidence")
    country: Optional[str] = Field(None, description="Pays de résidence")
    linkedin: Optional[str] = Field(None, description="URL profil LinkedIn")
    bio: Optional[str] = Field(None, description="Résumé ou Bio")

class FullCVData(BaseModel):
    """Modèle représentant les données collectées"""
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    experiences: Any = []
    educations: Any = []
    skills: Any = []
    work_style: Any = []
    relational_style: Any = []
    professional_approach: Any = []
    qualities: Any = []
    flaws: Any = []
    interests: Any = []
    languages: Any = []
    clarifications: Any = []
    target_job: Optional[str] = ""
    target_company: Optional[str] = None
    target_industry: Optional[str] = None
    job_description: Optional[str] = Field(None, description="Description brute de l'offre d'emploi")
    research_data: Optional[Dict[str, Any]] = Field(None, description="Données de recherche marché et entreprise")
    target_country: Optional[str] = Field(None, description="Pays visé pour l'analyse de marché")
    remote_preference: Optional[str] = Field(None, description="full, hybrid, onsite")
    availability: Optional[str] = Field(None, description="Disponibilité du candidat")
    contract_type: Optional[str] = Field(None, description="Type de contrat visé (CDI, Freelance...)")
    provider: Optional[str] = None
    target_language: Optional[str] = "French"
    # Flag pour indiquer si c'est un démarrage partiel (Page 2) ou complet (Page 8)
    is_partial_start: bool = False
    # Options de génération
    design_variant: Optional[str] = Field("1", description="Variante de design du CV (1, 2, 3)")
    preview: bool = Field(False, description="Mode prévisualisation")
    renderer: Optional[str] = Field("pdf", description="Format de sortie: 'pdf' ou 'json'")

class FeedbackRequest(BaseModel):
    feature: str = Field(..., description="Nom de la fonctionnalité évaluée (ex: 'parade_defauts')")
    is_positive: bool = Field(..., description="True pour pouce en l'air (👍), False pour pouce vers le bas (👎)")
    comments: Optional[str] = Field(None, description="Commentaire optionnel")

def _sanitize_for_prompt(data: dict) -> dict:
    """Retire les données binaires et non-essentielles avant l'injection dans les prompts."""
    safe_data = data.copy() if isinstance(data, dict) else {}
    if 'photo' in safe_data:
        del safe_data['photo']
    if 'personal_info' in safe_data and isinstance(safe_data['personal_info'], dict):
        safe_data['personal_info'] = safe_data['personal_info'].copy()
        
        # [FIX SECU/RGPD] Suppression stricte des PII (Identifiants Personnels)
        # L'IA n'a pas besoin de ces données pour faire une analyse de carrière.
        for pii_key in ['photo', 'email', 'phone', 'address', 'linkedin', 'birth_date']:
            if pii_key in safe_data['personal_info']:
                del safe_data['personal_info'][pii_key]
                
    return safe_data

# --- Gardien d'Abonnement (Paywall Backend) ---
async def require_active_subscription(current_user: dict = Depends(get_current_user)):
    """Vérifie que l'utilisateur a un abonnement actif avant d'autoriser l'accès à l'IA."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT subscription_status, subscription_expiration_date FROM users WHERE id = %s", (current_user["id"],))
        row = await cursor.fetchone()
        if row:
            row = {"subscription_status": row[0] if isinstance(row, tuple) else row["subscription_status"], 
                   "subscription_expiration_date": row[1] if isinstance(row, tuple) else row["subscription_expiration_date"]}
            
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    status = row["subscription_status"]
    exp_date = row["subscription_expiration_date"]
    
    # Logique d'expiration
    is_expired = status == "expired"
    if exp_date and isinstance(exp_date, datetime) and exp_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        is_expired = True
                
    if is_expired:
        raise HTTPException(status_code=402, detail="Abonnement expiré. L'accès aux modèles d'Intelligence Artificielle est verrouillé.")
        
    return current_user

# --- Routes ---

@router.post("/optimize-experience")
async def optimize_experience(request: ExperienceRequest, current_user: dict = Depends(require_active_subscription)):
    """
    Reformule une expérience professionnelle pour la rendre plus impactante (verbes d'action, résultats).
    """
    target_lang = normalize_language(request.target_language)
    prompt = f"""
    You are a CV writing expert. Rewrite the following professional experience in {target_lang}.
    
    Context:
    - Role: {request.role} at {request.company}
    - Raw Description: {request.description}
    
    Instructions:
    1. Use strong action verbs.
    2. Highlight concrete results/metrics if possible.
    3. Make the text fluid, professional, and concise.
    4. Output ONLY the rewritten text, no intro/outro.
    5. STRICTLY WRITE IN {target_lang}.
    """

    try:
        # Appel au service unifié
        optimized_text = await ai_service.generate(
            prompt=prompt,
            provider="openai",
            system_instruction=f"You are an expert HR consultant. Language: {target_lang}."
        )
        return {"optimized_content": optimized_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@router.post("/generate-summary")
async def generate_summary(request: SummaryRequest, current_user: dict = Depends(require_active_subscription)):
    """
    Génère un résumé de profil (About Me) basé sur les compétences et le poste visé.
    """
    target_lang = normalize_language(request.target_language)
    skills_str = ", ".join(request.skills)
    prompt = f"""
    Write a CV profile summary (About Me) in {target_lang}.
    
    Candidate:
    - Target Job: {request.target_job}
    - Years of Exp: {request.years_of_experience}
    - Key Skills: {skills_str}
    
    Instructions:
    - Tone: Confident, professional, engaging.
    - Length: 3-4 sentences.
    - Use first person ("I").
    - STRICTLY WRITE IN {target_lang}.
    """

    try:
        summary = await ai_service.generate(
            prompt=prompt,
            provider="openai",
            system_instruction=f"You are a Personal Branding expert. Language: {target_lang}."
        )
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@router.post("/extract-skills")
async def extract_skills(request: SkillExtractionRequest, current_user: dict = Depends(require_active_subscription)):
    """
    Extrait une liste de compétences techniques et comportementales depuis un texte brut (ex: description de poste ou CV existant).
    """
    prompt = f"""
    Analyse le texte suivant et extrais les compétences clés.
    
    Texte :
    {request.raw_text}
    
    Format de réponse attendu : Une liste simple séparée par des virgules (ex: Python, Gestion de projet, Communication).
    """

    try:
        response = await ai_service.generate(
            prompt=prompt,
            provider="gemini",
            system_instruction="Tu es un assistant de tri de CV automatisé."
        )
        # Nettoyage basique de la réponse pour en faire une liste
        skills_list = [s.strip() for s in response.split(',') if s.strip()]
        return {"skills": skills_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@router.post("/simulate-career")
async def simulate_career(request: SimulationRequest, current_user: dict = Depends(require_active_subscription)):
    """
    Simule l'impact d'une action sur la carrière.
    """
    target_lang = normalize_language(request.candidate_data.get('target_language', 'French'))
    prompt_template = load_prompt(get_prompt_path("career_simulator.md"))
    
    final_prompt = f"""
    {prompt_template}
    
    PROFIL ACTUEL :
    {json.dumps(_sanitize_for_prompt(request.candidate_data), indent=2, ensure_ascii=False, default=str)}
    
    ACTION SIMULÉE :
    {request.simulation_action}
    
    OUTPUT LANGUAGE: {target_lang}
    """
    
    try:
        result_str = await ai_service.generate(final_prompt, provider="openai", system_instruction="You are a Career Simulator Engine.")
        return clean_ai_json_response(result_str)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.post("/generate-clarifications")
async def generate_clarifications(data: FullCVData, current_user: dict = Depends(require_active_subscription)):
    """
    Page 6 -> 7 (Synchrone) : Génère des questions pour préciser le profil.
    """
    target_lang = normalize_language(data.target_language)
    prompt = f"""
    Analyze this candidate profile (JSON) and the free text provided.
    Identify ambiguous or missing points that are CRITICAL for a CV.
    Generate clarification questions to ask the candidate. Generate only what is strictly necessary, up to a maximum of 20 questions if the profile is very incomplete. If the profile is very detailed, you can generate 0 to 3 questions.
    
    DATA: {json.dumps(_sanitize_for_prompt(data.model_dump()), default=str)}
    
    OUTPUT STRICT JSON: {{ "questions": ["Question 1?", "Question 2?", "..."] }}
    LANGUAGE: {target_lang}
    """
    res = await ai_service.generate(prompt, provider="openai", system_instruction="You are a Career Coach.")
    return clean_ai_json_response(res)

@router.post("/generate")
async def generate_cv(data: FullCVData):
    """
    Génère le CV (PDF ou JSON) à partir des données fournies.
    Gère la mise en forme des compétences et le choix du design.
    """
    # Copie des données pour manipulation sans affecter l'original
    cv_data = data.model_dump()
    
    # [FIX] Gestion robuste des skills (List -> Dict pour LaTeX/JSON)
    # Le modèle Pydantic attend List[str], mais le template LaTeX peut vouloir un Dict ou String.
    current_skills = cv_data.get('skills', [])
    
    # Récupération et formatage des langues
    languages = cv_data.get('languages', [])
    langs_str = ""
    if languages:
        formatted_langs = []
        for lang_item in languages:
            if isinstance(lang_item, dict):
                lang_name = lang_item.get('language', '')
                level = lang_item.get('level', '')
                if lang_name:
                    formatted_langs.append(f"{lang_name} ({level})" if level else lang_name)
            elif isinstance(lang_item, str):
                formatted_langs.append(lang_item)
        langs_str = ", ".join(formatted_langs)

    # Transformation des skills pour le rendu
    if isinstance(current_skills, list):
        # On convertit la liste en une chaîne séparée par des virgules pour la partie "Technique"
        skills_text = ", ".join([str(s) for s in current_skills if s])
        # On structure pour le template : { "technical": "...", "languages": "..." }
        cv_data['skills'] = {"technical": skills_text, "languages": langs_str}
    elif isinstance(current_skills, str):
        cv_data['skills'] = {"technical": current_skills, "languages": langs_str}
    elif isinstance(current_skills, dict):
        if not current_skills.get('languages') and langs_str:
            current_skills['languages'] = langs_str
        cv_data['skills'] = current_skills
    else:
        cv_data['skills'] = {"technical": "", "languages": langs_str}

    # Pour le débogage ou si le renderer est JSON
    # Note: Pour le PDF, il faudrait appeler ici le service de génération PDF (ex: latex_renderer.generate_pdf(cv_data))
    # Comme le code de rendu PDF n'est pas fourni, on renvoie le JSON structuré qui permet au moins de vérifier les données.
    return cv_data

@router.post("/start-analysis")
async def start_analysis(data: FullCVData, background_tasks: BackgroundTasks, current_user: dict = Depends(require_active_subscription)):
    """
    Déclenche le PIPELINE.
    - Si is_partial_start=True (Page 2) : Lance uniquement Recherche Marché + Salaire.
    - Sinon (Page 8) : Lance Analyse CV complète.
    """
    tasks_map = {}
    now = datetime.now().isoformat()
    # OPTIMISATION: On utilise le profil allégé pour TOUTES les tâches IA
    cv_lean_dict = data.get_lean_profile()
    
    # 1. Définition des tâches selon le contexte
    if data.is_partial_start:
        # Trigger Page 2 : Analyse Marché/Entreprise uniquement
        # On ne lance que si une cible est définie
        if data.target_company or data.target_industry:
            tasks_map["market_research"] = str(uuid.uuid4())
        
        print(f"[PIPELINE] 🚀 Partial start (Page 2 Trigger). Tasks: {tasks_map}", flush=True)
    else:
        # Trigger Page 8 (Full Analysis)
        # Note: Page 7 trigger logic should be handled here if 'is_final_step' flag is sent
        tasks_map["cv_analysis"] = str(uuid.uuid4())
        tasks_map["pitch"] = str(uuid.uuid4())          # Ajout ID Pitch
        tasks_map["questions"] = str(uuid.uuid4())      # Ajout ID Questions
        tasks_map["gap_analysis"] = str(uuid.uuid4())   # Ajout ID Gap
        tasks_map["salary_estimation"] = str(uuid.uuid4()) # Déplacé ici (Page 8)
        tasks_map["career_radar"] = str(uuid.uuid4())   # [NEW] Radar
        tasks_map["recruiter_view"] = str(uuid.uuid4()) # [NEW] Recruiter View
        tasks_map["one_liner"] = str(uuid.uuid4())      # [NEW] One-Liner
        tasks_map["risk_analysis"] = str(uuid.uuid4())  # [NEW] Risk Analysis
        tasks_map["job_decoder"] = str(uuid.uuid4())    # [NEW] Job Decoder
        tasks_map["hidden_market"] = str(uuid.uuid4())  # [NEW] Hidden Market
        tasks_map["career_gps"] = str(uuid.uuid4())     # [NEW] Career GPS
        tasks_map["reality_check"] = str(uuid.uuid4())  # [NEW] Reality Check (Viral)
        
        # On relance la recherche SEULEMENT si on n'a pas déjà les résultats en cache (Page 2)
        if (data.target_company or data.target_industry) and not data.research_data:
            tasks_map["market_research"] = str(uuid.uuid4())
        print(f"[PIPELINE] 🚀 Full start (Page 8 Trigger). Tasks: {tasks_map}", flush=True)

    # 2. Initialisation DB
    async with db.get_connection() as conn:
        for tid in tasks_map.values():
            await db.execute(conn, 
                "INSERT INTO tasks (id, status, result, created_at) VALUES (%s, %s, %s, %s)", 
                (tid, "PENDING", None, now))
    
    # 3. Lancement des tâches
    
    # Tâche : Recherche de marché
    if "market_research" in tasks_map:
        if data.target_company or data.target_industry:
            research_payload = {
                "target_company": data.target_company,
                "target_industry": data.target_industry,
                "target_country": data.target_country,
                "target_job": data.target_job,
                "candidate_data": cv_lean_dict,
                "provider": data.provider,
                "target_language": data.target_language
            }
            background_tasks.add_task(process_research_in_background, tasks_map["market_research"], research_payload)
        else:
            background_tasks.add_task(update_task_status_sync, tasks_map["market_research"], "COMPLETED", {"info": "Skipped, no company provided"})

    # Tâche : Estimation Salaire
    if "salary_estimation" in tasks_map:
        background_tasks.add_task(process_salary_in_background, tasks_map["salary_estimation"], cv_lean_dict)

    # Tâche : Analyse CV (Uniquement si données complètes)
    if "cv_analysis" in tasks_map:
        background_tasks.add_task(process_cv_analysis_in_background, tasks_map["cv_analysis"], cv_lean_dict)

    # Tâche : Pitch (Uniquement si données complètes)
    if "pitch" in tasks_map:
        background_tasks.add_task(process_pitch_in_background, tasks_map["pitch"], cv_lean_dict)

    # Tâche : Questions d'entretien (Uniquement si données complètes)
    if "questions" in tasks_map:
        background_tasks.add_task(process_questions_in_background, tasks_map["questions"], cv_lean_dict)

    # Tâche : Gap Analysis (Uniquement si données complètes)
    if "gap_analysis" in tasks_map:
        background_tasks.add_task(process_gap_analysis_in_background, tasks_map["gap_analysis"], cv_lean_dict)
    
    # TÂCHES FUSIONNÉES : Executive Summary
    exec_tasks = {k: tasks_map[k] for k in ["one_liner", "career_radar", "recruiter_view"] if k in tasks_map}
    if exec_tasks:
        background_tasks.add_task(process_executive_summary_in_background, exec_tasks, cv_lean_dict)

    # TÂCHES FUSIONNÉES : Market Strategy
    strategy_tasks = {k: tasks_map[k] for k in ["job_decoder", "risk_analysis", "hidden_market"] if k in tasks_map}
    if strategy_tasks:
        background_tasks.add_task(process_market_strategy_in_background, strategy_tasks, cv_lean_dict)

    # Tâche : Career GPS (Premium)
    if "career_gps" in tasks_map:
        background_tasks.add_task(process_career_gps_in_background, tasks_map["career_gps"], cv_lean_dict)

    # Tâche : Reality Check (Viral)
    if "reality_check" in tasks_map:
        background_tasks.add_task(process_reality_check_in_background, tasks_map["reality_check"], cv_lean_dict)

    return {
        "message": "Pipeline started",
        "tasks": tasks_map,
        # Retourne l'ID principal pertinent pour le frontend
        "task_id": tasks_map.get("cv_analysis") or tasks_map.get("market_research")
    }

@router.post("/analyze-completeness")
async def analyze_completeness(background_tasks: BackgroundTasks, payload: dict = Body(...), current_user: dict = Depends(require_active_subscription)):
    """
    Analyse la complétude du profil avant de passer à l'étape suivante.
    """
    task_id = str(uuid.uuid4())
    async with db.get_connection() as conn:
        await db.execute(conn, "INSERT INTO tasks (id, status, result, created_at) VALUES (%s, %s, %s, %s)", 
                         (task_id, "PENDING", None, datetime.now().isoformat()))
    
    background_tasks.add_task(process_completeness_in_background, task_id, payload)
    return {"task_id": task_id, "status": "PENDING"}

@router.get("/analysis-status/{task_id}")
async def get_analysis_status(task_id: str):
    """
    Appelé par le Dashboard pour vérifier si l'analyse est prête.
    """
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT status, result FROM tasks WHERE id = %s", (task_id,))
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Analyse non trouvée")
    
    status = row[0] if isinstance(row, tuple) else row["status"]
    result_raw = row[1] if isinstance(row, tuple) else row["result"]
    
    response = {"status": status}
    
    # [FIX] Support de "SUCCESS" (standard tasks.py) et "COMPLETED" (ancien)
    if (status == "SUCCESS" or status == "COMPLETED") and result_raw:
        # On essaie de parser le JSON stocké, sinon on renvoie le texte brut
        try:
            parsed = json.loads(result_raw)
            
            # Gérer le cas d'une double stringification "{\"clé\":...}"
            if isinstance(parsed, str):
                try: parsed = json.loads(parsed)
                except Exception: pass
                
            # Gérer le cas où les sous-clés (ex: market_report) contiennent du Markdown brut non parsé
            if isinstance(parsed, dict):
                for k, v in parsed.items():
                    if isinstance(v, str) and (v.strip().startswith("{") or v.strip().startswith("```")):
                        try: parsed[k] = clean_ai_json_response(v)
                        except Exception: pass
                        
            response["result"] = parsed
        except Exception:
            response["result"] = result_raw
    elif status == "FAILED":
        response["result"] = result_raw if result_raw else "Erreur interne de l'IA (Vérifiez les logs backend)"
            
    return response
    

@router.post("/dashboard/summary")
async def get_dashboard_summary(data: FullCVData, current_user: dict = Depends(require_active_subscription)):
    """
    [NOUVEAU] Agrège toutes les données nécessaires pour le Diagnostic Dashboard.
    """
    cv_dict = data.model_dump()
    target_lang = normalize_language(cv_dict.get('target_language', 'French'))
    
    # ⚡ OPTIMISATION VITESSE : On utilise le Gap Analysis déjà calculé à l'étape 7 s'il existe
    cached_gap = cv_dict.get('gap_analysis')
    has_cached_gap = bool(cached_gap and isinstance(cached_gap, dict) and cached_gap.get('match_score'))
    gap_analysis_task = asyncio.sleep(0) if has_cached_gap else run_gap_analysis_and_get_result(cv_dict)

    # 2. Générer les "Forces Principales"
    key_strengths_prompt = f"""
    Analyse ce profil et résume-le en 3 forces clés percutantes.
    Exemple: "Leadership opérationnel", "Gestion du risque", "Prise de décision en environnement critique".
    Ne retourne QUE le JSON.
    
    PROFIL: {json.dumps(_sanitize_for_prompt(data.model_dump()), default=str)}
    
    OUTPUT LANGUAGE: {target_lang}
    FORMAT JSON STRICT: {{"key_strengths": ["Force 1", "Force 2", "Force 3"]}}
    """
    key_strengths_task = ai_service.generate(key_strengths_prompt, provider="gemini", system_instruction=f"Tu es un expert en branding personnel. Langue: {target_lang}.")

    # 3. Générer la "Stratégie de Candidature"
    application_strategy_prompt = f"""
    Analyse ce profil et le poste visé. Propose une stratégie de candidature en 3 points prioritaires.
    Exemple: "Cibler les entreprises industrielles", "Valoriser l'expérience opérationnelle".
    Ne retourne QUE le JSON.
    
    PROFIL: {json.dumps(_sanitize_for_prompt(data.model_dump()), default=str)}
    
    OUTPUT LANGUAGE: {target_lang}
    FORMAT JSON STRICT: {{"application_strategy": ["Priorité 1", "Priorité 2", "Priorité 3"]}}
    """
    application_strategy_task = ai_service.generate(application_strategy_prompt, provider="gemini", system_instruction=f"Tu es un coach de carrière stratégique. Langue: {target_lang}.")

    # Exécution en parallèle
    results = await asyncio.gather(gap_analysis_task, key_strengths_task, application_strategy_task)
    
    # Récupération instantanée
    if has_cached_gap:
        gap_analysis_result = cached_gap
    else:
        raw_gap = results[0]
        gap_analysis_result = {}
        if raw_gap:
            if isinstance(raw_gap, dict):
                gap_analysis_result = raw_gap
            else:
                gap_analysis_result = clean_ai_json_response(raw_gap)
            
    key_strengths_result = clean_ai_json_response(results[1])
    application_strategy_result = clean_ai_json_response(results[2])

    # Valeur par défaut robuste pour le score
    match_score = gap_analysis_result.get("match_score")
    if match_score is None:
        print("[Dashboard] Warning: match_score is None, defaulting to 0", flush=True)
        match_score = 0
        
    # Formatage de la stratégie en un seul texte si c'est une liste
    strategy_list = application_strategy_result.get("application_strategy", [])
    recommended_strategy = " ".join(strategy_list) if isinstance(strategy_list, list) else str(strategy_list)
    
    # Création d'une matrice factice pour les gaps si l'IA n'a renvoyé qu'une liste de strings
    raw_gaps = gap_analysis_result.get("missing_gaps", [])
    gaps_matrix = [{"skill": gap, "impact": "Bloquant pour les ATS", "action": "À développer ou justifier"} for gap in raw_gaps]

    # 4. Agréger et retourner (Format aligné avec l'interface PilotData du Frontend)
    return {
        "matchScore": match_score,
        "summary": f"Votre profil correspond à {match_score}% des attentes du poste visé. {len(raw_gaps)} compétences sont à renforcer.",
        "strengths": key_strengths_result.get("key_strengths", []),
        "gapsMatrix": gaps_matrix,
        "recommendedStrategy": recommended_strategy,
        # Conservation des anciennes stats au cas où d'autres composants les utilisent
        "analysis_stats": {
            "skills_detected": len(data.skills) + len(data.work_style) + len(data.relational_style) + len(data.professional_approach),
            "requirements_analyzed": len(gap_analysis_result.get("key_needs_from_job", [])),
            "gaps_identified": len(gap_analysis_result.get("missing_gaps", []))
        }
    }

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Enregistre le feedback utilisateur (pouces) pour une fonctionnalité spécifique.
    """
    # Logique d'enregistrement (ex: log ou sauvegarde en base de données)
    vote = "👍" if request.is_positive else "👎"
    print(f"[FEEDBACK] Vote reçu pour '{request.feature}': {vote}", flush=True)
    
    # Sauvegarde en base de données
    async with db.get_connection() as conn:
        try:
            await db.execute(conn, 
                "INSERT INTO feedbacks (feature, is_positive, comments, created_at) VALUES (%s, %s, %s, %s)", 
                (request.feature, request.is_positive, request.comments, datetime.now().isoformat()))
        except Exception as e:
            print(f"[DB ERROR] Erreur d'insertion du feedback: {e}", flush=True)
            raise HTTPException(status_code=500, detail="Erreur interne de la base de données")

    return {"status": "success", "message": "Feedback enregistré avec succès"}

@router.get("/feedbacks")
async def get_feedbacks(current_user: dict = Depends(get_current_user)):
    """
    Récupère la liste de tous les feedbacks (Vue Admin).
    [FIX SECU] Protégé par authentification. À terme, vérifier is_admin.
    """
    # En production, il faudrait s'assurer que current_user a des droits d'admin.
    async with db.get_connection() as conn:
        try:
            cursor = await db.execute(conn, "SELECT id, feature, is_positive, comments, created_at FROM feedbacks ORDER BY created_at DESC")
            rows = await cursor.fetchall()
        except Exception as e:
            print(f"[Admin] Erreur SQL feedbacks : {e}")
            return {"feedbacks": []}
        
    feedbacks = []
    for row in rows:
        feedbacks.append({
            "id": row[0] if isinstance(row, tuple) else row["id"],
            "feature": row[1] if isinstance(row, tuple) else row["feature"],
            "is_positive": bool(row[2] if isinstance(row, tuple) else row["is_positive"]),
            "comments": row[3] if isinstance(row, tuple) else row["comments"],
            "created_at": row[4] if isinstance(row, tuple) else row["created_at"]
        })
    return {"feedbacks": feedbacks}

@router.get("/me/profile")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Récupère le profil complet (JSON) de l'utilisateur connecté de manière sécurisée.
    """
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, """
                SELECT p.profile_data 
                FROM user_profiles p
                JOIN users u ON p.user_id = u.id
                WHERE u.id = %s
            """, (current_user["id"],))
            row = await cursor.fetchone()
            
        if not row or not (row[0] if isinstance(row, tuple) else row["profile_data"]):
            return {"first_name": current_user.get("first_name", ""), "last_name": current_user.get("last_name", ""), "email": current_user.get("email", "")}
            
        profile_data = row[0] if isinstance(row, tuple) else row["profile_data"]
        return json.loads(profile_data)
    except Exception as e:
        print(f"[PROFILE WARNING] Table user_profiles absente ou erreur: {e}", flush=True)
        # Fallback gracieux si la table n'existe pas (évite un crash 500 post-login)
        return {"first_name": current_user.get("first_name", ""), "last_name": current_user.get("last_name", ""), "email": current_user.get("email", "")}

@router.get("/documents")
async def get_my_documents():
    """
    Bouchon (Mock) pour afficher des documents dans la modale du candidat.
    """
    return [
        {
            "id": "doc-1",
            "filename": "BeyondTheCV_Pitch.pdf",
            "type": "PDF",
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "doc-2",
            "filename": "BeyondTheCV_Analyse_Ecarts.json",
            "type": "JSON",
            "created_at": datetime.now().isoformat()
        }
    ]

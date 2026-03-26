import os
import uuid
import json
import asyncio
import re
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Body, Depends, Query
from fastapi.responses import JSONResponse, FileResponse
from starlette.background import BackgroundTask
from pypdf import PdfReader
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from database import db
from models import GenerateRequest, CVFinal, FeedbackRequest
from security import get_current_user
# [FIX] Utilisation du service unifié au lieu d'imports inexistants
from .ai_generator import ai_service
from .latex import generate_pdf_from_latex
from .docx_generator import generate_cv_docx
from .tasks import (
    process_cv_draft_in_background,
    process_cv_analysis_in_background,
    process_research_in_background,
    process_salary_in_background,
    process_completeness_in_background,
    update_task_status_sync,
    process_profile_validation_in_background,
    process_gap_analysis_in_background,
    process_pitch_in_background,
    process_recruiter_view_in_background,
    process_reality_check_in_background,
    process_flaw_coaching_in_background,
    process_career_radar_in_background,
    process_questions_in_background,
    process_career_gps_in_background,
    process_oneliner_in_background,
    process_market_strategy_in_background,
    run_gap_analysis_and_get_result,
)
from .utils import clean_ai_json_response, normalize_language, load_prompt
from .tasks import get_prompt_path

router = APIRouter(prefix="/api/cv", tags=["CV Generator"])

class FlawCoachRequest(BaseModel):
    flaw: str
    target_job: Optional[str] = "Candidat"
    target_language: Optional[str] = "fr"

class PersonalInfo(BaseModel):
    first_name: Optional[str] = Field(None, description="Prénom du candidat")
    last_name: Optional[str] = Field(None, description="Nom de famille")
    email: Optional[str] = Field(None, description="Email professionnel")
    phone: Optional[str] = Field(None, description="Numéro de téléphone")
    address: Optional[str] = Field(None, description="Adresse postale (facultative)")
    city: Optional[str] = Field(None, description="Ville de résidence")
    country: Optional[str] = Field(None, description="Pays de résidence")
    linkedin: Optional[str] = Field(None, description="URL profil LinkedIn")
    bio: Optional[str] = Field(None, description="Résumé ou Bio")

class FullCVData(BaseModel):
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
    free_text: Optional[str] = Field(None, description="Texte libre du candidat (Étape 6)")
    current_role: Optional[str] = None
    current_company: Optional[str] = None
    target_role_primary: Optional[str] = None
    provider: Optional[str] = None
    target_language: Optional[str] = "French"
    is_partial_start: bool = False
    design_variant: Optional[str] = Field("1", description="Variante de design du CV (1, 2, 3)")
    preview: bool = Field(False, description="Mode prévisualisation")
    renderer: Optional[str] = Field("pdf", description="Format de sortie: 'pdf' ou 'json'")

# --- Modèles rapatriés de cv_generator.py ---
class ExperienceRequest(BaseModel):
    role: str = Field(..., description="Intitulé du poste")
    company: str = Field(..., description="Nom de l'entreprise")
    description: str = Field(..., description="Description brute des tâches effectuées")
    target_language: Optional[str] = "fr"

class SkillExtractionRequest(BaseModel):
    raw_text: str
    target_language: Optional[str] = "fr"

class SimulationRequest(BaseModel):
    candidate_data: Dict[str, Any]
    simulation_action: str

def _remove_file_safe(path: str):
    """Supprime un fichier temporaire après son envoi sans crasher en cas d'erreur."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"[CLEANUP ERROR] Impossible de supprimer {path}: {e}")

def _sanitize_data_for_ai(data: dict, strict: bool = False) -> dict:
    """Supprime les données lourdes et inutiles pour l'IA (ex: Base64) pour économiser des tokens et de la latence."""
    clean_data = data.copy() if isinstance(data, dict) else {}
    if 'photo' in clean_data:
        del clean_data['photo']
        
    if 'personal_info' in clean_data and isinstance(clean_data['personal_info'], dict):
        clean_data['personal_info'] = clean_data['personal_info'].copy()
        if 'photo' in clean_data['personal_info']:
            del clean_data['personal_info']['photo']
            
        if strict:
            # Suppression des PII inutiles pour l'analyse stratégique
            for key in ['email', 'phone', 'address', 'linkedin', 'city']:
                clean_data['personal_info'].pop(key, None)
                
    if strict:
        # Suppression des flags de l'UI
        for key in ['target_language', 'provider', 'renderer', 'design_variant', 'is_partial_start', 'preview', 'clarifications']:
            clean_data.pop(key, None)
            
    return clean_data

# --- Gardien d'Abonnement (Paywall Backend) ---
async def require_active_subscription(current_user: dict = Depends(get_current_user)):
    """Vérifie que l'utilisateur a un abonnement actif avant d'autoriser l'accès à l'IA."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT subscription_status, subscription_expiration_date FROM users WHERE id = ?", (current_user["id"],))
            row = await cursor.fetchone()
    except Exception as e:
        print(f"[AUTH ERROR] Fetch subscription failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Database connection error in subscription check")

    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    status = row[0] if isinstance(row, tuple) else row.get("subscription_status")
    exp_date = row[1] if isinstance(row, tuple) else row.get("subscription_expiration_date")
    
    is_expired = status == "expired"
    if exp_date and isinstance(exp_date, datetime) and exp_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        is_expired = True
                
    if is_expired:
        raise HTTPException(status_code=402, detail="Abonnement expiré. L'accès aux modèles d'Intelligence Artificielle est verrouillé.")
        
    return current_user

def _generate_smart_filename(data: dict, doc_type: str = "CV", ext: str = "pdf") -> str:
    """Génère un nom de fichier propre et explicite: Type_Nom_Poste_Entreprise_Date.ext"""
    last_name = data.get('last_name', 'Candidat').strip()
    target_job = data.get('target_job', data.get('target_role_primary', '')).strip()
    target_company = data.get('target_company', '').strip()
    
    # Nettoyage strict (Alphanumérique + espaces transformés en tirets du bas)
    last_name = re.sub(r'[^A-Za-z0-9 ]', '', last_name).replace(' ', '')
    target_job = re.sub(r'[^A-Za-z0-9 ]', '', target_job).replace(' ', '_')
    target_company = re.sub(r'[^A-Za-z0-9 ]', '', target_company).replace(' ', '_')
    
    parts = [doc_type]
    if last_name: parts.append(last_name.capitalize())
    if target_job: parts.append(target_job)
    if target_company: parts.append(target_company)
    parts.append(datetime.now().strftime('%Y%m%d'))
    
    base_name = re.sub(r'_+', '_', "_".join([p for p in parts if p])) # Évite les doubles underscores
    return f"{base_name}.{ext}"

async def analyze_free_text_content(text, quality='fast'):
    prompt = f"Extract structured CV data from this text. Return JSON with fields: first_name, last_name, email, phone, skills (string), experiences (list), educations (list).\n\nTEXT:\n{text[:3000]}"
    return await ai_service.generate_valid_json(prompt, provider="gemini", system_instruction="You are a CV parser API. Output STRICT JSON.")

async def optimize_cv_data(data, target_lang='French', quality='smart'):
    prompt = f"""
    Optimize this CV data for ATS in {target_lang}. Improve wording and keywords.
    ⚠️ IMPÉRATIF DE CORRECTION : Le texte fourni est un brouillon brut. Tu DOIS corriger scrupuleusement toutes les fautes d'orthographe, de frappe, ajouter les accents manquants et corriger la typographie (mettre des majuscules aux noms, prénoms, noms d'entreprises et débuts de phrases). Le résultat doit avoir une rigueur typographique absolue.
    
    DATA:
    {json.dumps(_sanitize_data_for_ai(data), default=str)}
    """
    return await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are an expert CV writer and rigorous copy-editor. Output in {target_lang}. Return JSON with keys: 'optimized_data' (dict) and 'analysis' (dict).")

async def generate_interview_questions(data, quality='smart'):
    # [AMELIORATION] Prompt aligné avec tasks.py pour des réponses suggérées
    raw_lang = data.get('target_language') or data.get('language', 'fr')
    target_lang = normalize_language(raw_lang)
    p_info = data.get('personal_info', {})
    address = p_info.get('address', '')
    city = p_info.get('city', '')
    hobbies = data.get('interests', [])
    flaws = data.get('flaws', [])
    
    prompt_template = load_prompt(get_prompt_path("interview_questions.md"))
    prompt = f"""
    {prompt_template}
    
    CONTEXTE CANDIDAT :
    Adresse : {address}, {city}
    Hobbies : {hobbies}
    Défauts identifiés par le candidat : {flaws}
    Poste visé : {data.get('target_job')}
    
    DONNÉES :
    {json.dumps(_sanitize_data_for_ai(data), indent=2)}
    
    OUTPUT LANGUAGE: {target_lang}
    """
    res_str = await ai_service.generate(prompt, provider="openai", system_instruction=f"You are an expert interviewer. Output ONLY JSON. Language: {target_lang}.")
    parsed = clean_ai_json_response(res_str)
    return parsed.get('questions', [])

async def generate_smart_questions(data, quality='smart'):
    # [AMELIORATION] Génération de questions stratégiques à poser au recruteur
    raw_lang = data.get('target_language') or data.get('language', 'fr')
    target_lang = normalize_language(raw_lang)

    target_job = data.get('target_job', 'Poste visé')
    target_company = data.get('target_company', 'Entreprise cible')
    
    # [FIX] Chargement du prompt expert depuis le fichier
    prompt_template = load_prompt("5_questions.md")

    prompt = f"""
    {prompt_template}
    
    CONTEXTE :
    Poste visé : {target_job}
    Entreprise : {target_company}
    Langue de sortie : {target_lang}
    
    INSTRUCTIONS COMPLÉMENTAIRES :
    FORMAT JSON STRICT :
    {{
        "questions_to_ask": [
            {{
                "question": "La question exacte à poser",
                "strategy": "Explication courte de pourquoi cette question est bonne (Stratégie)"
            }}
        ]
    }}
    """
    res_str = await ai_service.generate(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output ONLY JSON in {target_lang}.")
    parsed = clean_ai_json_response(res_str)
    return parsed.get('questions_to_ask', [])

async def generate_gap_analysis(data, job_desc, quality='smart'):
    # [AMELIORATION] Prompt aligné avec tasks.py pour garantir la structure attendue par le Frontend
    target_lang = normalize_language(data.get('target_language', 'fr'))
    # [FIX] Fallback robuste pour le titre du poste
    target_job = data.get('target_job') or data.get('target_role_primary', 'Inconnu')
    jd_text = job_desc.get('job_description', '').strip()
    jd_instruction = jd_text if jd_text else "Aucune annonce n'a été fournie par le candidat. Évalue son profil en te basant sur les STANDARDS STRICTS DU MARCHÉ pour ce titre de poste."
    
    prompt_template = load_prompt(get_prompt_path("gap_analysis.md"))
    prompt = f"""
    {prompt_template}
    
    CONTEXTE DU POSTE :
    Poste visé : {target_job}
    Description / Contexte : {jd_instruction}
    
    PROFIL CANDIDAT :
    {json.dumps(_sanitize_data_for_ai(data, strict=True), default=str)}
    
    OUTPUT LANGUAGE: {target_lang}
    """
    res_str = await ai_service.generate(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
    return clean_ai_json_response(res_str)

async def generate_pitch(data, quality='smart'):
    # [AMELIORATION] Utilisation des clarifications et fallback conseils
    clarifications = data.get('clarifications', [])
    target_lang = normalize_language(data.get('target_language', 'fr'))
    clarifications_str = "\n".join([f"Q: {c.get('question')}\nA: {c.get('answer')}" for c in clarifications if c.get('answer')])
    
    # [NEW] Injection des données de recherche asynchrone (Entreprise & Marché)
    research_context = ""
    rd = data.get("research_data")
    if rd:
        cr = rd.get("company_report", {})
        mr = rd.get("market_report", {})
        research_context = f"\nCONTEXTE ENTREPRISE & MARCHÉ (À UTILISER POUR LA PROJECTION) :\n- ADN: {cr.get('identity_dna', '')}\n- Défis: {cr.get('usp', '')}\n- Marché: {mr.get('trends', '')}\n"

    prompt_template = load_prompt(get_prompt_path("pitch_v1.md"))
    prompt = f"""
    {prompt_template}
    
    DONNÉES CANDIDAT :
    {json.dumps(_sanitize_data_for_ai(data, strict=True), default=str)}
    
    CLARIFICATIONS APPORTÉES :
    {clarifications_str}
    {research_context}
    
    OUTPUT LANGUAGE: {target_lang}
    """
    res_str = await ai_service.generate(prompt, provider="openai", system_instruction=f"Output STRICT JSON in {target_lang}.")
    return clean_ai_json_response(res_str)

@router.post("/coach-flaw")
async def coach_flaw(request: FlawCoachRequest):
    """Transforme un défaut brut en argument d'entretien."""
    target_lang = normalize_language(request.target_language)
    prompt_template = load_prompt(get_prompt_path("flaw_coach.md"))
    
    final_prompt = f"""
    {prompt_template}
    
    DÉFAUT DU CANDIDAT : "{request.flaw}"
    POSTE VISÉ : "{request.target_job}"
    
    Adapte la réponse au poste visé si pertinent (ex: pour un manager, la délégation est clé ; pour un dev, la rigueur).
    OUTPUT LANGUAGE: {target_lang}
    """
    
    try:
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an Interview Coach.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flaw coaching failed: {str(e)}")

def run_compliance_check(data, lang, quality='smart'):
    # Pas de check complexe pour l'instant, on renvoie la donnée telle quelle ou une correction simple
    return {"corrected_content": data}

# --- Routes exclusives rapatriées de cv_generator.py ---

@router.post("/optimize-experience")
async def optimize_experience(request: ExperienceRequest, current_user: dict = Depends(require_active_subscription)):
    target_lang = normalize_language(request.target_language)
    prompt = f"You are a CV writing expert. Rewrite the following professional experience in {target_lang}. Context:\n- Role: {request.role} at {request.company}\n- Raw Description: {request.description}\n\nInstructions: Use strong action verbs, highlight concrete metrics, make it professional. Output ONLY the rewritten text."
    try:
        optimized_text = await ai_service.generate(prompt=prompt, provider="openai", system_instruction=f"You are an expert HR consultant. Language: {target_lang}.")
        return {"optimized_content": optimized_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@router.post("/extract-skills")
async def extract_skills(request: SkillExtractionRequest, current_user: dict = Depends(require_active_subscription)):
    prompt = f"Analyse le texte suivant et extrais les compétences clés. Texte :\n{request.raw_text}\n\nFormat attendu : Une liste simple séparée par des virgules."
    try:
        response = await ai_service.generate(prompt=prompt, provider="gemini", system_instruction="Tu es un assistant de tri de CV.")
        skills_list = [s.strip() for s in response.split(',') if s.strip()]
        return {"skills": skills_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@router.post("/simulate-career")
async def simulate_career(request: SimulationRequest, current_user: dict = Depends(require_active_subscription)):
    target_lang = normalize_language(request.candidate_data.get('target_language', 'French'))
    prompt_template = load_prompt(get_prompt_path("career_simulator.md"))
    
    final_prompt = f"""
    {prompt_template}
    
    PROFIL ACTUEL :
    {json.dumps(_sanitize_data_for_ai(request.candidate_data, strict=True), default=str)}
    
    ACTION SIMULÉE :
    {request.simulation_action}
    
    INSTRUCTIONS DE FORMATAGE STRICT (JSON) :
    Tu dois renvoyer un objet JSON contenant au minimum ces deux clés :
    - "feasibility_score": Un nombre entier entre 0 et 10 représentant la faisabilité réaliste.
    - "analysis": L'analyse détaillée des risques, opportunités et de la marche à suivre (avec des retours à la ligne \\n).
    
    OUTPUT LANGUAGE: {target_lang}
    """
    try:
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Career Simulator Engine. Output STRICT JSON.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.post("/generate-clarifications")
async def generate_clarifications(data: FullCVData, current_user: dict = Depends(require_active_subscription)):
    target_lang = normalize_language(data.target_language)
    prompt = f"Analyze this candidate profile. Identify ambiguous/missing points CRITICAL for a CV. Generate up to 20 clarification questions (0-3 if well detailed).\nCRITICAL: If the user includes typos, self-sabotaging flaws (e.g., 'lazy', 'liar'), or unprofessional terms, your FIRST question MUST act as a coach: point out the error gently and propose a positive professional alternative to reframe it.\n\nDATA: {json.dumps(_sanitize_data_for_ai(data.model_dump(), strict=True), default=str)}\n\nOUTPUT STRICT JSON: {{ \"questions\": [\"Q1?\", \"Q2?\"] }}\nLANGUAGE: {target_lang}"
    res = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a Career Coach.")
    return res

@router.post("/parse-linkedin")
async def parse_linkedin_pdf(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Extrait les données d'un PDF LinkedIn pour pré-remplir le formulaire.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Format de fichier invalide. Seuls les PDF sont acceptés.")

    try:
        pdf_reader = PdfReader(file.file)
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text() + "\n"

        if "linkedin.com" not in text_content[:1000] and "Experience" not in text_content[:1000]:
             print("[PARSER] Warning: Le document ne semble pas être un profil LinkedIn standard.")
             # On continue quand même, l'IA pourrait s'en sortir.

        prompt_template = load_prompt(get_prompt_path("linkedin_parser.md"))

        final_prompt = f"""
        {prompt_template}

        TEXTE BRUT EXTRAIT DU PDF :
        {text_content}
        """

        parsed_data = await ai_service.generate_valid_json(final_prompt, provider="gemini", system_instruction="You are a LinkedIn Profile Parser. Output STRICT JSON.")
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse du PDF : {str(e)}")

@router.post("/start")
async def start_cv_generation(background_tasks: BackgroundTasks, data: dict = Body(...), current_user: dict = Depends(require_active_subscription)):
    task_id = str(uuid.uuid4())
    async with db.get_connection() as conn:
        await db.execute(conn, 
            "INSERT INTO tasks (id, status, result, created_at) VALUES (?, ?, ?, ?)", 
            (task_id, "PENDING", None, datetime.now()))
    background_tasks.add_task(process_cv_draft_in_background, task_id, data)
    return {"task_id": task_id, "status": "PENDING"}

@router.post("/generate")
async def generate_document(request: GenerateRequest, current_user: dict = Depends(require_active_subscription)):
    action = request.action
    data = request.data
    print(f"[API] Generate action requested: '{action}'", flush=True)
    
    try:
        if "CV" in action:
            target_lang = normalize_language(data.get('target_language') or data.get('language', 'fr'))
            
            if not request.skip_ai:
                ai_result = await optimize_cv_data(data, target_lang=target_lang, quality='smart')
                optimized_data = ai_result.get("optimized_data", data)
                analysis_data = ai_result.get("analysis")
            else:
                optimized_data = data
                analysis_data = None

            # Normalisation des langues
            langs = optimized_data.get('languages')
            if langs and isinstance(langs, list):
                formatted_langs = [f"{lang_item.get('language', lang_item.get('name'))} ({lang_item.get('level')})" if isinstance(lang_item, dict) and lang_item.get('level') else lang_item.get('language', lang_item.get('name')) if isinstance(lang_item, dict) else lang_item for lang_item in langs]
                if formatted_langs:
                    langs_str = ", ".join([item for item in formatted_langs if item])
                    
                    # [FIX] Logique de formatage des skills pour le template LaTeX
                    current_skills_data = optimized_data.get('skills', [])
                    
                    # S'assurer que les skills sont une chaîne de caractères
                    if isinstance(current_skills_data, list):
                        skills_text = ", ".join(current_skills_data)
                    else:
                        skills_text = str(current_skills_data)
                    
                    optimized_data['skills'] = {"technical": skills_text, "languages": langs_str}

            if request.preview and request.renderer == "json":
                return JSONResponse(content=optimized_data)

            if "Word" in action or ".doc" in action:
                docx_path = generate_cv_docx(optimized_data)
                filename = _generate_smart_filename(data, "CV", "docx")
                if not request.preview:
                    doc_id = str(uuid.uuid4())
                    async with db.get_connection() as conn:
                        await db.execute(conn,
                            "INSERT INTO documents (id, user_id, filename, path, type, created_at, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (doc_id, current_user["id"], filename, docx_path, "CV_WORD", datetime.now(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
                    return FileResponse(path=docx_path, filename=filename, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                else:
                    # [ROBUSTESSE] On programme la suppression du fichier temporaire après l'envoi au client
                    return FileResponse(path=docx_path, filename=filename, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', background=BackgroundTask(_remove_file_safe, docx_path))
            else:
                template_name = "cv_ats.tex"

                # Vérification existence template (Fallback sur ATS si manquant)
                # Note: generate_pdf_from_latex gère déjà une partie des erreurs, mais on assure ici le nom
                generated_path = generate_pdf_from_latex(optimized_data, template_name)
                filename = _generate_smart_filename(data, "CV", "pdf")
                
                headers = {"X-CV-Analysis": json.dumps(analysis_data)} if analysis_data else {}
                
                if not request.preview:
                    doc_id = str(uuid.uuid4())
                    async with db.get_connection() as conn:
                        await db.execute(conn,
                            "INSERT INTO documents (id, user_id, filename, path, type, created_at, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (doc_id, current_user["id"], filename, generated_path, "CV_ATS", datetime.now(), 'application/pdf'))
                    return FileResponse(path=generated_path, filename=filename, media_type='application/pdf', headers=headers)
                else:
                    # Mode prévisualisation : suppression propre post-réponse
                    return FileResponse(path=generated_path, filename=filename, media_type='application/pdf', headers=headers, background=BackgroundTask(_remove_file_safe, generated_path))

        elif "Questionnaire" in action or "Print Questionnaire" in action:
            # [OPTIMISATION] Parallélisation des appels IA pour réduire de moitié le temps d'attente
            async def get_qs():
                q = data.get('questions') or data.get('questions_list')
                return q if q else await generate_interview_questions(data, quality='smart')
                
            async def get_smart_qs():
                sq = data.get('questions_to_ask')
                return sq if sq else await generate_smart_questions(data, quality='smart')

            questions, smart_qs = await asyncio.gather(get_qs(), get_smart_qs())
            
            target_lang = normalize_language(data.get('target_language') or data.get('language', 'fr'))
            
            # Détection de la langue pour les labels UI
            is_french = target_lang == 'French'
            cat_label = "Questions à poser au recruteur" if is_french else "Questions to Ask Recruiter"
            
            for q in smart_qs:
                # q est maintenant un dict {question, strategy}
                if isinstance(q, dict):
                    questions.append({
                        "category": cat_label, 
                        "question": q.get("question", ""), 
                        "suggested_answer": q.get("strategy", "Stratégie"), # On affiche la stratégie dans le champ réponse
                        "score": 100,
                        "advice": "Posez cette question pour montrer votre vision stratégique." if is_french else "Ask this to demonstrate strategic vision."
                    })
                elif isinstance(q, str):
                    questions.append({"category": cat_label, "question": q, "suggested_answer": "Stratégie", "score": 100})
            
            if "Print" in action:
                compliance = run_compliance_check({"questions": questions}, target_lang, quality='smart')
                questions = compliance.get("corrected_content", {}).get("questions", questions)
                return JSONResponse(content={"title": "Interview Prep", "questions": questions, "type": "questions"})
            
            return JSONResponse(content={"questions": questions})

        elif "Pitch" in action:
            # [OPTIMISATION] Si le pitch est déjà calculé (via polling), on l'utilise
            pitch = data.get('pitch')
            if not pitch:
                pitch = await generate_pitch(data, quality='smart')

            if pitch.get("status") == "success":
                compliance = run_compliance_check(pitch, normalize_language(data.get("language", "en")), quality='smart')
                pitch = compliance.get("corrected_content", pitch)
            return JSONResponse(content={"pitch": pitch})

        elif "Gap Analysis" in action:
            # [OPTIMISATION] Utilisation des données pré-calculées
            gap = data.get('gap_analysis')
            # Vérification que les clés essentielles sont présentes pour éviter un faux positif vide
            if not gap or not gap.get('match_score'):
                gap = await generate_gap_analysis(data, {"job_description": data.get("job_description", "")}, quality='smart')
            
            # [FIX] Retourner l'objet à plat pour correspondre à GapAnalysisModal
            return JSONResponse(content=gap)

        elif "Salary" in action:
            # Gestion de l'action 'Salary Estimate' manquante
            prompt = f"Estimate a realistic salary range (low, mid, high) for this profile:\n{json.dumps(data, indent=2)}\n\nRespond in STRICT JSON: {{\"salary_range\": {{\"low\": 0, \"mid\": 0, \"high\": 0}}, \"currency\": \"EUR\", \"commentary\": \"...\"}}"
            res_str = await ai_service.generate(prompt, provider="openai", system_instruction="You are a compensation expert. You must output STRICT JSON.")
            salary_data = clean_ai_json_response(res_str)
            return JSONResponse(content=salary_data)

        else:
            print(f"[API] Error: Unknown action '{action}'")
            raise HTTPException(status_code=400, detail="Unknown action")

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Generate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render")
async def render_final_cv(cv_final_data: CVFinal, preview: bool = Query(False), current_user: dict = Depends(get_current_user)):
    try:
        # Transformation simplifiée pour LaTeX (logique extraite de main.py)
        latex_data = cv_final_data.dict(include={'first_name', 'last_name', 'email', 'phone', 'linkedin', 'city', 'country', 'photo', 'current_role'})
        for section in cv_final_data.sections:
            if not section.enabled:
                continue
            items = [i.fields for i in section.items if i.enabled]
            if not items:
                continue
            
            if section.type == "summary":
                latex_data["summary"] = items[0].get("text", "")
            elif section.type in ["experience", "education", "projects"]:
                key = section.type + "s" if section.type != "projects" else "projects"
                for item in items:
                    if "bullets" in item and "achievements" not in item:
                        item["achievements"] = item["bullets"]
                latex_data[key] = items
            elif section.type == "skills":
                if not isinstance(latex_data.get("skills"), dict):
                    latex_data["skills"] = {}
                if len(items) == 1 and any(k in items[0] for k in ["technical", "languages"]):
                    latex_data["skills"].update(items[0])
                else:
                    latex_data["skills"]["text"] = ", ".join([str(list(i.values())[0]) for i in items])
        
        safe_last = "".join(c for c in cv_final_data.last_name if c.isalnum()) or "Candidat"
        filename = f"CV_{safe_last.capitalize()}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        generated_path = generate_pdf_from_latex(latex_data, "cv_ats.tex")
        
        if not preview:
            doc_id = str(uuid.uuid4())
            async with db.get_connection() as conn:
                await db.execute(conn,
                    "INSERT INTO documents (id, user_id, filename, path, type, created_at, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (doc_id, current_user["id"], filename, generated_path, "CV_ATS", datetime.now(), 'application/pdf'))
            return FileResponse(path=generated_path, filename=filename, media_type='application/pdf')
        else:
            return FileResponse(path=generated_path, filename=filename, media_type='application/pdf', background=BackgroundTask(_remove_file_safe, generated_path))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render error: {e}")

async def orchestrate_dashboard_tasks(tasks_map: dict, cv_dict: dict):
    """
    Enterprise-grade Orchestrator:
    Éxécute les tâches d'arrière-plan par "Vagues" (Batching) de priorité.
    Cela empêche de saturer les limites de requêtes par minute (RPM) de l'API IA,
    tout en garantissant que les infos les plus importantes chargent en premier.
    """
    print("\n[ORCHESTRATOR] 🌊 Dispatching tasks to Semaphore Queue...", flush=True)
    
    def fire(task_key, coro):
        async def safe_coro():
            try:
                await coro
            except Exception as e:
                print(f"[ORCHESTRATOR ERROR] Crash critique intercepté sur '{task_key}' : {e}", flush=True)
                
                # [ROBUSTESSE] Récupération des IDs pour forcer le statut FAILED en DB et libérer le Frontend
                tids = []
                if isinstance(task_key, str) and task_key in tasks_map:
                    tids.append(tasks_map[task_key])
                elif isinstance(task_key, dict):  # Cas des tâches fusionnées (Market Strategy)
                    tids.extend(task_key.values())
                    
                for tid in tids:
                    try:
                        await asyncio.to_thread(update_task_status_sync, tid, "FAILED", {"error": f"Orchestrator safety fallback: {str(e)}"})
                    except Exception as db_err:
                        print(f"[ORCHESTRATOR DB ERROR] Impossible de MAJ le statut pour {tid}: {db_err}", flush=True)
                        
        asyncio.create_task(safe_coro())

    if "profile_validation" in tasks_map: fire("profile_validation", process_profile_validation_in_background(tasks_map["profile_validation"], cv_dict))
    if "cv_analysis" in tasks_map: fire("cv_analysis", process_cv_analysis_in_background(tasks_map["cv_analysis"], cv_dict))
    if "gap_analysis" in tasks_map: fire("gap_analysis", process_gap_analysis_in_background(tasks_map["gap_analysis"], cv_dict))
    
    await asyncio.sleep(0.5) # Micro-délai pour garantir la priorité

    if "pitch" in tasks_map: fire("pitch", process_pitch_in_background(tasks_map["pitch"], cv_dict))
    if "recruiter_view" in tasks_map: fire("recruiter_view", process_recruiter_view_in_background(tasks_map["recruiter_view"], cv_dict))
    if "reality_check" in tasks_map: fire("reality_check", process_reality_check_in_background(tasks_map["reality_check"], cv_dict))
    if "flaw_coaching" in tasks_map: fire("flaw_coaching", process_flaw_coaching_in_background(tasks_map["flaw_coaching"], cv_dict))

    await asyncio.sleep(0.5)

    if "career_radar" in tasks_map: fire("career_radar", process_career_radar_in_background(tasks_map["career_radar"], cv_dict))
    if "questions" in tasks_map: fire("questions", process_questions_in_background(tasks_map["questions"], cv_dict))

    await asyncio.sleep(0.5)

    if "career_gps" in tasks_map: fire("career_gps", process_career_gps_in_background(tasks_map["career_gps"], cv_dict))
    if "one_liner" in tasks_map: fire("one_liner", process_oneliner_in_background(tasks_map["one_liner"], cv_dict))
        
    # TÂCHES FUSIONNÉES : Market Strategy
    strategy_tasks = {k: tasks_map[k] for k in ["job_decoder", "risk_analysis", "hidden_market"] if k in tasks_map}
    if strategy_tasks: fire(strategy_tasks, process_market_strategy_in_background(strategy_tasks, cv_dict))

    print("[ORCHESTRATOR] ✅ All tasks queued successfully. Semaphore is handling the flow.", flush=True)

@router.post("/start-analysis")
async def start_analysis(data: FullCVData, background_tasks: BackgroundTasks, current_user: dict = Depends(require_active_subscription)):
    tasks_map = {}
    now = datetime.now()
    try:
        cv_dict = data.model_dump()
    except AttributeError:
        cv_dict = data.dict()
    
    if data.is_partial_start:
        if data.target_company or data.target_industry:
            tasks_map["market_research"] = str(uuid.uuid4())
            tasks_map["salary_estimation"] = str(uuid.uuid4()) # Ajout explicite pour le frontend
    else:
        tasks_map["cv_analysis"] = str(uuid.uuid4())
        tasks_map["pitch"] = str(uuid.uuid4())
        tasks_map["questions"] = str(uuid.uuid4())
        tasks_map["gap_analysis"] = str(uuid.uuid4())
        tasks_map["salary_estimation"] = str(uuid.uuid4())
        tasks_map["career_radar"] = str(uuid.uuid4())
        tasks_map["recruiter_view"] = str(uuid.uuid4())
        tasks_map["one_liner"] = str(uuid.uuid4())
        tasks_map["risk_analysis"] = str(uuid.uuid4())
        
        # [FIX] On ne lance le Job Decoder QUE si une annonce a été fournie (évite les hallucinations)
        if data.job_description and str(data.job_description).strip():
            tasks_map["job_decoder"] = str(uuid.uuid4())
        tasks_map["hidden_market"] = str(uuid.uuid4())
        tasks_map["career_gps"] = str(uuid.uuid4())
        tasks_map["reality_check"] = str(uuid.uuid4())
        tasks_map["profile_validation"] = str(uuid.uuid4())
        tasks_map["flaw_coaching"] = str(uuid.uuid4())
        
        # [CRITIQUE] Ne pas écraser la recherche de marché si l'Étape 2 est déjà en cours ou terminée
        has_research_data = isinstance(data.research_data, dict) and len(data.research_data) > 0
        if (data.target_company or data.target_industry) and not has_research_data:
            tasks_map["market_research"] = str(uuid.uuid4())
        else:
            print("[PIPELINE] Market research skipped (Already running or cached from Step 2).", flush=True)

    try:
        async with db.get_connection() as conn:
            for tid in tasks_map.values():
                await db.execute(conn, 
                    "INSERT INTO tasks (id, status, result, created_at) VALUES (?, ?, ?, ?)", 
                    (tid, "PENDING", None, now))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[START_ANALYSIS] DB INSERT ERROR: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Database insert error")
    
    if "market_research" in tasks_map:
        if data.target_company or data.target_industry:
            research_payload = {
                "target_company": data.target_company,
                "target_industry": data.target_industry,
                "target_country": data.target_country,
                "target_job": data.target_job,
                "candidate_data": cv_dict,
                "provider": data.provider,
                "target_language": data.target_language
            }
            background_tasks.add_task(process_research_in_background, tasks_map["market_research"], research_payload)
        else:
            background_tasks.add_task(update_task_status_sync, tasks_map["market_research"], "COMPLETED", {"info": "Skipped, no company provided"})

    if "salary_estimation" in tasks_map:
        background_tasks.add_task(process_salary_in_background, tasks_map["salary_estimation"], cv_dict)

    # Lancement orchestré par vagues pour éviter les Timeouts d'API (Thundering Herd)
    if not data.is_partial_start:
        background_tasks.add_task(orchestrate_dashboard_tasks, tasks_map, cv_dict)

    return {
        "message": "Pipeline started",
        "tasks": tasks_map,
        "task_id": tasks_map.get("cv_analysis") or tasks_map.get("market_research"),
        "salary_task_id": tasks_map.get("salary_estimation")
    }

@router.post("/analyze-completeness")
async def analyze_completeness(background_tasks: BackgroundTasks, payload: dict = Body(...), current_user: dict = Depends(require_active_subscription)):
    task_id = str(uuid.uuid4())
    async with db.get_connection() as conn:
        await db.execute(conn, "INSERT INTO tasks (id, status, result, created_at) VALUES (?, ?, ?, ?)", 
                         (task_id, "PENDING", None, datetime.now()))
    
    background_tasks.add_task(process_completeness_in_background, task_id, payload)
    return {"task_id": task_id, "status": "PENDING"}

@router.get("/analysis-status/{task_id}")
async def get_analysis_status(task_id: str):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT status, result FROM tasks WHERE id = ?", (task_id,))
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Analyse non trouvée")
    
    status = row[0] if isinstance(row, tuple) else row["status"]
    result_raw = row[1] if isinstance(row, tuple) else row["result"]
    
    response = {"status": status}
    
    if (status in ["SUCCESS", "COMPLETED", "FAILED"]) and result_raw:
        try:
            response["result"] = json.loads(result_raw)
        except Exception:
            response["result"] = result_raw
            
    return response

@router.post("/dashboard/summary")
async def get_dashboard_summary(data: FullCVData, current_user: dict = Depends(require_active_subscription)):
    try:
        cv_dict = data.model_dump()
    except AttributeError:
        cv_dict = data.dict()
    target_lang = normalize_language(cv_dict.get('target_language', 'French'))
    
    cached_gap = cv_dict.get('gap_analysis')
    has_cached_gap = bool(cached_gap and isinstance(cached_gap, dict) and cached_gap.get('match_score'))
    gap_analysis_task = asyncio.sleep(0) if has_cached_gap else run_gap_analysis_and_get_result(cv_dict)

    key_strengths_prompt = f"""
    Analyse ce profil et résume-le en 3 forces clés percutantes.
    Exemple: "Leadership opérationnel", "Gestion du risque", "Prise de décision en environnement critique".
    Ne retourne QUE le JSON.
    
    PROFIL: {json.dumps(_sanitize_data_for_ai(cv_dict), default=str)}
    
    OUTPUT LANGUAGE: {target_lang}
    FORMAT JSON STRICT: {{"key_strengths": ["Force 1", "Force 2", "Force 3"]}}
    """
    key_strengths_task = ai_service.generate(key_strengths_prompt, provider="gemini", system_instruction=f"Tu es un expert en branding personnel. Langue: {target_lang}.")

    application_strategy_prompt = f"""
    Analyse ce profil et le poste visé. Propose une stratégie de candidature en 3 points prioritaires.
    Exemple: "Cibler les entreprises industrielles", "Valoriser l'expérience opérationnelle".
    ATTENTION: Si le profil contient des failles de FOND critiques (défauts professionnels suicidaires comme "fainéant", "menteur", agressivité), 
    le point n°1 de la stratégie DOIT ÊTRE un recadrage bienveillant mais ferme.
    ⚠️ RÈGLE D'OR : IGNORE TOTALEMENT les erreurs de forme (absence de majuscules, fautes de frappe, accents manquants, mots en majuscules). Le texte brut est un brouillon informel adressé au coach et sera formaté automatiquement plus tard. Ne fais JAMAIS de remarques sur la typographie.
    Ne retourne QUE le JSON.
    
    PROFIL: {json.dumps(_sanitize_data_for_ai(cv_dict), default=str)}
    
    OUTPUT LANGUAGE: {target_lang}
    FORMAT JSON STRICT: {{"application_strategy": ["Priorité 1", "Priorité 2", "Priorité 3"]}}
    """
    application_strategy_task = ai_service.generate(application_strategy_prompt, provider="gemini", system_instruction=f"Tu es un coach de carrière stratégique. Langue: {target_lang}.")

    results = await asyncio.gather(gap_analysis_task, key_strengths_task, application_strategy_task)
    
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

    match_score = gap_analysis_result.get("match_score")
    if match_score is None:
        match_score = 0
        
    strategy_list = application_strategy_result.get("application_strategy", [])
    recommended_strategy = " ".join(strategy_list) if isinstance(strategy_list, list) else str(strategy_list)
    
    raw_gaps = gap_analysis_result.get("missing_gaps", [])
    gaps_matrix = [{"skill": gap, "impact": "Bloquant pour les ATS", "action": "À développer ou justifier"} for gap in raw_gaps]

    return {
        "matchScore": match_score,
        "summary": f"Votre profil correspond à {match_score}% des attentes du poste visé. {len(raw_gaps)} compétences sont à renforcer.",
        "strengths": key_strengths_result.get("key_strengths", []),
        "gapsMatrix": gaps_matrix,
        "recommendedStrategy": recommended_strategy,
        "analysis_stats": {
            "skills_detected": len(cv_dict.get('skills', [])) + len(cv_dict.get('work_style', [])) + len(cv_dict.get('relational_style', [])) + len(cv_dict.get('professional_approach', [])),
            "requirements_analyzed": len(gap_analysis_result.get("key_needs_from_job", [])),
            "gaps_identified": len(gap_analysis_result.get("missing_gaps", []))
        }
    }

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Enregistre le feedback utilisateur (pouces) pour une fonctionnalité spécifique."""
    vote = "👍" if request.is_positive else "👎"
    print(f"[FEEDBACK] Vote reçu pour '{request.feature}': {vote}", flush=True)
    
    async with db.get_connection() as conn:
        try:
            await db.execute(conn, """
                CREATE TABLE IF NOT EXISTS feedbacks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    feature TEXT NOT NULL,
                    is_positive BOOLEAN NOT NULL,
                    comments TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.execute(conn, 
                "INSERT INTO feedbacks (feature, is_positive, comments, created_at) VALUES (?, ?, ?, ?)", 
                (request.feature, request.is_positive, request.comments, datetime.now()))
        except Exception as e:
            error_msg = str(e).lower()
            if "no column" in error_msg or "has no column" in error_msg:
                print("[DB] Auto-migration : Ajout des colonnes à la table feedbacks...", flush=True)
                try:
                    await db.execute(conn, "ALTER TABLE feedbacks ADD COLUMN is_positive BOOLEAN")
                except Exception: pass
                try:
                    await db.execute(conn, "ALTER TABLE feedbacks ADD COLUMN comments TEXT")
                except Exception: pass
                await db.execute(conn, 
                    "INSERT INTO feedbacks (feature, is_positive, comments, created_at) VALUES (?, ?, ?, ?)", 
                    (request.feature, request.is_positive, request.comments, datetime.now()))
            else:
                print(f"[DB ERROR] Erreur d'insertion du feedback: {e}", flush=True)
                raise HTTPException(status_code=500, detail="Erreur interne de la base de données")

    return {"status": "success", "message": "Feedback enregistré avec succès"}

@router.get("/feedbacks")
async def get_feedbacks():
    """Récupère la liste de tous les feedbacks (Vue Admin)."""
    async with db.get_connection() as conn:
        try:
            await db.execute(conn, """
                CREATE TABLE IF NOT EXISTS feedbacks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    feature TEXT NOT NULL,
                    is_positive BOOLEAN NOT NULL,
                    comments TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
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
    """Récupère le profil complet (JSON) de l'utilisateur connecté."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (current_user["id"],))
            row = await cursor.fetchone()
            
        if row:
            data = row[0] if isinstance(row, tuple) else row.get("profile_data")
            if data:
                return json.loads(data) if isinstance(data, str) else data
                
            print(f"[PROFIL WARNING] Aucun profil complet trouvé en base pour {current_user['email']}.", flush=True)
            return {"form": {"email": current_user.get("email", ""), "first_name": current_user.get("first_name", ""), "last_name": current_user.get("last_name", "")}}
    except Exception as e:
        print(f"[PROFILE ERROR] {e}", flush=True)
        return {"form": {"email": current_user.get("email", "")}}

@router.post("/me/profile")
async def update_my_profile(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Met à jour ou fusionne le profil complet du candidat dans la base de données."""
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO user_profiles (user_id, profile_data) VALUES (?, ?::jsonb)
                ON CONFLICT(user_id) DO UPDATE SET profile_data = user_profiles.profile_data || EXCLUDED.profile_data::jsonb
            """, (current_user["id"], json.dumps(payload)))
        return {"status": "success", "message": "Brouillon fusionné et sauvegardé"}
    except Exception as e:
        print(f"[PROFILE SAVE ERROR] {e}", flush=True)
        return {"status": "error", "message": str(e)}

@router.get("/documents")
async def get_my_documents(current_user: dict = Depends(get_current_user)):
    """Récupère la liste des vrais documents générés par l'utilisateur connecté."""
    async with db.get_connection() as conn:
        # Création de sécurité
        await db.execute(conn, """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                filename TEXT,
                path TEXT,
                type TEXT,
                created_at DATETIME,
                media_type TEXT
            )
        """)
        # On filtre explicitement pour ne pas afficher les JSON
        cursor = await db.execute(conn, "SELECT id, filename, type, created_at FROM documents WHERE user_id = ? AND type != 'JSON' ORDER BY created_at DESC", (current_user["id"],))
        rows = await cursor.fetchall()
        
    return [{
        "id": row[0] if isinstance(row, tuple) else row["id"],
        "filename": row[1] if isinstance(row, tuple) else row["filename"],
        "type": row[2] if isinstance(row, tuple) else row["type"],
        "created_at": row[3] if isinstance(row, tuple) else row["created_at"]
    } for row in rows]

@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Télécharge ou affiche un document spécifique (PDF/Word)."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT path, filename, media_type FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"]))
        row = await cursor.fetchone()
        
    if not row:
        raise HTTPException(status_code=404, detail="Document introuvable ou accès refusé")
        
    path = row[0] if isinstance(row, tuple) else row["path"]
    filename = row[1] if isinstance(row, tuple) else row["filename"]
    media_type = row[2] if isinstance(row, tuple) else row["media_type"]
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur")
        
    return FileResponse(path=path, filename=filename, media_type=media_type)

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Supprime un document de la base."""
    async with db.get_connection() as conn:
        await db.execute(conn, "DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"]))
    return {"status": "success"}
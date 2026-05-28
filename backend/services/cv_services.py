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
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from database import db
from models import GenerateRequest, CVFinal, FeedbackRequest, ExperienceRequest, SkillExtractionRequest, FullCVData
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
    orchestrate_dashboard_tasks,
    process_action_plan_in_background,
)
from .utils import (
    clean_ai_json_response, normalize_language, load_prompt, _get_sortable_date_tuple,
    _sanitize_data_for_ai, _generate_cache_key, get_cached_content, set_cached_content
)
from .tasks import get_prompt_path
from .websocket_manager import manager

router = APIRouter(prefix="/api/cv", tags=["CV Generator"])

# [FIX EXPERT - POINT 3] Redéfinition robuste du payload de Feedback pour éviter les erreurs 422 Unprocessable Entity
class FeedbackPayload(BaseModel):
    feature: str
    is_positive: bool = True
    comments: Optional[str] = None
    job_type: Optional[str] = None

class FlawCoachRequest(BaseModel):
    flaw: str
    target_job: Optional[str] = "Candidat"
    target_language: Optional[str] = "fr"

class InterviewAnswerRequest(BaseModel):
    question: str
    category: Optional[str] = "Question d'entretien"
    suggested_framework: Optional[str] = ""
    user_answer: str
    application_id: Optional[str] = None
    task_id: Optional[str] = None

class CustomQuestionRequest(BaseModel):
    theme: str
    question_type: str
    count: Optional[int] = 1
    target_job: Optional[str] = "Candidat"
    target_company: Optional[str] = "Entreprise cible"

class TrainingEvaluateRequest(BaseModel):
    theme: str
    question_type: str
    question_text: str
    user_answer: str
    target_job: Optional[str] = "Candidat"
    target_company: Optional[str] = "Entreprise cible"

class VocalPitchRequest(BaseModel):
    transcript: str
    duration_seconds: int
    target_job: Optional[str] = "Candidat"
    target_language: Optional[str] = "fr"

class EvaluatePitchRequest(BaseModel):
    accroche: str
    preuve: str
    valeur: str
    projection: str
    target_job: Optional[str] = "Candidat"
    target_language: Optional[str] = "fr"

def _remove_file_safe(path: str):
    """Supprime un fichier temporaire après son envoi sans crasher en cas d'erreur."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"[CLEANUP ERROR] Impossible de supprimer {path}: {e}")

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
    # [FIX] Extraction des mots-clés et clarifications pour forcer l'IA à les utiliser
    clarifications = data.get('clarifications', [])
    free_text = data.get('free_text', '')
    
    clarifications_str = "\n".join([f"- {c.get('question', '')} : {c.get('answer', '')}" for c in clarifications if isinstance(c, dict) and c.get('answer')])
    
    instructions_candidat = ""
    if free_text or clarifications_str:
        instructions_candidat = f"\n⚠️ INSTRUCTIONS SPÉCIFIQUES DU CANDIDAT (MOTS-CLÉS & PRÉCISIONS À INTÉGRER IMPÉRATIVEMENT DANS LES EXPÉRIENCES OU COMPÉTENCES) :\n{free_text}\n{clarifications_str}\nTu dois absolument tisser ces éléments dans le contenu du CV.\n"

    prompt = f"""
    Optimize this CV data for ATS in {target_lang}. Improve wording and keywords.
    ⚠️ IMPÉRATIF DE CORRECTION : Le texte fourni est un brouillon brut. Tu DOIS corriger scrupuleusement toutes les fautes d'orthographe, de frappe, ajouter les accents manquants et corriger la typographie (mettre des majuscules aux noms, prénoms, noms d'entreprises et débuts de phrases). Le résultat doit avoir une rigueur typographique absolue.
    ⚠️ INTERDICTION ABSOLUE : N'invente AUCUNE donnée personnelle (téléphone, email, ville, linkedin). Si une information est absente du JSON source, laisse la valeur VIDE ou null. N'écris JAMAIS de texte comme "Numéro formaté", "Ville, France" ou "URL propre".
    ⚠️ TRI CHRONOLOGIQUE : Tu DOIS réorganiser les tableaux `experiences` et `educations` par ordre anti-chronologique (de la date la plus récente à la plus ancienne). Si une date est marquée comme 'Présent' ou 'En cours', place-la en premier.
    {instructions_candidat}
    
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
    
    target_job = data.get('target_job', 'Poste visé')
    target_company = data.get('target_company', 'Entreprise cible')
    job_desc = data.get('job_description', '')
    
    job_context = f"Poste visé : {target_job} chez {target_company}"
    if job_desc and len(job_desc) > 50:
        job_context += f"\nDESCRIPTION DE L'OFFRE (CRITIQUE POUR CRÉER LES 4 MISES EN SITUATION) :\n{job_desc}"
        
    prompt_template = load_prompt(get_prompt_path("interview_questions.md"))
    prompt = f"""
    {prompt_template}
    
    CONTEXTE CIBLE :
    {job_context}
    
    CONTEXTE CANDIDAT :
    Adresse : {address}, {city}
    Hobbies : {hobbies}
    Défauts identifiés par le candidat : {flaws}
    
    DONNÉES :
    {json.dumps(_sanitize_data_for_ai(data), indent=2)}
    
    OUTPUT LANGUAGE: {target_lang}
    """
    result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a ruthless but constructive Executive Recruiter. Generate high-level, challenging interview questions. Output ONLY JSON. Language: {target_lang}.")
    if "error" in result:
        return []
    return result.get('questions', [])

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
    result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output ONLY JSON in {target_lang}.")
    if "error" in result:
        return []
    return result.get('questions_to_ask', [])

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
    result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
    if "error" in result:
        return {}
    return result

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
    result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a senior recruiter. ALL CONTENT MUST BE ENTIRELY WRITTEN IN {target_lang.upper()}. Output STRICT JSON.")
    if "error" in result:
        return {}
    return result

@router.post("/coach-flaw")
async def coach_flaw(request: FlawCoachRequest, current_user: dict = Depends(require_active_subscription)):
    """Transforme un défaut brut en argument d'entretien."""
    req_dump = request.model_dump() if hasattr(request, "model_dump") else request.dict()
    cache_key = _generate_cache_key(current_user["id"], "coach_flaw", req_dump)
    cached = await get_cached_content(cache_key)
    if cached:
        return cached
        
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
        await set_cached_content(cache_key, current_user["id"], "coach_flaw", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flaw coaching failed: {str(e)}")

@router.post("/evaluate-interview-answer")
async def evaluate_interview_answer(request: InterviewAnswerRequest, current_user: dict = Depends(require_active_subscription)):
    """Évalue une réponse donnée par le candidat à une question d'entretien (Micro ou Texte)."""
    prompt_template = load_prompt(get_prompt_path("evaluate_interview_answer.md"))
    
    final_prompt = f"""
    {prompt_template}
    
    QUESTION POSÉE : "{request.question}"
    CATÉGORIE / ATTENTE : "{request.category}"
    CADRE ATTENDU / SUGGESTION : "{request.suggested_framework}"
    
    RÉPONSE DU CANDIDAT :
    "{request.user_answer}"
    """
    
    try:
        result = await ai_service.generate_valid_json(
            final_prompt, 
            provider="openai", 
            system_instruction="You are an Expert Interview Coach. Output STRICT JSON."
        )
        
        # --- [FIX EXPERT] SANITISATION DES TABLEAUX ---
        if not isinstance(result.get("strengths"), list):
            s = result.get("strengths")
            result["strengths"] = [s] if s and isinstance(s, str) else []
        if not isinstance(result.get("weaknesses"), list):
            w = result.get("weaknesses")
            result["weaknesses"] = [w] if w and isinstance(w, str) else []
            
        # [FIX EXPERT] Sauvegarde de la session d'entretien en BDD
        session_id = str(uuid.uuid4())
        app_id = request.application_id or "general"
        
        async with db.get_connection() as conn:
            try:
                await db.execute(conn, """
                    INSERT INTO interview_sessions (id, user_id, application_id, question_text, user_answer, score, feedback, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
                """, (session_id, current_user["id"], app_id, request.question, request.user_answer, result.get("score", 0), json.dumps(result), datetime.now()))
            except Exception as e:
                print(f"[DB WARNING] Failed to insert interview session (missing table?): {e}", flush=True)
            
            def parse_deep_json(raw_str):
                parsed = raw_str
                for _ in range(5):
                    if isinstance(parsed, str):
                        try:
                            parsed = json.loads(parsed)
                        except Exception:
                            import re
                            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', parsed, re.IGNORECASE)
                            if match:
                                try:
                                    parsed = json.loads(match.group(1))
                                except Exception:
                                    break
                            else:
                                break
                    else:
                        break
                return parsed

            def update_question_node(node):
                def normalize_str(s):
                    return re.sub(r'\W+', '', str(s)).lower() if s else ""
                    
                if isinstance(node, dict):
                    req_q = normalize_str(request.question)
                    
                    def is_match(a, b):
                        if not a or not b: return False
                        if len(a) > 10 and a in b: return True
                        if len(b) > 10 and b in a: return True
                        return a == b   
                        
                    # [FIX EXPERT] Sécurité : on s'assure de n'altérer que des noeuds qui ressemblent à des questions
                    if any(k in node for k in ["question", "scenario", "situation", "text", "contexte", "description", "defi"]):
                        for k, v in list(node.items()):
                            if isinstance(v, str) and len(v) > 5:
                                if is_match(req_q, normalize_str(v)):
                                    node["user_answer"] = request.user_answer
                                    node["evaluation"] = result
                                    return True
                                    
                    for v in list(node.values()):
                        if update_question_node(v): return True
                elif isinstance(node, list):
                    for item in node:
                        if update_question_node(item): return True
                return False

            # [FIX EXPERT] Mise à jour du JSON de la tâche pour que les scores soient rechargés au retour
            task_to_update = request.task_id
            
            # [FIX EXPERT] Recherche robuste de la tâche avec priorité ciblée sur le tasks_map
            if not task_to_update and request.application_id:
                try:
                    cursor = await db.execute(conn, "SELECT tasks_map FROM job_applications WHERE id = ?", (request.application_id,))
                    row = await cursor.fetchone()
                    if row:
                        t_map_raw = row[0] if isinstance(row, tuple) else row.get("tasks_map")
                        if t_map_raw:
                            t_map = json.loads(t_map_raw) if isinstance(t_map_raw, str) else t_map_raw
                            possible_tasks = []
                            if "questions" in t_map: possible_tasks.append(t_map["questions"])
                            if "custom_scenarios" in t_map: possible_tasks.append(t_map["custom_scenarios"])
                            
                            for tid in possible_tasks:
                                cursor = await db.execute(conn, "SELECT result FROM tasks WHERE id = ?", (tid,))
                                t_row = await cursor.fetchone()
                                if t_row:
                                    t_res = t_row[0] if isinstance(t_row, tuple) else t_row.get("result")
                                    if t_res:
                                        task_result = parse_deep_json(t_res)
                                        if update_question_node(task_result):
                                            task_to_update = tid
                                            await db.execute(conn, "UPDATE tasks SET result = ? WHERE id = ?", (json.dumps(task_result), task_to_update))
                                            break
                except Exception as e:
                    print(f"[DB WARNING] Failed to use tasks_map: {e}")
                    
            if not task_to_update:
                try:
                    cursor = await db.execute(conn, """
                        SELECT t.id, t.result FROM tasks t
                        LEFT JOIN job_applications a ON t.application_id = a.id
                        WHERE (a.user_id = ? OR t.user_id = ?)
                        ORDER BY t.created_at DESC LIMIT 50
                    """, (current_user["id"], current_user["id"]))
                    rows = await cursor.fetchall()
                    for row in rows:
                        t_res = row[1] if isinstance(row, tuple) else row.get("result")
                        if not t_res: continue
                        
                        task_result = parse_deep_json(t_res)
                        if update_question_node(task_result):
                            task_to_update = row[0] if isinstance(row, tuple) else row.get("id")
                            await db.execute(conn, "UPDATE tasks SET result = ? WHERE id = ?", (json.dumps(task_result), task_to_update))
                            break
                except Exception as e:
                    print(f"[DB WARNING] Failed to auto-discover task: {e}", flush=True)

            elif request.task_id:
                try:
                    cursor = await db.execute(conn, "SELECT result FROM tasks WHERE id = ?", (task_to_update,))
                    task_row = await cursor.fetchone()
                    if task_row:
                        task_result_str = task_row[0] if isinstance(task_row, tuple) else task_row.get("result")
                        if task_result_str:
                            task_result = parse_deep_json(task_result_str)
                            if update_question_node(task_result):
                                await db.execute(conn, "UPDATE tasks SET result = ? WHERE id = ?", (json.dumps(task_result), task_to_update))
                except Exception as e:
                    print(f"[DB WARNING] Failed to update task JSON: {e}", flush=True)
                    
            try:
                # [FIX EXPERT] Mise à jour du Cache pour que les réponses survivent au rechargement de page (F5)
                cursor = await db.execute(conn, "SELECT cache_key, result FROM generation_cache WHERE user_id = ? AND content_type IN ('interview_questions', 'extra_scenarios') ORDER BY created_at DESC LIMIT 5", (current_user["id"],))
                cache_rows = await cursor.fetchall()
                for c_row in cache_rows:
                    c_key = c_row[0] if isinstance(c_row, tuple) else c_row.get("cache_key")
                    c_res = c_row[1] if isinstance(c_row, tuple) else c_row.get("result")
                    try:
                        c_data = parse_deep_json(c_res)
                            
                        if update_question_node(c_data):
                            await db.execute(conn, "UPDATE generation_cache SET result = ?::jsonb WHERE cache_key = ?", (json.dumps(c_data), c_key))
                    except Exception:
                        pass
            except Exception as e:
                print(f"[DB WARNING] Failed to update generation_cache: {e}", flush=True)
            
        return {"feedback": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'évaluation de la réponse: {str(e)}")

@router.get("/interview/history")
async def get_interview_history(current_user: dict = Depends(require_active_subscription)):
    """Récupère l'historique des réponses aux entretiens de l'utilisateur."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, """
                SELECT id, question_text, user_answer, score, feedback, created_at
                FROM interview_sessions 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            """, (current_user["id"],))
            rows = await cursor.fetchall()
            
        history = []
        for row in rows:
            r = dict(row) if not isinstance(row, tuple) else {
                "id": row[0], "question_text": row[1], "user_answer": row[2], 
                "score": row[3], "feedback": row[4], "created_at": row[5]
            }
            feedback = json.loads(r["feedback"]) if isinstance(r["feedback"], str) else r["feedback"]
            history.append({
                "id": r["id"], "question": r["question_text"], "user_answer": r["user_answer"],
                "score": r["score"], "feedback": feedback, "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], 'isoformat') else str(r["created_at"])
            })
        return {"history": history}
    except Exception as e:
        print(f"[DB WARNING] Failed to fetch interview_sessions: {e}")
        return {"history": []}

@router.post("/training/evaluate-vocal-pitch")
async def evaluate_vocal_pitch(request: VocalPitchRequest, current_user: dict = Depends(require_active_subscription)):
    """Évalue un pitch vocal (transcription + durée) pour analyser le débit, les tics et la structure."""
    word_count = len(request.transcript.split())
    wpm = int((word_count / request.duration_seconds) * 60) if request.duration_seconds > 0 else 0
    target_lang = normalize_language(request.target_language)

    prompt = f"""
    Tu es un Expert en Prise de Parole en Public et Coach de Carrière de très haut niveau.
    Ta mission est d'analyser la transcription d'un pitch vocal SPONTANÉ (sans script) et de fournir un feedback hyper-actionnable.

    POSTE VISÉ : {request.target_job}
    DURÉE DE L'ENREGISTREMENT : {request.duration_seconds} secondes
    MOTS PRONONCÉS : {word_count}
    DÉBIT (Words Per Minute) : {wpm} mots / minute. (Pour info: 130-150 = conversationnel, >160 = trop rapide/stressé, <110 = trop lent/hésitant).

    TRANSCRIPTION DU PITCH :
    "{request.transcript}"

    ANALYSE ATTENDUE :
    1. Tics de langage : Traque les mots parasites ("euh", "du coup", "en fait", "voilà").
    2. Rythme : Analyse le WPM et repère l'absence de silence ou les hésitations.
    3. Structure : Le candidat est-il clair ? Y a-t-il une vraie accroche et une conclusion ?
    4. Micro-exercices : Propose 2 petits exercices pratiques pour corriger les défauts ciblés.

    OUTPUT STRICT JSON:
    {{
        "score": 75,
        "metrics": {{
            "wpm": {wpm},
            "pace_status": "Idéal | Trop rapide | Trop lent",
            "filler_words_detected": ["euh", "du coup"]
        }},
        "feedback": {{
            "pace_and_silences": "Diagnostic précis sur le rythme...",
            "structure_and_clarity": "Diagnostic sur la clarté et l'impact...",
            "actionable_advice": ["Conseil 1", "Conseil 2"]
        }},
        "micro_exercises": [
            {{ "title": "Titre de l'exercice", "description": "Comment l'exécuter concrètement" }}
        ]
    }}
    LANGUAGE: {target_lang}
    """
    try:
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are an elite Public Speaking Coach. Output STRICT JSON.")
        
        # --- [FIX EXPERT] SANITISATION GLOBALE DES TABLEAUX ---
        # On force la conversion en tableau pour éviter les crashs React (ie.map is not a function)
        if "metrics" in result and not isinstance(result["metrics"].get("filler_words_detected"), list):
            fw = result["metrics"].get("filler_words_detected")
            result["metrics"]["filler_words_detected"] = [fw] if fw and isinstance(fw, str) else []
            
        if not isinstance(result.get("micro_exercises"), list):
            me = result.get("micro_exercises")
            if isinstance(me, dict):
                result["micro_exercises"] = [me]
            elif isinstance(me, str):
                result["micro_exercises"] = [{"title": "Exercice ciblé", "description": me}]
            else:
                result["micro_exercises"] = []
                
        # [FIX EXPERT] Sauvegarde du pitch vocal dans l'historique d'entraînement pour les statistiques
        session_id = str(uuid.uuid4())
        try:
            async with db.get_connection() as conn:
                await db.execute(conn, """
                    INSERT INTO training_sessions (id, user_id, theme, question_type, question_text, user_answer, score, strengths, weaknesses, improved_answer, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (session_id, current_user["id"], "Pitch Vocal", "Vocal", "Entraînement au pitch vocal (spontané)", request.transcript, result.get("score", 0), json.dumps(result.get("metrics", {})), json.dumps(result.get("feedback", {})), json.dumps(result.get("micro_exercises", [])), datetime.now()))
        except Exception as e:
            print(f"[DB WARNING] Failed to insert training_session: {e}")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'évaluation vocale : {str(e)}")

@router.post("/evaluate-pitch")
async def evaluate_written_pitch(request: EvaluatePitchRequest, current_user: dict = Depends(require_active_subscription)):
    """Évalue le pitch écrit par le candidat après modification manuelle."""
    prompt = f"""
    Tu es un coach en communication pour cadres dirigeants.
    Évalue ce pitch de présentation de 3 minutes pour le poste de "{request.target_job}".
    
    PITCH DU CANDIDAT :
    Accroche : "{request.accroche}"
    Preuve : "{request.preuve}"
    Valeur : "{request.valeur}"
    Projection : "{request.projection}"
    
    L'analyse doit être sévère et constructive. Le score global est un entier sur 10.
    
    OUTPUT STRICT JSON:
    {{
        "analysis": {{
            "global_score": 7,
            "structure": "Forte | Moyenne | Faible",
            "clarity": "Élevée | Moyenne | Basse",
            "conviction": "Forte | Moyenne | Faible",
            "critique": "Une phrase courte de critique constructive sur l'impact."
        }}
    }}
    LANGUAGE: {request.target_language}
    """
    try:
        return await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are an expert pitch coach. Output STRICT JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'évaluation du pitch : {str(e)}")

@router.post("/training/generate-question")
async def generate_training_question(request: CustomQuestionRequest, current_user: dict = Depends(require_active_subscription)):
    """Génère une question ciblée d'entraînement basée sur un thème."""
    
    cache_key = _generate_cache_key(current_user["id"], "training_question", request.model_dump() if hasattr(request, "model_dump") else request.dict())
    cached = await get_cached_content(cache_key)
    if cached:
        return cached

    prompt_template = load_prompt(get_prompt_path("custom_question_generator.md"))
    
    final_prompt = prompt_template.replace("{{THEME}}", request.theme) \
                                  .replace("{{TYPE}}", request.question_type) \
                                  .replace("{{COUNT}}", str(request.count)) \
                                  .replace("{{TARGET_JOB}}", request.target_job) \
                                  .replace("{{TARGET_COMPANY}}", request.target_company)
                                  
    try:
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="Tu es un Coach de Carrière expert.")
        await set_cached_content(cache_key, current_user["id"], "training_question", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de génération : {str(e)}")

@router.post("/training/evaluate")
async def evaluate_training_answer(request: TrainingEvaluateRequest, current_user: dict = Depends(require_active_subscription)):
    """Évalue la réponse à l'entraînement, renvoie le feedback et le sauvegarde en DB."""
    prompt_template = load_prompt(get_prompt_path("evaluate_interview_answer.md"))
    
    final_prompt = f"""
    {prompt_template}
    
    QUESTION POSÉE : "{request.question_text}"
    CATÉGORIE / ATTENTE : "{request.theme} - {request.question_type}"
    RÉPONSE DU CANDIDAT :
    "{request.user_answer}"
    """
    
    try:
        feedback = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an Expert Interview Coach. Output STRICT JSON.")
        
        # --- [FIX EXPERT] SANITISATION DES TABLEAUX ---
        if not isinstance(feedback.get("strengths"), list):
            s = feedback.get("strengths")
            feedback["strengths"] = [s] if s and isinstance(s, str) else []
        if not isinstance(feedback.get("weaknesses"), list):
            w = feedback.get("weaknesses")
            feedback["weaknesses"] = [w] if w and isinstance(w, str) else []
            
        # Sauvegarde de la session en base de données pour calculer les moyennes plus tard
        session_id = str(uuid.uuid4())
        try:
            async with db.get_connection() as conn:
                await db.execute(conn, """
                    INSERT INTO training_sessions (id, user_id, theme, question_type, question_text, user_answer, score, strengths, weaknesses, improved_answer, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (session_id, current_user["id"], request.theme, request.question_type, request.question_text, request.user_answer, feedback.get("score", 0), json.dumps(feedback.get("strengths", [])), json.dumps(feedback.get("weaknesses", [])), feedback.get("improved_answer", ""), datetime.now()))
        except Exception as e:
            print(f"[DB WARNING] Failed to insert training_session: {e}")
            
        return {"feedback": feedback}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'évaluation : {str(e)}")

@router.post("/generate-extra-scenarios")
async def generate_extra_scenarios(data: dict = Body(...), current_user: dict = Depends(require_active_subscription)):
    """Génère de nouvelles mises en situation (scénarios de crise) à la volée pour le candidat."""
    target_job = data.get("target_job") or data.get("target_role_primary") or "Candidat"
    target_lang = normalize_language(data.get("target_language", "fr"))
    
    cache_key = _generate_cache_key(current_user["id"], "extra_scenarios", data)
    from .utils import _CACHE_LOCKS
    import asyncio
    if cache_key not in _CACHE_LOCKS:
        _CACHE_LOCKS[cache_key] = asyncio.Lock()
        
    async with _CACHE_LOCKS[cache_key]:
        cached = await get_cached_content(cache_key)
        if cached:
            return cached

        prompt_template = load_prompt("mise_en_situation.md")
        
        final_prompt = f"""
        {prompt_template or "Génère 3 catégories de mises en situation avec des scénarios de crise."}
        
        POSTE VISÉ : {target_job}
        PROFIL DU CANDIDAT : {json.dumps(_sanitize_data_for_ai(data, strict=True), default=str)}
        
        OUTPUT STRICT JSON.
        LANGUAGE: {target_lang}
        """
        
        try:
            result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an Expert HR Assessor. Output STRICT JSON.")
            await set_cached_content(cache_key, current_user["id"], "extra_scenarios", result)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur de génération des scénarios : {str(e)}")

@router.get("/training/stats")
async def get_training_stats(current_user: dict = Depends(require_active_subscription)):
    """Récupère les statistiques de l'utilisateur pour l'onglet d'entraînement."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT score, theme FROM training_sessions WHERE user_id = ? ORDER BY created_at ASC", (current_user["id"],))
            rows = await cursor.fetchall()
            
        if not rows:
            return {"global_score": 0, "total_sessions": 0, "theme_scores": {}}
            
        total_weighted_score, total_weight = 0, 0
        theme_data = {}
        
        for i, row in enumerate(rows):
            score = row[0] if isinstance(row, tuple) else row["score"]
            theme = row[1] if isinstance(row, tuple) else row["theme"]
            weight = 1 + (i * 0.05) # Les réponses plus récentes pèsent plus lourd (+5% par session)
            
            total_weighted_score += score * weight
            total_weight += weight
            
            if theme not in theme_data:
                theme_data[theme] = {"score": 0, "weight": 0}
            theme_data[theme]["score"] += score * weight
            theme_data[theme]["weight"] += weight
            
        global_score = min(100, max(0, round(total_weighted_score / total_weight))) if total_weight > 0 else 0
        
        theme_scores = {}
        for theme, data in theme_data.items():
            theme_scores[theme] = min(100, max(0, round(data["score"] / data["weight"]))) if data["weight"] > 0 else 0
            
        return {"global_score": global_score, "total_sessions": len(rows), "theme_scores": theme_scores}
    except Exception as e:
        print(f"[DB WARNING] Failed to fetch training stats: {e}")
        return {"global_score": 0, "total_sessions": 0, "theme_scores": {}}

@router.get("/training/history")
async def get_training_history(current_user: dict = Depends(require_active_subscription)):
    """Récupère l'historique complet des sessions d'entraînement de l'utilisateur."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, """
                SELECT id, theme, question_type, question_text, user_answer, 
                       score, strengths, weaknesses, improved_answer, created_at
                FROM training_sessions 
                WHERE user_id = ? 
                ORDER BY created_at ASC
            """, (current_user["id"],))
            rows = await cursor.fetchall()
            
        history = []
        for row in rows:
            r = dict(row) if not isinstance(row, tuple) else {
                "id": row[0], "theme": row[1], "question_type": row[2], 
                "question_text": row[3], "user_answer": row[4], "score": row[5], 
                "strengths": row[6], "weaknesses": row[7], "improved_answer": row[8],
                "created_at": row[9]
            }
            
            try:
                strengths = json.loads(r["strengths"]) if isinstance(r["strengths"], str) else r["strengths"]
                if not isinstance(strengths, list): strengths = [strengths] if strengths else []
            except:
                strengths = []
                
            try:
                weaknesses = json.loads(r["weaknesses"]) if isinstance(r["weaknesses"], str) else r["weaknesses"]
                if not isinstance(weaknesses, list): weaknesses = [weaknesses] if weaknesses else []
            except:
                weaknesses = []

            history.append({
                "id": r["id"],
                "category": r["theme"],
                "type": r["question_type"],
                "question": r["question_text"],
                "userAnswer": r["user_answer"],
                "feedback": {
                    "score": r["score"],
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "improved_answer": r["improved_answer"]
                }
            })
            
        return {"history": history}
    except Exception as e:
        print(f"[DB WARNING] Failed to fetch training history: {e}")
        return {"history": []}

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
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.post("/generate-clarifications")
async def generate_clarifications(data: FullCVData, current_user: dict = Depends(require_active_subscription)):
    cv_dict = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    cache_key = _generate_cache_key(current_user["id"], "clarifications", cv_dict)
    cached = await get_cached_content(cache_key)
    if cached:
        return cached
        
    target_lang = normalize_language(data.target_language)
    prompt = f"Analyze this candidate profile. Identify ambiguous/missing points CRITICAL for a CV. Generate up to 20 clarification questions (0-3 if well detailed).\nCRITICAL: If the user includes typos, self-sabotaging flaws (e.g., 'lazy', 'liar'), or unprofessional terms, your FIRST question MUST act as a coach: point out the error gently and propose a positive professional alternative to reframe it.\n\nDATA: {json.dumps(_sanitize_data_for_ai(data.model_dump(), strict=True), default=str)}\n\nOUTPUT STRICT JSON: {{ \"questions\": [\"Q1?\", \"Q2?\"] }}\nLANGUAGE: {target_lang}"
    res = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a Career Coach.")
    if "error" not in res:
        await set_cached_content(cache_key, current_user["id"], "clarifications", res)
    return res

@router.post("/parse-linkedin")
async def parse_linkedin_pdf(file: UploadFile = File(...), current_user: dict = Depends(require_active_subscription)):
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
            # [FIX EXPERT] Tri automatique des expériences par date de fin (décroissant).
            # Garantit que l'ajout d'une nouvelle expérience (ou l'import LinkedIn)
            # place toujours les postes dans le bon ordre chronologique sur le CV final.
            if 'experiences' in data and isinstance(data['experiences'], list):
                data['experiences'].sort(
                    key=lambda exp: _get_sortable_date_tuple(exp.get('end_date') or exp.get('endDate') or exp.get('date') or ''),
                    reverse=True
                )
            
            # [COHÉRENCE] Tri automatique des formations.
            if 'educations' in data and isinstance(data['educations'], list):
                data['educations'].sort(
                    key=lambda edu: _get_sortable_date_tuple(edu.get('end_date') or edu.get('endDate') or edu.get('date') or ''),
                    reverse=True
                )

            target_lang = normalize_language(data.get('target_language') or data.get('language', 'fr'))
            
            if not request.skip_ai:
                ai_result = await optimize_cv_data(data, target_lang=target_lang, quality='smart')
                optimized_data = ai_result.get("optimized_data", data)
                analysis_data = ai_result.get("analysis")
            else:
                optimized_data = data
                analysis_data = None

            # [FIX CRITIQUE] Aplatissement des informations personnelles pour le LaTeX
            # On force l'écrasement avec les VRAIES données utilisateur (data)
            # et on SUPPRIME les champs vides pour tuer les hallucinations type "URL linkedin propre"
            real_personal_info = data.get("personal_info", {})
            if isinstance(real_personal_info, dict):
                for k in ['first_name', 'last_name', 'email', 'phone', 'linkedin', 'city', 'country']:
                    val = real_personal_info.get(k)
                    if val and isinstance(val, str) and str(val).strip():
                        val_lower = val.lower()
                        # Filtre strict anti-hallucinations fréquentes de l'IA
                        invalid_placeholders = ["ville", "ville, france", "city", "numéro formaté", "numéro de téléphone", "votre ville", "url linkedin", "url propre"]
                        if any(p in val_lower for p in ["propre", "formaté"]) or val_lower in invalid_placeholders or ("url" in val_lower and k == "linkedin"):
                            optimized_data.pop(k, None)
                        else:
                            optimized_data[k] = val.strip()
                    else:
                        optimized_data.pop(k, None)

            # Normalisation des langues
            langs = optimized_data.get('languages')
            langs_str = ""
            if langs and isinstance(langs, list):
                formatted_langs = [f"{lang_item.get('language', lang_item.get('name'))} ({lang_item.get('level')})" if isinstance(lang_item, dict) and lang_item.get('level') else lang_item.get('language', lang_item.get('name')) if isinstance(lang_item, dict) else lang_item for lang_item in langs]
                if formatted_langs:
                    langs_str = ", ".join([item for item in formatted_langs if item])
                    
            # [FIX CRITIQUE] Formatage des skills sécurisé et sorti de la condition des langues
            current_skills_data = optimized_data.get('skills', [])
            if isinstance(current_skills_data, list):
                skills_text = ", ".join([str(s) for s in current_skills_data])
            else:
                skills_text = str(current_skills_data)
            
            optimized_data['skills'] = {"technical": skills_text, "languages": langs_str}
            
            # [FIX EXPERT - POINT 10] Injection des traductions dynamiques pour le template LaTeX (Titres des sections)
            # Détection robuste de la langue (gère 'fr', 'french', 'fr-FR', etc.)
            is_french = str(target_lang).lower() in ['fr', 'french', 'fr-fr']
            optimized_data['translations'] = {
                'profile': 'Profil' if is_french else 'Profile',
                'experience': 'Expérience Professionnelle' if is_french else 'Professional Experience',
                'education': 'Formation' if is_french else 'Education',
                'skills': 'Compétences' if is_french else 'Skills',
                'technical': 'Techniques' if is_french else 'Technical',
                'languages': 'Langues' if is_french else 'Languages'
            }

            if request.preview and request.renderer == "json":
                return JSONResponse(content=optimized_data)

            if "Word" in action or ".doc" in action:
                docx_path = generate_cv_docx(optimized_data)
                filename = _generate_smart_filename(data, "CV", "docx")
                if not request.preview:
                    doc_id = str(uuid.uuid4())
                    application_id = data.get("application_id")
                    async with db.get_connection() as conn:
                        await db.execute(conn,
                            "INSERT INTO documents (id, user_id, filename, path, type, created_at, media_type, application_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                            (doc_id, current_user["id"], filename, docx_path, "CV_WORD", datetime.now(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', application_id))
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
                    application_id = data.get("application_id")
                    async with db.get_connection() as conn:
                        await db.execute(conn,
                            "INSERT INTO documents (id, user_id, filename, path, type, created_at, media_type, application_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                            (doc_id, current_user["id"], filename, generated_path, "CV_ATS", datetime.now(), 'application/pdf', application_id))
                    return FileResponse(path=generated_path, filename=filename, media_type='application/pdf', headers=headers)
                else:
                    # Mode prévisualisation : suppression propre post-réponse
                    return FileResponse(path=generated_path, filename=filename, media_type='application/pdf', headers=headers, background=BackgroundTask(_remove_file_safe, generated_path))

        elif "Questionnaire" in action or "Print Questionnaire" in action:
            # [OPTIMISATION] Parallélisation des appels IA pour réduire de moitié le temps d'attente
            async def get_qs():
                q = data.get('questions') or data.get('questions_list')
                
                cache_key = _generate_cache_key(current_user["id"], "interview_questions", data)
                
                from .utils import _CACHE_LOCKS
                import asyncio
                if cache_key not in _CACHE_LOCKS:
                    _CACHE_LOCKS[cache_key] = asyncio.Lock()
                    
                async with _CACHE_LOCKS[cache_key]:
                    cached = await get_cached_content(cache_key)
                    
                    if q and isinstance(q, list) and len(q) > 0:
                        if cached:
                            def extract_deep_questions(obj):
                                found = []
                                if isinstance(obj, dict):
                                    if any(k in obj for k in ["question", "scenario", "situation", "text", "contexte", "description", "defi"]):
                                        found.append(obj)
                                    for v in obj.values():
                                        found.extend(extract_deep_questions(v))
                                elif isinstance(obj, list):
                                    for item in obj:
                                        found.extend(extract_deep_questions(item))
                                return found
                                
                            cached_list = extract_deep_questions(cached)
                            cached_answers = {
                                re.sub(r'\W+', '', str(cq.get("question") or cq.get("scenario") or cq.get("situation") or cq.get("text") or cq.get("contexte") or cq.get("description") or cq.get("defi") or "")).lower(): cq 
                                for cq in cached_list if isinstance(cq, dict) and "user_answer" in cq
                            }
                            for q_item in q:
                                if isinstance(q_item, dict):
                                    q_text = q_item.get("question") or q_item.get("scenario") or q_item.get("situation") or q_item.get("text") or q_item.get("contexte") or q_item.get("description") or q_item.get("defi") or ""
                                    q_norm = re.sub(r'\W+', '', str(q_text)).lower()
                                    if q_norm in cached_answers:
                                        cq = cached_answers[q_norm]
                                        q_item["user_answer"] = cq.get("user_answer")
                                        if "evaluation" in cq:
                                            q_item["evaluation"] = cq.get("evaluation")
                        return q
                        
                    if cached: return cached
                    
                    res = await generate_interview_questions(data, quality='smart')
                    if res: await set_cached_content(cache_key, current_user["id"], "interview_questions", res)
                    return res
                
            async def get_smart_qs():
                sq = data.get('questions_to_ask')
                if sq: return sq
                
                cache_key = _generate_cache_key(current_user["id"], "smart_questions", data)
                cached = await get_cached_content(cache_key)
                if cached: return cached
                
                res = await generate_smart_questions(data, quality='smart')
                if res: await set_cached_content(cache_key, current_user["id"], "smart_questions", res)
                return res

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
            prompt = f"Estimate a realistic salary range (low, mid, high) for this profile:\n{json.dumps(data, indent=2)}\n\n⚠️ INSTRUCTION CRITIQUE : Ne renvoie JAMAIS les valeurs 0 de l'exemple JSON. Tu DOIS estimer de VRAIS salaires de marché selon l'expérience du candidat.\nRespond in STRICT JSON: {{\"salary_range\": {{\"low\": 0, \"mid\": 0, \"high\": 0}}, \"currency\": \"EUR\", \"confidence\": \"Haute | Moyenne | Faible\", \"commentary\": \"...\"}}"
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
# [FIX SECURITE] On bloque le rendu PDF si l'abonnement est expiré pour éviter les abus CPU
async def render_final_cv(cv_final_data: CVFinal, preview: bool = Query(False), current_user: dict = Depends(require_active_subscription)):
    try:
        # Transformation simplifiée pour LaTeX (logique extraite de main.py)
        latex_data = cv_final_data.dict(include={'first_name', 'last_name', 'email', 'phone', 'linkedin', 'city', 'country', 'current_role'})
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
                        
                # [FIX EXPERT] Tri chronologique final JUSTE AVANT la génération du PDF
                if section.type in ["experience", "education"]:
                    items.sort(key=lambda x: _get_sortable_date_tuple(x.get('end_date') or x.get('endDate') or x.get('date') or ''), reverse=True)
                    
                latex_data[key] = items
            elif section.type == "skills":
                if not isinstance(latex_data.get("skills"), dict):
                    latex_data["skills"] = {}
                if len(items) == 1 and any(k in items[0] for k in ["technical", "languages"]):
                    latex_data["skills"].update(items[0])
                else:
                    latex_data["skills"]["text"] = ", ".join([str(list(i.values())[0]) for i in items])
        
        # [FIX EXPERT] Sécurisation contre la valeur 'None' si le nom de famille n'est pas fourni (évite le crash TypeError)
        safe_last = "".join(c for c in (cv_final_data.last_name or "") if c.isalnum()) or "Candidat"
        filename = f"CV_{safe_last.capitalize()}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        generated_path = generate_pdf_from_latex(latex_data, "cv_ats.tex")
        
        if not preview:
            doc_id = str(uuid.uuid4())
            # Compatibilité si CVFinal intègre application_id
            application_id = getattr(cv_final_data, "application_id", None)
            async with db.get_connection() as conn:
                await db.execute(conn,
                    "INSERT INTO documents (id, user_id, filename, path, type, created_at, media_type, application_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (doc_id, current_user["id"], filename, generated_path, "CV_ATS", datetime.now(), 'application/pdf', application_id))
            return FileResponse(path=generated_path, filename=filename, media_type='application/pdf')
        else:
            return FileResponse(path=generated_path, filename=filename, media_type='application/pdf', background=BackgroundTask(_remove_file_safe, generated_path))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render error: {e}")

@router.post("/start-analysis")
async def start_analysis(background_tasks: BackgroundTasks, data: dict = Body(...), current_user: dict = Depends(require_active_subscription)):
    tasks_map = {}
    now = datetime.now()
    cv_dict = data.copy()
        
    # [FIX EXPERT] Tri chronologique absolu en entrée de pipeline. Force la réorganisation des 
    # expériences et formations par date même si le frontend envoie un tableau désordonné.
    if 'experiences' in cv_dict and isinstance(cv_dict['experiences'], list):
        cv_dict['experiences'].sort(key=lambda exp: _get_sortable_date_tuple(exp.get('end_date') or exp.get('endDate') or exp.get('date') or ''), reverse=True)
    if 'educations' in cv_dict and isinstance(cv_dict['educations'], list):
        cv_dict['educations'].sort(key=lambda edu: _get_sortable_date_tuple(edu.get('end_date') or edu.get('endDate') or edu.get('date') or ''), reverse=True)
    
    if cv_dict.get('is_partial_start'):
        if cv_dict.get('target_company') or cv_dict.get('target_industry'):
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
        if cv_dict.get('job_description') and str(cv_dict.get('job_description')).strip():
            tasks_map["job_decoder"] = str(uuid.uuid4())
        tasks_map["hidden_market"] = str(uuid.uuid4())
        tasks_map["career_gps"] = str(uuid.uuid4())
        tasks_map["reality_check"] = str(uuid.uuid4())
        tasks_map["profile_validation"] = str(uuid.uuid4())
        tasks_map["flaw_coaching"] = str(uuid.uuid4())
        tasks_map["action_plan"] = str(uuid.uuid4())
        tasks_map["custom_scenarios"] = str(uuid.uuid4())
        
        if cv_dict.get('target_company') or cv_dict.get('target_industry'):
            tasks_map["market_research"] = str(uuid.uuid4())

    application_id = cv_dict.get("application_id")
    if not application_id:
        application_id = str(uuid.uuid4())
        cv_dict["application_id"] = application_id

    # [INJECTION] On transmet l'ID Utilisateur aux tâches de fond pour permettre le Cache IA
    cv_dict["user_id"] = current_user["id"]

    session_hash = _generate_cache_key(current_user["id"], "session", cv_dict)

    # [FIX EXPERT] On ignore le cache si le frontend signale que la tâche est encore en cours ("pending")
    rd = cv_dict.get('research_data')
    has_research_data = isinstance(rd, dict) and len(rd) > 0 and rd.get("status") != "pending"

    try:
        async with db.get_connection() as conn:
            try:
                try:
                    cursor = await db.execute(conn, "SELECT column_name FROM information_schema.columns WHERE table_name='job_applications'")
                    columns = [row[0] if isinstance(row, tuple) else row.get("column_name") for row in await cursor.fetchall()]
                except Exception:
                    cursor = await db.execute(conn, "PRAGMA table_info(job_applications)")
                    columns = [row[1] if isinstance(row, tuple) else row.get("name") for row in await cursor.fetchall()]
                
                if columns:
                    if 'session_hash' not in columns:
                        await db.execute(conn, "ALTER TABLE job_applications ADD COLUMN session_hash TEXT")
                    if 'tasks_map' not in columns:
                        try:
                            await db.execute(conn, "ALTER TABLE job_applications ADD COLUMN tasks_map JSONB")
                        except Exception:
                            await db.execute(conn, "ALTER TABLE job_applications ADD COLUMN tasks_map TEXT")
            except Exception as e:
                print(f"[DB WARNING] Alter table skipped: {e}")

            if not cv_dict.get('is_partial_start'):
                try:
                    cursor = await db.execute(conn, "SELECT id, tasks_map FROM job_applications WHERE user_id = ? AND session_hash = ? ORDER BY created_at DESC LIMIT 1", (current_user["id"], session_hash))
                    existing_app = await cursor.fetchone()
                    if existing_app:
                        app_id = existing_app[0] if isinstance(existing_app, tuple) else existing_app["id"]
                        t_map_raw = existing_app[1] if isinstance(existing_app, tuple) else existing_app["tasks_map"]
                        if t_map_raw:
                            t_map = json.loads(t_map_raw) if isinstance(t_map_raw, str) else t_map_raw
                        # [VERIFICATION CRITIQUE] On s'assure que c'est une session COMPLÈTE et non une session issue d'un "is_partial_start"
                        if "cv_analysis" in t_map and "recruiter_view" in t_map:
                            print(f"[START_ANALYSIS] Session restored for hash {session_hash}", flush=True)
                            return {
                                "message": "Session restored",
                                "application_id": app_id,
                                "tasks": t_map,
                                "task_id": t_map.get("cv_analysis") or t_map.get("market_research"),
                                "salary_task_id": t_map.get("salary_estimation")
                            }
                except Exception as e:
                    print(f"[DB WARNING] Failed to restore session: {e}")

            # 1. Création de la session de candidature
            try:
                tasks_map_json = json.dumps(tasks_map)
                await db.execute(conn,
                    """INSERT INTO job_applications (id, user_id, target_company, target_job, created_at, session_hash, tasks_map) 
                   VALUES (?, ?, ?, ?, ?, ?, ?) 
                   ON CONFLICT (id) DO UPDATE SET session_hash = EXCLUDED.session_hash, tasks_map = EXCLUDED.tasks_map""",
                    (application_id, current_user["id"], cv_dict.get('target_company') or "Général", cv_dict.get('target_job') or "Poste non spécifié", now, session_hash, tasks_map_json)
                )
            except Exception as e:
                print(f"[DB WARNING] Insert fallback used: {e}")
                await db.execute(conn,
                    """INSERT INTO job_applications (id, user_id, target_company, target_job, created_at) 
                       VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING""",
                    (application_id, current_user["id"], cv_dict.get('target_company') or "Général", cv_dict.get('target_job') or "Poste non spécifié", now)
                )
            
            # 2. Insertion des tâches liées
            for tid in tasks_map.values():
                await db.execute(conn, 
                    "INSERT INTO tasks (id, status, result, created_at, application_id) VALUES (?, ?, ?, ?, ?)", 
                    (tid, "PENDING", None, now, application_id))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[START_ANALYSIS] DB INSERT ERROR: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Database insert error")
    
    if "market_research" in tasks_map:
        # [FIX EXPERT] On court-circuite le cache si l'utilisateur relance explicitement l'analyse (is_partial_start)
        # Cela force l'IA à refaire une recherche web fraîche.
        if has_research_data and not cv_dict.get('is_partial_start'):
            # [FIX EXPERT] On restaure le cache ET on prévient le frontend via WebSocket
            async def restore_research_cache(tid, cached_data):
                await asyncio.to_thread(update_task_status_sync, tid, "SUCCESS", cached_data)
                await manager.broadcast(tid, "Analyse restaurée depuis le cache.", status="COMPLETED", data=cached_data)
            background_tasks.add_task(restore_research_cache, tasks_map["market_research"], rd)
        elif cv_dict.get('target_company') or cv_dict.get('target_industry'):
            research_payload = {
                "target_company": cv_dict.get('target_company'),
                "target_industry": cv_dict.get('target_industry'),
                "target_country": cv_dict.get('target_country'),
                "target_job": cv_dict.get('target_job'),
                "candidate_data": cv_dict,
                "provider": cv_dict.get('provider'),
                "target_language": cv_dict.get('target_language')
            }
            background_tasks.add_task(process_research_in_background, tasks_map["market_research"], research_payload)
        else:
            background_tasks.add_task(update_task_status_sync, tasks_map["market_research"], "COMPLETED", {"info": "Skipped, no company provided"})

    if "salary_estimation" in tasks_map:
        background_tasks.add_task(process_salary_in_background, tasks_map["salary_estimation"], cv_dict)

    # Lancement orchestré par vagues pour éviter les Timeouts d'API (Thundering Herd)
    if not cv_dict.get('is_partial_start'):
        background_tasks.add_task(orchestrate_dashboard_tasks, tasks_map, cv_dict)

    return {
        "message": "Pipeline started",
        "application_id": application_id,
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
            parsed = json.loads(result_raw)
            # [FIX] Gère le cas d'une double stringification de l'IA ("{\"clé\":...}")
            if isinstance(parsed, str):
                try: parsed = json.loads(parsed)
                except Exception: pass
            # [FIX] Nettoyage markdown profond si des sous-clés sont polluées
            if isinstance(parsed, dict):
                for k, v in parsed.items():
                    if isinstance(v, str) and (v.strip().startswith("{") or v.strip().startswith("```")):
                        try: parsed[k] = clean_ai_json_response(v)
                        except Exception: pass
            response["result"] = parsed
        except Exception:
            response["result"] = result_raw
            
    return response

@router.post("/dashboard/summary")
async def get_dashboard_summary(data: FullCVData, current_user: dict = Depends(require_active_subscription)):
    # [FIX] Le bloc try...except doit englober toute la fonction pour intercepter les erreurs IA
    try:
        try:
            cv_dict = data.model_dump()
        except AttributeError:
            cv_dict = data.dict()
            
        # [FIX EXPERT] Cache pour éviter de relancer les requêtes IA "Dashboard" à chaque F5
        cache_key = _generate_cache_key(current_user["id"], "dashboard_summary", cv_dict)
        cached = await get_cached_content(cache_key)
        
        # Ne recharge le cache que s'il est complet (c.-à-d. Gap Analysis a eu le temps de finir)
        if cached and cached.get("matchScore", 0) > 0:
            return cached

        # [FIX EXPERT] On s'assure que le résumé du dashboard travaille également sur des données triées
        if 'experiences' in cv_dict and isinstance(cv_dict['experiences'], list):
            cv_dict['experiences'].sort(key=lambda exp: _get_sortable_date_tuple(exp.get('end_date', '')), reverse=True)
        if 'educations' in cv_dict and isinstance(cv_dict['educations'], list):
            cv_dict['educations'].sort(key=lambda edu: _get_sortable_date_tuple(edu.get('end_date', '')), reverse=True)
            
        target_lang = normalize_language(cv_dict.get('target_language', 'French'))
        cv_lean_dict = _sanitize_data_for_ai(cv_dict, strict=True)
        
        cached_gap = cv_dict.get('gap_analysis')
        has_cached_gap = bool(cached_gap and isinstance(cached_gap, dict) and cached_gap.get('match_score'))
        
        # [FIX EXPERT] On ne lance PLUS le Gap Analysis synchrone ici (qui prenait ~15s).
        # Il est déjà géré par la tâche de fond (background_tasks). 
        # Le Dashboard se mettra à jour automatiquement dès qu'il sera prêt via le polling.
        gap_analysis_task = asyncio.sleep(0)

        key_strengths_prompt = f"""
        Analyse ce profil et résume-le en 3 forces clés percutantes.
        Exemple: "Leadership opérationnel", "Gestion du risque", "Prise de décision en environnement critique".
        Ne retourne QUE le JSON.
        
        PROFIL: {json.dumps(cv_lean_dict, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        ⚠️ INSTRUCTION CRITIQUE : Ne recopie JAMAIS "Force 1", "Force 2". Tu DOIS générer les vraies forces du candidat.
        FORMAT JSON STRICT: {{"key_strengths": ["Force 1", "Force 2", "Force 3"]}}
        """
        key_strengths_task = ai_service.generate(key_strengths_prompt, provider="gemini", system_instruction=f"Tu es un expert en branding personnel. Langue: {target_lang}.", bypass_queue=True)

        application_strategy_prompt = f"""
        Analyse ce profil et le poste visé. Propose une stratégie de candidature en 3 points prioritaires.
        Exemple: "Cibler les entreprises industrielles", "Valoriser l'expérience opérationnelle".
        ATTENTION: Si le profil contient des failles de FOND critiques (défauts professionnels suicidaires comme "fainéant", "menteur", agressivité), 
        le point n°1 de la stratégie DOIT ÊTRE un recadrage bienveillant mais ferme.
        ⚠️ RÈGLE D'OR : IGNORE TOTALEMENT les erreurs de forme (absence de majuscules, fautes de frappe, accents manquants, mots en majuscules). Le texte brut est un brouillon informel adressé au coach et sera formaté automatiquement plus tard. Ne fais JAMAIS de remarques sur la typographie.
        Ne retourne QUE le JSON.
        
        PROFIL: {json.dumps(cv_lean_dict, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        ⚠️ INSTRUCTION CRITIQUE : Ne recopie JAMAIS "Priorité 1", "Priorité 2". Tu DOIS générer de vraies stratégies actionnables.
        FORMAT JSON STRICT: {{"application_strategy": ["Priorité 1", "Priorité 2", "Priorité 3"]}}
        """
        application_strategy_task = ai_service.generate(application_strategy_prompt, provider="gemini", system_instruction=f"Tu es un coach de carrière stratégique. Langue: {target_lang}.", bypass_queue=True)

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
    except Exception as e:
        error_msg = str(e).lower()
        if "timeout" in error_msg:
            raise HTTPException(status_code=504, detail="Le réseau est trop lent ou bloque l'accès aux intelligences artificielles (Timeout). Vérifiez votre connexion internet.")
        raise HTTPException(status_code=500, detail=f"Erreur lors du diagnostic IA : {str(e)}")

@router.post("/feedback")
@router.post("/feedbacks")
async def submit_feedback(request: FeedbackPayload, current_user: dict = Depends(get_current_user)):
    """
    Enregistre les retours utilisateurs (pouces levés/baissés) sur les générations IA.
    """
    actual_comments = request.comments or ""
    user_id = current_user.get("id")
    now = datetime.now()

    # [FIX] Utilisation de l'unique requête correspondant au schéma définitif de production
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, 
                "INSERT INTO feedbacks (user_id, feature, is_positive, comments, job_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, request.feature, request.is_positive, actual_comments, request.job_type, now))
        return {"status": "success", "message": "Feedback enregistré"}
    except Exception as e:
        print(f"[FEEDBACK ERROR] Impossible d'enregistrer le feedback: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'enregistrement du feedback.")

@router.get("/feedbacks")
async def get_feedbacks(current_user: dict = Depends(get_current_user)):
    """
    Récupère tous les feedbacks pour l'interface Admin.
    """
    try:
        schema_type = "new"
        try:
            # Schéma Ultra-Complet (Si la DB est un mélange corrompu)
            async with db.get_connection() as conn:
                cursor = await db.execute(conn, """
                    SELECT f.id, f.feature, f.is_positive, f.comments, f.feedback, f.reason, f.created_at, u.email as user_email 
                    FROM feedbacks f 
                    LEFT JOIN users u ON f.user_id = u.id 
                    ORDER BY f.created_at DESC
                """)
                rows = await cursor.fetchall()
                schema_type = "full"
        except Exception:
            try:
                # Nouveau schéma préféré
                async with db.get_connection() as conn:
                    cursor = await db.execute(conn, """
                        SELECT f.id, f.feature, f.is_positive, f.comments, f.created_at, u.email as user_email 
                        FROM feedbacks f 
                        LEFT JOIN users u ON f.user_id = u.id 
                        ORDER BY f.created_at DESC
                    """)
                    rows = await cursor.fetchall()
            except Exception:
                try:
                    # Hybride
                    async with db.get_connection() as conn:
                        cursor = await db.execute(conn, """
                            SELECT f.id, f.feature, f.is_positive, f.reason as comments, f.created_at, u.email as user_email 
                            FROM feedbacks f 
                            LEFT JOIN users u ON f.user_id = u.id 
                            ORDER BY f.created_at DESC
                        """)
                        rows = await cursor.fetchall()
                except Exception:
                    # Ancien schéma de secours
                    async with db.get_connection() as conn:
                        cursor = await db.execute(conn, """
                            SELECT f.id, f.feature, f.feedback as is_positive, f.reason as comments, f.created_at, u.email as user_email 
                            FROM feedbacks f 
                            LEFT JOIN users u ON f.user_id = u.id 
                            ORDER BY f.created_at DESC
                        """)
                        rows = await cursor.fetchall()
            
        feedbacks_list = []
        for row in rows:
            if isinstance(row, tuple):
                row_id = row[0]
                feature = row[1]
                if schema_type == "full":
                    is_pos_val = row[2] if row[2] is not None else row[4]
                    comments_val = row[3] if row[3] is not None else row[5]
                    created_at = row[6]
                    user_email = row[7]
                else:
                    is_pos_val = row[2]
                    comments_val = row[3]
                    created_at = row[4]
                    user_email = row[5]
            else:
                row_dict = dict(row)
                row_id = row_dict.get("id")
                feature = row_dict.get("feature", "unknown")
                is_pos_val = row_dict.get("is_positive")
                if is_pos_val is None:
                    is_pos_val = row_dict.get("feedback")
                comments_val = row_dict.get("comments")
                if comments_val is None:
                    comments_val = row_dict.get("reason")
                created_at = row_dict.get("created_at")
                user_email = row_dict.get("user_email")
                
            if is_pos_val is None:
                is_pos = True
            elif isinstance(is_pos_val, str):
                is_pos = is_pos_val.lower() in ['true', 't', '1']
            else:
                is_pos = bool(is_pos_val)

            feedbacks_list.append({
                "id": row_id,
                "feature": feature,
                "is_positive": is_pos,
                "comments": comments_val,
                "created_at": created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at),
                "user_email": user_email
            })

        return {"feedbacks": feedbacks_list}
    except Exception as e:
        print(f"[GET FEEDBACKS ERROR] {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des feedbacks")

@router.delete("/cache")
async def purge_cache(content_type: Optional[str] = Query(None), current_user: dict = Depends(require_active_subscription)):
    """Permet au Frontend de forcer la suppression du cache (Ex: Bouton 'Générer d'autres questions')."""
    try:
        async with db.get_connection() as conn:
            if content_type:
                await db.execute(conn, "DELETE FROM generation_cache WHERE user_id = ? AND content_type = ?", (current_user["id"], content_type))
            else:
                await db.execute(conn, "DELETE FROM generation_cache WHERE user_id = ?", (current_user["id"],))
        return {"status": "success", "message": "Cache purgé avec succès pour forcer une nouvelle génération."}
    except Exception as e:
        print(f"[DB WARNING] Failed to purge cache (table might be missing): {e}")
        return {"status": "success", "message": "Cache purge skipped (table missing)."}
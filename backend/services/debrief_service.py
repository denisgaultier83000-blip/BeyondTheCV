from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import uuid, json
from datetime import datetime

from security import get_current_user
from database import db
from models import InterviewDebriefRequest
# [FIX] Import des utilitaires nécessaires
from .ai_generator import ai_service
from .utils import load_prompt, normalize_language

class AnalyzeDebriefRequest(BaseModel):
    cvData: dict
    nextInterviewContext: Optional[dict] = None

router = APIRouter(
    prefix="/api/debriefs",
    tags=["Interview Debriefs"],
    dependencies=[Depends(get_current_user)]
)

@router.post("", status_code=201)
async def create_debrief(debrief_data: InterviewDebriefRequest, current_user: dict = Depends(get_current_user)):
    """
    Enregistre un nouveau compte rendu d'entretien pour l'utilisateur connecté.
    """
    debrief_id = str(uuid.uuid4())
    user_id = current_user["id"]

    query = """
        INSERT INTO interview_debriefs (
            id, user_id, company_name, job_title, interview_date, interview_format,
            interlocutor_type, interlocutor_name, interlocutor_role, ambiance,
            positive_signals, red_flags, questions_asked, difficult_questions,
            learnings, preparation_points, interest_level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    values = (
        debrief_id, user_id, debrief_data.company_name, debrief_data.job_title,
        debrief_data.interview_date, debrief_data.interview_format,
        debrief_data.interlocutor_type, debrief_data.interlocutor_name, debrief_data.interlocutor_role,
        json.dumps(debrief_data.ambiance), json.dumps(debrief_data.positive_signals), json.dumps(debrief_data.red_flags),
        debrief_data.questions_asked, debrief_data.difficult_questions, debrief_data.learnings,
        debrief_data.preparation_points, debrief_data.interest_level, datetime.now()
    )

    async with db.get_connection() as conn:
        await db.execute(conn, query, values)

    return {"id": debrief_id, "status": "created"}

@router.put("/{debrief_id}", status_code=200)
async def update_debrief(debrief_id: str, debrief_data: InterviewDebriefRequest, current_user: dict = Depends(get_current_user)):
    """
    Met à jour un compte rendu d'entretien existant.
    """
    user_id = current_user["id"]

    query = """
        UPDATE interview_debriefs SET
            company_name = ?, job_title = ?, interview_date = ?, interview_format = ?,
            interlocutor_type = ?, interlocutor_name = ?, interlocutor_role = ?, ambiance = ?,
            positive_signals = ?, red_flags = ?, questions_asked = ?, difficult_questions = ?,
            learnings = ?, preparation_points = ?, interest_level = ?
        WHERE id = ? AND user_id = ?
    """
    values = (
        debrief_data.company_name, debrief_data.job_title, debrief_data.interview_date,
        debrief_data.interview_format, debrief_data.interlocutor_type, debrief_data.interlocutor_name,
        debrief_data.interlocutor_role, json.dumps(debrief_data.ambiance),
        json.dumps(debrief_data.positive_signals), json.dumps(debrief_data.red_flags),
        debrief_data.questions_asked, debrief_data.difficult_questions, debrief_data.learnings,
        debrief_data.preparation_points, debrief_data.interest_level, debrief_id, user_id
    )

    async with db.get_connection() as conn:
        await db.execute(conn, query, values)

    return {"id": debrief_id, "status": "updated"}

@router.get("", response_model=dict)
async def get_all_debriefs(current_user: dict = Depends(get_current_user)):
    """
    Récupère la liste de tous les débriefs pour l'utilisateur connecté.
    """
    user_id = current_user["id"]
    query = "SELECT id, company_name, job_title, interview_date, interlocutor_name, interlocutor_role FROM interview_debriefs WHERE user_id = ? ORDER BY interview_date DESC"
    
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, query, (user_id,))
        rows = await cursor.fetchall()

    debriefs = [dict(row) for row in rows]
    return {"debriefs": debriefs}

@router.get("/{debrief_id}", response_model=dict)
async def get_debrief_details(debrief_id: str, current_user: dict = Depends(get_current_user)):
    """
    Récupère les détails complets d'un débrief spécifique.
    """
    user_id = current_user["id"]
    query = "SELECT * FROM interview_debriefs WHERE id = ? AND user_id = ?"
    
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, query, (debrief_id, user_id))
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Debrief not found")

    debrief_details = dict(row)
    # Dé-sérialisation des champs JSON
    for field in ['ambiance', 'positive_signals', 'red_flags']:
        try:
            debrief_details[field] = eval(debrief_details[field])
        except:
            debrief_details[field] = []

    return debrief_details

@router.post("/{debrief_id}/analyze", response_model=dict)
async def analyze_debrief(debrief_id: str, request: AnalyzeDebriefRequest, current_user: dict = Depends(get_current_user)):
    """
    Lance l'analyse IA sur un débrief pour générer le plan de préparation.
    """
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT * FROM interview_debriefs WHERE id = ? AND user_id = ?", (debrief_id, current_user["id"]))
        debrief_row = await cursor.fetchone()

    if not debrief_row:
        raise HTTPException(status_code=404, detail="Debrief not found")

    debrief_dict = dict(debrief_row)
    target_lang = normalize_language(request.cvData.get('target_language', 'fr'))

    # [FIX] Le prompt attend `NEXT_INTERVIEW_CONTEXT_JSON`, mais il n'était pas fourni.
    # On s'assure de le récupérer du corps de la requête et de le formater en JSON.
    # S'il est absent, on passe un objet JSON vide pour éviter un crash du template.
    next_interview_context = request.nextInterviewContext or {}

    # Chargement du prompt
    prompt_template = load_prompt("next_step_prep.md")

    # Remplacement des placeholders
    final_prompt = prompt_template.replace("{{CANDIDATE_PROFILE_JSON}}", json.dumps(request.cvData, indent=2, ensure_ascii=False, default=str)) \
                                  .replace("{{DEBRIEF_JSON}}", json.dumps(debrief_dict, indent=2, ensure_ascii=False, default=str)) \
                                  .replace("{{TARGET_LANGUAGE}}", target_lang) \
                                  .replace("{{NEXT_INTERVIEW_CONTEXT_JSON}}", json.dumps(next_interview_context, indent=2, ensure_ascii=False, default=str))

    try:
        # Appel au service IA pour générer l'analyse
        analysis_result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
        return {"analysis": analysis_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
    
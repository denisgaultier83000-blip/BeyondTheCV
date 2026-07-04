from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import uuid, json
from datetime import datetime

from security import get_current_user
from database import db
from models import InterviewDebriefRequest
from .ai_generator import ai_service

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
async def analyze_debrief(debrief_id: str, current_user: dict = Depends(get_current_user)):
    """
    Lance l'analyse IA sur un débrief pour générer le plan de préparation.
    """
    debrief_details = await get_debrief_details(debrief_id, current_user)
    
    # On récupère le profil complet du candidat pour donner plus de contexte à l'IA
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (current_user["id"],))
        profile_row = await cursor.fetchone()
    
    candidate_profile = json.loads(profile_row[0]) if profile_row and profile_row[0] else {}

    analysis_result = await ai_service.generate_from_prompt(
        "next_step_prep.md",
        CANDIDATE_PROFILE_JSON=json.dumps(candidate_profile, indent=2),
        DEBRIEF_JSON=json.dumps(debrief_details, indent=2, default=str),
        NEXT_INTERVIEW_CONTEXT_JSON=json.dumps({"interlocutor": "Inconnu", "format": "Inconnu"}), # Placeholder pour le futur
        TARGET_LANGUAGE="fr"
    )

    return {"analysis": analysis_result}
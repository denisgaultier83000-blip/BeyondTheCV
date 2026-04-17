import json
from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Optional, Dict, Any

from models import (
    SimulationRequest,
    SituationSimulationRequest,
)
from security import get_current_user
from .ai_generator import ai_service
from .utils import load_prompt, clean_ai_json_response, normalize_language

router = APIRouter(
    prefix="/api/cv",
    tags=["Simulations & Coaching"]
)

def _sanitize_for_prompt(data: dict) -> dict:
    """Retire les données binaires et non-essentielles avant l'injection dans les prompts."""
    safe_data = data.copy() if isinstance(data, dict) else {}
    if 'photo' in safe_data:
        del safe_data['photo']
    if 'personal_info' in safe_data and isinstance(safe_data['personal_info'], dict):
        safe_data['personal_info'] = safe_data['personal_info'].copy()
        for pii_key in ['photo', 'email', 'phone', 'address', 'linkedin', 'birth_date']:
            if pii_key in safe_data['personal_info']:
                del safe_data['personal_info'][pii_key]
    return safe_data

@router.post("/coach-keyword")
async def coach_keyword(request: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Génère un conseil pour intégrer un mot-clé manquant."""
    keyword = request.get("keyword")
    cv_data = request.get("cv_data")
    if not keyword or not cv_data:
        raise HTTPException(status_code=400, detail="Keyword and cv_data are required.")

    target_lang = normalize_language(cv_data.get('target_language', 'fr'))
    prompt_template = load_prompt("keyword_coach.md")

    prompt = f"""
    {prompt_template}

    MOT-CLÉ MANQUANT : "{keyword}"
    CV DU CANDIDAT :
    {json.dumps(_sanitize_for_prompt(cv_data), default=str)}
    """
    result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
    return result

@router.post("/simulate-career")
async def simulate_career(request: SimulationRequest, current_user: dict = Depends(get_current_user)):
    """Simule l'impact d'une action sur la carrière."""
    target_lang = normalize_language(request.candidate_data.get('target_language', 'French'))
    prompt_template = load_prompt("career_simulator.md")
    
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

@router.post("/simulate-situation")
async def simulate_situation(request: SituationSimulationRequest, current_user: dict = Depends(get_current_user)):
    """Analyse la réponse d'un candidat face à une mise en situation professionnelle complexe."""
    prompt_template = load_prompt("mise_en_situation.md")
    
    final_prompt = f"""
    {prompt_template}
    
    SCENARIO CONTEXT:
    {json.dumps(request.scenario_context, indent=2, ensure_ascii=False, default=str)}

    CANDIDATE PROFILE:
    {json.dumps(_sanitize_for_prompt(request.candidate_profile), indent=2, ensure_ascii=False, default=str)}
    
    USER ANSWER:
    {request.user_answer}
    """
    
    try:
        result_str = await ai_service.generate(final_prompt, provider="openai", system_instruction="Tu es un Recruteur Expert et Coach de Carrière.")
        return {"feedback": clean_ai_json_response(result_str)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Situation simulation failed: {str(e)}")
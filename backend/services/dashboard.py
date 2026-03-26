import uuid
import json
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from database import db
from models import ResearchRequest, DisambiguationRequest, FeedbackRequest
# [FIX] Import relatif cohérent
from .ai_generator import ai_service
# [FIX] Utilisation de l'import relatif pour éviter les conflits de path
from .tasks import (
    process_research_in_background, 
    process_salary_in_background, 
)
from .utils import clean_ai_json_response, normalize_language
from .websocket_manager import manager

router = APIRouter(tags=["Dashboard & Research"])

@router.post("/api/research/start")
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    tasks_map = {"research": str(uuid.uuid4()), "salary": str(uuid.uuid4())}
    print(f"[API] 🟢 Manual Research Triggered. Tasks: {tasks_map}", flush=True)
    # [FIX] On passe un objet datetime natif pour respecter le typage strict d'asyncpg (TIMESTAMP)
    now = datetime.now()
    
    async with db.get_connection() as conn:
        for tid in tasks_map.values():
            await db.execute(conn, "INSERT INTO tasks (id, status, result, created_at) VALUES (?, ?, ?, ?)", (tid, "PENDING", None, now))
            # [FIX] Le commit manuel a été supprimé pour garantir la compatibilité asynchrone avec PostgreSQL (asyncpg/psycopg2)
    
    # [FIX] Compatibilité Pydantic V2 (model_dump) avec fallback V1 (dict)
    try:
        req_dict = request.model_dump()
    except AttributeError:
        req_dict = request.dict()
        
    background_tasks.add_task(process_research_in_background, tasks_map["research"], req_dict)
    background_tasks.add_task(process_salary_in_background, tasks_map["salary"], request.candidate_data)
    
    return {
        "message": "Research started",
        "tasks": tasks_map,
        "task_id": tasks_map["research"],
        "salary_task_id": tasks_map["salary"]
    }

@router.post("/api/analyze-completeness")
async def analyze_completeness(request: Request):
    # [MODIF] Exécution SYNCHRONE demandée pour la Page 7
    try:
        body = await request.json()
        data_to_analyze = body.get("data", body)
        target_lang = normalize_language(data_to_analyze.get("target_language", "French"))
        text_content = json.dumps(data_to_analyze, indent=2, default=str)
        
        prompt = f"""
        Analyze the candidate's profile completeness with a specific focus on generating a strong Elevator Pitch (Who I am, What I've done, What I bring, Why this role).
        
        Return JSON with 'score', 'quality', 'missing_info', 'suggestions', 'clarifications'.
        
        For 'clarifications', you MUST provide EXACTLY 3 objects: { 'question': '...', 'suggested_answer': '...' }.
        Even if the profile seems completely perfect, you MUST ask 3 strategic questions to extract quantifiable metrics (KPIs), specific challenges overcome, or unique value propositions that will make the oral pitch memorable.
        The suggested answer should be a plausible draft based on the context, written in the first person.
        
        CONTENT:
        {text_content[:15000]}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Data Quality Analyst. Language: {target_lang}. Output STRICT JSON.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    try:
        now = datetime.now()
        async with db.get_connection() as conn:
            await db.execute(conn, 
                "INSERT INTO feedbacks (user_id, feature, feedback, reason, job_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("anonymous", request.feature, request.feedback, request.reason, request.job_type, now))
            # [FIX] Suppression de `await conn.commit()`
        return {"status": "success"}
    except Exception as e:
        print(f"[FEEDBACK ERROR] {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")

@router.post("/api/research/disambiguate")
async def disambiguate_company_endpoint(request: DisambiguationRequest):
    try:
        result_str = await ai_service.generate(f"Disambiguate company: {request.company_name}. Respond in JSON with a 'candidates' list.", provider="gemini", system_instruction="You are a JSON API.")
        cleaned_result = result_str.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI disambiguation failed: {str(e)}")

@router.get("/api/tasks/status/{task_id}")
async def get_task_status(task_id: str):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT status FROM tasks WHERE id = ?", (task_id,))
        task = await cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # [FIX] Accès sécurisé : garantit le fonctionnement que l'ORM retourne un Dictionnaire ou un Tuple (psycopg2)
    status = task[0] if isinstance(task, tuple) else task.get("status", task["status"])
    
    return {"task_id": task_id, "status": status}

@router.get("/api/tasks/result/{task_id}")
async def get_task_result(task_id: str):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT status, result FROM tasks WHERE id = ?", (task_id,))
        task = await cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # [FIX] Accès sécurisé Dictionnaire / Tuple
    status = task[0] if isinstance(task, tuple) else task.get("status", task["status"])
    result_raw = task[1] if isinstance(task, tuple) else task.get("result", task["result"])
    
    if status == "FAILED":
        error_details = json.loads(result_raw) if result_raw else {"error": "Unknown error"}
        return JSONResponse(status_code=500, content=error_details)

    if status not in ["SUCCESS", "COMPLETED"]:
        return JSONResponse(status_code=202, content={"task_id": task_id, "status": status})
    
    result_data = json.loads(result_raw) if result_raw else {}
    return JSONResponse(content=result_data)

@router.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await manager.connect(websocket, task_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)

import uuid
import json
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse

from ..database import db
# [FIX] Use relative imports to find modules in the parent 'backend' directory
from ..security import get_current_user, require_admin_user
from ..models import ResearchRequest, DisambiguationRequest
# [FIX] Import relatif cohérent
from .ai_generator import ai_service
# [FIX] Utilisation de l'import relatif pour éviter les conflits de path
from .tasks import (
    process_research_in_background, 
    process_salary_in_background, 
)
from .utils import clean_ai_json_response, normalize_language, _generate_cache_key, get_cached_content, set_cached_content
from .websocket_manager import manager

router = APIRouter(tags=["Dashboard & Research"])

@router.post("/research/start")
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    tasks_map = {"research": str(uuid.uuid4()), "salary": str(uuid.uuid4())}
    print(f"[API] 🟢 Manual Research Triggered. Tasks: {tasks_map}", flush=True)
    # [FIX] On passe un objet datetime natif pour respecter le typage strict d'asyncpg (TIMESTAMP)
    now = datetime.now()
    
    # [FIX] Compatibilité Pydantic V2 (model_dump) avec fallback V1 (dict)
    try:
        req_dict = request.model_dump()
    except AttributeError:
        req_dict = request.dict()
        
    candidate_data = req_dict.get("candidate_data", {})
    application_id = candidate_data.get("application_id")
    if not application_id:
        application_id = str(uuid.uuid4())
        candidate_data["application_id"] = application_id
        
    # [FIX EXPERT] Ré-affectation pour garantir que le dictionnaire modifié n'est pas orphelin
    req_dict["candidate_data"] = candidate_data
    
    # [FIX EXPERT] Prévention du crash SQL (NOT NULL constraint) si la valeur est None
    target_company = req_dict.get("target_company") or candidate_data.get("target_company") or "Général"
    target_job = req_dict.get("target_job") or candidate_data.get("target_job") or "Poste non spécifié"

    # [FIX EXPERT] Injection de l'user_id pour le système de cache (évite "unknown_user" et le crash SQL cache_key=null)
    req_dict["user_id"] = current_user["id"]
    candidate_data["user_id"] = current_user["id"]

    async with db.get_connection() as conn:
        # 1. Création de la session de candidature
        await db.execute(conn,
            """INSERT INTO job_applications (id, user_id, target_company, target_job, created_at) 
               VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING""",
            (application_id, current_user["id"], target_company, target_job, now)
        )
        
        # 2. Insertion des tâches liées
        for tid in tasks_map.values():
            await db.execute(conn, "INSERT INTO tasks (id, status, result, created_at, application_id) VALUES (?, ?, ?, ?, ?)", (tid, "PENDING", None, now, application_id))
            
    # On passe le dictionnaire qui contient désormais l'application_id injecté
    background_tasks.add_task(process_research_in_background, tasks_map["research"], req_dict)
    background_tasks.add_task(process_salary_in_background, tasks_map["salary"], candidate_data)
    
    return {
        "message": "Research started",
        "application_id": application_id,
        "tasks": tasks_map,
        "task_id": tasks_map["research"],
        "salary_task_id": tasks_map["salary"]
    }

@router.post("/analyze-completeness")
async def analyze_completeness(request: Request, current_user: dict = Depends(get_current_user)):
    # [MODIF] Exécution SYNCHRONE demandée pour la Page 7
    try:
        body = await request.json()
        data_to_analyze = body.get("data", body)
        
        cache_key = _generate_cache_key(current_user["id"], "completeness_sync", data_to_analyze)
        cached = await get_cached_content(cache_key)
        if cached:
            return cached
            
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
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Data Quality Analyst. Language: {target_lang}. Output STRICT JSON.", bypass_queue=True)
        if "error" not in result:
            await set_cached_content(cache_key, current_user["id"], "completeness_sync", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/research/disambiguate")
async def disambiguate_company_endpoint(request: DisambiguationRequest):
    try:
        result_str = await ai_service.generate(f"Disambiguate company: {request.company_name}. Respond in JSON with a 'candidates' list.", provider="gemini", system_instruction="You are a JSON API.", bypass_queue=True)
        cleaned_result = result_str.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI disambiguation failed: {str(e)}")

@router.get("/tasks/status/{task_id}")
async def get_task_status(task_id: str):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT status FROM tasks WHERE id = ?", (task_id,))
        task = await cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # [FIX] Accès sécurisé : garantit le fonctionnement que l'ORM retourne un Dictionnaire ou un Tuple (psycopg2)
    status = task[0] if isinstance(task, tuple) else task.get("status", task["status"])
    
    return {"task_id": task_id, "status": status}

@router.get("/tasks/result/{task_id}")
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

@router.get("/applications")
async def get_applications(current_user: dict = Depends(get_current_user)):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, """
            SELECT 
                ja.id as app_id, ja.target_company, ja.target_job, ja.created_at as app_created_at,
                d.id as doc_id, d.filename, d.type as doc_type, d.created_at as doc_created_at
            FROM job_applications ja
            LEFT JOIN documents d ON d.application_id = ja.id
            WHERE ja.user_id = ?
            
            UNION ALL
            
            SELECT 
                'archives_id' as app_id, 'Archives' as target_company, 'Anciens Documents' as target_job, '2000-01-01 00:00:00' as app_created_at,
                id as doc_id, filename, type as doc_type, created_at as doc_created_at
            FROM documents 
            WHERE user_id = ? AND (application_id IS NULL OR application_id = '')
            ORDER BY app_created_at DESC
        """, (current_user["id"], current_user["id"]))
        rows = await cursor.fetchall()
        
    apps = {}
    for row in rows:
        r = dict(row) if not isinstance(row, tuple) else {
            "app_id": row[0], "target_company": row[1], "target_job": row[2], "app_created_at": row[3],
            "doc_id": row[4], "filename": row[5], "doc_type": row[6], "doc_created_at": row[7]
        }
        app_id = r["app_id"]
        if app_id not in apps:
            apps[app_id] = {
                "id": app_id,
                "target_company": r["target_company"],
                "target_job": r["target_job"],
                "created_at": r["app_created_at"].isoformat() if hasattr(r["app_created_at"], "isoformat") else str(r["app_created_at"]),
                "documents": []
            }
        if r.get("doc_id"):
            apps[app_id]["documents"].append({
                "id": r["doc_id"], "filename": r["filename"], "type": r["doc_type"],
                "created_at": r["doc_created_at"].isoformat() if hasattr(r["doc_created_at"], "isoformat") else str(r["doc_created_at"])
            })
    
    return list(apps.values())

@router.delete("/applications/{app_id}")
async def delete_application(app_id: str, current_user: dict = Depends(get_current_user)):
    """Supprime une candidature (dossier) et tous ses documents liés."""
    async with db.get_connection() as conn:
        # 1. Vérifier que l'application appartient bien à l'utilisateur
        cursor = await db.execute(conn, "SELECT id FROM job_applications WHERE id = ? AND user_id = ?", (app_id, current_user["id"]))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Application non trouvée ou accès refusé.")
            
        # 2. Supprimer les documents liés
        await db.execute(conn, "DELETE FROM documents WHERE application_id = ?", (app_id,))
        
        # 3. Supprimer les tâches liées
        await db.execute(conn, "DELETE FROM tasks WHERE application_id = ?", (app_id,))
        
        # 4. Supprimer les sessions d'entretien liées (avec fallback si la table n'est pas encore créée)
        try:
            await db.execute(conn, "DELETE FROM interview_sessions WHERE application_id = ?", (app_id,))
        except Exception:
            pass
            
        # 5. Supprimer l'application elle-même
        await db.execute(conn, "DELETE FROM job_applications WHERE id = ?", (app_id,))
        
    return {"status": "success", "message": "Candidature supprimée"}

@router.get("/applications/{app_id}/load")
async def load_application(app_id: str, current_user: dict = Depends(get_current_user)):
    """Recharge les données complètes d'une ancienne candidature depuis les archives des tâches."""
    async with db.get_connection() as conn:
        try:
            cursor = await db.execute(conn, "SELECT id, target_company, target_job, tasks_map FROM job_applications WHERE id = ? AND user_id = ?", (app_id, current_user["id"]))
        except Exception:
            cursor = await db.execute(conn, "SELECT id, target_company, target_job FROM job_applications WHERE id = ? AND user_id = ?", (app_id, current_user["id"]))
        app_row = await cursor.fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Candidature non trouvée ou accès refusé.")
            
        tasks_map = {}
        if len(app_row) > 3:
            t_map_raw = app_row[3] if isinstance(app_row, tuple) else app_row.get("tasks_map")
            if t_map_raw:
                tasks_map = json.loads(t_map_raw) if isinstance(t_map_raw, str) else t_map_raw
                
        cursor = await db.execute(conn, "SELECT id, status, result FROM tasks WHERE application_id = ? AND status IN ('SUCCESS', 'COMPLETED')", (app_id,))
        tasks = await cursor.fetchall()
        
    results = {}
    id_to_key = {v: k for k, v in tasks_map.items()} if tasks_map else {}

    for task in tasks:
        task_id = task[0] if isinstance(task, tuple) else task.get("id")
        res_str = task[2] if isinstance(task, tuple) else task.get("result")
        if not res_str: continue
        
        task_key = id_to_key.get(task_id)
        if not task_key: continue

        try:
            parsed = json.loads(res_str)
            # Mapping direct et fiable
            key_map = {"market_research": "researchResult", "gap_analysis": "gapResult", "salary_estimation": "salaryResult", "pitch": "pitchResult", "questions": "questionsResult", "recruiter_view": "recruiterResult", "reality_check": "realityResult", "action_plan": "actionPlanResult", "custom_scenarios": "customScenariosResult", "flaw_coaching": "flawCoachingResult"}
            if task_key in key_map:
                results[key_map[task_key]] = parsed
        except Exception as e:
            print(f"[LOAD APP] Erreur de parsing d'une tâche: {e}")
            
    app_data = dict(app_row) if not isinstance(app_row, tuple) else {"id": app_row[0], "target_company": app_row[1], "target_job": app_row[2]}
        
    return {"status": "success", "application": app_data, "data": results}

@router.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await manager.connect(websocket, task_id)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass # On ignore silencieusement les coupures réseau abruptes (RuntimeError, CancelledError)
    finally:
        manager.disconnect(websocket, task_id) # Garanti d'être exécuté à 100%, libérant la mémoire

@router.get("/admin/migrate-archives")
async def migrate_archives(current_user: dict = Depends(require_admin_user)):
    """Route temporaire pour ranger les anciens documents orphelins dans un dossier Archives."""
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO job_applications (id, user_id, target_company, target_job, created_at)
                SELECT DISTINCT 
                    md5(user_id), user_id, 'Archives', 'Anciens Documents', CURRENT_TIMESTAMP 
                FROM documents 
                WHERE application_id IS NULL
                ON CONFLICT (id) DO NOTHING
            """)
            await db.execute(conn, """
                UPDATE documents 
                SET application_id = md5(user_id)
                WHERE application_id IS NULL
            """)
        return {"status": "success", "message": "Anciens documents archivés avec succès !"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

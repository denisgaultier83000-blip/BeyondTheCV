import uuid
import json
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse

from database import db
from security import get_current_user
from models import ResearchRequest, DisambiguationRequest
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
    
    # [FIX EXPERT] Prévention du crash SQL (NOT NULL constraint) si la valeur est None
    target_company = req_dict.get("target_company") or candidate_data.get("target_company") or "Général"
    target_job = req_dict.get("target_job") or candidate_data.get("target_job") or "Poste non spécifié"

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
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Data Quality Analyst. Language: {target_lang}. Output STRICT JSON.", bypass_queue=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/research/disambiguate")
async def disambiguate_company_endpoint(request: DisambiguationRequest):
    try:
        result_str = await ai_service.generate(f"Disambiguate company: {request.company_name}. Respond in JSON with a 'candidates' list.", provider="gemini", system_instruction="You are a JSON API.", bypass_queue=True)
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

@router.get("/api/applications")
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

@router.delete("/api/applications/{app_id}")
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

@router.get("/api/applications/{app_id}/load")
async def load_application(app_id: str, current_user: dict = Depends(get_current_user)):
    """Recharge les données complètes d'une ancienne candidature depuis les archives des tâches."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT id, target_company, target_job FROM job_applications WHERE id = ? AND user_id = ?", (app_id, current_user["id"]))
        app_row = await cursor.fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Candidature non trouvée ou accès refusé.")
            
        # Récupérer toutes les tâches réussies associées à cette candidature
        cursor = await db.execute(conn, "SELECT status, result FROM tasks WHERE application_id = ? AND status IN ('SUCCESS', 'COMPLETED')", (app_id,))
        tasks = await cursor.fetchall()
        
    results = {}
    # [FIX EXPERT] Inférence automatique du type de tâche en fonction du schéma JSON retourné
    for task in tasks:
        res_str = task[1] if isinstance(task, tuple) else task.get("result")
        if not res_str: continue
        
        try:
            parsed = json.loads(res_str)
            if isinstance(parsed, str):
                try: parsed = json.loads(parsed)
                except: pass
                
            if isinstance(parsed, dict):
                if "market_report" in parsed or "company_report" in parsed: results["researchResult"] = parsed
                elif "gap_analysis" in parsed or "match_score" in parsed: results["gapResult"] = parsed
                elif "salary_range" in parsed: results["salaryResult"] = parsed
                elif "pitch" in parsed: results["pitchResult"] = parsed
                elif "questions" in parsed: results["questionsResult"] = parsed
                elif "career_gps_result" in parsed or "route" in parsed: results["careerGpsResult"] = parsed
                elif "career_radar_result" in parsed or "trajectories" in parsed: results["careerRadarResult"] = parsed
                elif "job_decoder_result" in parsed or ("reality_check" in parsed and isinstance(parsed.get("reality_check"), list)): results["jobDecoderResult"] = parsed
                elif "hidden_market" in parsed or "target_profiles" in parsed: results["hiddenMarketResult"] = parsed
                elif "recruiter_persona" in parsed: results["recruiterResult"] = parsed
                elif "reality_check" in parsed and isinstance(parsed.get("reality_check"), dict): results["realityResult"] = parsed
                elif "action_plan_result" in parsed or "action_plan" in parsed: results["actionPlanResult"] = parsed
                elif "custom_scenarios_result" in parsed or "categories" in parsed: results["customScenariosResult"] = parsed
                elif "optimized_data" in parsed: results["cvResult"] = parsed
                elif "flaws" in parsed or "flaw_coaching" in parsed: results["flawCoachingResult"] = parsed
            elif isinstance(parsed, list):
                results["flawCoachingResult"] = parsed # Le flaw coaching peut parfois retourner un tableau direct
        except Exception as e:
            print(f"[LOAD APP] Erreur de parsing d'une tâche: {e}")
            
    app_data = dict(app_row) if not isinstance(app_row, tuple) else {"id": app_row[0], "target_company": app_row[1], "target_job": app_row[2]}
        
    return {"status": "success", "application": app_data, "data": results}

@router.get("/api/applications/{app_id}/inventory")
async def get_application_inventory(app_id: str, current_user: dict = Depends(get_current_user)):
    """
    [LAZY LOADING] Renvoie uniquement un inventaire léger des documents/tâches disponibles 
    pour une candidature, sans charger les lourds payloads JSON.
    Idéal pour afficher un tableau de bord avec des actions "Voir / Imprimer".
    """
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT id, target_company, target_job, created_at FROM job_applications WHERE id = ? AND user_id = ?", (app_id, current_user["id"]))
        app_row = await cursor.fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Candidature non trouvée ou accès refusé.")
            
        cursor = await db.execute(conn, "SELECT id, status, result, created_at FROM tasks WHERE application_id = ? AND status IN ('SUCCESS', 'COMPLETED')", (app_id,))
        tasks = await cursor.fetchall()
        
    inventory = []
    for task in tasks:
        task_id = task[0] if isinstance(task, tuple) else task.get("id")
        status = task[1] if isinstance(task, tuple) else task.get("status")
        res_str = task[2] if isinstance(task, tuple) else task.get("result")
        created_at = task[3] if isinstance(task, tuple) else task.get("created_at")
        
        if not res_str: continue
        
        # Inférence légère du type de document en scannant les clés du JSON
        doc_type = "Document Inconnu"
        doc_key = "unknown"
        
        try:
            parsed = json.loads(res_str)
            if isinstance(parsed, str):
                try: parsed = json.loads(parsed)
                except: pass
                
            if isinstance(parsed, dict):
                if "market_report" in parsed or "company_report" in parsed: 
                    doc_type, doc_key = "Recherche Marché & Entreprise", "researchResult"
                elif "gap_analysis" in parsed or "match_score" in parsed: 
                    doc_type, doc_key = "Analyse d'Adéquation (Gap)", "gapResult"
                elif "salary_range" in parsed: 
                    doc_type, doc_key = "Estimation Salariale", "salaryResult"
                elif "pitch" in parsed: 
                    doc_type, doc_key = "Pitch de Présentation", "pitchResult"
                elif "questions" in parsed: 
                    doc_type, doc_key = "Questions d'Entretien", "questionsResult"
                elif "career_gps_result" in parsed or "route" in parsed: 
                    doc_type, doc_key = "GPS de Carrière", "careerGpsResult"
                elif "career_radar_result" in parsed or "trajectories" in parsed: 
                    doc_type, doc_key = "Radar de Carrière", "careerRadarResult"
                elif "job_decoder_result" in parsed or ("reality_check" in parsed and isinstance(parsed.get("reality_check"), list)): 
                    doc_type, doc_key = "Décodeur d'Offre", "jobDecoderResult"
                elif "hidden_market" in parsed or "target_profiles" in parsed: 
                    doc_type, doc_key = "Marché Caché", "hiddenMarketResult"
                elif "recruiter_persona" in parsed: 
                    doc_type, doc_key = "Vision du Recruteur", "recruiterResult"
                elif "reality_check" in parsed and isinstance(parsed.get("reality_check"), dict): 
                    doc_type, doc_key = "Reality Check", "realityResult"
                elif "action_plan_result" in parsed or "action_plan" in parsed: 
                    doc_type, doc_key = "Plan d'Action", "actionPlanResult"
                elif "custom_scenarios_result" in parsed or "categories" in parsed: 
                    doc_type, doc_key = "Mises en Situation", "customScenariosResult"
                elif "optimized_data" in parsed: 
                    doc_type, doc_key = "CV Optimisé", "cvResult"
                elif "flaws" in parsed or "flaw_coaching" in parsed: 
                    doc_type, doc_key = "Coaching Défauts", "flawCoachingResult"
            elif isinstance(parsed, list):
                doc_type, doc_key = "Coaching Défauts", "flawCoachingResult"
        except Exception:
            pass
            
        if doc_key != "unknown":
            inventory.append({
                "task_id": task_id,
                "name": doc_type,
                "key": doc_key,
                "status": status,
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
            })
            
    app_data = dict(app_row) if not isinstance(app_row, tuple) else {"id": app_row[0], "target_company": app_row[1], "target_job": app_row[2]}
        
    return {"status": "success", "application": app_data, "inventory": inventory}

@router.websocket("/ws/task/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await manager.connect(websocket, task_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)

@router.get("/api/admin/migrate-archives")
async def migrate_archives():
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

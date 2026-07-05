from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from security import require_admin_user, get_current_user
from database import db
import json
from . import tasks
from .audit_service import audit_service

router = APIRouter(
    prefix="/api/admin/generations",
    tags=["Administration - Generations"],
    dependencies=[Depends(require_admin_user)]
)

@router.post("/{generation_id}/rerun")
async def rerun_generation(
    generation_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Relance une génération IA spécifique.
    """
    async with db.get_connection() as conn:
        task_cursor = await db.execute(conn, "SELECT id, metadata, user_id FROM tasks WHERE id = ?", (generation_id,))
        task = await task_cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Génération (tâche) introuvable.")

        metadata_str = task['metadata']
        if not metadata_str:
            raise HTTPException(status_code=400, detail="Les métadonnées de la tâche sont manquantes, impossible de relancer.")

        try:
            metadata = json.loads(metadata_str)
            task_name = metadata.get("task_name")
            candidate_data = metadata.get("candidate_data")
            if not task_name or not candidate_data:
                raise HTTPException(status_code=400, detail="Données de relance incomplètes dans les métadonnées.")
        except (json.JSONDecodeError, KeyError):
            raise HTTPException(status_code=500, detail="Format de métadonnées invalide.")

        # Mapping des noms de tâches aux fonctions de traitement
        task_functions = {
            "pitch": tasks.process_pitch_in_background,
            "questions": tasks.process_questions_in_background,
            "gap_analysis": tasks.process_gap_analysis_in_background,
            "salary_estimation": tasks.process_salary_in_background,
            "flaw_coaching": tasks.process_flaw_coaching_in_background,
            "action_plan": tasks.process_action_plan_in_background,
            "custom_scenarios": tasks.process_custom_scenarios_in_background,
            "recruiter_view": tasks.process_recruiter_view_in_background,
            "job_decoder": tasks.process_job_decoder_in_background,
            "risk_analysis": tasks.process_risk_analysis_in_background,
            "hidden_market": tasks.process_hidden_market_in_background,
            "reality_check": tasks.process_reality_check_in_background,
            "market_research": tasks.process_research_in_background,
        }

        process_function = task_functions.get(task_name)
        if not process_function:
            raise HTTPException(status_code=400, detail=f"Type de tâche inconnu ou non relançable : {task_name}")

        # Récupérer l'email de l'utilisateur cible pour l'audit
        target_user_id = task['user_id']
        target_user_email = "unknown"
        if target_user_id:
            user_cursor = await db.execute(conn, "SELECT email FROM users WHERE id = ?", (target_user_id,))
            target_user = await user_cursor.fetchone()
            if target_user:
                target_user_email = target_user['email']
        
        # Log de l'action d'audit
        await audit_service.log_admin_action(
            request=request,
            admin_user=admin_user,
            action="RERUN_GENERATION",
            target_user_id=target_user_id,
            target_user_email=target_user_email,
            details={"task_id": generation_id, "task_name": task_name}
        )

        # Relancer la tâche en arrière-plan
        background_tasks.add_task(process_function, generation_id, candidate_data)

        return {
            "status": "success",
            "message": f"La génération '{task_name}' a été relancée avec succès."
        }

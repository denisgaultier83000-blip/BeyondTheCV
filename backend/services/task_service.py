from fastapi import APIRouter, HTTPException
from database import db
import json

router = APIRouter(
    prefix="/tasks",
    tags=["Task Management"]
)


def _parse_task_result(raw_value):
    if raw_value is None:
        return None
    if isinstance(raw_value, str):
        try:
            return json.loads(raw_value)
        except json.JSONDecodeError:
            return raw_value
    return raw_value

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Vérifie le statut d'une tâche asynchrone (ex: génération IA).
    C'est le point de terminaison que le frontend interroge régulièrement (polling).
        Mode DB-only :
            - Lit exclusivement la table `tasks`
            - Retourne 404 si la tâche n'existe pas
    """
    # 1) Lecture depuis la base de données
    task = None
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT status, result, error_message FROM tasks WHERE id = ?", (task_id,))
            task = await cursor.fetchone()
    except Exception as e:
        # Mode DB-only: on loggue l'erreur puis on laisse la route renvoyer 404 si aucun enregistrement n'est disponible.
        print(f"[TASKS] DB read error: {e}", flush=True)
        task = None

    # 2) Si trouvée en DB, formater la réponse
    if task:
        status = task.get("status", "PENDING").upper()
        result_data = _parse_task_result(task.get("result"))

        if status in ["COMPLETED", "SUCCESS"]:
            return {"status": "SUCCESS", "result": result_data}

        if status == "FAILED":
            # Certaines tâches écrivent le détail d'erreur dans result.error
            # plutôt que dans error_message. On harmonise ici la réponse API.
            error_message = task.get("error_message")
            if not error_message and isinstance(result_data, dict):
                error_message = result_data.get("error")
            return {"status": "FAILED", "error": error_message, "result": result_data}

        return {"status": status, "result": result_data, "error": task.get("error_message")}

    # 3) Pas trouvé en base : renvoyer 404 (mode DB-only)
    raise HTTPException(status_code=404, detail="Tâche non trouvée.")
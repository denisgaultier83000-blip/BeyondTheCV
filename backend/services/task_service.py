from fastapi import APIRouter, HTTPException
from database import db
import json

router = APIRouter(
    prefix="/tasks",
    tags=["Task Management"]
)

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Vérifie le statut d'une tâche asynchrone (ex: génération IA).
    C'est le point de terminaison que le frontend interroge régulièrement (polling).
    Comportement amélioré :
      - Essaie la DB d'abord
      - Si la tâche n'existe pas en DB, vérifie le TASK_STORE en mémoire (utilisé pour le dev local)
      - Ne masque pas les HTTPException (404) en 500
    """
    # 1) Tenter de lire depuis la base de données (si disponible)
    task = None
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT status, result, error_message FROM tasks WHERE id = ?", (task_id,))
            task = await cursor.fetchone()
    except Exception as e:
        # Log d'information mais ne crash pas : on tentera le fallback mémoire
        print(f"[TASKS] DB read error (continuing to in-memory fallback): {e}", flush=True)
        task = None

    # 2) Si trouvée en DB, formater la réponse
    if task:
        status = task.get("status", "PENDING").upper()
        if status in ["COMPLETED", "SUCCESS"]:
            result_data = task.get("result")
            if isinstance(result_data, str):
                try:
                    result_data = json.loads(result_data)
                except json.JSONDecodeError:
                    pass
            return {"status": "SUCCESS", "result": result_data}
        return {"status": status, "error": task.get("error_message")}

    # 3) Fallback : vérifier le store en mémoire (mock) défini dans services.cv_services
    try:
        from services.cv_services import TASK_STORE
        entry = TASK_STORE.get(task_id)
        if entry:
            return entry
    except Exception:
        # Import/circular errors -> ignore, on renverra 404
        pass

    # 4) Pas trouvé : renvoyer 404
    raise HTTPException(status_code=404, detail="Tâche non trouvée.")
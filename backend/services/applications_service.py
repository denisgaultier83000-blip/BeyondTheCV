"""
Endpoints pour la gestion des candidatures sauvegardées (/api/applications).
Utilisé par DocumentsModal.tsx et ApplicationDossier.tsx.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from security import get_current_user
from database import db

router = APIRouter(
    prefix="/applications",
    tags=["Applications"]
)


@router.get("")
async def list_applications(current_user: dict = Depends(get_current_user)):
    """
    Retourne toutes les candidatures de l'utilisateur avec leurs documents.
    Format attendu par DocumentsModal :
    [{ id, target_company, target_job, created_at, documents: [{id, filename, type, created_at}] }]
    """
    user_id = current_user["id"]
    try:
        async with db.get_connection() as conn:
            # Récupère les candidatures
            apps_cursor = await db.execute(
                conn,
                """SELECT id, target_company, target_job, created_at
                   FROM job_applications WHERE user_id = %s
                   ORDER BY created_at DESC LIMIT 50""",
                (user_id,)
            )
            apps_rows = await apps_cursor.fetchall()

        result = []
        for app_row in apps_rows:
            app = dict(app_row) if hasattr(app_row, 'keys') else {
                "id": app_row[0], "target_company": app_row[1],
                "target_job": app_row[2], "created_at": app_row[3]
            }
            # Sérialise le datetime
            if hasattr(app.get("created_at"), "isoformat"):
                app["created_at"] = app["created_at"].isoformat()

            # Tente de récupérer les documents liés
            docs = []
            try:
                async with db.get_connection() as conn2:
                    docs_cursor = await db.execute(
                        conn2,
                        """SELECT id, filename, type, created_at
                           FROM documents
                           WHERE user_id = %s
                             AND (application_id = %s
                                  OR (application_id IS NULL AND %s IS NOT NULL))
                           ORDER BY created_at DESC""",
                        (user_id, app["id"], app["id"])
                    )
                    doc_rows = await docs_cursor.fetchall()
                    for dr in (doc_rows or []):
                        d = dict(dr) if hasattr(dr, 'keys') else {
                            "id": dr[0], "filename": dr[1], "type": dr[2], "created_at": dr[3]
                        }
                        if hasattr(d.get("created_at"), "isoformat"):
                            d["created_at"] = d["created_at"].isoformat()
                        docs.append(d)
            except Exception:
                pass  # documents sans application_id → liste vide

            app["documents"] = docs
            result.append(app)

        return result

    except Exception as e:
        print(f"[APPLICATIONS] list error: {e}", flush=True)
        return []


@router.delete("/{app_id}")
async def delete_application(app_id: str, current_user: dict = Depends(get_current_user)):
    """Supprime une candidature et ses documents associés."""
    user_id = current_user["id"]
    async with db.get_connection() as conn:
        # Vérifie l'appartenance
        cursor = await db.execute(
            conn,
            "SELECT id FROM job_applications WHERE id = %s AND user_id = %s",
            (app_id, user_id)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidature introuvable.")

        # Supprime les documents liés
        try:
            await db.execute(
                conn,
                "DELETE FROM documents WHERE application_id = %s AND user_id = %s",
                (app_id, user_id)
            )
        except Exception:
            pass  # table sans application_id → ignore

        # Supprime la candidature
        await db.execute(
            conn,
            "DELETE FROM job_applications WHERE id = %s AND user_id = %s",
            (app_id, user_id)
        )

    return {"status": "success", "id": app_id}


@router.get("/{app_id}/load")
async def load_application(app_id: str, current_user: dict = Depends(get_current_user)):
    """
    Charge le contexte complet d'une candidature sauvegardée.
    Retourne { data: { formData, taskResults } } pour restauration dans le Dashboard.
    """
    user_id = current_user["id"]
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT id, target_company, target_job, tasks_map FROM job_applications WHERE id = %s AND user_id = %s",
            (app_id, user_id)
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Candidature introuvable.")

    app = dict(row) if hasattr(row, 'keys') else {
        "id": row[0], "target_company": row[1], "target_job": row[2], "tasks_map": row[3]
    }

    tasks_map = app.get("tasks_map") or {}
    if isinstance(tasks_map, str):
        try:
            tasks_map = json.loads(tasks_map)
        except Exception:
            tasks_map = {}

    # Charge les résultats de chaque tâche depuis la table tasks
    task_results = {}
    if tasks_map:
        try:
            async with db.get_connection() as conn2:
                for task_key, task_id in tasks_map.items():
                    if not task_id:
                        continue
                    t_cursor = await db.execute(
                        conn2,
                        "SELECT result, status FROM tasks WHERE id = %s",
                        (task_id,)
                    )
                    t_row = await t_cursor.fetchone()
                    if t_row:
                        t_data = dict(t_row) if hasattr(t_row, 'keys') else {"result": t_row[0], "status": t_row[1]}
                        if t_data.get("status") in ("SUCCESS", "COMPLETED") and t_data.get("result"):
                            raw = t_data["result"]
                            task_results[task_key] = json.loads(raw) if isinstance(raw, str) else raw
        except Exception as e:
            print(f"[APPLICATIONS] load tasks error: {e}", flush=True)

    return {
        "data": {
            "target_company": app.get("target_company", ""),
            "target_job":     app.get("target_job", ""),
            "taskResults":    task_results,
        }
    }

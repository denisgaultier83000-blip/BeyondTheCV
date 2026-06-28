import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from database import db
from models import DocumentMetadata
from security import get_current_user

router = APIRouter(tags=["Documents"])

@router.get("/documents")
async def list_user_documents(current_user: dict = Depends(get_current_user)):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],))
        rows = await cursor.fetchall()

    # [FIX CRITIQUE] Reconstruction de la structure attendue par le frontend,
    # similaire à la route /applications pour garantir la cohérence.
    apps = {}
    for row in rows:
        r = dict(row)
        app_id = r.get("application_id") or "archives_id"

        if app_id not in apps:
            apps[app_id] = {
                "id": app_id,
                "target_company": "Archives",
                "target_job": "Documents non classés",
                "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"]),
                "documents": []
            }

        if r.get("id"):
            apps[app_id]["documents"].append({
                "id": r["id"],
                "filename": r["filename"],
                "type": r.get("type", "document"),
                "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"])
            })

    return {"users": list(apps.values())}

@router.get("/api/documents/download/{doc_id}")
async def download_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = None
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"]))
        row = await cursor.fetchone()
        if row:
            doc = dict(row)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    file_path = doc["path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server.")
    
    # [FIX EXPERT] Sécurité : Prévention du Path Traversal par répertoire voisin
    # (startswith est vulnérable si le dossier ciblé est "/app/backend_secrets")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    abs_file_path = os.path.abspath(file_path)
    if os.path.commonpath([base_dir, abs_file_path]) != base_dir:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    return FileResponse(path=file_path, filename=doc["filename"], media_type=doc.get("media_type", "application/octet-stream"))

@router.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT path FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"]))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found.")
        
        await db.execute(conn, "DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"]))
        await conn.commit()
        
        file_path = row["path"]
        if file_path and os.path.exists(file_path):
            # [FIX EXPERT] Sécurité : Empêche un attaquant de supprimer des fichiers système
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            abs_file_path = os.path.abspath(file_path)
            if os.path.commonpath([base_dir, abs_file_path]) == base_dir:
                try:
                    os.remove(file_path)
                except Exception:
                    pass
    return {"status": "success", "id": doc_id}
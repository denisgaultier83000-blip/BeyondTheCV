import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from database import db
from models import DocumentMetadata
from security import get_current_user

router = APIRouter(tags=["Documents"])

@router.get("/api/documents", response_model=List[DocumentMetadata])
async def list_user_documents(current_user: dict = Depends(get_current_user)):
    response_docs = []
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],))
        rows = await cursor.fetchall()
        for row in rows:
            response_docs.append(DocumentMetadata(**dict(row)))
    return response_docs

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
    
    # Security check
    if not os.path.abspath(file_path).startswith(os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))):
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
        
        if row["path"] and os.path.exists(row["path"]):
            try:
                os.remove(row["path"])
            except Exception:
                pass
    return {"status": "success", "id": doc_id}
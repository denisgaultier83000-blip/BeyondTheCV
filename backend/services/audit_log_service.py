from fastapi import APIRouter, Depends, HTTPException, Query
from security import require_admin_user
from database import db
from typing import List, Optional

router = APIRouter(
    prefix="/api/admin/audit-logs",
    tags=["Administration - Audit Logs"],
    dependencies=[Depends(require_admin_user)]
)

@router.get("")
async def get_audit_logs(
    limit: int = 50,
    offset: int = 0,
    admin_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    action: Optional[str] = None,
):
    """
    Récupère les logs d'audit avec filtres et pagination.
    """
    params = []
    where_clauses = []

    if admin_user_id:
        where_clauses.append("admin_user_id = ?")
        params.append(admin_user_id)
    if target_user_id:
        where_clauses.append("target_user_id = ?")
        params.append(target_user_id)
    if action:
        where_clauses.append("action = ?")
        params.append(action)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT id, timestamp, admin_user_email, action, target_user_email, details, ip_address
        FROM admin_audit_logs
        {where_sql}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    """
    
    count_query = f"SELECT COUNT(*) FROM admin_audit_logs {where_sql}"

    pagination_params = list(params)
    pagination_params.extend([limit, offset])

    try:
        async with db.get_connection() as conn:
            logs_cursor = await db.execute(conn, query, tuple(pagination_params))
            logs = await logs_cursor.fetchall()

            total_cursor = await db.execute(conn, count_query, tuple(params))
            total_row = await total_cursor.fetchone()
            total_logs = list(total_row.values())[0] if total_row else 0
        
        return {
            "logs": [dict(log) for log in logs],
            "total": total_logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {e}")

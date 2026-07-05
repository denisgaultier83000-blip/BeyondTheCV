from fastapi import Request
from database import db
import json

class AuditService:
    @staticmethod
    async def log_admin_action(
        request: Request,
        admin_user: dict,
        action: str,
        target_user_id: str,
        target_user_email: str,
        details: dict
    ):
        """
        Enregistre une action d'administration dans la base de données.
        """
        # [SÉCURITÉ & RÉSEAU] Récupérer la vraie IP derrière un proxy/Docker
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        else:
            ip_address = request.client.host if request.client else "unknown"

        query = """
            INSERT INTO admin_audit_logs 
            (admin_user_id, admin_user_email, action, target_user_id, target_user_email, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        # Sérialiser les détails en JSON
        details_json = json.dumps(details)
        
        params = (
            admin_user.get("id"),
            admin_user.get("email"),
            action,
            target_user_id,
            target_user_email,
            details_json,
            ip_address
        )
        
        try:
            async with db.get_connection() as conn:
                await db.execute(conn, query, params)
        except Exception as e:
            print(f"CRITICAL: Failed to log admin action. Error: {e}")
            # Ne pas faire de raise HTTPException ici pour ne pas faire échouer l'action principale.
            # L'échec de l'audit doit être loggué mais ne doit pas empêcher l'action de se terminer.

audit_service = AuditService()

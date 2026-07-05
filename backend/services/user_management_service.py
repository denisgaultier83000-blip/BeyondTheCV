from fastapi import APIRouter, Depends, HTTPException, Request
from security import require_admin_user, get_current_user
from database import db
import uuid
from .audit_service import audit_service

router = APIRouter(
    prefix="/api/admin/users",
    tags=["Administration - User Management"],
    dependencies=[Depends(require_admin_user)]
)

@router.post("/{user_id}/anonymize")
async def anonymize_user(user_id: str, request: Request, admin_user: dict = Depends(get_current_user)):
    """
    Anonymise un utilisateur et supprime ses données personnelles associées.
    Cette action est irréversible.
    """
    async with db.get_connection() as conn:
        # Vérifier que l'utilisateur existe
        user_cursor = await db.execute(conn, "SELECT id, email FROM users WHERE id = ?", (user_id,))
        user = await user_cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

        target_user_email = user['email']

        # Démarrer une transaction
        async with db.transaction(conn):
            try:
                # 1. Supprimer les données associées (grâce à ON DELETE CASCADE)
                # Note: 'tasks' est en SET NULL, les autres en CASCADE
                # Il suffit de supprimer l'utilisateur pour que le CASCADE s'applique.
                # Mais ici, on veut anonymiser, pas supprimer l'enregistrement user.
                # On doit donc supprimer manuellement les données des tables liées.
                
                related_tables = [
                    "user_profiles", "job_applications", "products", "documents",
                    "subscription_extensions", "feedbacks", "interview_sessions",
                    "training_sessions", "generation_cache"
                ]
                for table in related_tables:
                    await db.execute(conn, f"DELETE FROM {table} WHERE user_id = ?", (user_id,))

                # 2. Anonymiser l'enregistrement dans la table 'users'
                anonymized_email = f"anonymized_{user_id}@beyondthecv.app"
                invalid_password = f"invalid_hash_{uuid.uuid4()}"
                
                await db.execute(conn, """
                    UPDATE users
                    SET 
                        email = ?,
                        hashed_password = ?,
                        first_name = 'Utilisateur',
                        last_name = 'Anonymisé',
                        is_active = FALSE,
                        subscription_status = 'expired',
                        deleted_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (anonymized_email, invalid_password, user_id))

                # 3. Log de l'action d'audit
                await audit_service.log_admin_action(
                    request=request,
                    admin_user=admin_user,
                    action="ANONYMIZE_USER",
                    target_user_id=user_id,
                    target_user_email=target_user_email,
                    details={"reason": "GDPR request"}
                )
                
                return {
                    "status": "success",
                    "message": f"L'utilisateur {user_id} a été anonymisé avec succès."
                }

            except Exception as e:
                # En cas d'erreur, la transaction sera annulée par le gestionnaire de contexte
                raise HTTPException(status_code=500, detail=f"Erreur lors de l'anonymisation: {e}")

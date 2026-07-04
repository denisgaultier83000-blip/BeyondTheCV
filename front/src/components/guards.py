from fastapi import Depends, HTTPException
from database import db
from security import get_current_user
from datetime import datetime, timezone

async def require_active_subscription(current_user: dict = Depends(get_current_user)):
    """
    Vérifie que l'utilisateur a un abonnement actif avant d'autoriser l'accès à une route.
    Cette fonction est maintenant dans son propre module pour éviter les imports circulaires.
    """
    if current_user.get("is_admin") or current_user.get("is_tester"):
        return current_user
        
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT subscription_status, subscription_expiration_date FROM users WHERE id = ?", (current_user["id"],))
            row = await cursor.fetchone()
    except Exception as e:
        print(f"[AUTH ERROR] Fetch subscription failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Database connection error in subscription check")

    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    status, exp_date = (row[0], row[1]) if isinstance(row, tuple) else (row.get("subscription_status"), row.get("subscription_expiration_date"))
    
    is_expired = status == "expired" or (exp_date and exp_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc))
                
    if is_expired:
        raise HTTPException(status_code=402, detail="Abonnement expiré. L'accès aux modèles d'Intelligence Artificielle est verrouillé.")
    return current_user
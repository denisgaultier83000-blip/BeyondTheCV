import json
from fastapi import APIRouter, Depends, Body, HTTPException
from security import get_current_user
from database import db

router = APIRouter(
    prefix="/api/cv",
    tags=["User Profile"]
)

@router.get("/me/profile")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Récupère le profil complet (JSON) de l'utilisateur connecté."""
    try:
        async with db.get_connection() as conn:
            # Création défensive pour éviter le crash SQL et le Fallback vide
            await db.execute(conn, """
                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id TEXT PRIMARY KEY,
                    profile_data JSONB
                )
            """)
            cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (current_user["id"],))
            row = await cursor.fetchone()

            if row:
                data = row[0] if isinstance(row, tuple) else row.get("profile_data")
                if data:
                    return json.loads(data) if isinstance(data, str) else data

            print(f"[PROFIL] Aucun profil trouvé pour {current_user['email']}. Construction depuis la table users.", flush=True)
            user_cursor = await db.execute(conn, "SELECT email, first_name, last_name FROM users WHERE id = ?", (current_user["id"],))
            user_row = await user_cursor.fetchone()

            if user_row:
                user_data = dict(user_row)
                return {"form": {
                    "email": user_data.get("email", ""),
                    "first_name": user_data.get("first_name", ""),
                    "last_name": user_data.get("last_name", "")
                }}

        print(f"[PROFIL WARNING] Utilisateur {current_user['id']} non trouvé dans la table users.", flush=True)
        return {"form": {"email": current_user.get("email", "")}}
    except Exception as e:
        print(f"[PROFILE CRITICAL ERROR] {e}", flush=True)
        return {"form": {"email": current_user.get("email", "")}}

@router.post("/me/profile")
async def update_my_profile(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Met à jour (écrase) le profil complet du candidat dans la base de données."""
    try:
        async with db.get_connection() as conn:
            profile_json = json.dumps(payload)
            cursor = await db.execute(conn, "SELECT 1 FROM user_profiles WHERE user_id = ?", (current_user["id"],))
            exists = await cursor.fetchone()
            
            if exists:
                await db.execute(conn, "UPDATE user_profiles SET profile_data = ?::jsonb WHERE user_id = ?", (profile_json, current_user["id"]))
            else:
                await db.execute(conn, "INSERT INTO user_profiles (user_id, profile_data) VALUES (?, ?::jsonb)", (current_user["id"], profile_json))
        return {"status": "success", "message": "Profil sauvegardé"}
    except Exception as e:
        print(f"[PROFILE SAVE ERROR] {e}", flush=True)
        return {"status": "error", "message": str(e)}
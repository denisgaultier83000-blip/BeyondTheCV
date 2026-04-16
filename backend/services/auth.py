import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from models import UserLogin, UserRegister
from security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, verify_password, get_password_hash
from database import db

router = APIRouter(tags=["Authentication"])

async def _insert_user(uid, email, hashed_pw, first, last, created):
    """Insère un nouvel utilisateur."""
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO users (id, email, hashed_password, first_name, last_name, created_at, is_premium)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (uid, email, hashed_pw, first, last, created, False))
    except Exception as e:
        print(f"[DB ERROR] _insert_user: {e}", flush=True)
        raise e

# --- Routes ---

@router.post("/api/auth/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        async with db.get_connection() as conn:
            # Requête propre et directe
            cursor = await db.execute(conn, "SELECT * FROM users WHERE email = ?", (form_data.username,))
            row = await cursor.fetchone()

        if not row:
            print(f"[AUTH ERROR] Échec : Email introuvable en base ({form_data.username})", flush=True)
            raise HTTPException(status_code=401, detail="Identifiants incorrects.")
            
        # [FIX] Sécurisation absolue : on garantit un dictionnaire peu importe le driver (psycopg2/asyncpg)
        user_dict = dict(row) if not isinstance(row, dict) else row
            
        try:
            is_valid = verify_password(form_data.password, user_dict.get("hashed_password", ""))
        except Exception as hash_err:
            print(f"[AUTH ERROR] Erreur de vérification du hash: {hash_err}", flush=True)
            is_valid = False
            
        if not is_valid:
            print(f"[AUTH ERROR] Échec : Mot de passe incorrect pour ({form_data.username})", flush=True)
            raise HTTPException(status_code=401, detail="Identifiants incorrects.")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_dict.get("id", ""))},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user_dict.get("id", "")),
                "name": f"{user_dict.get('first_name', '')} {user_dict.get('last_name', '')}".strip(),
                "email": user_dict.get("email", ""),
                "is_premium": bool(user_dict.get("is_premium", False))
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[AUTH ERROR CRITICAL] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne : {str(e)}")

@router.post("/api/auth/register")
async def register(user: UserRegister):
    print(f"[AUTH] Register attempt for: {user.email}", flush=True)
    email = user.email.lower().strip()

    print("[AUTH] Hashing password...", flush=True)
    hashed_pw = get_password_hash(user.password)

    try:
        # Vérification si l'email existe déjà
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (email,))
            exists = await cursor.fetchone()

        if exists:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = str(uuid.uuid4())
        now = datetime.now()

        # Insertion du nouvel utilisateur
        await _insert_user(user_id, email, hashed_pw, user.first_name, user.last_name, now)

        return {"status": "success", "message": "User created successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[AUTH] CRITICAL ERROR during register: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: [{type(e).__name__}] {str(e)}")

@router.get("/api/user/status")
async def get_user_status(current_user: dict = Depends(get_current_user)):
    """Vérifie le statut Premium de l'utilisateur."""
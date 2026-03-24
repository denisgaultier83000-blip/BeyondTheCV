import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from models import UserLogin, UserRegister
from security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, verify_password, get_password_hash
from database import db

router = APIRouter(tags=["Authentication"])

# --- Helpers PostgreSQL ---

async def _fetch_user_by_email(email):
    """Récupère un utilisateur par email."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT * FROM users WHERE email = ?", (email,))
            row = await cursor.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"[DB ERROR] _fetch_user_by_email: {e}", flush=True)
        raise e

async def _check_email_exists(email):
    """Vérifie si un email existe déjà."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (email,))
            row = await cursor.fetchone()
            return row is not None
    except Exception as e:
        print(f"[DB ERROR] _check_email_exists: {e}", flush=True)
        raise e

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

async def _fetch_user_profile(user_id):
    """Récupère le profil complet de l'utilisateur incluant les dernières métadonnées."""
    try:
        async with db.get_connection() as conn:
            # Récupérer les informations de base de l'utilisateur
            cursor = await db.execute(conn, "SELECT * FROM users WHERE id = ?", (user_id,))
            user_row = await cursor.fetchone()
            
            if not user_row:
                return None
                
            # Récupérer le produit le plus récent avec métadonnées
            cursor = await db.execute(conn, """
                SELECT metadata FROM products 
                WHERE user_id = ? AND metadata IS NOT NULL 
                ORDER BY created_at DESC 
                LIMIT 1
            """, (user_id,))
            
            product_row = await cursor.fetchone()
            
            # Construire le profil complet
            profile = dict(user_row)
            
            # Ajouter les métadonnées du dernier produit si elles existent
            # Sécurité via dict() pour garantir l'accès par clé (compatible SQLite aiosqlite.Row)
            if product_row and dict(product_row).get('metadata'):
                metadata = dict(product_row).get('metadata')
                if isinstance(metadata, str):
                    import json
                    metadata = json.loads(metadata)
                profile['profile_data'] = {
                    'sector': metadata.get('sector'),
                    'job_title': metadata.get('job_title'),
                    'experience_years': metadata.get('experience_years'),
                    'successes': metadata.get('successes', []),
                    'failures': metadata.get('failures', []),
                    'qualities': metadata.get('qualities', []),
                    'hobbies': metadata.get('hobbies', []),
                    'languages': metadata.get('languages', []),
                    'certifications': metadata.get('certifications', [])
                }
            else:
                profile['profile_data'] = {
                    'sector': None,
                    'job_title': None,
                    'experience_years': None,
                    'successes': [],
                    'failures': [],
                    'qualities': [],
                    'hobbies': [],
                    'languages': [],
                    'certifications': []
                }
            
            return profile
            
    except Exception as e:
        print(f"[DB ERROR] _fetch_user_profile: {e}", flush=True)
        raise e

async def _fetch_premium_status(user_id):
    """Récupère le statut premium d'un utilisateur."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT is_premium FROM users WHERE id = ?", (user_id,))
            row = await cursor.fetchone()
            return bool(dict(row).get("is_premium", False)) if row else False
    except Exception as e:
        print(f"[DB ERROR] _fetch_premium_status: {e}", flush=True)
        return False

# --- Routes ---

@router.post("/api/login")
async def login(request: UserLogin):
    try:
        async with db.get_connection() as conn:
            # Requête propre et directe
            cursor = await db.execute(conn, "SELECT * FROM users WHERE email = ?", (request.email,))
            row = await cursor.fetchone()

        if not row:
            print(f"[AUTH ERROR] Échec : Email introuvable en base ({request.email})", flush=True)
            raise HTTPException(status_code=401, detail="L'email n'existe pas dans la base de données.")
            
        # [FIX] Sécurisation absolue : on garantit un dictionnaire peu importe le driver (psycopg2/asyncpg)
        user_dict = dict(row) if not isinstance(row, dict) else row
            
        try:
            is_valid = verify_password(request.password, user_dict.get("hashed_password", ""))
        except Exception as hash_err:
            print(f"[AUTH ERROR] Erreur de vérification du hash: {hash_err}", flush=True)
            is_valid = False
            
        if not is_valid:
            print(f"[AUTH ERROR] Échec : Mot de passe incorrect pour ({request.email})", flush=True)
            raise HTTPException(status_code=401, detail="Le mot de passe est incorrect.")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_dict.get("id", ""))},
            expires_delta=access_token_expires
        )

        return {
            "token": access_token,
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

@router.post("/api/register")
async def register(user: UserRegister):
    print(f"[AUTH] Register attempt for: {user.email}", flush=True)
    email = user.email

    print("[AUTH] Hashing password...", flush=True)
    hashed_pw = get_password_hash(user.password)

    try:
        # Vérification si l'email existe déjà
        exists = await _check_email_exists(email)
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
        raise HTTPException(status_code=500, detail="Internal Server Error during registration.")

@router.get("/api/user/status")
async def get_user_status(current_user: dict = Depends(get_current_user)):
    """Vérifie le statut Premium de l'utilisateur."""
    user_id = current_user["id"]

    # Mock user bypass
    if user_id == "1" or user_id == "test-user-id":
        return {"is_premium": True}

    try:
        is_premium = await _fetch_premium_status(user_id)
        return {"is_premium": is_premium}
    except Exception as e:
        print(f"[AUTH ERROR] get_user_status: {e}", flush=True)
        # En cas d'erreur DB, on retourne false par sécurité plutôt que de crasher
        return {"is_premium": False}
@router.get("/api/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Récupère le profil complet de l'utilisateur connecté."""
    user_id = current_user["id"]
    
    # Mock user bypass
    if user_id == "1" or user_id == "test-user-id":
        return {
            "id": "1",
            "email": "test@test.com",
            "first_name": "Test",
            "last_name": "User",
            "is_premium": True,
            "profile_data": {
                "sector": "Test",
                "job_title": "Test Developer",
                "experience_years": 5,
                "successes": ["Test success"],
                "failures": ["Test failure"],
                "qualities": ["Test quality"],
                "hobbies": ["Test hobby"],
                "languages": ["Test language"],
                "certifications": ["Test cert"]
            }
        }
    
    try:
        profile = await _fetch_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "id": profile["id"],
            "email": profile["email"],
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "is_premium": bool(profile.get("is_premium", False)),
            "profile_data": profile["profile_data"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH ERROR] get_user_profile: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
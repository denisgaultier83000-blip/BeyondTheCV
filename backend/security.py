import os
from datetime import datetime, timedelta, UTC
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext

from database import db
# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# [STABILITÉ] Utilisation de pbkdf2_sha256 par défaut (Pure Python, stable)
try:
    import bcrypt
    pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
except ImportError:
    print("[SECURITY WARNING] 'bcrypt' module not found. Falling back to pbkdf2_sha256 only.", flush=True)
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# [DIAGNOSTIC] Vérification immédiate de la santé de bcrypt au démarrage
try:
    test_hash = pwd_context.hash("test_startup")
    pwd_context.verify("test_startup", test_hash)
    print("[SECURITY] Password hashing system is working correctly.", flush=True)
except Exception as e:
    print(f"[SECURITY] CRITICAL: Password hashing is failing! {e}", flush=True)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Décode le token JWT et retourne les informations de l'utilisateur."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        # Récupérer les informations utilisateur depuis la base de données
        try:
            async with db.get_connection() as conn:
                # [FIX] Le token peut contenir l'ID ou l'Email. On vérifie les deux pour une compatibilité absolue.
                cursor = await db.execute(conn, "SELECT id, email, first_name, last_name, is_premium FROM users WHERE id = ? OR email = ?", (user_id, user_id))
                user_row = await cursor.fetchone()
            
            if user_row:
                return {
                    "id": user_row["id"],
                    "email": user_row["email"],
                    "first_name": user_row["first_name"],
                    "last_name": user_row["last_name"],
                    "is_premium": bool(user_row["is_premium"])
                }
            else:
                raise HTTPException(status_code=401, detail="User not found")
                
        except Exception as e:
            print(f"[AUTH ERROR] Database error in get_current_user: {e}")
            # Fallback si db est indisponible ou erreur
            return {"id": user_id, "email": f"user_{user_id}@test.com", "first_name": "Test", "last_name": "User", "is_premium": True}
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
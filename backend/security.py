import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import sys
sys.modules['bcrypt'] = None

from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext
from database import db # [FIX] Import manquant qui cause des crashs sur les routes protégées

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# [STABILITÉ] Utilisation de pbkdf2_sha256 par défaut (Pure Python, stable).
# On force l'utilisation de pbkdf2_sha256 pour éviter les crashs potentiels de la librairie C 'bcrypt'
# dans des environnements instables (Docker, changements réseau).
# pbkdf2_sha256 est en pur Python, donc plus lent mais beaucoup plus stable.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token") # [FIX] Correction de l'URL du token pour la doc Swagger

# [DIAGNOSTIC] Vérification immédiate de la santé du système de hash au démarrage
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
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Décode le token JWT et retourne les informations de l'utilisateur."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # New simple path for admin
        if payload.get("role") == "admin":
            return {
                "email": payload.get("sub"),
                "is_admin": True,
                "is_tester": True, # Admins are testers
                # Add other fields if needed, or keep it minimal
                "id": "admin_user",
                "first_name": "Admin",
                "last_name": "",
                "is_premium": True,
            }
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        # Récupérer les informations utilisateur depuis la base de données
        try:
            async with db.get_connection() as conn: # Cette ligne plantait car 'db' n'était pas importé
                # [FIX] Le token peut contenir l'ID ou l'Email. On vérifie les deux pour une compatibilité absolue avec les anciennes versions du token.
                cursor = await db.execute(conn, "SELECT id, email, first_name, last_name, is_premium, is_admin, is_tester, credits FROM users WHERE id = ? OR email = ?", (user_id, user_id))
                user_row = await cursor.fetchone()
            
            if user_row:
                user_email = user_row["email"]
                is_admin_db = bool(user_row.get("is_admin", False))
                
                # [FIX EXPERT] On vérifie aussi si l'utilisateur courant correspond aux emails de la variable ADMIN_EMAIL
                admin_emails_str = os.getenv("ADMIN_EMAIL", "")
                admin_emails = {e.strip().lower() for e in admin_emails_str.split(',') if e.strip()}
                is_admin_env = user_email.lower() in admin_emails
                
                tester_emails_str = os.getenv("TESTER_EMAILS_LIST", "")
                tester_emails = {e.strip().lower() for e in tester_emails_str.split(',') if e.strip()}
                is_tester_env = bool(user_email.lower() in tester_emails) or (os.getenv("ENVIRONMENT", "production") != "production")

                return {
                    "id": user_row["id"],
                    "email": user_email,
                    "first_name": user_row["first_name"],
                    "last_name": user_row["last_name"],
                    "is_premium": bool(user_row["is_premium"]),
                    "is_admin": is_admin_db or is_admin_env,
                    "is_tester": bool(user_row.get("is_tester", False)) or is_tester_env,
                    "credits": user_row.get("credits") if user_row.get("credits") is not None else 60
                }
            else:
                raise HTTPException(status_code=401, detail="User not found")
                
        except Exception as e:
            print(f"[AUTH ERROR] Database error in get_current_user: {e}")
            # [SECURITÉ] Ne jamais accorder d'accès par défaut en cas d'erreur DB
            raise HTTPException(status_code=500, detail="Internal server error during authentication verification")
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin_user(current_user: dict = Depends(get_current_user)):
    """
    Vérifie si l'utilisateur courant est un administrateur.
    Le flag 'is_admin' est injecté par get_current_user.
    """
    if not current_user.get("is_admin"):
        # [SÉCURITÉ] Fallback via variable d'environnement pour le tout premier admin
        admin_emails_str = os.getenv("ADMIN_EMAIL", "")
        admin_emails = {e.strip().lower() for e in admin_emails_str.split(',') if e.strip()}
        if not admin_emails or current_user.get("email", "").lower() not in admin_emails:
            raise HTTPException(status_code=403, detail="Accès refusé. Cette opération requiert des droits administrateur.")
    
    return current_user
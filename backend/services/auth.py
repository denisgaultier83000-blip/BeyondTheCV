import uuid
import os
import secrets
import smtplib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from models import UserLogin, UserRegister
from security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, verify_password, get_password_hash
from database import db

router = APIRouter(tags=["Authentication"])

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

async def _insert_user(uid, email, hashed_pw, first, last, created):
    """Insère un nouvel utilisateur."""
    try:
        async with db.get_connection() as conn:
            # Fail-safe : Création de la colonne credits si elle n'existe pas
            try:
                await db.execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100")
            except Exception:
                pass
            await db.execute(conn, """
                INSERT INTO users (id, email, hashed_password, first_name, last_name, created_at, is_premium, credits)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, email, hashed_pw, first, last, created, False, 100))
            
            # [FIX] Initialisation des compteurs réels utilisés par le frontend (pitch / qa)
            try:
                await db.execute(conn, """
                    CREATE TABLE IF NOT EXISTS user_quotas (
                        user_id TEXT PRIMARY KEY,
                        pitch INTEGER DEFAULT 100,
                        qa INTEGER DEFAULT 100
                    )
                """)
                await db.execute(conn, "INSERT INTO user_quotas (user_id, pitch, qa) VALUES (?, 100, 100)", (uid,))
            except Exception as q_err:
                print(f"[DB WARNING] Impossible d'initialiser les quotas : {q_err}", flush=True)
    except Exception as e:
        print(f"[DB ERROR] _insert_user: {e}", flush=True)
        raise e

# --- Routes ---

@router.post("/api/auth/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        # [FIX] On gère la casse de l'email pour garantir un login fiable
        email = form_data.username.lower().strip()
        async with db.get_connection() as conn:
            # Fail-safe : Création de la colonne credits avant le SELECT
            try:
                await db.execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100")
            except Exception:
                pass
            # Requête propre et directe
            cursor = await db.execute(conn, "SELECT id, email, hashed_password, first_name, last_name, created_at, is_premium, credits FROM users WHERE email = ?", (email,))
            row = await cursor.fetchone()

        if not row:
            print(f"[AUTH ERROR] Échec : Email introuvable en base ({email})", flush=True)
            raise HTTPException(status_code=401, detail="Identifiants incorrects.")
            
        # [FIX] Sécurisation absolue du mapping pour gérer tuples, sqlite3.Row, asyncpg.Record et dicts
        if isinstance(row, dict):
            user_dict = row
        elif hasattr(row, 'keys'):
            user_dict = dict(row)
        elif isinstance(row, tuple):
            user_dict = {
                "id": row[0],
                "email": row[1],
                "hashed_password": row[2],
                "first_name": row[3],
                "last_name": row[4],
                "created_at": row[5],
                "is_premium": row[6] if len(row) > 6 else False,
                "credits": row[7] if len(row) > 7 else 100
            }
        else:
            user_dict = dict(row)
            
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

        # --- GESTION DES CRÉDITS & RELANCE TESTEURS ---
        TESTER_EMAILS = {"ami1@gmail.com", "ami2@test.com"} # <-- Remplace par les emails de tes amis
        user_credits = user_dict.get("credits")
        if user_credits is None:
            user_credits = 100
            
        # Relance à 100 crédits s'ils sont à sec
        if email in TESTER_EMAILS and user_credits < 100:
            user_credits = 100
            async with db.get_connection() as conn:
                await db.execute(conn, "UPDATE users SET credits = ? WHERE email = ?", (user_credits, email))
                try:
                    await db.execute(conn, "UPDATE user_quotas SET pitch = 100, qa = 100 WHERE user_id = ?", (user_dict.get("id"),))
                except Exception:
                    pass
            print(f"[AUTH] 🎁 Relance de 100 crédits appliquée pour le testeur : {email}", flush=True)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user_dict.get("id", "")),
                "name": f"{user_dict.get('first_name', '')} {user_dict.get('last_name', '')}".strip(),
                "email": user_dict.get("email", ""),
                "is_premium": bool(user_dict.get("is_premium", False)),
                "credits": user_credits
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

def send_reset_email(to_email: str, reset_token: str):
    """Envoie l'email de réinitialisation de mot de passe via SMTP, de manière synchrone."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    if not all([smtp_host, smtp_user, smtp_pass]):
        print(f"[AUTH] ⚠️ Configuration SMTP manquante. Email de reset non envoyé. Lien : {reset_link}", flush=True)
        return
        
    msg = MIMEMultipart("alternative")
    msg["From"] = f"Support BeyondTheCV <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "Réinitialisation de votre mot de passe - BeyondTheCV"

    plain_body = f"""Bonjour,\n\nVous avez demandé à réinitialiser le mot de passe de votre compte BeyondTheCV.\n\nCliquez sur le lien suivant pour créer un nouveau mot de passe (ce lien expire dans 15 minutes) :\n{reset_link}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\nL'équipe BeyondTheCV"""

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0F2650;">Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser le mot de passe de votre compte BeyondTheCV.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #0F2650; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="color: #64748b; font-size: 0.9em;">Ce lien expirera dans 15 minutes.</p>
        <p style="color: #64748b; font-size: 0.9em;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
    </div>
    """

    msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"[AUTH] 📧 Email de récupération envoyé à {to_email}", flush=True)
    except Exception as e:
        print(f"[SMTP ERROR] Échec de l'envoi : {e}", flush=True)

@router.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Génère un token de récupération et l'envoie par email."""
    email = request.email.lower().strip()
    try:
        async with db.get_connection() as conn:
            # [FIX EXPERT] Fail-safe Migration : Crée les colonnes si elles n'existent pas encore
            try:
                await db.execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT")
                await db.execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP")
            except Exception as e:
                print(f"[DB WARNING] Impossible d'ajouter les colonnes reset_token : {e}", flush=True)
                
            cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (email,))
            user = await cursor.fetchone()
            
            if user:
                token = secrets.token_urlsafe(32)
                expires = datetime.now() + timedelta(minutes=15)
                
                await db.execute(conn, "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?", (token, expires, email))
                # Lancement de l'envoi de mail en arrière-plan pour ne pas bloquer l'UI
                background_tasks.add_task(send_reset_email, email, token)
                
    except Exception as e:
        print(f"[AUTH ERROR] Forgot password failed: {e}", flush=True)
        
    # [SÉCURITÉ] Renvoie toujours "success" pour empêcher l'Account Enumeration (Deviner si un email existe)
    return {"status": "success", "message": "Si ce compte existe, un email a été envoyé."}

@router.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Vérifie le token et met à jour le mot de passe."""
    token = request.token.strip()
    
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT id, reset_token_expires FROM users WHERE reset_token = ?", (token,))
            user = await cursor.fetchone()
            
            if not user:
                raise HTTPException(status_code=400, detail="Ce lien de récupération est invalide.")
                
            user_id = user[0] if isinstance(user, tuple) else user.get("id")
            expires = user[1] if isinstance(user, tuple) else user.get("reset_token_expires")
            
            if expires and expires < datetime.now():
                raise HTTPException(status_code=400, detail="Ce lien a expiré (validité 15 minutes). Veuillez refaire une demande.")
                
            hashed_pw = get_password_hash(request.new_password)
            
            await db.execute(conn, "UPDATE users SET hashed_password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?", (hashed_pw, user_id))
            
        return {"status": "success", "message": "Votre mot de passe a été mis à jour avec succès."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH ERROR] Reset password failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de la réinitialisation.")
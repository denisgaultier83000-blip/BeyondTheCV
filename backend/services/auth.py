import uuid
import os
import secrets
import smtplib
import asyncio
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from models import UserLogin, UserRegister
from security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, verify_password, get_password_hash
from database import db
router = APIRouter(
    prefix="/auth", # [FIX] Ajout du préfixe manquant pour correspondre à l'URL /api/auth/token
    tags=["Authentication"]
)
TESTER_SESSION_CAP = 30
AUTH_DB_TIMEOUT_SECONDS = 8
AUTH_LAST_LOGIN_TIMEOUT_SECONDS = 3


async def _fetch_user_by_email(email: str):
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT id, email, hashed_password, first_name, last_name, created_at, is_premium, credits, is_admin, is_active, is_tester FROM users WHERE email = ?",
            (email,),
        )
        return await cursor.fetchone()


async def _touch_last_login(user_id: str):
    async with db.get_connection() as conn:
        update_cursor = await db.execute(
            conn,
            "UPDATE users SET last_login = ? WHERE id = ? RETURNING id",
            (datetime.now(timezone.utc), user_id),
        )
        return await update_cursor.fetchone()

async def _insert_user(uid, email, hashed_pw, first, last, created):
    """Insère un nouvel utilisateur."""
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO users (id, email, hashed_password, first_name, last_name, created_at, is_premium, credits, is_tester, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, email, hashed_pw, first, last, created, False, TESTER_SESSION_CAP, True, True))
            
            # Initialisation de tous les quotas (entraînements + ressources candidature)
            try:
                await db.execute(
                    conn,
                    """UPDATE users SET
                        quota_pitch = ?, quota_qa = ?, quota_mes = ?,
                        quota_negotiation = ?, quota_regeneration = ?, quota_update = ?,
                        quota_entreprises = ?, quota_offres = ?
                       WHERE id = ?""",
                    (TESTER_SESSION_CAP, TESTER_SESSION_CAP, TESTER_SESSION_CAP,
                     TESTER_SESSION_CAP, TESTER_SESSION_CAP, TESTER_SESSION_CAP,
                     5, 15, uid)
                )
            except Exception as q_err:
                print(f"[DB WARNING] Impossible d'initialiser les quotas : {q_err}", flush=True)
    except Exception as e:
        print(f"[DB ERROR] _insert_user: {e}", flush=True)
        raise e

# --- Routes ---

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        # [FIX] On gère la casse de l'email pour garantir un login fiable
        email = form_data.username.lower().strip()
        try:
            user_row = await asyncio.wait_for(
                _fetch_user_by_email(email),
                timeout=AUTH_DB_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            print(f"[AUTH ERROR] Timeout while fetching user for {email}", flush=True)
            raise HTTPException(status_code=503, detail="Le service d'authentification est temporairement indisponible. Veuillez reessayer.")

        # Simple admin authentication
        admin_email = os.getenv("ADMIN_EMAIL", "").lower()
        admin_password = os.getenv("ADMIN_PASSWORD")

        if admin_email and admin_password and email == admin_email and form_data.password == admin_password:
            print(f"[AUTH] ✅ Admin login successful for: {email}", flush=True)
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            # [FIX] Le token contient maintenant le rôle pour la protection des endpoints
            access_token = create_access_token(data={"sub": email, "role": "admin", "is_admin": True}, expires_delta=access_token_expires)
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "role": "admin", # [FIX] Signal clair pour la redirection frontend
                "user": { "email": email, "is_admin": True }
            }

        if not user_row:
            raise HTTPException(status_code=401, detail="Identifiants incorrects.")

        # [FIX] Sécurisation absolue du mapping pour gérer tuples, sqlite3.Row, asyncpg.Record et dicts
        if isinstance(user_row, dict):
            user_dict = user_row
        elif hasattr(user_row, 'keys'):
            user_dict = dict(user_row)
        elif isinstance(user_row, tuple):
            user_dict = {
                "id": user_row[0],
                "email": user_row[1],
                "hashed_password": user_row[2],
                "first_name": user_row[3],
                "last_name": user_row[4],
                "created_at": user_row[5],
                "is_premium": user_row[6] if len(user_row) > 6 else False,
                "credits": user_row[7] if len(user_row) > 7 else 100,
                "is_admin": user_row[8] if len(user_row) > 8 else False,
                "is_active": user_row[9] if len(user_row) > 9 else True,
                "is_tester": user_row[10] if len(user_row) > 10 else False
            }
        else:
            user_dict = dict(user_row)
            
        # [SÉCURITÉ] Vérification si le compte a été bloqué par un administrateur
        is_active = user_dict.get("is_active")
        if is_active is False or is_active == 0 or str(is_active).lower() == "false":
            print(f"[AUTH ERROR] Échec : Compte banni ou inactif ({email})", flush=True)
            raise HTTPException(status_code=403, detail="Votre compte a été désactivé par l'administration. Veuillez contacter le support.")

        try:
            is_valid = verify_password(form_data.password, user_dict.get("hashed_password", ""))
        except Exception as hash_err:
            print(f"[AUTH ERROR] Erreur de vérification du hash: {hash_err}", flush=True)
            is_valid = False
            
        if not is_valid:
            print(f"[AUTH ERROR] Échec : Mot de passe incorrect pour ({form_data.username})", flush=True)
            raise HTTPException(status_code=401, detail="Identifiants incorrects.")

        # [NEW] Update last_login timestamp upon successful login
        try:
            updated_row = await asyncio.wait_for(
                _touch_last_login(str(user_dict.get("id"))),
                timeout=AUTH_LAST_LOGIN_TIMEOUT_SECONDS,
            )
            if not updated_row:
                print(f"[DB WARNING] last_login was NOT updated for user {user_dict.get('id')}. The user might not exist or the query failed silently.", flush=True)
        except asyncio.TimeoutError:
            print(f"[DB WARNING] last_login update timed out for user {user_dict.get('id')}", flush=True)
        except Exception as e:
            # More critical logging
            print(f"[DB CRITICAL] Failed to update last_login due to an exception: {e}", flush=True)

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_dict.get("id", ""))},
            expires_delta=access_token_expires
        )

        # --- [MODIFICATION] GESTION DES CRÉDITS & RELANCE TESTEURS ---
        # En mode test, les séances sont rechargées à 30 quand le solde atteint 0.
        user_credits = user_dict.get("credits")
        if user_credits is not None and user_credits <= 0:
            new_balance = TESTER_SESSION_CAP
            user_credits = new_balance # Mise à jour pour le token
            async with db.get_connection() as conn:
                try:
                    # On réinitialise tous les quotas pour une expérience de test cohérente.
                    await db.execute(conn, """
                        UPDATE users SET
                            credits = ?, quota_pitch = ?, quota_qa = ?, quota_mes = ?,
                            quota_negotiation = ?, quota_regeneration = ?, quota_update = ?,
                            quota_entreprises = 5, quota_offres = 15
                        WHERE id = ?
                    """, (new_balance, new_balance, new_balance, new_balance, new_balance, new_balance, new_balance, user_dict.get("id")))
                    print(f"[AUTH] 🎁 Compte recrédité à {new_balance} séances pour : {email}", flush=True)
                except Exception as e:
                    print(f"[AUTH WARNING] Échec de la recharge automatique des crédits : {e}", flush=True)

        # --- [MODIFICATION] Tous les utilisateurs sont des testeurs ---
        is_tester_flag = True
        
        admin_emails_str = os.getenv("ADMIN_EMAIL", "")
        admin_emails = {e.strip().lower() for e in admin_emails_str.split(',') if e.strip()}
        # [CORRECTIF] On vérifie si l'utilisateur est admin via la DB OU via la variable d'environnement.
        is_admin_flag = bool(user_dict.get("is_admin")) or (email in admin_emails)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user_dict.get("id", "")),
                "name": f"{user_dict.get('first_name', '')} {user_dict.get('last_name', '')}".strip(),
                "email": user_dict.get("email", ""),
                "is_premium": bool(user_dict.get("is_premium", False)),
                "credits": user_credits,
                "is_admin": is_admin_flag,
                "is_tester": is_tester_flag
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[AUTH ERROR CRITICAL] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne : {str(e)}")

@router.post("/register")
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
        now = datetime.now(timezone.utc)

        # Insertion du nouvel utilisateur
        await _insert_user(user_id, email, hashed_pw, user.first_name, user.last_name, now)

        return {"status": "success", "message": "User created successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[AUTH] CRITICAL ERROR during register: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: [{type(e).__name__}] {str(e)}")

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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Génère un token de récupération et l'envoie par email."""
    email = request.email.lower().strip()
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (email,))
            user = await cursor.fetchone()
            
            if user:
                token = secrets.token_urlsafe(32)
                expires = datetime.now(timezone.utc) + timedelta(minutes=15)
                
                await db.execute(conn, "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?", (token, expires, email))
                # Lancement de l'envoi de mail en arrière-plan pour ne pas bloquer l'UI
                background_tasks.add_task(send_reset_email, email, token)
                
    except Exception as e:
        print(f"[AUTH ERROR] Forgot password failed: {e}", flush=True)
        
    # [SÉCURITÉ] Renvoie toujours "success" pour empêcher l'Account Enumeration (Deviner si un email existe)
    return {"status": "success", "message": "Si ce compte existe, un email a été envoyé."}

@router.post("/reset-password")
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
            
            if expires and expires < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Ce lien a expiré (validité 15 minutes). Veuillez refaire une demande.")
                
            hashed_pw = get_password_hash(request.new_password)
            
            await db.execute(conn, "UPDATE users SET hashed_password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?", (hashed_pw, user_id))
            
        return {"status": "success", "message": "Votre mot de passe a été mis à jour avec succès."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH ERROR] Reset password failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de la réinitialisation.")
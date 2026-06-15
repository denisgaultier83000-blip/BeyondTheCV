from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Literal
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime

from security import require_admin_user
from database import db

router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin_user)] # Protège toutes les routes de ce routeur
)

class CreditQuotaRequest(BaseModel):
    email: EmailStr
    quota_type: Literal["pitch", "qa", "mes", "negotiation", "regeneration", "update"]
    amount: int

def send_quota_recharge_email(to_email: str, amount: int, quota_type: str):
    """Envoie un email de notification en tâche de fond via SMTP."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if not all([smtp_host, smtp_user, smtp_pass]):
        print("[EMAIL WARNING] Configuration SMTP manquante, email de recharge non envoyé.")
        return

    module_names = {
        "qa": "Questions Classiques",
        "mes": "Mises en Situation",
        "pitch": "Pitch Vocal",
        "negotiation": "Négociation Salariale",
        "regeneration": "Régénérations IA",
        "update": "Mises à jour Marché"
    }
    module_label = module_names.get(quota_type, quota_type)
    
    msg = MIMEMultipart("alternative")
    msg["From"] = f"Support BeyondTheCV <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "🎁 Votre compte a été rechargé !"

    frontend_url = os.getenv("FRONTEND_URL", "https://beyondthecv.app")
    logo_url = f"{frontend_url}/logo.png"
    current_year = datetime.now().year

    # Version texte simple pour les anciens clients mail
    plain_body = f"""Bonjour,\n\nBonne nouvelle ! Le support de BeyondTheCV vient de créditer votre compte.\n\nVous avez reçu : +{amount} session(s) pour le module '{module_label}'.\n\nVous pouvez dès à présent reprendre votre entraînement sur la plateforme :\n{frontend_url}/candidate\n\nBons entretiens et à bientôt,\nL'équipe BeyondTheCV"""
    
    # Version HTML avec le logo et les couleurs de la marque
    html_body = f"""
    <!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Votre compte a été rechargé !</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f8fafc;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;"><tr><td align="center" style="padding: 30px 20px; border-bottom: 1px solid #e2e8f0;"><img src="{logo_url}" alt="BeyondTheCV Logo" style="height: 40px; width: auto;"></td></tr><tr><td style="padding: 40px 30px; color: #446285; font-size: 16px; line-height: 1.6;"><h1 style="color: #0F2650; font-size: 24px; margin: 0 0 20px 0;">Bonne nouvelle !</h1><p style="margin: 0 0 20px 0;">Le support de BeyondTheCV vient de créditer votre compte.</p><div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;"><p style="margin: 0; font-size: 14px; color: #446285;">Vous avez reçu :</p><p style="margin: 10px 0 0 0; font-size: 28px; font-weight: bold; color: #0F2650;">+{amount} simulation(s)</p><p style="margin: 5px 0 0 0; font-size: 16px; color: #6DBEF7; font-weight: 600;">pour le module "{module_label}"</p></div><p style="margin: 30px 0;">Vous pouvez dès à présent reprendre votre entraînement sur la plateforme et continuer à vous préparer pour vos entretiens.</p><div style="text-align: center;"><a href="{frontend_url}/candidate" target="_blank" style="background-color: #0F2650; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; transition: background-color 0.2s;">Reprendre l'entraînement</a></div></td></tr><tr><td style="padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;"><p style="margin: 0;">© {current_year} BeyondTheCV. Tous droits réservés.</p></td></tr></table></td></tr></table></body></html>
    """
    
    msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"[EMAIL SUCCESS] Notification de recharge envoyée à {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Échec de l'envoi à {to_email}: {e}")

@router.post("/credit-quotas")
async def credit_user_quotas(request: CreditQuotaRequest, background_tasks: BackgroundTasks):
    """
    Crédite manuellement des quotas à un utilisateur.
    'amount' peut être positif pour ajouter, ou négatif pour retirer.
    """
    column_name = f"quota_{request.quota_type}"
    
    async with db.get_connection() as conn:
        user_cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (request.email,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail=f"Utilisateur avec l'email '{request.email}' introuvable.")
            
        user_id = user_row.get("id") if isinstance(user_row, dict) else user_row[0]
        
        try:
            update_query = f"UPDATE users SET {column_name} = COALESCE({column_name}, 0) + %s WHERE id = %s RETURNING {column_name}"
            result_cursor = await db.execute(conn, update_query, (request.amount, user_id))
            new_balance_row = await result_cursor.fetchone()
            new_balance = new_balance_row.get(column_name) if new_balance_row else "inconnu"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur base de données : {e}")

    if request.amount > 0:
        background_tasks.add_task(send_quota_recharge_email, request.email, request.amount, request.quota_type)

    return {
        "status": "success",
        "message": f"{request.amount} crédits '{request.quota_type}' ont été traités pour {request.email}.",
        "new_balance": new_balance
    }
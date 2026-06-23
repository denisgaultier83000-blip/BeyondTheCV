from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime
import stripe, json
import httpx

from security import require_admin_user
from database import db
from .ai_generator import ai_service

router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin_user)] # Protège toutes les routes de ce routeur
)

class CreditQuotaRequest(BaseModel):
    email: EmailStr
    quota_type: Literal["pitch", "qa", "mes", "negotiation", "regeneration", "update"]
    amount: int

class AdminSubscriptionRequest(BaseModel):
    action: Literal["extend", "cancel"]
    days: Optional[int] = 30

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

@router.get("/users")
async def admin_list_users(limit: int = 50, offset: int = 0):
    """[MODIFIÉ] 1. Gestion : Liste complète des utilisateurs avec pagination."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, """
            SELECT id, email, first_name, last_name, created_at, is_premium, is_active, 
                   subscription_expiration_date, credits, quota_pitch, quota_qa, quota_mes
            FROM users 
            ORDER BY created_at DESC LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = await cursor.fetchall()
        
        # Compte total pour la pagination côté client
        total_cursor = await db.execute(conn, "SELECT COUNT(*) FROM users")
        total_users = (await total_cursor.fetchone())[0]
        
    users_list = []
    for r in rows:
        user_dict = dict(r) if not isinstance(r, tuple) else {
            # [FIX] Assurer la compatibilité avec les différents drivers DB
            "id": r[0], "email": r[1], "first_name": r[2], "last_name": r[3], 
            "created_at": r[4], "is_premium": r[5], "is_active": r[6], 
            "subscription_expiration_date": r[7], "credits": r[8]
        }
        users_list.append(user_dict)
    return {"users": users_list}


@router.post("/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: str):
    """1. Gestion : Activer/Désactiver (Bannir) un utilisateur."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT is_active FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        
        current_status = row[0] if isinstance(row, tuple) else row.get("is_active", True)
        new_status = not bool(current_status)
        
        await db.execute(conn, "UPDATE users SET is_active = ? WHERE id = ?", (new_status, user_id))
        
    return {"status": "success", "user_id": user_id, "is_active": new_status}

@router.get("/stats")
async def admin_get_stats():
    """[MODIFIÉ] 2. Analytics : Statistiques globales pour le dashboard."""
    async with db.get_connection() as conn:
        c1 = await db.execute(conn, "SELECT COUNT(*) FROM users")
        total_users = (await c1.fetchone())[0] if c1 else 0
        
        # [AJOUT] Nombre d'analyses complètes lancées (basé sur la création de dossiers)
        c2 = await db.execute(conn, "SELECT COUNT(*) FROM job_applications")
        analyses_launched = (await c2.fetchone())[0] if c2 else 0

        # [AJOUT] Nombre de retours utilisateurs
        c3 = await db.execute(conn, "SELECT COUNT(*) FROM feedbacks")
        feedbacks_count = (await c3.fetchone())[0] if c3 else 0
        
        # [AJOUT] Statistiques du cache d'articles
        c4 = await db.execute(conn, "SELECT value FROM system_stats WHERE key = 'article_cache_hits' AND date = CURRENT_DATE")
        cache_hits_row = await c4.fetchone()
        cache_hits = cache_hits_row[0] if cache_hits_row else 0

        c5 = await db.execute(conn, "SELECT value FROM system_stats WHERE key = 'article_cache_misses' AND date = CURRENT_DATE")
        cache_misses_row = await c5.fetchone()
        cache_misses = cache_misses_row[0] if cache_misses_row else 0

        # [AJOUT] Calcul du Hit Ratio du cache
        total_cache_requests = cache_hits + cache_misses
        cache_hit_ratio = (cache_hits / total_cache_requests) * 100 if total_cache_requests > 0 else 0

        # [NOUVEAU] KPI Financiers & Coûts IA
        # Note: Ces requêtes supposent l'existence de tables 'payments' et de colonnes de coût dans 'users'
        try:
            c6 = await db.execute(conn, "SELECT SUM(amount) FROM payments WHERE created_at >= date_trunc('month', CURRENT_DATE)")
            revenue_month = (await c6.fetchone())[0] or 0
            c7 = await db.execute(conn, "SELECT SUM(total_ia_cost) FROM users") # Supposant une colonne 'total_ia_cost'
            ai_cost_total = (await c7.fetchone())[0] or 0
            avg_ai_cost_per_user = (ai_cost_total / total_users) if total_users > 0 else 0
        except Exception:
            revenue_month = 0
            avg_ai_cost_per_user = 0

    return {
        "total_users": total_users,
        "analyses_launched": analyses_launched,
        "feedbacks_count": feedbacks_count,
        "cache_hits": cache_hits,
        "cache_misses": cache_misses,
        "cache_hit_ratio": round(cache_hit_ratio, 2)
        "revenue_month": revenue_month / 100, # Conversion de centimes en euros
        "avg_ai_cost_per_user": round(avg_ai_cost_per_user, 2)
    }

@router.get("/cache-history")
async def admin_get_cache_history(days: int = 7):
    """[NOUVEAU] Récupère l'historique des hits/misses du cache sur les N derniers jours."""
    async with db.get_connection() as conn:
        # Assurez-vous que la table system_stats a bien une colonne 'date'
        # et que 'key' et 'date' forment une clé primaire composite.
        cursor = await db.execute(conn, """
            SELECT date,
                   SUM(CASE WHEN key = 'article_cache_hits' THEN value ELSE 0 END) AS hits,
                   SUM(CASE WHEN key = 'article_cache_misses' THEN value ELSE 0 END) AS misses
            FROM system_stats
            WHERE key IN ('article_cache_hits', 'article_cache_misses')
              AND date >= CURRENT_DATE - INTERVAL '? days'
            GROUP BY date
            ORDER BY date ASC
        """, (days,))
        rows = await cursor.fetchall()

    history = []
    for row in rows:
        hits = row[1]
        misses = row[2]
        total = hits + misses
        hit_ratio = (hits / total) * 100 if total > 0 else 0
        history.append({"date": row[0].isoformat(), "hits": hits, "misses": misses, "hit_ratio": round(hit_ratio, 2)})

    return {"cache_history": history}

@router.get("/recent-users")
async def get_recent_users(limit: int = 5):
    """[NOUVEAU] Récupère les X derniers utilisateurs inscrits."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT id, email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = await cursor.fetchall()
    users = [dict(row) for row in rows]
    return {"users": users}

@router.post("/users/{user_id}/subscription")
async def admin_manage_subscription(user_id: str, req: AdminSubscriptionRequest):
    """3. Abonnements : Prolonger ou annuler manuellement un abonnement (SAV)."""
    async with db.get_connection() as conn:
        if req.action == "extend":
            days = req.days or 30
            await db.execute(conn, f"""
                UPDATE users 
                SET is_premium = TRUE, 
                    subscription_status = 'active',
                    subscription_expiration_date = GREATEST(COALESCE(subscription_expiration_date, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + INTERVAL '{days} days'
                WHERE id = ?
            """, (user_id,))
            msg = f"Abonnement prolongé de {days} jours."
        elif req.action == "cancel":
            await db.execute(conn, """
                UPDATE users 
                SET is_premium = FALSE, 
                    subscription_status = 'expired',
                    subscription_expiration_date = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (user_id,))
            msg = "Abonnement annulé manuellement."
            
    return {"status": "success", "message": msg}

@router.delete("/users/{user_id}/cache")
async def admin_purge_user_cache(user_id: str):
    """4. Debug : Purger le cache IA d'un utilisateur en cas de bug de génération."""
    async with db.get_connection() as conn:
        await db.execute(conn, "DELETE FROM generation_cache WHERE user_id = ?", (user_id,))
    return {"status": "success", "message": f"Cache purgé pour l'utilisateur."}

@router.get("/health-check")
async def admin_health_check():
    """4. Debug : Ping global des fournisseurs (Stripe, OpenAI, Gemini, Serper)."""
    statuses = {"stripe": "unknown", "openai": "unknown", "serper": "unknown", "gemini": "unknown"}
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if stripe.api_key:
        try:
            stripe.Balance.retrieve()
            statuses["stripe"] = "ok"
        except Exception as e:
            statuses["stripe"] = f"error: {str(e)}"
    else:
        statuses["stripe"] = "missing_key"

    if ai_service.openai_client:
        try:
            await ai_service.generate("Ping", provider="openai")
            statuses["openai"] = "ok"
        except Exception as e:
            statuses["openai"] = f"error: {str(e)}"
    else:
        statuses["openai"] = "missing_key"
        
    if ai_service.gemini_client:
        try:
            await ai_service.generate("Ping", provider="gemini")
            statuses["gemini"] = "ok"
        except Exception as e:
            statuses["gemini"] = f"error: {str(e)}"
    else:
        statuses["gemini"] = "missing_key"

    serper_key = os.getenv("SERPER_API_KEY")
    if serper_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post("https://google.serper.dev/search", headers={"X-API-KEY": serper_key}, json={"q": "ping"})
                if resp.status_code == 200:
                    statuses["serper"] = "ok"
                else:
                    statuses["serper"] = f"error: HTTP {resp.status_code}"
        except Exception as e:
            statuses["serper"] = f"error: {str(e)}"
    else:
        statuses["serper"] = "missing_key"

    return {"services": statuses}

@router.get("/cache/stats", response_model=dict)
async def get_cache_stats():
    """
    [NOUVEAU] Fournit les statistiques de performance globales du cache des articles (OSINT).
    Calcule le total sur toute la période, pas seulement la journée en cours.
    """
    try:
        async with db.get_connection() as conn:
            # Récupère le total des hits et des misses sur toute la période
            hits_row = await db.fetchone(conn, "SELECT SUM(value) FROM system_stats WHERE key = 'article_cache_hits'")
            misses_row = await db.fetchone(conn, "SELECT SUM(value) FROM system_stats WHERE key = 'article_cache_misses'")

            total_hits = hits_row[0] if hits_row and hits_row[0] is not None else 0
            total_misses = misses_row[0] if misses_row and misses_row[0] is not None else 0
            
            total_requests = total_hits + total_misses
            hit_ratio = (total_hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "total_hits": total_hits,
                "total_misses": total_misses,
                "total_requests": total_requests,
                "hit_ratio_percent": round(hit_ratio, 2)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")
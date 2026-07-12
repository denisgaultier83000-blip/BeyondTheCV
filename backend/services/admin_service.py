from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks, Request, Query
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timedelta, timezone
import stripe, json
import httpx, asyncio
from db_schemas import PaginatedUsersResponse, AiCostHistoryResponse, DailyCost
 
from security import require_admin_user
from database import db
from .ai_generator import ai_service
from .audit_service import audit_service

router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin_user)] # [FIX] Protège toutes les routes de ce routeur
)

class CreditUserRequest(BaseModel):
    email: EmailStr
    amount: int

class AdminSubscriptionRequest(BaseModel):
    action: Literal["extend", "cancel"]
    days: Optional[int] = 30

def send_credit_recharge_email(to_email: str, amount: int):
    """Envoie un email de notification pour un rechargement de crédits."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if not all([smtp_host, smtp_user, smtp_pass]):
        print("[EMAIL WARNING] Configuration SMTP manquante, email de recharge non envoyé.")
        return
    
    msg = MIMEMultipart("alternative")
    msg["From"] = f"Support BeyondTheCV <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "🎁 Votre compte a été rechargé !"

    frontend_url = os.getenv("FRONTEND_URL", "https://beyondthecv.app")
    logo_url = f"{frontend_url}/logo.png"
    current_year = datetime.now(timezone.utc).year

    # Version texte simple pour les anciens clients mail
    plain_body = f"""Bonjour,

Bonne nouvelle ! Le support de BeyondTheCV vient de créditer votre compte.

Vous avez reçu : +{amount} crédits de simulation.

Vous pouvez dès à présent reprendre votre entraînement sur la plateforme :
{frontend_url}/candidate

Bons entretiens et à bientôt,
L'équipe BeyondTheCV"""
    
    # Version HTML avec le logo et les couleurs de la marque
    html_body = f"""
    <!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Votre compte a été rechargé !</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f8fafc;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;"><tr><td align="center" style="padding: 30px 20px; border-bottom: 1px solid #e2e8f0;"><img src="{logo_url}" alt="BeyondTheCV Logo" style="height: 40px; width: auto;"></td></tr><tr><td style="padding: 40px 30px; color: #446285; font-size: 16px; line-height: 1.6;"><h1 style="color: #0F2650; font-size: 24px; margin: 0 0 20px 0;">Bonne nouvelle !</h1><p style="margin: 0 0 20px 0;">Le support de BeyondTheCV vient de créditer votre compte.</p><div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;"><p style="margin: 0; font-size: 14px; color: #446285;">Vous avez reçu :</p><p style="margin: 10px 0 0 0; font-size: 28px; font-weight: bold; color: #0F2650;">+{amount} crédits de simulation</p></div><p style="margin: 30px 0;">Vous pouvez dès à présent reprendre votre entraînement sur la plateforme et continuer à vous préparer pour vos entretiens.</p><div style="text-align: center;"><a href="{frontend_url}/candidate" target="_blank" style="background-color: #0F2650; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reprendre l'entraînement</a></div><p style="margin: 30px 0 10px 0;">À bientôt,<br>L’équipe BeyondTheCV</p></td></tr><tr><td align="center" style="padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;"><p style="margin: 0;">© {current_year} BeyondTheCV. Tous droits réservés.</p></td></tr></table></td></tr></table></body></html>
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

@router.post("/credit-user")
async def credit_user(
    credit_request: CreditUserRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    admin_user: dict = Depends(require_admin_user)
):
    """
    Crédite manuellement des crédits à un utilisateur.
    'amount' peut être positif pour ajouter, ou négatif pour retirer.
    """
    async with db.get_connection() as conn:
        user_cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (credit_request.email,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail=f"Utilisateur avec l'email '{credit_request.email}' introuvable.")
            
        user_id = user_row.get("id") if isinstance(user_row, dict) else user_row[0]
        
        try:
            # [CORRECTIF] Séparation de la mise à jour et de la lecture pour une meilleure compatibilité (SQLite ne supporte pas RETURNING).
            # 1. Mettre à jour le solde
            update_query = "UPDATE users SET credits = COALESCE(credits, 0) + ? WHERE id = ?"
            await db.execute(conn, update_query, (credit_request.amount, user_id))
            
            # 2. Récupérer le nouveau solde
            balance_cursor = await db.execute(conn, "SELECT credits FROM users WHERE id = ?", (user_id,))
            new_balance_row = await balance_cursor.fetchone()
            new_balance = new_balance_row.get('credits') if new_balance_row else "inconnu"

            # Log audit
            await audit_service.log_admin_action(
                request=request,
                admin_user=admin_user,
                action="CREDIT_USER",
                target_user_id=user_id,
                target_user_email=credit_request.email,
                details={"amount": credit_request.amount, "new_balance": new_balance}
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur base de données : {e}")

    if credit_request.amount > 0:
        background_tasks.add_task(send_credit_recharge_email, credit_request.email, credit_request.amount)

    return {
        "status": "success",
        "message": f"{credit_request.amount} crédits ont été traités pour {credit_request.email}.",
        "new_balance": new_balance
    }

@router.get("/billing")
async def admin_get_billing_history(limit: int = 50, offset: int = 0):
    """[NOUVEAU] Récupère l'historique des paiements."""
    # Cette route suppose une table `payments` qui est créée par le service de paiement (Stripe Webhook)
    query = """
        SELECT p.id, p.user_id, u.email, p.amount_paid, p.currency, p.status, p.offer_name, p.purchase_date, p.stripe_charge_id
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.purchase_date DESC
        LIMIT ? OFFSET ?
    """
    count_query = "SELECT COUNT(*) FROM payments"
    
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, query, (limit, offset))
            rows = await cursor.fetchall()
            
            total_cursor = await db.execute(conn, count_query)
            total_row = await total_cursor.fetchone()
            total_payments = list(total_row.values())[0] if total_row else 0

        payments = [dict(row) for row in rows]
        return {"payments": payments, "total": total_payments}
    except Exception as e:
        # Si la table n'existe pas, on renvoie une liste vide au lieu de crasher.
        print(f"Could not query payments table: {e}")
        return {"payments": [], "total": 0}

@router.get("/billing/webhook-status")
async def get_webhook_status():
    """
    [NOUVEAU] Vérifie l'état du webhook Stripe en regardant le dernier paiement enregistré.
    """
    try:
        async with db.get_connection() as conn:
            # On cherche le paiement le plus récent
            cursor = await db.execute(conn, "SELECT purchase_date FROM payments ORDER BY purchase_date DESC LIMIT 1")
            last_payment = await cursor.fetchone()

        if last_payment:
            last_payment_date = last_payment[0] if isinstance(last_payment, tuple) else last_payment.get("purchase_date")
            # Si le dernier paiement date de moins de 3 jours, on considère que c'est OK.
            if (datetime.now(timezone.utc) - last_payment_date) < timedelta(days=3):
                return {"status": "ok", "last_event": last_payment_date.isoformat()}
            else:
                return {"status": "inactive", "last_event": last_payment_date.isoformat()}
        return {"status": "inactive", "last_event": None}
    except Exception:
        return {"status": "error", "last_event": None}

@router.get("/generations")
async def admin_get_generations_history(limit: int = 20, offset: int = 0):
    """[MODIFIÉ] Récupère l'historique de toutes les générations IA avec plus de détails."""
    query = """
        SELECT 
            t.id, 
            t.user_id, 
            u.email as user_email, 
            t.task_type as module, 
            t.status, 
            t.created_at, 
            t.duration_ms, 
            t.estimated_cost,
            t.model_used,
            t.prompt_version,
            t.error_message,
            t.result,
            t.metadata
        FROM tasks t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
    """
    count_query = "SELECT COUNT(*) FROM tasks"
    
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, query, (limit, offset))
            rows = await cursor.fetchall()
            
            total_cursor = await db.execute(conn, count_query)
            total_row = await total_cursor.fetchone()
            total_generations = list(total_row.values())[0] if total_row else 0

        generations = [dict(row) for row in rows]
        return {"generations": generations, "total": total_generations}
    except Exception as e:
        print(f"Could not query tasks table: {e}")
        return {"generations": [], "total": 0}
        
@router.get("/users/{user_id}")
async def admin_get_user_details(user_id: str):
    """[NOUVEAU] Récupère les détails complets d'un utilisateur."""
    async with db.get_connection() as conn:
        # [FIX] La sous-requête pour login_count peut faire échouer toute la requête si la table n'existe pas.
        # On la retire de la requête principale pour la rendre plus robuste.
        cursor = await db.execute(conn, """
            SELECT id, email, first_name, last_name, created_at, last_login, subscription_status as status,
                   subscription_expiration_date as expiration_date, total_ia_cost, credits as sessions_remaining
            FROM users WHERE id = ?
        """, (user_id,))
        user = await cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    
    # [FIX] Accès sécurisé aux données pour gérer les tuples et les dictionnaires, comme dans les autres fonctions.
    # Le `dict(user)` précédent pouvait causer un TypeError.
    if isinstance(user, tuple):
        keys = [desc[0] for desc in cursor.description]
        user_data = dict(zip(keys, user))
    else:
        user_data = dict(user)

    user_data['offer_name'] = 'Stratégique' # Placeholder
    return user_data

@router.get("/users/{user_id}/generations")
async def admin_get_user_generations(user_id: str, limit: int = 5):
    """[MODIFIÉ] Récupère les dernières générations pour un utilisateur avec plus de détails."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, """
            SELECT id, status, created_at, task_type as module, estimated_cost, duration_ms, model_used, error_message 
            FROM tasks
            WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
        """, (user_id, limit))
        generations = await cursor.fetchall()

    # [FIX] Conversion sécurisée des résultats en dictionnaires.
    result_list = []
    for g in generations:
        if isinstance(g, tuple):
            result_list.append(dict(zip([desc[0] for desc in cursor.description], g)))
        else:
            result_list.append(dict(g))
    return {"generations": result_list}

@router.get("/users/{user_id}/cost-history")
async def admin_get_user_cost_history(user_id: str, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    """[NOUVEAU] Récupère l'historique paginé des coûts IA pour un utilisateur spécifique."""
    # Cette requête cible la table 'tasks' qui enregistre chaque génération IA.
    query = """
        SELECT 
            id, 
            created_at, 
            task_type, 
            status, 
            estimated_cost,
            model_used,
            duration_ms
        FROM tasks
        WHERE user_id = ? AND estimated_cost IS NOT NULL AND estimated_cost > 0
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    """
    count_query = "SELECT COUNT(*) FROM tasks WHERE user_id = ? AND estimated_cost IS NOT NULL AND estimated_cost > 0"
    
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, query, (user_id, limit, offset))
        rows = await cursor.fetchall()
        
        total_cursor = await db.execute(conn, count_query, (user_id,))
        total_row = await total_cursor.fetchone()
        total_records = list(total_row.values())[0] if total_row else 0

    costs = [dict(row) for row in rows]
    return {"costs": costs, "total": total_records}

@router.post("/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: str, request: Request, admin_user: dict = Depends(require_admin_user)):
    """1. Gestion : Activer/Désactiver (Bannir) un utilisateur."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT email, is_active FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        
        user_email = row['email']
        current_status = row['is_active']
        new_status = not bool(current_status)
        
        await db.execute(conn, "UPDATE users SET is_active = ? WHERE id = ?", (new_status, user_id))

        # Log audit
        await audit_service.log_admin_action(
            request=request,
            admin_user=admin_user,
            action="TOGGLE_USER_ACTIVE",
            target_user_id=user_id,
            target_user_email=user_email,
            details={"is_active": new_status}
        )
        
    return {"status": "success", "user_id": user_id, "is_active": new_status}

@router.get("/stats")
async def admin_get_stats():
    """[MODIFIÉ] 2. Analytics : Statistiques globales pour le dashboard."""
    async with db.get_connection() as conn:
        c1 = await db.execute(conn, "SELECT COUNT(*) FROM users")
        total_users_row = await c1.fetchone()
        total_users = list(total_users_row.values())[0] if total_users_row and total_users_row.values() else 0
        
        c2 = await db.execute(conn, "SELECT COUNT(*) FROM job_applications")
        analyses_launched_row = await c2.fetchone()
        analyses_launched = list(analyses_launched_row.values())[0] if analyses_launched_row and analyses_launched_row.values() else 0

        c3 = await db.execute(conn, "SELECT COUNT(*) FROM feedbacks")
        feedbacks_count_row = await c3.fetchone()
        feedbacks_count = list(feedbacks_count_row.values())[0] if feedbacks_count_row and feedbacks_count_row.values() else 0
        
        c4 = await db.execute(conn, "SELECT value FROM system_stats WHERE key = 'article_cache_hits' AND date = CURRENT_DATE")
        cache_hits_row = await c4.fetchone()
        cache_hits = list(cache_hits_row.values())[0] if cache_hits_row and cache_hits_row.values() else 0

        c5 = await db.execute(conn, "SELECT value FROM system_stats WHERE key = 'article_cache_misses' AND date = CURRENT_DATE")
        cache_misses_row = await c5.fetchone()
        cache_misses = list(cache_misses_row.values())[0] if cache_misses_row and cache_misses_row.values() else 0

        # [AJOUT] Calcul du Hit Ratio du cache
        total_cache_requests = cache_hits + cache_misses
        cache_hit_ratio = (cache_hits / total_cache_requests) * 100 if total_cache_requests > 0 else 0

        # [FIX] KPI Financiers & Coûts IA dans un bloc try/except pour éviter un crash
        # si les tables/colonnes ne sont pas encore migrées.
        try:
            c6 = await db.execute(conn, "SELECT SUM(amount_paid) FROM payments WHERE purchase_date >= date_trunc('month', CURRENT_DATE) AND status = 'succeeded'")
            revenue_row = await c6.fetchone()
            revenue_month = list(revenue_row.values())[0] if revenue_row and revenue_row.values() else 0
            revenue_month = revenue_month or 0

            c7 = await db.execute(conn, "SELECT SUM(total_ia_cost) FROM users") # Supposant une colonne 'total_ia_cost'
            ai_cost_row = await c7.fetchone()
            ai_cost_total = list(ai_cost_row.values())[0] if ai_cost_row and ai_cost_row.values() else 0
            ai_cost_total = ai_cost_total or 0
            
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
        "cache_hit_ratio": round(cache_hit_ratio, 2),
        "revenue_month": revenue_month / 100, # Conversion de centimes en euros
        "avg_ai_cost_per_user": round(avg_ai_cost_per_user, 2)
    }

@router.get("/cache-history")
async def admin_get_cache_history(days: int = 7):
    """[NOUVEAU] Récupère l'historique des hits/misses du cache sur les N derniers jours."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    async with db.get_connection() as conn:
        # Assurez-vous que la table system_stats a bien une colonne 'date'
        # et que 'key' et 'date' forment une clé primaire composite.
        cursor = await db.execute(conn, """
            SELECT date,
                   SUM(CASE WHEN key = 'article_cache_hits' THEN value ELSE 0 END) AS hits,
                   SUM(CASE WHEN key = 'article_cache_misses' THEN value ELSE 0 END) AS misses
            FROM system_stats
            WHERE key IN ('article_cache_hits', 'article_cache_misses')
              AND date >= ?
            GROUP BY date
            ORDER BY date ASC
        """, (start_date,))
        rows = await cursor.fetchall()

    history = []
    for row in rows:
        hits = row[1]
        misses = row[2]
        total = hits + misses
        hit_ratio = (hits / total) * 100 if total > 0 else 0
        history.append({"date": row[0].isoformat(), "hits": hits, "misses": misses, "hit_ratio": round(hit_ratio, 2)})

    return {"cache_history": history}

@router.get("/stats/ai-cost-history", response_model=AiCostHistoryResponse)
async def get_ai_cost_history(days: int = Query(30, ge=1, le=365)):
    """
    [NOUVEAU] Récupère l'historique des coûts IA agrégés par jour pour le graphique du dashboard.
    """
    # Sécurité : Limite le nombre de jours pour éviter les requêtes trop lourdes.
    if days > 365:
        days = 365

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # La fonction DATE() est compatible avec PostgreSQL et SQLite.
    query = """
        SELECT
            DATE(created_at) as day,
            SUM(estimated_cost) as daily_total
        FROM tasks
        WHERE created_at >= ?
          AND estimated_cost IS NOT NULL AND estimated_cost > 0
        GROUP BY day
        ORDER BY day ASC;
    """
    try:
        async with db.get_connection() as conn:
            rows = await db.execute(conn, query, (start_date,))
            # La méthode `fetchall` est nécessaire pour récupérer toutes les lignes du curseur
            history_rows = await rows.fetchall()
        return {"costs": [DailyCost(date=row['day'], total_cost=row['daily_total']) for row in history_rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {e}")

@router.get("/recent-users")
async def get_recent_users(limit: int = 5):
    """[NOUVEAU] Récupère les X derniers utilisateurs inscrits."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT id, email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = await cursor.fetchall()

    users = []
    for row in rows:
        # [FIX] Accès sécurisé aux données pour éviter les erreurs d'index.
        if isinstance(row, tuple):
            keys = [desc[0] for desc in cursor.description]
            user_dict = dict(zip(keys, row))
            users.append(user_dict)
        else: # row is a dict
            users.append(dict(row))

    return users

@router.post("/users/{user_id}/subscription")
async def admin_manage_subscription(user_id: str, req: AdminSubscriptionRequest, request: Request, admin_user: dict = Depends(require_admin_user)):
    """3. Abonnements : Prolonger ou annuler manuellement un abonnement (SAV)."""
    async with db.get_connection() as conn:
        user_cursor = await db.execute(conn, "SELECT email FROM users WHERE id = ?", (user_id,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        user_email = user_row['email']

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
            action = "EXTEND_SUBSCRIPTION"
            details = {"days": days}
        elif req.action == "cancel":
            await db.execute(conn, """
                UPDATE users 
                SET is_premium = FALSE, 
                    subscription_status = 'expired',
                    subscription_expiration_date = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (user_id,))
            msg = "Abonnement annulé manuellement."
            action = "CANCEL_SUBSCRIPTION"
            details = {}
        
        # Log audit
        await audit_service.log_admin_action(
            request=request,
            admin_user=admin_user,
            action=action,
            target_user_id=user_id,
            target_user_email=user_email,
            details=details
        )

    return {"status": "success", "message": msg}

@router.delete("/users/{user_id}/cache")
async def admin_purge_user_cache(user_id: str, request: Request, admin_user: dict = Depends(require_admin_user)):
    """4. Debug : Purger le cache IA d'un utilisateur en cas de bug de génération."""
    async with db.get_connection() as conn:
        user_cursor = await db.execute(conn, "SELECT email FROM users WHERE id = ?", (user_id,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        user_email = user_row['email']

        await db.execute(conn, "DELETE FROM generation_cache WHERE user_id = ?", (user_id,))

        # Log audit
        await audit_service.log_admin_action(
            request=request,
            admin_user=admin_user,
            action="PURGE_USER_CACHE",
            target_user_id=user_id,
            target_user_email=user_email,
            details={}
        )

    return {"status": "success", "message": f"Cache purgé pour l'utilisateur."}

@router.delete("/users/{user_id}/cache")
async def admin_purge_user_cache(user_id: str, request: Request, admin_user: dict = Depends(require_admin_user)):
    """4. Debug : Purger le cache IA d'un utilisateur en cas de bug de génération."""
    async with db.get_connection() as conn:
        user_cursor = await db.execute(conn, "SELECT email FROM users WHERE id = ?", (user_id,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        user_email = user_row['email']

        await db.execute(conn, "DELETE FROM generation_cache WHERE user_id = ?", (user_id,))

        # Log audit
        await audit_service.log_admin_action(
            request=request,
            admin_user=admin_user,
            action="PURGE_USER_CACHE",
            target_user_id=user_id,
            target_user_email=user_email,
            details={}
        )

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


async def admin_list_users(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None,
    offer: Optional[str] = None
):
    """Service pour lister les utilisateurs avec filtres et pagination."""
    params = []
    where_clauses = []

    if search:
        where_clauses.append("(email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?)")
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])

    if status:
        where_clauses.append("subscription_status = ?")
        params.append(status)

    # Le filtre 'offer' sera ajouté ici si la colonne existe dans la table 'users'

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT id, email, first_name, last_name, created_at, updated_at, is_premium, is_active,
               subscription_status, subscription_expiration_date, subscription_extension_count,
               last_login, total_ia_cost
        FROM users
        {where_sql}
        ORDER BY created_at DESC LIMIT ? OFFSET ?
    """

    where_params = tuple(params)
    pagination_params = list(where_params)
    pagination_params.extend([limit, offset])

    async with db.get_connection() as conn:
        cursor = await db.execute(conn, query, tuple(pagination_params))
        rows = await cursor.fetchall()

        count_query = f"SELECT COUNT(*) FROM users {where_sql}"
        total_cursor = await db.execute(conn, count_query, where_params)
        total_row = await total_cursor.fetchone()
        total_users = list(total_row.values())[0] if total_row else 0

    users_list = [dict(r) for r in rows]
    return {
        "users": users_list,
        "total": total_users,
        "page": (offset // limit) + 1,
        "size": limit
    }


@router.get("/users", response_model=PaginatedUsersResponse)
async def list_users_endpoint(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, description="Recherche par email, nom ou prénom"),
    status: str | None = Query(None, description="Filtre par statut d'abonnement (active, expired, etc.)"),
    offer: str | None = Query(None, description="Filtre par type d'offre (plan_id)")
):
    """
    Récupère une liste paginée des utilisateurs pour le panneau d'administration.
    Accessible uniquement par les administrateurs.
    """
    user_data = await admin_list_users(limit=limit, offset=offset, search=search, status=status, offer=offer)
    return user_data

from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime, timedelta
import stripe, json
import httpx

from security import require_admin_user, get_current_user
from database import db
from .ai_generator import ai_service
from .audit_service import audit_service

router = APIRouter(
    # [FIX EXPERT] Le préfixe "/api" est géré de manière centralisée dans main.py.
    # On ne garde que le préfixe spécifique à ce module pour former /api/admin.
    prefix="/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin_user)] # [FIX] Protège toutes les routes de ce routeur
)

class CreditQuotaRequest(BaseModel):
    email: EmailStr
    quota_type: Literal["pitch", "qa", "mes", "negotiation", "regeneration", "update"]
    amount: int

class AdminSubscriptionRequest(BaseModel):
    action: Literal["extend", "cancel"]
    days: Optional[int] = 30


async def _get_table_columns(conn, table_name: str) -> set[str]:
    cursor = await db.execute(
        conn,
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ?
        """,
        (table_name,)
    )
    rows = await cursor.fetchall()
    cols = set()
    for row in rows:
        if isinstance(row, tuple):
            cols.add(row[0])
        else:
            cols.add(row.get("column_name"))
    return cols

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
async def credit_user_quotas(
    credit_request: CreditQuotaRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Crédite manuellement des quotas à un utilisateur.
    'amount' peut être positif pour ajouter, ou négatif pour retirer.
    """
    column_name = f"quota_{credit_request.quota_type}"
    
    async with db.get_connection() as conn:
        user_cursor = await db.execute(conn, "SELECT id FROM users WHERE email = ?", (credit_request.email,))
        user_row = await user_cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail=f"Utilisateur avec l'email '{credit_request.email}' introuvable.")
            
        user_id = user_row.get("id") if isinstance(user_row, dict) else user_row[0]
        
        try:
            update_query = f"UPDATE users SET {column_name} = COALESCE({column_name}, 0) + ? WHERE id = ? RETURNING {column_name}"
            result_cursor = await db.execute(conn, update_query, (credit_request.amount, user_id))
            new_balance_row = await result_cursor.fetchone()
            new_balance = new_balance_row.get(column_name) if new_balance_row else "inconnu"

            # Log audit
            await audit_service.log_admin_action(
                request=request,
                admin_user=admin_user,
                action="CREDIT_QUOTAS",
                target_user_id=user_id,
                target_user_email=credit_request.email,
                details={"quota_type": credit_request.quota_type, "amount": credit_request.amount, "new_balance": new_balance}
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur base de données : {e}")

    if credit_request.amount > 0:
        background_tasks.add_task(send_quota_recharge_email, credit_request.email, credit_request.amount, credit_request.quota_type)

    return {
        "status": "success",
        "message": f"{credit_request.amount} crédits '{credit_request.quota_type}' ont été traités pour {credit_request.email}.",
        "new_balance": new_balance
    }

@router.get("/users")
async def admin_list_users(
    limit: int = 50, 
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None
):
    """[MODIFIÉ] 1. Gestion : Liste complète des utilisateurs avec pagination."""
    async with db.get_connection() as conn:
        user_columns = await _get_table_columns(conn, "users")

        params = []
        where_clauses = []

        if search:
            where_clauses.append("(email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])

        if status:
            if "subscription_status" in user_columns:
                where_clauses.append("subscription_status = ?")
                params.append(status)
            elif "is_premium" in user_columns:
                if status in {"active", "extended"}:
                    where_clauses.append("COALESCE(is_premium, FALSE) = TRUE")
                elif status == "expired":
                    where_clauses.append("COALESCE(is_premium, FALSE) = FALSE")

        status_expr = (
            "subscription_status"
            if "subscription_status" in user_columns
            else "CASE WHEN COALESCE(is_premium, FALSE) THEN 'active' ELSE 'expired' END AS subscription_status"
        )
        expiration_expr = (
            "subscription_expiration_date"
            if "subscription_expiration_date" in user_columns
            else "NULL::timestamp AS subscription_expiration_date"
        )
        sessions_expr = (
            "quota_qa AS sessions_remaining"
            if "quota_qa" in user_columns
            else ("credits AS sessions_remaining" if "credits" in user_columns else "0 AS sessions_remaining")
        )
        ia_cost_expr = (
            "total_ia_cost"
            if "total_ia_cost" in user_columns
            else "0::double precision AS total_ia_cost"
        )
        is_active_expr = (
            "is_active"
            if "is_active" in user_columns
            else "TRUE AS is_active"
        )

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"""
                SELECT id, email, first_name, last_name, created_at, {is_active_expr},
                       {status_expr}, {expiration_expr}, last_login, {ia_cost_expr}, {sessions_expr}
                FROM users
                {where_sql}
                ORDER BY created_at DESC LIMIT ? OFFSET ?
            """

        where_params = tuple(params)
        pagination_params = list(where_params)
        pagination_params.extend([limit, offset])

        cursor = await db.execute(conn, query, tuple(pagination_params))
        rows = await cursor.fetchall()
        
        # Compte total pour la pagination côté client, en appliquant les filtres.
        count_query = f"SELECT COUNT(*) FROM users {where_sql}"
        total_cursor = await db.execute(conn, count_query, where_params)
        total_row = await total_cursor.fetchone()
        # [FIX] Le driver DB retourne un dictionnaire. On accède à la valeur par `list(row.values())[0]` pour être robuste.
        total_users = list(total_row.values())[0] if total_row else 0
        
    users_list = []
    for r in rows:
        # [FIX] Accès sécurisé aux données pour éviter les erreurs d'index si le schéma change.
        # Le code précédent était fragile car il dépendait de l'ordre des colonnes.
        if isinstance(r, tuple):
            keys = [desc[0] for desc in cursor.description]
            user_dict = dict(zip(keys, r))
        else:
            user_dict = dict(r)

        # On s'assure que les champs essentiels ont une valeur par défaut
        user_dict.setdefault("is_premium", False)
        user_dict.setdefault("is_active", True)
        user_dict.setdefault("credits", 0)
        user_dict.setdefault("sessions_remaining", user_dict.get("credits", 0))
        user_dict.setdefault("subscription_status", "expired")
        user_dict.setdefault("subscription_expiration_date", None)
        user_dict.setdefault("last_login", None)
        user_dict.setdefault("total_ia_cost", 0)

        users_list.append(user_dict)
    return {"users": users_list, "total": total_users}

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
async def admin_get_billing_webhook_status():
    """Retourne un état de santé minimal des flux Stripe pour le dashboard admin."""
    last_payment_processed_at = None
    async with db.get_connection() as conn:
        try:
            cursor = await db.execute(
                conn,
                "SELECT MAX(purchase_date) AS last_payment_processed_at FROM payments WHERE status = 'succeeded'"
            )
            row = await cursor.fetchone()
            if row:
                if isinstance(row, tuple):
                    last_payment_processed_at = row[0]
                else:
                    last_payment_processed_at = row.get("last_payment_processed_at")
        except Exception as e:
            print(f"[ADMIN BILLING] webhook-status fallback: {e}", flush=True)

    return {
        "last_webhook_received_at": None,
        "last_payment_processed_at": last_payment_processed_at,
        "recent_failed_webhooks": [],
        "unactivated_payments": [],
        "activated_without_payment": []
    }


@router.get("/feedbacks")
async def admin_get_feedbacks(limit: int = 200, offset: int = 0):
    """Retourne les feedbacks utilisateurs pour le dashboard admin."""
    async with db.get_connection() as conn:
        feedback_columns = await _get_table_columns(conn, "feedbacks")
        status_expr = "f.status" if "status" in feedback_columns else "'new' AS status"

        cursor = await db.execute(conn, f"""
            SELECT
                f.id, f.feature, f.is_positive, f.comments, f.created_at,
                {status_expr},
                u.email AS user_email
            FROM feedbacks f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = await cursor.fetchall()

    result = []
    for row in rows:
        if isinstance(row, tuple):
            result.append(dict(zip([desc[0] for desc in cursor.description], row)))
        else:
            result.append(dict(row))
    return {"feedbacks": result}


@router.post("/feedbacks/{feedback_id}/archive")
async def admin_archive_feedback(feedback_id: int):
    """Archive un feedback, ou le supprime si la colonne status n'existe pas."""
    async with db.get_connection() as conn:
        feedback_columns = await _get_table_columns(conn, "feedbacks")
        if "status" in feedback_columns:
            cursor = await db.execute(
                conn,
                "UPDATE feedbacks SET status = 'archived' WHERE id = ? RETURNING id",
                (feedback_id,)
            )
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Feedback introuvable.")
        else:
            cursor = await db.execute(
                conn,
                "DELETE FROM feedbacks WHERE id = ? RETURNING id",
                (feedback_id,)
            )
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Feedback introuvable.")

    return {"status": "success", "feedback_id": feedback_id}

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
        user_columns = await _get_table_columns(conn, "users")
        status_expr = (
            "subscription_status AS status"
            if "subscription_status" in user_columns
            else "CASE WHEN COALESCE(is_premium, FALSE) THEN 'active' ELSE 'expired' END AS status"
        )
        expiration_expr = (
            "subscription_expiration_date AS expiration_date"
            if "subscription_expiration_date" in user_columns
            else "NULL::timestamp AS expiration_date"
        )
        sessions_expr = (
            "quota_qa AS sessions_remaining"
            if "quota_qa" in user_columns
            else ("credits AS sessions_remaining" if "credits" in user_columns else "0 AS sessions_remaining")
        )
        ia_cost_expr = (
            "total_ia_cost"
            if "total_ia_cost" in user_columns
            else "0::double precision AS total_ia_cost"
        )
        is_active_expr = (
            "is_active"
            if "is_active" in user_columns
            else "TRUE AS is_active"
        )
        is_admin_expr = (
            "is_admin"
            if "is_admin" in user_columns
            else "FALSE AS is_admin"
        )
        cgu_expr = (
            "cgu_cgv_acceptance_date"
            if "cgu_cgv_acceptance_date" in user_columns
            else "NULL::timestamp AS cgu_cgv_acceptance_date"
        )
        privacy_expr = (
            "privacy_policy_acceptance_date"
            if "privacy_policy_acceptance_date" in user_columns
            else "NULL::timestamp AS privacy_policy_acceptance_date"
        )

        cursor = await db.execute(conn, f"""
            SELECT id, email, first_name, last_name, created_at, last_login, {status_expr},
                   {expiration_expr}, {ia_cost_expr}, {sessions_expr}, {is_active_expr},
                   {is_admin_expr}, {cgu_expr}, {privacy_expr}
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

    user_data.setdefault("status", "expired")
    user_data.setdefault("expiration_date", None)
    user_data.setdefault("sessions_remaining", 0)
    user_data.setdefault("is_active", True)
    user_data.setdefault("is_admin", False)
    user_data.setdefault("cgu_cgv_acceptance_date", None)
    user_data.setdefault("privacy_policy_acceptance_date", None)
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


@router.post("/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: str, request: Request, admin_user: dict = Depends(get_current_user)):
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

def _val(row, default=0):
    if not row:
        return default
    if hasattr(row, 'values'):
        vals = list(row.values())
        return vals[0] if vals and len(vals) > 0 and vals[0] is not None else default
    if isinstance(row, (list, tuple)):
        return row[0] if len(row) > 0 and row[0] is not None else default
    if isinstance(row, dict):
        vals = list(row.values())
        return vals[0] if vals and len(vals) > 0 and vals[0] is not None else default
    return default


@router.get("/dashboard-stats")
@router.get("/stats")
async def admin_get_stats():
    """Calcul complet des 13 indicateurs de succès produit et statistiques globales."""
    async with db.get_connection() as conn:
        # Total utilisateurs non supprimés
        c1 = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")
        total_users = _val(await c1.fetchone(), 0)

        # Utilisateurs actifs
        c_act = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE is_active = TRUE AND deleted_at IS NULL")
        active_users = _val(await c_act.fetchone(), total_users)

        # Nouveaux utilisateurs sur 7 jours
        c_new7 = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL '7 days') AND deleted_at IS NULL")
        new_users_7d = _val(await c_new7.fetchone(), 0)

        # 1. Inscription -> Création 1ère candidature
        c_users_app = await db.execute(conn, "SELECT COUNT(DISTINCT user_id) FROM job_applications")
        users_with_app = _val(await c_users_app.fetchone(), 0)
        conversion_registration_to_application = round((users_with_app / total_users * 100), 1) if total_users > 0 else 0.0

        # Total candidatures
        c_tot_apps = await db.execute(conn, "SELECT COUNT(*) FROM job_applications")
        total_applications = _val(await c_tot_apps.fetchone(), 0)

        # 2. Candidature créée -> 1ère analyse
        c_apps_ana = await db.execute(conn, "SELECT COUNT(DISTINCT application_id) FROM documents WHERE application_id IS NOT NULL")
        apps_with_analysis = _val(await c_apps_ana.fetchone(), 0)
        if apps_with_analysis == 0 and total_applications > 0:
            c_apps_ana_alt = await db.execute(conn, "SELECT COUNT(*) FROM job_applications WHERE tasks_map IS NOT NULL OR session_hash IS NOT NULL")
            apps_with_analysis = _val(await c_apps_ana_alt.fetchone(), 0)

        conversion_application_to_analysis = round((apps_with_analysis / total_applications * 100), 1) if total_applications > 0 else 0.0

        # Total documents/analyses
        c_tot_docs = await db.execute(conn, "SELECT COUNT(*) FROM documents")
        total_documents = _val(await c_tot_docs.fetchone(), 0)
        if total_documents == 0:
            c_tot_prod = await db.execute(conn, "SELECT COUNT(*) FROM products")
            total_documents = _val(await c_tot_prod.fetchone(), 0)

        # 3. Nombre moyen d'analyses par candidature
        avg_analyses_per_application = round(total_documents / total_applications, 2) if total_applications > 0 else 0.0

        # 4. Utilisation du module entraînement
        try:
            c_train_sess = await db.execute(conn, "SELECT COUNT(*) FROM interview_sessions")
            total_training_sessions = _val(await c_train_sess.fetchone(), 0)
            c_train_u = await db.execute(conn, "SELECT COUNT(DISTINCT user_id) FROM interview_sessions")
            training_active_users = _val(await c_train_u.fetchone(), 0)
        except Exception:
            total_training_sessions = 0
            training_active_users = 0

        training_usage_rate = round((training_active_users / total_users * 100), 1) if total_users > 0 else 0.0
        training_module_usage = {
            "total_sessions": total_training_sessions,
            "active_users": training_active_users,
            "usage_rate": training_usage_rate
        }

        # 5. Nombre de débriefs
        try:
            c_debr = await db.execute(conn, "SELECT COUNT(*) FROM interview_debriefs")
            total_debriefs = _val(await c_debr.fetchone(), 0)
        except Exception:
            total_debriefs = 0

        debriefs_stats = {
            "total_debriefs": total_debriefs,
            "avg_debriefs_per_user": round(total_debriefs / total_users, 2) if total_users > 0 else 0.0
        }

        # 6. Rétention mensuelle
        c_ret = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE created_at <= (CURRENT_TIMESTAMP - INTERVAL '30 days') AND last_login >= (CURRENT_TIMESTAMP - INTERVAL '30 days') AND deleted_at IS NULL")
        retained_users = _val(await c_ret.fetchone(), 0)

        c_elig_ret = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE created_at <= (CURRENT_TIMESTAMP - INTERVAL '30 days') AND deleted_at IS NULL")
        eligible_retention_users = _val(await c_elig_ret.fetchone(), 0)

        monthly_retention_rate = round((retained_users / eligible_retention_users * 100), 1) if eligible_retention_users > 0 else 100.0

        # 7. Nombre moyen de candidatures préparées
        avg_applications_per_user = round(total_applications / total_users, 2) if total_users > 0 else 0.0

        # 8. Taux d'utilisation / de satisfaction des recommandations
        try:
            c_fb = await db.execute(conn, "SELECT COUNT(*), SUM(CASE WHEN is_positive = TRUE THEN 1 ELSE 0 END) FROM feedbacks")
            fb_row = await c_fb.fetchone()
            if fb_row and hasattr(fb_row, 'values'):
                fb_vals = list(fb_row.values())
                total_feedbacks = fb_vals[0] or 0
                pos_feedbacks = fb_vals[1] or 0
            elif fb_row:
                total_feedbacks = fb_row[0] or 0
                pos_feedbacks = fb_row[1] or 0
            else:
                total_feedbacks = 0
                pos_feedbacks = 0
        except Exception:
            total_feedbacks = 0
            pos_feedbacks = 0

        recommendations_usage_rate = round((pos_feedbacks / total_feedbacks * 100), 1) if total_feedbacks > 0 else 100.0

        # 9. Consommation moyenne des analyses
        avg_analysis_consumption = round((total_documents + total_training_sessions) / total_users, 1) if total_users > 0 else 0.0

        # 10. Churn
        c_churn = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE (subscription_status = 'expired' OR deleted_at IS NOT NULL) AND is_admin = FALSE")
        churned_users = _val(await c_churn.fetchone(), 0)
        churn_rate = round((churned_users / total_users * 100), 1) if total_users > 0 else 0.0

        # 11. Conversion essai/visiteur -> abonnement
        c_prem = await db.execute(conn, "SELECT COUNT(*) FROM users WHERE (is_premium = TRUE OR subscription_status = 'active') AND deleted_at IS NULL")
        premium_users = _val(await c_prem.fetchone(), 0)
        conversion_trial_to_sub = round((premium_users / total_users * 100), 1) if total_users > 0 else 0.0

        # 12. Coût IA moyen par utilisateur
        try:
            c_ai = await db.execute(conn, "SELECT SUM(total_ia_cost) FROM users WHERE deleted_at IS NULL")
            total_ai_cost = _val(await c_ai.fetchone(), 0.0) or 0.0
        except Exception:
            total_ai_cost = 0.0

        avg_ai_cost_per_user = round(total_ai_cost / total_users, 2) if total_users > 0 else 0.0

        # 13. Marge brute par abonnement
        sub_price_eur = 29.90
        gross_margin_per_sub = round(sub_price_eur - avg_ai_cost_per_user, 2)
        gross_margin_rate = round((gross_margin_per_sub / sub_price_eur * 100), 1) if sub_price_eur > 0 else 100.0

        # Chiffre d'affaires
        try:
            c_rev = await db.execute(conn, "SELECT SUM(price_paid_cents) FROM subscription_extensions WHERE created_at >= date_trunc('month', CURRENT_DATE)")
            rev_cents = _val(await c_rev.fetchone(), 0) or 0
            revenue_month = round(rev_cents / 100, 2)
        except Exception:
            revenue_month = round(premium_users * 29.90, 2)

        if revenue_month == 0 and premium_users > 0:
            revenue_month = round(premium_users * 29.90, 2)

        ai_cost_month = round(total_ai_cost, 2)

        # Cache stats
        try:
            c_hits = await db.execute(conn, "SELECT value FROM system_stats WHERE key = 'article_cache_hits' AND date = CURRENT_DATE")
            cache_hits = _val(await c_hits.fetchone(), 0) or 0

            c_misses = await db.execute(conn, "SELECT value FROM system_stats WHERE key = 'article_cache_misses' AND date = CURRENT_DATE")
            cache_misses = _val(await c_misses.fetchone(), 0) or 0
        except Exception:
            cache_hits = 0
            cache_misses = 0

        tot_cache = cache_hits + cache_misses
        cache_hit_ratio = round((cache_hits / tot_cache * 100), 1) if tot_cache > 0 else 0.0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "premium_users": premium_users,
        "new_users_7d": new_users_7d,
        "total_tasks": total_documents + total_training_sessions,
        "successful_generations": total_documents + total_training_sessions,
        "failed_generations": 0,
        "users_in_cost_alert": 0,
        "cache_hits": cache_hits,
        "cache_misses": cache_misses,
        "cache_hit_ratio": cache_hit_ratio,
        "revenue_month": revenue_month,
        "ai_cost_month": ai_cost_month,
        "avg_ai_cost_per_user": avg_ai_cost_per_user,
        "gross_margin": round(revenue_month - ai_cost_month, 2),

        # Structure dédiée des 13 KPIs Produit
        "kpis": {
            "conversion_registration_to_application": conversion_registration_to_application,
            "conversion_application_to_analysis": conversion_application_to_analysis,
            "avg_analyses_per_application": avg_analyses_per_application,
            "training_module_usage": training_module_usage,
            "debriefs_stats": debriefs_stats,
            "monthly_retention_rate": monthly_retention_rate,
            "avg_applications_per_user": avg_applications_per_user,
            "recommendations_usage_rate": recommendations_usage_rate,
            "avg_analysis_consumption": avg_analysis_consumption,
            "churn_rate": churn_rate,
            "conversion_trial_to_subscription": conversion_trial_to_sub,
            "avg_ai_cost_per_user": avg_ai_cost_per_user,
            "gross_margin_per_subscription": {
                "subscription_price_eur": sub_price_eur,
                "margin_eur": gross_margin_per_sub,
                "margin_rate": gross_margin_rate
            }
        }
    }

@router.get("/cache-history")
async def admin_get_cache_history(days: int = 7):
    """[NOUVEAU] Récupère l'historique des hits/misses du cache sur les N derniers jours."""
    start_date = datetime.now() - timedelta(days=days)
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
async def admin_manage_subscription(user_id: str, req: AdminSubscriptionRequest, request: Request, admin_user: dict = Depends(get_current_user)):
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
async def admin_purge_user_cache(user_id: str, request: Request, admin_user: dict = Depends(get_current_user)):
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


@router.get("/cache/shared-stats")
async def get_shared_cache_stats():
    """
    Statistiques des caches partagés (cross-utilisateurs) :
    entreprises, offres d'emploi, marché, et profils candidats.
    Affiche les hits, les entrées stockées et les économies IA estimées.
    """
    from .cache_service import get_cache_stats
    try:
        stats = await get_cache_stats()
        total_savings = sum(
            v.get("estimated_savings_eur", 0)
            for v in stats.values()
            if isinstance(v, dict)
        )
        return {
            "caches": stats,
            "total_estimated_savings_eur": round(total_savings, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur stats cache : {str(e)}")


@router.delete("/cache/company/{company_name}")
async def purge_company_cache(company_name: str, request: Request, admin_user: dict = Depends(get_current_user)):
    """Force la régénération de l'analyse d'une entreprise (supprime l'entrée du cache partagé)."""
    from .cache_service import _company_key
    cache_key = _company_key(company_name)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, "DELETE FROM company_analysis_cache WHERE cache_key = %s", (cache_key,))
        await audit_service.log_admin_action(
            request=request, admin_user=admin_user,
            action="PURGE_COMPANY_CACHE",
            target_user_id=None, target_user_email="",
            details={"company_name": company_name}
        )
        return {"status": "success", "message": f"Cache supprimé pour : {company_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refill-all-testers")
async def refill_all_testers(request: Request, admin_user: dict = Depends(get_current_user)):
    """Recharge tous les comptes actifs à 150 crédits + 5 candidatures."""
    try:
        async with db.get_connection() as conn:
            try:
                await db.execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_entreprises INTEGER DEFAULT 5;")
                await db.execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_offres INTEGER DEFAULT 5;")
            except Exception:
                pass
            cursor = await db.execute(
                conn,
                """
                UPDATE users SET
                    credits            = 150,
                    quota_pitch        = 150,
                    quota_qa           = 150,
                    quota_mes          = 150,
                    quota_negotiation  = 150,
                    quota_regeneration = 150,
                    quota_update       = 150,
                    quota_entreprises  = 5,
                    quota_offres       = 5,
                    is_tester          = TRUE
                WHERE deleted_at IS NULL
                RETURNING id
                """
            )
            updated = await cursor.fetchall()
            count = len(updated) if updated else 0
        await audit_service.log_admin_action(
            request=request, admin_user=admin_user,
            action="REFILL_ALL_TESTERS",
            target_user_id=None, target_user_email="",
            details={"updated_count": count}
        )
        return {"status": "success", "updated_count": count, "message": f"{count} comptes recharges a 30 credits."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

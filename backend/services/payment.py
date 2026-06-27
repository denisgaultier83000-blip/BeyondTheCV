import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from ..database import db
from ..models import PaymentIntentRequest
from ..security import get_current_user

router = APIRouter(tags=["Payment"])

# [FIX EXPERT] Centralisation des prix pour la sécurité et la maintenance.
# Le backend est la seule source de vérité pour les prix.
PLAN_PRICES = {
    "express": 3900,
    "strategic": 11900,
    "intensive": 21900,
    "renewal": 3000, # 30€
    "recharge_5": 1500,
    "recharge_10": 2500,
    "recharge_20": 4500,
    "recharge_30": 6000,
    "recharge_60": 9900,
}

@router.post("/api/create-payment-intent")
async def create_payment_intent(request: PaymentIntentRequest, current_user: dict = Depends(get_current_user)):
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe config missing")
    
    plan_name = request.plan_name or "strategic"
    if plan_name not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail=f"Plan '{plan_name}' invalide")
    
    actual_amount = PLAN_PRICES[plan_name]
    
    try:
        stripe.api_key = stripe_key
        intent = stripe.PaymentIntent.create(
            amount=actual_amount,
            currency=request.currency,
            automatic_payment_methods={"enabled": True},
            metadata={
                "user_id": current_user["id"],
                "plan_name": plan_name
            }
        )
        return {"clientSecret": intent.client_secret}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/webhook/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret missing")

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload/signature")

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        user_id = payment_intent.get("metadata", {}).get("user_id")
        plan_name = payment_intent.get("metadata", {}).get("plan_name", "strategic")
        
        # Mapping des séances selon l'offre commerciale
        sessions_to_add = 0
        if plan_name == "express": sessions_to_add = 3
        elif plan_name == "strategic": sessions_to_add = 15
        elif plan_name == "intensive": sessions_to_add = 30
        elif plan_name == "renewal": sessions_to_add = 15
        # Nouveaux plans de recharge de séances
        elif plan_name == "recharge_5": sessions_to_add = 5
        elif plan_name == "recharge_10": sessions_to_add = 10
        elif plan_name == "recharge_20": sessions_to_add = 20
        elif plan_name == "recharge_30": sessions_to_add = 30
        elif plan_name == "recharge_60": sessions_to_add = 60

        if user_id and sessions_to_add > 0:
            async with db.get_connection() as conn:
                # 1. Protection contre les appels doublons de Stripe (Idempotence)
                cursor = await db.execute(conn, "SELECT 1 FROM subscription_extensions WHERE transaction_id = ?", (payment_intent.id,))
                if await cursor.fetchone():
                    return {"status": "success", "message": "Already processed"}

                # 2. Mise à jour réelle incluant le temps d'expiration (120 jours) et le crédit de séances
                await db.execute(conn, """
                    UPDATE users 
                    SET is_premium = TRUE, 
                        subscription_status = 'active',
                        subscription_expiration_date = GREATEST(COALESCE(subscription_expiration_date, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + INTERVAL '120 days',
                        quota_pitch = COALESCE(quota_pitch, 0) + ?,
                        quota_qa = COALESCE(quota_qa, 0) + ?,
                        quota_mes = COALESCE(quota_mes, 0) + ?,
                        quota_negotiation = COALESCE(quota_negotiation, 0) + ?,
                        quota_regeneration = COALESCE(quota_regeneration, 0) + ?,
                        quota_update = COALESCE(quota_update, 0) + ?
                    WHERE id = ?
                """, (sessions_to_add, sessions_to_add * 2, sessions_to_add, sessions_to_add, sessions_to_add, sessions_to_add, user_id))

                # 3. Mémoriser la transaction pour bloquer un éventuel rejeu
                import uuid
                await db.execute(conn, "INSERT INTO subscription_extensions (id, user_id, plan_id, new_expiration_date, transaction_id, payment_status) VALUES (?, ?, 'plan_3_months', CURRENT_TIMESTAMP + INTERVAL '90 days', ?, 'completed')", (str(uuid.uuid4()), user_id, payment_intent.id))

    return {"status": "success"}
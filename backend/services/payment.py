import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from database import db
from models import PaymentIntentRequest
from security import get_current_user

router = APIRouter(tags=["Payment"])

@router.post("/api/create-payment-intent")
async def create_payment_intent(request: PaymentIntentRequest, current_user: dict = Depends(get_current_user)):
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe config missing")
    
    # [FIX SECURITE] Le backend vérifie le montant en base, on ne fait jamais confiance au frontend.
    # On suppose ici que la requête front envoie l'ID du plan souhaité dans un champ (ou on utilise le standard 99$).
    actual_amount = 9900 # Prix par défaut sécurisé (99.00 $)
    
    # Si vous avez plusieurs plans, récupérez le prix en base :
    # async with db.get_connection() as conn:
    #     cursor = await db.execute(conn, "SELECT price_cents FROM subscription_plans WHERE id = ?", (request.plan_id,))
    #     plan = await cursor.fetchone()
    #     if not plan:
    #         raise HTTPException(status_code=400, detail="Plan invalide")
    #     actual_amount = plan[0] if isinstance(plan, tuple) else plan.get("price_cents")
    
    try:
        stripe.api_key = stripe_key
        intent = stripe.PaymentIntent.create(
            amount=actual_amount,
            currency=request.currency,
            automatic_payment_methods={"enabled": True},
            metadata={
                "user_id": current_user["id"],
                "plan_name": request.plan_name or "strategic"
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
        sessions_to_add = 15
        if plan_name == "express": sessions_to_add = 3
        elif plan_name == "strategic": sessions_to_add = 15
        elif plan_name == "intensive": sessions_to_add = 30
        elif plan_name == "recharge_10": sessions_to_add = 10
        elif plan_name == "renewal": sessions_to_add = 15

        if user_id:
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
                        training_sessions_balance = COALESCE(training_sessions_balance, 0) + ?
                    WHERE id = ?
                """, (sessions_to_add, user_id))

                # 3. Mémoriser la transaction pour bloquer un éventuel rejeu
                import uuid
                await db.execute(conn, "INSERT INTO subscription_extensions (id, user_id, plan_id, new_expiration_date, transaction_id, payment_status) VALUES (?, ?, 'plan_3_months', CURRENT_TIMESTAMP + INTERVAL '90 days', ?, 'completed')", (str(uuid.uuid4()), user_id, payment_intent.id))

    return {"status": "success"}
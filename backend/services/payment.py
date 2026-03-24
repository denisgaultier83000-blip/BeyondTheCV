import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from database import db
from models import PaymentIntentRequest
from security import get_current_user

router = APIRouter(tags=["Payment"])

@router.post("/api/create-payment-intent")
def create_payment_intent(request: PaymentIntentRequest, current_user: dict = Depends(get_current_user)):
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe config missing")
    
    try:
        stripe.api_key = stripe_key
        intent = stripe.PaymentIntent.create(
            amount=request.amount,
            currency=request.currency,
            automatic_payment_methods={"enabled": True},
            metadata={"user_id": current_user["id"]}
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
        if user_id:
            async with db.get_connection() as conn:
                await db.execute(conn, "UPDATE users SET is_premium = TRUE WHERE id = ?", (user_id,))
    return {"status": "success"}
import pytest
from fastapi.testclient import TestClient
from unittest.mock import ANY

# --- Test 6 (Nouveau): Création d'une intention de paiement ---
def test_create_payment_intent(test_client: TestClient, mocker):
    """Vérifie la création d'une intention de paiement via l'API Stripe mockée."""
    mock_intent = mocker.patch("stripe.PaymentIntent.create")

    # Stripe retourne un objet, pas un dict. On utilise un Mock pour simuler l'accès par attribut .client_secret
    mock_return = mocker.Mock()
    mock_return.client_secret = "cs_test_123"
    mock_intent.return_value = mock_return

    mocker.patch("os.getenv", return_value="sk_test_dummy_key")

    response = test_client.post("/api/create-payment-intent", json={"amount": 11900, "currency": "eur"})

    assert response.status_code == 200
    assert response.json() == {"clientSecret": "cs_test_123"}

    mock_intent.assert_called_once()
    call_args, call_kwargs = mock_intent.call_args_list[0]
    assert call_kwargs["amount"] == 11900
    assert call_kwargs["metadata"]["user_id"] == "test-user-id"

# --- Test 7 (Nouveau): Webhook Stripe pour paiement réussi ---
def test_stripe_webhook_success(test_client: TestClient, mock_db, mocker):
    """Vérifie que le webhook met à jour le statut premium de l'utilisateur."""
    class PaymentIntentDict(dict):
        def __init__(self):
            super().__init__()
            self.id = "pi_test_123"
            self.metadata = {"user_id": "user_to_upgrade", "plan_name": "strategic"}

        def get(self, key, default=None):
            if key == "id":
                return self.id
            if key == "metadata":
                return self.metadata
            return default

    mocker.patch("stripe.Webhook.construct_event", return_value={
        "type": "payment_intent.succeeded",
        "data": {
            "object": PaymentIntentDict()
        }
    })
    mocker.patch("os.getenv", return_value="whsec_test_dummy_secret")

    response = test_client.post("/api/webhook/stripe", content="{}", headers={"Stripe-Signature": "dummy"})

    assert response.status_code == 200

    calls = [str(call) for call in mock_db['execute'].await_args_list]
    assert any("UPDATE users" in c and "is_premium" in c for c in calls)
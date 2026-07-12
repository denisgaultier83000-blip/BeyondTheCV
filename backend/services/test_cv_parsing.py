import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from security import get_current_user

from fastapi.testclient import TestClient
from main import app  # Assurez-vous que votre fichier principal s'appelle main.py et qu'il expose l'app FastAPI

# Crée un client de test pour votre application FastAPI
client = TestClient(app)

# --- Données de Mock ---

# Un utilisateur de test simulé qui sera retourné par le mock de `get_current_user`
MOCK_USER = {"id": "user-123", "email": "test@example.com", "is_admin": False}

# Le JSON de retour attendu de l'IA en cas de succès
MOCK_AI_SUCCESS_RESPONSE = {
    "personal_info": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@email.com"
    },
    "experiences": [],
    "educations": [],
    "skills": ["Python", "FastAPI"],
    "cost": 0.01 # Le coût est important pour les tests de remboursement
}

# --- Tests ---

@pytest.fixture(autouse=True)
def override_dependencies():
    """
    Ce fixture s'exécute automatiquement pour chaque test.
    Il remplace les dépendances externes (DB, sécurité, IA) par des mocks.
    """
    # Mock de la sécurité pour ne pas dépendre du login
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    
    # On utilise yield pour que les mocks soient actifs pendant le test, puis nettoyés
    yield
    
    # Nettoyage après le test
    app.dependency_overrides = {}

@patch("services.cv_services.consume_credit", new_callable=AsyncMock)
@patch("services.cv_services.refund_credit", new_callable=AsyncMock)
@patch("services.cv_services.get_cached_content", new_callable=AsyncMock, return_value=None)
@patch("services.cv_services.set_cached_content", new_callable=AsyncMock)
@patch("services.ai_generator.ai_service.generate_from_pdf_or_image", new_callable=AsyncMock)
def test_parse_cv_success(mock_ai_call, mock_set_cache, mock_get_cache, mock_refund, mock_consume):
    """
    🧪 Test du cas idéal (Happy Path) :
    Un utilisateur envoie un fichier PDF valide, l'IA le traite avec succès.
    On vérifie :
    - Le statut 200 OK.
    - Le contenu de la réponse est bien le JSON de l'IA.
    - Le crédit a été consommé mais PAS remboursé.
    - Le résultat a été mis en cache.
    """
    print("--- Test du cas nominal (succès) ---")
    mock_ai_call.return_value = MOCK_AI_SUCCESS_RESPONSE

    # Création d'un faux fichier en mémoire
    fake_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    files = {"file": ("test_cv.pdf", fake_pdf_content, "application/pdf")}

    # Appel de l'endpoint
    response = client.post("/api/cv/parse-cv", files=files)

    # Assertions
    assert response.status_code == 200
    assert response.json() == MOCK_AI_SUCCESS_RESPONSE
    
    mock_consume.assert_awaited_once_with(MOCK_USER["id"], cost=2)
    mock_refund.assert_not_awaited()
    mock_get_cache.assert_awaited_once()
    mock_set_cache.assert_awaited_once()
    mock_ai_call.assert_awaited_once()

@patch("services.cv_services.consume_credit", new_callable=AsyncMock)
@patch("services.cv_services.refund_credit", new_callable=AsyncMock)
@patch("services.ai_generator.ai_service.generate_from_pdf_or_image", new_callable=AsyncMock)
def test_parse_cv_ai_timeout(mock_ai_call, mock_refund, mock_consume):
    """
    🧪 Test du cas d'erreur "Timeout" :
    L'appel à l'IA (Gemini) prend trop de temps et lève une exception TimeoutError.
    On vérifie :
    - Le statut 504 Gateway Timeout.
    - Le message d'erreur est informatif pour le front-end.
    - Le crédit de l'utilisateur a bien été remboursé.
    """
    print("--- Test du cas d'erreur (Timeout IA) ---")
    # On configure le mock de l'IA pour qu'il lève une erreur de Timeout
    mock_ai_call.side_effect = asyncio.TimeoutError

    fake_pdf_content = b"dummy content"
    files = {"file": ("test_cv.pdf", fake_pdf_content, "application/pdf")}

    response = client.post("/api/cv/parse-cv", files=files)

    assert response.status_code == 504
    assert "pris trop de temps" in response.json()["detail"]
    
    mock_consume.assert_awaited_once_with(MOCK_USER["id"], cost=2)
    mock_refund.assert_awaited_once_with(MOCK_USER["id"], cost=2)

@patch("services.cv_services.consume_credit", new_callable=AsyncMock)
@patch("services.cv_services.refund_credit", new_callable=AsyncMock)
@patch("services.ai_generator.ai_service.generate_from_pdf_or_image", new_callable=AsyncMock)
def test_parse_cv_generic_ai_error(mock_ai_call, mock_refund, mock_consume):
    """
    🧪 Test du cas d'erreur générique de l'IA :
    L'IA renvoie une erreur imprévue (ex: API down, clé invalide, etc.).
    On vérifie :
    - Le statut 500 Internal Server Error.
    - Le crédit de l'utilisateur a été remboursé.
    """
    print("--- Test du cas d'erreur (Erreur générique IA) ---")
    mock_ai_call.side_effect = Exception("Erreur critique de l'API Gemini")

    fake_pdf_content = b"dummy content"
    files = {"file": ("test_cv.pdf", fake_pdf_content, "application/pdf")}

    response = client.post("/api/cv/parse-cv", files=files)

    assert response.status_code == 500
    assert "Erreur lors de l'analyse du CV" in response.json()["detail"]
    
    mock_consume.assert_awaited_once_with(MOCK_USER["id"], cost=2)
    mock_refund.assert_awaited_once_with(MOCK_USER["id"], cost=2)

def test_parse_cv_no_file():
    """
    🧪 Test du cas où l'utilisateur oublie de joindre un fichier.
    On vérifie :
    - Le statut 400 Bad Request, car la requête est mal formée.
    """
    print("--- Test du cas d'erreur (Aucun fichier fourni) ---")
    response = client.post("/api/cv/parse-cv", files={})

    assert response.status_code == 400
    assert "Veuillez fournir un fichier" in response.json()["detail"]

@patch("services.cv_services.consume_credit", new_callable=AsyncMock)
@patch("services.cv_services.refund_credit", new_callable=AsyncMock)
@patch("services.cv_services.get_cached_content") # Mock synchrone car appelé depuis une fonction asynchrone
@patch("services.ai_generator.ai_service.generate_from_pdf_or_image", new_callable=AsyncMock)
def test_parse_cv_cache_hit(mock_ai_call, mock_get_cache, mock_refund, mock_consume):
    """
    🧪 Test du cas où le CV a déjà été analysé et est présent dans le cache.
    On vérifie :
    - Le statut 200 OK.
    - La réponse est bien les données du cache.
    - L'IA n'est JAMAIS appelée.
    - Le crédit est consommé puis immédiatement remboursé (car l'opération est gratuite grâce au cache).
    """
    print("--- Test du cas de succès avec Cache (Cache Hit) ---")
    # On configure le mock du cache pour qu'il retourne des données
    # Note: get_cached_content est une fonction `async`, donc son mock doit être un `AsyncMock`
    # ou être configuré pour retourner un `Future`. Ici, on utilise `new_callable=AsyncMock`.
    mock_get_cache_async = AsyncMock(return_value=MOCK_AI_SUCCESS_RESPONSE)
    app.dependency_overrides[get_cached_content] = lambda: mock_get_cache_async

    fake_pdf_content = b"un contenu déjà analysé"
    files = {"file": ("cached_cv.pdf", fake_pdf_content, "application/pdf")}

    response = client.post("/api/cv/parse-cv", files=files)

    assert response.status_code == 200
    assert response.json() == MOCK_AI_SUCCESS_RESPONSE
    
    mock_consume.assert_awaited_once_with(MOCK_USER["id"], cost=2)
    # Le remboursement est la clé du test de cache !
    mock_refund.assert_awaited_once_with(MOCK_USER["id"], cost=2)
    
    # L'IA ne doit pas avoir été appelée
    mock_ai_call.assert_not_awaited()

    # Nettoyage pour ne pas affecter les autres tests
    del app.dependency_overrides[get_cached_content]

@patch("services.cv_services.consume_credit", new_callable=AsyncMock)
@patch("services.cv_services.refund_credit", new_callable=AsyncMock)
@patch("services.ai_generator.ai_service.generate_from_pdf_or_image", new_callable=AsyncMock)
def test_parse_cv_insufficient_credits(mock_ai_call, mock_refund, mock_consume):
    """
    🧪 Test du cas métier "Crédits insuffisants" :
    L'utilisateur n'a pas assez de crédits pour lancer l'analyse.
    On vérifie :
    - Le statut 402 Payment Required.
    - L'IA n'est JAMAIS appelée.
    - Aucun crédit n'est remboursé (puisqu'aucun n'a été réellement débité).
    """
    print("--- Test du cas métier (Crédits insuffisants) ---")
    # On configure le mock de `consume_credit` pour simuler une erreur de solde.
    from fastapi import HTTPException
    mock_consume.side_effect = HTTPException(status_code=402, detail="Crédits insuffisants.")

    fake_pdf_content = b"dummy content"
    files = {"file": ("test_cv.pdf", fake_pdf_content, "application/pdf")}

    response = client.post("/api/cv/parse-cv", files=files)

    assert response.status_code == 402
    assert "Crédits insuffisants" in response.json()["detail"]
    
    mock_consume.assert_awaited_once_with(MOCK_USER["id"], cost=2)
    mock_ai_call.assert_not_awaited()
    mock_refund.assert_not_awaited()

@patch("services.cv_services.consume_credit", new_callable=AsyncMock)
@patch("services.cv_services.refund_credit", new_callable=AsyncMock)
@patch("services.ai_generator.ai_service.generate_from_pdf_or_image", new_callable=AsyncMock)
def test_parse_cv_ai_safety_filter_block(mock_ai_call, mock_refund, mock_consume):
    """
    🧪 Test du cas d'erreur "Filtre de sécurité" :
    L'IA (Gemini) bloque le contenu et lève une erreur spécifique.
    On vérifie :
    - Le statut 500 (ou un code d'erreur approprié).
    - Le crédit de l'utilisateur est bien remboursé.
    """
    print("--- Test du cas d'erreur (Filtre de sécurité IA) ---")
    mock_ai_call.side_effect = RuntimeError("Gemini Safety Filter Blocked Content")

    files = {"file": ("sensitive_cv.pdf", b"contenu sensible", "application/pdf")}
    response = client.post("/api/cv/parse-cv", files=files)

    assert response.status_code == 500
    assert "Gemini Safety Filter" in response.json()["detail"]
    mock_refund.assert_awaited_once_with(MOCK_USER["id"], cost=2)
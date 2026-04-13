import pytest
from fastapi.testclient import TestClient
import asyncio

# HYPOTHÈSE : Votre application FastAPI principale est définie dans `backend/main.py`
# et l'objet s'appelle `app`. Ajustez si nécessaire.
try:
    from backend.main import app
except ImportError:
    print("\n⚠️  AVERTISSEMENT: Impossible d'importer `app` depuis `backend.main`. Assurez-vous que ce fichier existe.")
    # Crée une fausse app pour que les tests puissent être collectés sans erreur
    from fastapi import FastAPI
    app = FastAPI()

# --- MOCK GLOBAL DE L'AUTHENTIFICATION ---
# Force un faux utilisateur connecté pour tous les tests afin d'éviter les erreurs 401
try:
    from security import get_current_user
    from services.cv_services import require_active_subscription
    async def mock_get_current_user():
        return {"id": "test-user-id", "email": "test@example.com", "first_name": "Test", "last_name": "User", "is_premium": True}
    async def mock_require_active_subscription():
        return {"id": "test-user-id", "email": "test@example.com", "is_premium": True}
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[require_active_subscription] = mock_require_active_subscription
except ImportError:
    pass

@pytest.fixture(scope="module")
def test_client():
    """
    Crée un client de test pour l'application FastAPI.
    Cette fixture est partagée par tous les tests du module.
    """
    with TestClient(app) as client:
        yield client

@pytest.fixture(autouse=True)
def mock_db(mocker):
    """
    Mocke automatiquement le module de base de données pour tous les tests
    afin d'éviter de vrais appels à la base de données.
    """
    # Mock de la connexion asynchrone
    mock_conn = mocker.AsyncMock()
    mock_conn.commit = mocker.AsyncMock()
    
    # Mock du curseur
    mock_cursor = mocker.AsyncMock()
    mock_cursor.fetchone.return_value = None # Comportement par défaut
    
    # db.execute retourne le curseur mocké
    mock_execute = mocker.AsyncMock(return_value=mock_cursor)
    
    # Le context manager get_connection retourne la connexion mockée via __aenter__
    mock_cm = mocker.MagicMock()
    mock_cm.__aenter__ = mocker.AsyncMock(return_value=mock_conn)
    mock_cm.__aexit__ = mocker.AsyncMock(return_value=None)
    
    mocker.patch('database.db.get_connection', return_value=mock_cm)
    mocker.patch('database.db.execute', mock_execute)
    
    return {"conn": mock_conn, "cursor": mock_cursor, "execute": mock_execute}

@pytest.fixture
def mock_ai_service(mocker):
    """Mocke le service AI pour contrôler ses réponses."""
    return mocker.patch('services.ai_generator.AIGenerator.generate', new_callable=mocker.AsyncMock)
import pytest
from unittest.mock import MagicMock
from backend.services.utils import clean_ai_json_response
from backend.services.market_research import generate_deterministic_queries
from backend.services.websocket_manager import ConnectionManager
from datetime import datetime

# --- Test 1: Robustesse du nettoyage JSON ---
def test_clean_ai_json_response():
    """Vérifie que le nettoyeur JSON gère les blocs Markdown et le texte brut."""
    # Cas 1: Bloc Markdown standard
    assert clean_ai_json_response("```json\n{\"key\": \"value\"}\n```") == {"key": "value"}
    # Cas 2: Texte brut sans balises
    assert clean_ai_json_response("{\"key\": \"value\"}") == {"key": "value"}
    # Cas 3: Texte explicatif autour
    assert clean_ai_json_response("Voici le résultat: {\"key\": 123} merci.") == {"key": 123}
    # Cas 4: JSON invalide
    result = clean_ai_json_response("Not a json")
    assert "error" in result

# --- Test 2: Génération de requêtes de marché ---
def test_generate_deterministic_queries():
    """Vérifie que les requêtes de recherche sont bien générées dynamiquement."""
    queries = generate_deterministic_queries("Tesla", "Automotive")
    current_year = datetime.now().year
    
    assert len(queries) >= 5
    # Vérifie la présence de mots-clés contextuels
    assert any("Tesla" in q for q in queries)
    assert any(f"Automotive market trends" in q for q in queries)
    assert any(str(current_year) in q for q in queries)

# --- Test 4: Websocket Broadcast ---
@pytest.mark.asyncio
async def test_websocket_broadcast(mocker):
    """Vérifie que le manager envoie bien les messages aux clients connectés."""
    manager = ConnectionManager()
    mock_ws = mocker.AsyncMock() # Le websocket est asynchrone
    
    manager.active_connections["task_123"] = [mock_ws]
    
    await manager.broadcast("task_123", "Message Test", "SUCCESS", {"data": 1})
    
    mock_ws.send_json.assert_awaited_once()
    payload = mock_ws.send_json.await_args[0][0]
    assert payload["message"] == "Message Test"
    assert payload["status"] == "SUCCESS"
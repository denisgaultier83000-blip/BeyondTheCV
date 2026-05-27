import pytest
from services.utils import clean_ai_json_response

def test_clean_json_pure():
    """Cas nominal : l'IA renvoie un JSON parfait."""
    raw = '{"status": "ok", "score": 100}'
    res = clean_ai_json_response(raw)
    assert res == {"status": "ok", "score": 100}

def test_clean_json_with_markdown():
    """Cas vicieux 1 : l'IA encapsule dans des balises markdown ```json."""
    raw = "```json\n{\n  \"status\": \"ok\"\n}\n```"
    res = clean_ai_json_response(raw)
    assert res == {"status": "ok"}

def test_clean_json_with_garbage_text():
    """Cas vicieux 2 : l'IA ajoute du texte poli avant et après le JSON."""
    raw = "Voici votre résultat : \n\n{\"key\": \"value\"}\n\nJ'espère que cela vous aide !"
    res = clean_ai_json_response(raw)
    assert res == {"key": "value"}

def test_clean_json_array_format():
    """Cas vicieux 3 : l'IA renvoie un tableau JSON au lieu d'un objet."""
    raw = "```json\n[{\"id\": 1}, {\"id\": 2}]\n```"
    res = clean_ai_json_response(raw)
    assert isinstance(res, list)
    assert len(res) == 2
    assert res["id"] == 1

def test_clean_json_failure_fallback():
    """Cas fatal : le JSON est irrémédiablement cassé (il manque une accolade)."""
    raw = "{\"key\": \"value\"" # Cassé
    res = clean_ai_json_response(raw)
    
    # La fonction est censée capturer le JSONDecodeError et renvoyer un dict avec la clé 'error'
    assert isinstance(res, dict)
    assert "error" in res
    assert "Invalid JSON format" in res["error"]
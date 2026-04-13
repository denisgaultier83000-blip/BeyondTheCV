import pytest
from fastapi.testclient import TestClient
from unittest.mock import ANY

# --- Test 2 (Nouveau): Génération de document DOCX ---
def test_generate_docx_document(test_client: TestClient, mock_db, mocker):
    """Vérifie la génération d'un document Word via l'API."""
    # Mock de la fonction de génération docx pour ne pas créer de vrai fichier
    mock_generate_docx = mocker.patch("services.cv_services.generate_cv_docx", return_value="/tmp/fake_cv.docx")
    mocker.patch("os.path.basename", return_value="fake_cv.docx")
    
    # Mock de la réponse de l'IA
    mocker.patch("services.cv_services.optimize_cv_data", return_value={"optimized_data": {"last_name": "Doe"}})

    payload = {
        "action": "CV Word",
        "data": {"last_name": "Doe"},
        "renderer": "docx"
    }
    
    response = test_client.post("/api/cv/generate", json=payload)
    
    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    mock_generate_docx.assert_called_once()
    
    mock_db['execute'].assert_awaited_with(ANY, ANY, (ANY, "test-user-id", "fake_cv.docx", "/tmp/fake_cv.docx", "CV_WORD", ANY, ANY))
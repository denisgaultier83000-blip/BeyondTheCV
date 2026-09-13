import pytest
from fastapi.testclient import TestClient
from unittest.mock import ANY

# --- Test 7: Liste des documents ---
def test_documents_list(test_client: TestClient, mock_db):
    """Vérifie que l'API retourne la liste des documents de l'utilisateur."""
    mock_db['cursor'].fetchall.return_value = [
        {"id": "d1", "filename": "cv.pdf", "type": "CV_ATS", "created_at": "2023-01-01", "path": "/tmp/cv.pdf", "user_id": "u1", "media_type": "application/pdf"}
    ]

    response = test_client.get("/api/documents")

    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["id"] == "d1"
    assert docs[0]["filename"] == "cv.pdf"

# --- Test 8: Suppression de document ---
def test_documents_delete(test_client: TestClient, mock_db, mocker):
    """Vérifie la suppression logique (DB) et physique (Fichier) d'un document."""
    mock_db['cursor'].fetchone.return_value = {"path": "/tmp/dummy_cv.pdf"}

    mock_storage_delete = mocker.patch("services.documents.storage.delete", return_value=True)

    response = test_client.delete("/api/documents/d1")

    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Vérifie que la requête DELETE SQL a bien été exécutée
    mock_db['execute'].assert_awaited_with(ANY, "DELETE FROM documents WHERE id = ? AND user_id = ?", ("d1", ANY))
    # Vérifie que le fichier a été supprimé via le storage manager
    mock_storage_delete.assert_called_with("/tmp/dummy_cv.pdf")

# --- Test 9: Démarrage d'analyse ---
def test_start_analysis(test_client: TestClient, mock_db, mocker):
    """Vérifie que start-analysis crée les tâches de fond."""
    mock_add_task = mocker.patch('fastapi.BackgroundTasks.add_task')

    payload = {
        "target_job": "Dev",
        "target_company": "Google",
    }

    response = test_client.post("/api/cv/start-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "tasks" in data
    assert "pitch" in data["tasks"]
    assert "questions" in data["tasks"]
    assert mock_add_task.call_count >= 2

# --- Test 10: Logique Métier Tâche Salaire ---
@pytest.mark.asyncio
async def test_salary_task_logic(mocker):
    """Teste la logique interne de la tâche d'estimation de salaire."""
    from services.tasks import _run_salary_logic

    mock_update = mocker.patch("services.tasks.update_task_status_sync")
    mocker.patch("services.tasks.manager.broadcast", new_callable=mocker.AsyncMock)

    mock_ai_call = mocker.patch(
        "services.tasks.ai_call",
        new_callable=mocker.AsyncMock,
        return_value={"salary_range": {"low": 50000, "mid": 60000, "high": 70000}, "currency": "EUR", "commentary": "Good salary"},
    )

    await _run_salary_logic("task_salary_1", {"target_country": "France"})

    mock_ai_call.assert_awaited_once()
    assert mock_update.call_count >= 2  # RUNNING puis SUCCESS
    args, _ = mock_update.call_args
    assert args[0] == "task_salary_1"
    assert args[1] == "SUCCESS"
    assert args[2]["salary_range"]["low"] == 50000

# --- Test: Logique Métier Tâche Pitch (données manquantes) ---
@pytest.mark.asyncio
async def test_pitch_task_logic_with_missing_data(mocker):
    """
    Teste que la tâche de pitch génère un résultat structuré.
    """
    from services.tasks import _run_pitch_logic
    from services import cv_services

    mock_update = mocker.patch("services.tasks.update_task_status_sync")
    mocker.patch("services.tasks.manager.broadcast", new_callable=mocker.AsyncMock)

    ai_response = {
        "who_i_am": "[CONSEIL] Votre bio est vide. Décrivez en une phrase qui vous êtes professionnellement.",
        "what_ive_done": "...",
        "valeur": "...",
        "projection": "...",
    }
    mocker.patch.object(
        cv_services,
        "generate_pitch",
        new_callable=mocker.AsyncMock,
        return_value=ai_response,
    )

    await _run_pitch_logic("task_pitch_1", {"target_job": "Analyst"})

    args, _ = mock_update.call_args
    assert args[1] == "SUCCESS"
    assert "[CONSEIL]" in args[2]["who_i_am"]

# --- Test: Logique Métier Tâche Questions (Logique "Victor Hugo") ---
@pytest.mark.asyncio
async def test_questions_task_logic_with_famous_name(mocker):
    """
    Teste que la tâche de génération de questions inclut une question de curiosité
    si une adresse contient un nom célèbre.
    """
    from services.tasks import _run_questions_logic

    mock_update = mocker.patch("services.tasks.update_task_status_sync")
    mocker.patch("services.tasks.manager.broadcast", new_callable=mocker.AsyncMock)

    ai_response = {"questions": [{"category": "Curiosité", "question": "Je vois que vous habitez Avenue Victor Hugo, que savez-vous de lui ?"}]}
    mock_ai_call = mocker.patch(
        "services.tasks.ai_call",
        new_callable=mocker.AsyncMock,
        return_value=ai_response,
    )

    candidate_data = {"personal_info": {"address": "123 Avenue Victor Hugo"}, "target_job": "Librarian"}
    await _run_questions_logic("task_questions_1", candidate_data)

    call_args, call_kwargs = mock_ai_call.call_args
    prompt_sent = call_args[0] if call_args else call_kwargs.get('prompt', '')
    assert "Avenue Victor Hugo" in prompt_sent

    args, _ = mock_update.call_args
    assert args[1] == "SUCCESS"
    assert args[2]["questions"][0]["category"] == "Curiosité"
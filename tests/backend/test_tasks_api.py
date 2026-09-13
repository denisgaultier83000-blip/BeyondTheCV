import pytest

def test_get_task_status_success(test_client, mock_db):
    """Vérifie que la lecture du statut d'une tâche asynchrone fonctionne."""
    # Simule que la base retourne un statut SUCCESS
    mock_db["cursor"].fetchone.return_value = {"status": "SUCCESS", "result": None, "error_message": None}

    response = test_client.get("/api/tasks/status/task-1234")
    assert response.status_code == 200
    assert response.json()["status"] == "SUCCESS"

def test_get_task_status_not_found(test_client, mock_db):
    """Vérifie la bonne gestion de l'erreur 404 si la tâche n'existe pas."""
    mock_db["cursor"].fetchone.return_value = None

    response = test_client.get("/api/tasks/status/unknown-task")
    assert response.status_code == 404
    assert response.json()["detail"] == "Tâche non trouvée."

def test_get_task_status_completed_with_result(test_client, mock_db):
    """Vérifie que l'endpoint de statut renvoie les bonnes données quand terminé."""
    mock_db["cursor"].fetchone.return_value = {"status": "COMPLETED", "result": '{"market_data": "ok"}', "error_message": None}

    response = test_client.get("/api/tasks/status/task-1234")
    assert response.status_code == 200
    assert response.json()["result"] == {"market_data": "ok"}

def test_get_task_status_running(test_client, mock_db):
    """Vérifie que si la tâche tourne encore, l'API renvoie un code HTTP 200 avec le statut."""
    mock_db["cursor"].fetchone.return_value = {"status": "RUNNING", "result": None, "error_message": None}

    response = test_client.get("/api/tasks/status/task-1234")
    assert response.status_code == 200
    assert response.json()["status"] == "RUNNING"
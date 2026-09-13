import pytest
from fastapi.testclient import TestClient
from unittest.mock import ANY


# --- Test: Démarrage du pipeline d'analyse ---

def test_start_full_analysis(test_client: TestClient, mock_db, mocker):
    """
    Teste POST /api/cv/start-analysis pour un démarrage complet.
    """
    mock_add_task = mocker.patch('fastapi.BackgroundTasks.add_task')
    cv_data = {
        "target_job": "Ingénieur",
        "target_company": "BigCorp",
        "skills": ["Docker"],
        "is_partial_start": False
    }

    response = test_client.post("/api/cv/start-analysis", json=cv_data)

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["message"] == "Full analysis started (db-only)"
    assert "application_id" in response_data
    assert "tasks" in response_data

    # Une tâche est créée par worker en DB + l'insertion de la candidature
    assert mock_db['execute'].await_count >= len(response_data["tasks"]) + 1
    assert mock_add_task.call_count >= 2


# --- Test: Récupération du statut d'une analyse ---

def test_get_analysis_status_success(test_client: TestClient, mock_db):
    """
    Teste GET /api/cv/analysis-status/{task_id} pour une tâche terminée avec succès.
    """
    task_id = "test-task-123"
    result_json = '{"key": "value"}'
    mock_db['cursor'].fetchone.return_value = {"status": "SUCCESS", "result": result_json, "error_message": None}

    response = test_client.get(f"/api/cv/analysis-status/{task_id}")

    assert response.status_code == 200
    assert response.json() == {"status": "SUCCESS", "result": {"key": "value"}}
    mock_db['execute'].assert_awaited_with(ANY, "SELECT status, result, error_message FROM tasks WHERE id = ?", (task_id,))


def test_get_analysis_status_not_found(test_client: TestClient, mock_db):
    """
    Teste GET /api/cv/analysis-status/{task_id} pour une tâche non trouvée.
    """
    mock_db['cursor'].fetchone.return_value = None
    response = test_client.get("/api/cv/analysis-status/unknown-task")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"

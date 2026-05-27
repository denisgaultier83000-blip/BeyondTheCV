import pytest

def test_get_task_status_success(test_client, mock_db):
    """Vérifie que la lecture du statut d'une tâche asynchrone fonctionne."""
    # Simule que la base retourne un statut SUCCESS
    mock_db["cursor"].fetchone.return_value = {"status": "SUCCESS"}
    
    response = test_client.get("/api/tasks/status/task-1234")
    assert response.status_code == 200
    assert response.json() == {"task_id": "task-1234", "status": "SUCCESS"}

def test_get_task_status_not_found(test_client, mock_db):
    """Vérifie la bonne gestion de l'erreur 404 si la tâche n'existe pas."""
    mock_db["cursor"].fetchone.return_value = None
    
    response = test_client.get("/api/tasks/status/unknown-task")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"

def test_get_task_result_completed(test_client, mock_db):
    """Vérifie que l'endpoint de résultat renvoie les bonnes données quand terminé."""
    # Simule le retour de tuple depuis la DB : (status, result_json)
    mock_db["cursor"].fetchone.return_value = ("COMPLETED", '{"market_data": "ok"}')
    
    response = test_client.get("/api/tasks/result/task-1234")
    assert response.status_code == 200
    assert response.json() == {"market_data": "ok"}
    
def test_get_task_result_running(test_client, mock_db):
    """Vérifie que si la tâche tourne encore, l'API renvoie un code HTTP 202 (Accepted)."""
    # Simule une tâche en cours de traitement
    mock_db["cursor"].fetchone.return_value = ("RUNNING", None)
    
    response = test_client.get("/api/tasks/result/task-1234")
    # 202 indique au frontend qu'il doit continuer à poll/attendre
    assert response.status_code == 202
    assert response.json()["status"] == "RUNNING"
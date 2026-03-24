import pytest
from fastapi.testclient import TestClient
from unittest.mock import ANY

# --- Test 7: Liste des documents ---
def test_documents_list(test_client: TestClient, mock_db):
    """Vérifie que l'API retourne la liste des documents de l'utilisateur."""
    # Mock des résultats DB
    mock_db['cursor'].fetchall.return_value = [
        {"id": "d1", "filename": "cv.pdf", "type": "CV_ATS", "created_at": "2023-01-01", "path": "/tmp/cv.pdf", "user_id": "u1", "media_type": "application/pdf"}
    ]
    
    # Note: L'auth est bypassée par le mock get_current_user dans security.py (mode dev)
    response = test_client.get("/api/documents")
    
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["id"] == "d1"
    assert docs[0]["filename"] == "cv.pdf"

# --- Test 8: Suppression de document ---
def test_documents_delete(test_client: TestClient, mock_db, mocker):
    """Vérifie la suppression logique (DB) et physique (Fichier) d'un document."""
    # Mock de la récupération du fichier avant suppression
    mock_db['cursor'].fetchone.return_value = {"path": "/tmp/dummy_cv.pdf"}
    
    # Mock des opérations système de fichier
    mocker.patch("os.path.exists", return_value=True)
    mock_remove = mocker.patch("os.remove")
    
    response = test_client.delete("/api/documents/d1")
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Vérifie que la requête DELETE SQL a bien été exécutée
    mock_db['execute'].assert_awaited_with(ANY, "DELETE FROM documents WHERE id = ? AND user_id = ?", ("d1", ANY))
    # Vérifie que le fichier a été supprimé
    mock_remove.assert_called_with("/tmp/dummy_cv.pdf")

# --- Test 9: Démarrage Partiel (Page 2) ---
def test_start_partial_analysis(test_client: TestClient, mock_db, mocker):
    """Vérifie que le flag is_partial_start ne déclenche que la recherche de marché."""
    mock_add_task = mocker.patch('fastapi.BackgroundTasks.add_task')
    
    payload = {
        "target_job": "Dev",
        "target_company": "Google",
        "is_partial_start": True # Flag critique
    }
    
    response = test_client.post("/api/cv/start-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Vérifie que SEULE la tâche market_research est créée
    assert "market_research" in data["tasks"]
    assert "cv_analysis" not in data["tasks"]
    assert "pitch" not in data["tasks"]

# --- Test 10: Logique Métier Tâche Salaire ---
@pytest.mark.asyncio
async def test_salary_task_logic(mocker, mock_ai_service):
    """Teste la logique interne de la tâche d'estimation de salaire."""
    # On importe la fonction interne (non exposée via API directement)
    from services.tasks import _run_salary_logic
    
    # Mock de la mise à jour de statut (synchrone mais appelée via to_thread)
    mock_update = mocker.patch("services.tasks.update_task_status_sync")
    # Mock du broadcast websocket
    mocker.patch("services.tasks.manager.broadcast", new_callable=mocker.AsyncMock)
    
    # Simulation réponse IA
    mock_ai_service.return_value = '{"salary_range": {"low": 50000, "mid": 60000, "high": 70000}, "currency": "EUR", "commentary": "Good salary"}'
    
    await _run_salary_logic("task_salary_1", {"target_country": "France"})
    
    # Vérifie que le statut passe à SUCCESS avec les bonnes données
    assert mock_update.call_count >= 2 # RUNNING puis SUCCESS
    # Récupère le dernier appel
    args, _ = mock_update.call_args
    assert args[0] == "task_salary_1"
    assert args[1] == "SUCCESS"
    assert args[2]["salary_range"]["low"] == 50000

# --- Test 4 (Nouveau): Logique Métier Tâche Pitch (données manquantes) ---
@pytest.mark.asyncio
async def test_pitch_task_logic_with_missing_data(mocker, mock_ai_service):
    """
    Teste que la tâche de pitch génère des conseils si les données sont insuffisantes,
    plutôt que d'inventer du contenu.
    """
    from services.tasks import _run_pitch_logic
    mock_update = mocker.patch("services.tasks.update_task_status_sync")
    mocker.patch("services.tasks.manager.broadcast", new_callable=mocker.AsyncMock)
    
    # L'IA retourne un pitch avec un conseil, car les données sont vides
    ai_response = '{"who_i_am": "[CONSEIL] Votre bio est vide. Décrivez en une phrase qui vous êtes professionnellement.", "what_ive_done": "..."}'
    mock_ai_service.return_value = ai_response
    
    # Données candidat volontairement vides
    await _run_pitch_logic("task_pitch_1", {"target_job": "Analyst"})
    
    # Vérifie que le statut SUCCESS contient bien le conseil
    args, _ = mock_update.call_args
    assert args[1] == "SUCCESS"
    assert "[CONSEIL]" in args[2]["who_i_am"]

# --- Test 5 (Nouveau): Logique Métier Tâche Questions (Logique "Victor Hugo") ---
@pytest.mark.asyncio
async def test_questions_task_logic_with_famous_name(mocker, mock_ai_service):
    """
    Teste que la tâche de génération de questions inclut une question de curiosité
    si une adresse contient un nom célèbre.
    """
    from services.tasks import _run_questions_logic
    mock_update = mocker.patch("services.tasks.update_task_status_sync")
    mocker.patch("services.tasks.manager.broadcast", new_callable=mocker.AsyncMock)
    
    ai_response = '{"questions": [{"category": "Curiosité", "question": "Je vois que vous habitez Avenue Victor Hugo, que savez-vous de lui ?"}]}'
    mock_ai_service.return_value = ai_response
    
    candidate_data = {"personal_info": {"address": "123 Avenue Victor Hugo"}, "target_job": "Librarian"}
    await _run_questions_logic("task_questions_1", candidate_data)
    
    call_args, call_kwargs = mock_ai_service.call_args
    
    # Le prompt est passé en premier argument positionnel, pas forcément en keyword 'prompt'
    # On vérifie les deux pour être robuste
    prompt_sent = call_args[0] if call_args else call_kwargs.get('prompt', '')
    
    assert "Avenue Victor Hugo" in prompt_sent
    
    args, _ = mock_update.call_args
    assert args[1] == "SUCCESS"
    assert args[2]["questions"][0]["category"] == "Curiosité"

# --- Test 9 (Nouveau): Action "Gap Analysis" de l'endpoint /api/generate ---
def test_generate_action_gap_analysis(test_client: TestClient, mock_ai_service):
    """Vérifie que l'action 'Gap Analysis' appelle la bonne logique."""
    mock_ai_service.return_value = '{"match_score": 90, "missing_gaps": ["GraphQL"]}'
    payload = {"action": "Gap Analysis", "data": {"target_job": "Dev"}}
    response = test_client.post("/api/generate", json=payload)
    assert response.status_code == 200
    assert response.json()["match_score"] == 90

# --- Test 10 (Nouveau): Action "Questionnaire" de l'endpoint /api/generate ---
def test_generate_action_questionnaire(test_client: TestClient, mock_ai_service):
    """Vérifie que l'action 'Questionnaire' génère les deux types de questions."""
    mock_ai_service.side_effect = [
        '{"questions": [{"category": "Parcours", "question": "Why?"}]}',
        '{"questions_to_ask": [{"question": "Challenges?", "strategy": "Shows interest"}]}'
    ]
    payload = {"action": "Print Questionnaire", "data": {}}
    response = test_client.post("/api/generate", json=payload)
    assert response.status_code == 200
    assert mock_ai_service.await_count == 2
    assert len(response.json()["questions"]) == 2
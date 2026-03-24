import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, ANY

# --- Test 2: Endpoint d'optimisation avec IA mockée ---

def test_optimize_experience_success(test_client: TestClient, mock_ai_service: MagicMock):
    """
    Teste POST /api/cv/optimize-experience avec une réponse IA mockée.
    """
    mock_ai_service.return_value = "Texte optimisé par l'IA."
    request_data = {
        "role": "Développeur",
        "company": "TestCorp",
        "description": "Code initial.",
        "target_language": "fr"
    }

    response = test_client.post("/api/cv/optimize-experience", json=request_data)

    assert response.status_code == 200
    assert response.json() == {"optimized_content": "Texte optimisé par l'IA."}
    mock_ai_service.assert_awaited_once()
    call_args, call_kwargs = mock_ai_service.call_args
    prompt = call_kwargs['prompt']
    assert "Role: Développeur at TestCorp" in prompt
    assert "Raw Description: Code initial." in prompt


# --- Test 9: Gestion des erreurs de l'IA ---

def test_optimize_experience_ai_error(test_client: TestClient, mock_ai_service: MagicMock):
    """
    Teste la gestion d'erreur quand le service IA lève une exception.
    """
    mock_ai_service.side_effect = Exception("Panne du service IA")
    request_data = {"role": "Développeur", "company": "TestCorp", "description": "Code."}
    
    response = test_client.post("/api/cv/optimize-experience", json=request_data)

    assert response.status_code == 500
    assert response.json() == {"detail": "Erreur IA: Panne du service IA"}


# --- Test 3 & 10: Génération de document et formatage des compétences ---

def test_generate_cv_with_skill_formatting(test_client: TestClient):
    """
    Teste POST /api/cv/generate et valide la transformation des compétences.
    (Combine les tests 3 et 10)
    """
    cv_data = {
        "personal_info": {"first_name": "John"},
        "target_job": "Test Job",
        "skills": ["Python", "SQL"],
        "languages": [{"language": "Français", "level": "Natif"}, {"language": "Anglais", "level": "C1"}]
    }

    response = test_client.post("/api/cv/generate", json=cv_data)
    
    assert response.status_code == 200
    response_data = response.json()

    expected_skills = {
        "technical": "Python, SQL",
        "languages": "Français (Natif), Anglais (C1)"
    }
    assert "skills" in response_data
    assert response_data["skills"] == expected_skills
    assert response_data["personal_info"]["first_name"] == "John"


# --- Test 4 (Remplacement): Génération de clarifications ---

def test_generate_clarifications(test_client: TestClient, mock_ai_service: MagicMock):
    """
    Teste POST /api/cv/generate-clarifications.
    """
    ai_response = '{ "questions": ["Question 1?", "Question 2?"] }'
    mock_ai_service.return_value = ai_response
    cv_data = {"target_job": "Analyste", "skills": ["SQL"], "is_partial_start": False}

    response = test_client.post("/api/cv/generate-clarifications", json=cv_data)

    assert response.status_code == 200
    assert response.json() == {"questions": ["Question 1?", "Question 2?"]}
    mock_ai_service.assert_awaited_once()


# --- Test 5: Démarrage du pipeline d'analyse ---

def test_start_full_analysis(test_client: TestClient, mock_db, mocker):
    """
    Teste POST /api/cv/start-analysis pour un démarrage complet (Page 8).
    """
    mock_add_task = mocker.patch('fastapi.BackgroundTasks.add_task')
    cv_data = {
        "target_job": "Ingénieur",
        "target_company": "BigCorp",
        "skills": ["Docker"],
        "is_partial_start": False # Démarrage complet
    }

    response = test_client.post("/api/cv/start-analysis", json=cv_data)

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["message"] == "Pipeline started"
    
    # 6 tâches sont créées en BDD et lancées en fond pour une analyse complète
    assert mock_db['execute'].await_count == 6
    assert mock_add_task.call_count == 6
    mock_add_task.assert_any_call(ANY, response_data['tasks']['cv_analysis'], ANY)


# --- Test 6: Récupération du statut d'une analyse ---

def test_get_analysis_status_success(test_client: TestClient, mock_db):
    """
    Teste GET /api/analysis-status/{task_id} pour une tâche terminée avec succès.
    """
    task_id = "test-task-123"
    result_json = '{"key": "value"}'
    mock_db['cursor'].fetchone.return_value = {"status": "SUCCESS", "result": result_json}
    
    response = test_client.get(f"/api/cv/analysis-status/{task_id}")
    
    assert response.status_code == 200
    assert response.json() == {"status": "SUCCESS", "result": {"key": "value"}}
    mock_db['execute'].assert_awaited_with(ANY, "SELECT status, result FROM tasks WHERE id = ?", (task_id,))

def test_get_analysis_status_not_found(test_client: TestClient, mock_db):
    """
    Teste GET /api/analysis-status/{task_id} pour une tâche non trouvée.
    """
    mock_db['cursor'].fetchone.return_value = None # Comportement par défaut
    response = test_client.get("/api/cv/analysis-status/unknown-task")
    assert response.status_code == 404
    assert response.json() == {"detail": "Analyse non trouvée"}
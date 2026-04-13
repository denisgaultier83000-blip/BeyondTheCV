import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

# --- Test 8: Agrégation des données du Dashboard ---

def test_get_dashboard_summary(test_client: TestClient, mock_ai_service: MagicMock, mocker):
    """
    Teste POST /api/dashboard/summary en mockant ses dépendances internes.
    """
    # Mock de la fonction interne `run_gap_analysis_and_get_result`
    mock_run_gap = mocker.patch(
        'services.cv_services.run_gap_analysis_and_get_result',
        new_callable=mocker.AsyncMock
    )
    
    # Configuration des valeurs de retour des mocks
    mock_run_gap.return_value = {
        "match_score": 85,
        "missing_gaps": ["Compétence A"],
        "key_needs_from_job": ["Besoin 1", "Besoin 2"]
    }
    mock_ai_service.side_effect = [
        '{"key_strengths": ["Force 1", "Force 2"]}',
        '{"application_strategy": ["Stratégie 1", "Stratégie 2"]}'
    ]

    # Données d'entrée valides pour le modèle Pydantic `FullCVData`
    cv_data = {
        "personal_info": {}, "experiences": [], "educations": [],
        "skills": ["Python"], "work_style": [], "relational_style": [],
        "professional_approach": [], "qualities": [], "flaws": [],
        "interests": [], "languages": [], "clarifications": [],
        "target_job": "Data Scientist"
    }

    response = test_client.post("/api/cv/dashboard/summary", json=cv_data)

    assert response.status_code == 200
    data = response.json()

    # Vérification des données agrégées dans la réponse
    assert data["matchScore"] == 85
    assert data["summary"] == "Votre profil correspond à 85% des attentes du poste visé. 1 compétences sont à renforcer."
    assert data["strengths"] == ["Force 1", "Force 2"]
    assert data["gapsMatrix"][0]["skill"] == "Compétence A"
    assert data["recommendedStrategy"] == "Stratégie 1 Stratégie 2"
    
    # Vérification que les services ont bien été appelés
    mock_run_gap.assert_awaited_once()
    assert mock_ai_service.await_count == 2
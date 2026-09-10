import pytest
from unittest.mock import AsyncMock, patch

def test_get_my_differentiators_empty(test_client, mock_db):
    mock_db["cursor"].fetchall.return_value = []
    mock_db["cursor"].fetchone.return_value = {"off_cv_text": "Mon histoire hors CV"}

    response = test_client.get("/api/differentiators/me")
    assert response.status_code == 200
    data = response.json()
    assert "differentiators" in data
    assert "off_cv_text" in data
    assert isinstance(data["differentiators"], list)


def test_save_and_get_differentiator(test_client, mock_db):
    payload = {
        "off_cv_text": "Tour du monde en catamaran pendant 14 mois",
        "differentiators": [
            {
                "fact": "Champion départemental de boxe",
                "proof": "8 ans de pratique, 5 entraînements par semaine",
                "interpretation": "Discipline, goût de l'effort, persévérance",
                "interview_usage": "Question sur la gestion de la pression ou l'échec",
                "oral_phrasing": "La boxe m'a appris la rigueur...",
                "category": "sport"
            }
        ]
    }
    save_res = test_client.post("/api/differentiators/me", json=payload)
    assert save_res.status_code == 200
    assert save_res.json().get("status") == "saved"


def test_extract_differentiators_ai_mock(test_client, mock_db):
    mock_ai_response = {
        "differentiators": [
            {
                "fact": "Tour du monde en catamaran",
                "proof": "14 mois de mer en équipage de 4",
                "interpretation": "Prise de décision dans l'incertitude",
                "interview_usage": "Question sur l'adaptation aux imprévus",
                "oral_phrasing": "Pendant 14 mois en mer...",
                "category": "personal_adventure"
            }
        ]
    }

    with patch("services.differentiators_service.ai_service.generate_valid_json", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = mock_ai_response
        res = test_client.post(
            "/api/differentiators/extract",
            json={"off_cv_text": "J'ai navigué pendant 14 mois", "target_language": "fr"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("count") == 1
        assert data["differentiators"][0]["fact"] == "Tour du monde en catamaran"


def test_deepen_differentiator_ai_mock(test_client, mock_db):
    mock_deepen_response = {
        "needs_clarification": False,
        "differentiator": {
            "fact": "Création de 3 sites web autodidactes",
            "proof": "3 projets complets avec 10k utilisateurs",
            "interpretation": "Concrétisation d'idées et apprentissage rapide",
            "interview_usage": "Question sur l'initiative",
            "oral_phrasing": "J'ai appris à coder de zéro...",
            "category": "tech_project"
        }
    }

    with patch("services.differentiators_service.ai_service.generate_valid_json", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = mock_deepen_response
        res = test_client.post(
            "/api/differentiators/deepen",
            json={"user_story": "J'ai créé 3 sites web à 23 ans", "target_language": "fr"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("needs_clarification") is False
        assert data["differentiator"]["fact"] == "Création de 3 sites web autodidactes"

import pytest
from fastapi.testclient import TestClient


# --- Test: Agrégation des données du Dashboard ---

def test_get_dashboard_summary(test_client: TestClient, mocker):
    """
    Teste POST /api/cv/dashboard/summary en mockant l'appel IA.
    """
    mocker.patch(
        "services.cv_services.ai_call",
        new_callable=mocker.AsyncMock,
        return_value={
            "matchScore": 85,
            "summary": "Profil très aligné.",
            "strengths": ["Force 1", "Force 2"],
            "gapsMatrix": [{"skill": "Compétence A", "impact": "High", "action": "Action 1"}],
            "recommendedStrategy": "Stratégie 1 Stratégie 2",
        },
    )

    cv_data = {
        "personal_info": {}, "experiences": [], "educations": [],
        "skills": ["Python"], "work_style": [], "relational_style": [],
        "professional_approach": [], "qualities": [], "flaws": [],
        "interests": [], "languages": [], "clarifications": [],
        "target_job": "Data Scientist",
        "gap_analysis": {
            "match_score": 85,
            "missing_gaps": [{"skill": "Compétence A"}],
            "recommended_adjustments": [{"action": "Action 1"}],
            "matching_skills": ["Force 1", "Force 2"],
        }
    }

    response = test_client.post("/api/cv/dashboard/summary", json=cv_data)

    assert response.status_code == 200
    data = response.json()

    assert data["matchScore"] == 85
    assert data["strengths"] == ["Force 1", "Force 2"]
    assert data["gapsMatrix"][0]["skill"] == "Compétence A"
    assert data["recommendedStrategy"] == "Stratégie 1 Stratégie 2"

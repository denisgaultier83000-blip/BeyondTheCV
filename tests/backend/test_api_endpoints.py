import pytest

def test_submit_feedback_success(test_client, mock_db):
    """Vérifie que la soumission d'un feedback retourne bien un 200 OK avec le bon payload."""
    payload = {
        "feature": "cv_generation",
        "is_positive": True,
        "comments": "Super résultat",
        "job_type": "Développeur"
    }
    response = test_client.post("/api/cv/feedback", json=payload)
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Vérifie que la base de données a bien été appelée
    mock_db["execute"].assert_called()

def test_get_feedbacks_admin(test_client, mock_db):
    """Vérifie que la route d'administration des feedbacks parse bien les retours de la BDD."""
    # On simule un retour de tuple depuis la base de données
    mock_db["cursor"].fetchall.return_value = [
        (1, "cv_generation", True, "Super", "2026-05-08T10:00:00", "test@test.com")
    ]
    
    response = test_client.get("/api/cv/feedbacks")
    assert response.status_code == 200
    
    data = response.json()
    assert "feedbacks" in data
    assert len(data["feedbacks"]) == 1
    assert data["feedbacks"][0]["feature"] == "cv_generation"

def test_get_profile_fallback_to_users(test_client, mock_db):
    """Si aucun profil JSON complet n'existe, l'API doit retomber sur les données de la table users."""
    # Le premier fetchone() (user_profiles) renvoie None
    # Le deuxième fetchone() (users) renvoie des données de base
    mock_db["cursor"].fetchone.side_effect = [
        None, 
        {"email": "mock@test.com", "first_name": "Bob", "last_name": "Mock"}
    ]
    
    response = test_client.get("/api/cv/me/profile")
    assert response.status_code == 200
    
    data = response.json()
    assert "form" in data
    assert data["form"]["first_name"] == "Bob"
    assert data["form"]["email"] == "mock@test.com"
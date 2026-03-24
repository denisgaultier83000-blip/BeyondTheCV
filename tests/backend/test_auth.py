import pytest
from fastapi.testclient import TestClient

# --- Test 5: Login Succès ---
def test_login_success(test_client: TestClient, mock_db, mocker):
    """Vérifie qu'un login valide retourne un token."""
    # Mock de l'utilisateur en base
    user_data = {
        "id": "u1", "email": "valid@test.com", 
        "hashed_password": "hashed_secret", 
        "first_name": "Test", "last_name": "User", 
        "is_premium": 1
    }
    mock_db['cursor'].fetchone.return_value = user_data
    
    # Mock de la vérification de mot de passe (toujours vrai ici)
    mocker.patch("services.auth.verify_password", return_value=True)
    
    response = test_client.post("/api/login", json={"email": "valid@test.com", "password": "password123"})
    
    assert response.status_code == 200
    assert "token" in response.json()
    assert response.json()["user"]["email"] == "valid@test.com"

# --- Test 6: Login Échec ---
def test_login_failure(test_client: TestClient, mock_db, mocker):
    """Vérifie qu'un mauvais mot de passe retourne une erreur 401."""
    # L'utilisateur existe
    mock_db['cursor'].fetchone.return_value = {"id": "u1", "hashed_password": "hashed_secret"}
    
    # Mais le mot de passe est faux
    mocker.patch("services.auth.verify_password", return_value=False)
    
    response = test_client.post("/api/login", json={"email": "valid@test.com", "password": "wrongpassword"})
    assert response.status_code == 401

# --- Test 1 (Nouveau): Échec de l'inscription si l'email existe ---
def test_register_failure_email_exists(test_client: TestClient, mock_db):
    """Vérifie qu'on ne peut pas s'inscrire avec un email déjà utilisé."""
    # L'utilisateur avec cet email existe déjà dans la base de données
    mock_db['cursor'].fetchone.return_value = {"id": "u1"}
    
    payload = {
        "email": "existing@test.com",
        "password": "password123",
        "first_name": "Jane",
        "last_name": "Doe"
    }
    
    response = test_client.post("/api/register", json=payload)
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"
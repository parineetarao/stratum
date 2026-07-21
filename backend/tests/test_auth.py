from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_register_missing_fields():
    response = client.post("/auth/register", json={})
    assert response.status_code == 422


def test_login_invalid_credentials():
    response = client.post("/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_protected_route_without_token():
    response = client.get("/projects")
    assert response.status_code == 403
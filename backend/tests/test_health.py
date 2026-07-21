from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "stratum-backend"


def test_docs_accessible():
    response = client.get("/docs")
    assert response.status_code == 200
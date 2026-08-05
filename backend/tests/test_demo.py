import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base
from tests.conftest import TestingSessionLocal, test_engine
from app.models.user import User
from app.models.project import Project, DomainEnum, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.core.security import hash_password

client = TestClient(app)


def _register_and_login(email: str) -> str:
    client.post("/auth/register", json={"email": email, "password": "password123"})
    resp = client.post("/auth/login", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_demo_project() -> int:
    db = TestingSessionLocal()
    try:
        owner = User(email="demo-owner@stratum.internal", hashed_password=hash_password("unused-password"))
        db.add(owner)
        db.commit()
        db.refresh(owner)

        project = Project(
            user_id=owner.id,
            name="Pagila DVD Rental Analysis",
            domain=DomainEnum.retail,
            analysis_mode=AnalysisMode.warehouse,
            is_demo=True,
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        connection = Connection(
            project_id=project.id,
            connection_type=ConnectionType.postgresql,
            connection_string="postgresql://demo:demo@localhost:5432/pagila",
            source_schema="public",
        )
        db.add(connection)
        db.commit()

        return project.id
    finally:
        db.close()


def _create_own_project(token: str) -> int:
    resp = client.post("/projects", json={"name": "My Project", "domain": "retail"}, headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Demo route accessibility
# ---------------------------------------------------------------------------

def test_demo_overview_accessible_without_login():
    project_id = _create_demo_project()
    resp = client.get(f"/projects/{project_id}/overview")
    assert resp.status_code == 200
    assert resp.json()["is_demo"] is True


def test_demo_connection_accessible_without_login():
    project_id = _create_demo_project()
    resp = client.get(f"/projects/{project_id}/connection")
    assert resp.status_code == 200


def test_demo_relationships_accessible_without_login():
    project_id = _create_demo_project()
    resp = client.get(f"/projects/{project_id}/relationships")
    assert resp.status_code == 200
    assert resp.json()["project_id"] == project_id


def test_private_project_inaccessible_without_login():
    token = _register_and_login("owner1@test.com")
    project_id = _create_own_project(token)

    resp = client.get(f"/projects/{project_id}/overview")
    assert resp.status_code == 404


def test_private_project_inaccessible_to_other_user():
    token = _register_and_login("owner2@test.com")
    project_id = _create_own_project(token)

    other_token = _register_and_login("intruder@test.com")
    resp = client.get(f"/projects/{project_id}/overview", headers=_auth_headers(other_token))
    assert resp.status_code == 404


def test_demo_project_not_in_authenticated_users_project_list():
    _create_demo_project()
    token = _register_and_login("regular-user@test.com")
    resp = client.get("/projects", headers=_auth_headers(token))
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "Pagila DVD Rental Analysis" not in names


# ---------------------------------------------------------------------------
# Mutation guard
# ---------------------------------------------------------------------------

def test_demo_mutation_rejected_for_authenticated_non_owner():
    project_id = _create_demo_project()
    token = _register_and_login("would-be-editor@test.com")

    resp = client.post(f"/projects/{project_id}/relationships/bulk-accept", headers=_auth_headers(token))
    assert resp.status_code == 403
    assert "unavailable in the public demo" in resp.json()["detail"]


def test_demo_mutation_rejected_for_cleaning_bulk_decide():
    project_id = _create_demo_project()
    token = _register_and_login("editor2@test.com")

    resp = client.post(
        f"/projects/{project_id}/cleaning-recommendations/bulk-decide",
        json={"action": "approve_high_confidence"},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 403


def test_demo_mutation_rejected_for_insights_generate():
    project_id = _create_demo_project()
    token = _register_and_login("editor3@test.com")

    resp = client.post(f"/projects/{project_id}/insights", headers=_auth_headers(token))
    assert resp.status_code == 403


def test_demo_mutation_rejected_for_sql_save():
    project_id = _create_demo_project()
    token = _register_and_login("editor4@test.com")

    resp = client.post(
        f"/projects/{project_id}/sql/save",
        json={"name": "q", "sql": "SELECT 1", "environment": "source"},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 403


def test_demo_mutation_requires_auth_at_all():
    project_id = _create_demo_project()
    resp = client.post(f"/projects/{project_id}/relationships/bulk-accept")
    assert resp.status_code == 403 or resp.status_code == 401


def test_own_project_mutation_still_works():
    token = _register_and_login("full-access@test.com")
    project_id = _create_own_project(token)

    resp = client.post(
        f"/projects/{project_id}/cleaning-recommendations/bulk-decide",
        json={"action": "reset_all"},
        headers=_auth_headers(token),
    )
    # No cleaning recommendations exist yet, but the request must reach
    # that business-logic 404 rather than being blocked by the demo guard.
    assert resp.status_code == 404
    assert "demo" not in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# SQL Workspace demo mode
# ---------------------------------------------------------------------------

def test_demo_sql_execute_rejects_arbitrary_sql():
    project_id = _create_demo_project()
    resp = client.post(
        f"/projects/{project_id}/sql/execute",
        json={"sql": "DROP TABLE film;", "environment": "source"},
    )
    assert resp.status_code == 400
    assert "curated" in resp.json()["detail"].lower()


def test_demo_sql_execute_rejects_unknown_query_id():
    project_id = _create_demo_project()
    resp = client.post(
        f"/projects/{project_id}/sql/execute",
        json={"query_id": "not_a_real_query", "environment": "source"},
    )
    assert resp.status_code == 400


def test_demo_sql_execute_accepts_curated_query_id():
    project_id = _create_demo_project()
    resp = client.post(
        f"/projects/{project_id}/sql/execute",
        json={"query_id": "demo_monthly_rentals", "environment": "source"},
    )
    # No real Postgres is reachable in the test environment, so execution
    # itself fails, but the request must be accepted (not blocked as
    # "arbitrary SQL") and reach the connector.
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False
    assert "curated" not in (body.get("error") or "").lower()


def test_curated_demo_queries_all_have_row_limit():
    from app.demo.curated_queries import CURATED_DEMO_QUERIES
    assert len(CURATED_DEMO_QUERIES) == 5
    for query in CURATED_DEMO_QUERIES.values():
        assert "LIMIT" in query["sql"].upper()

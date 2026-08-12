"""Regression tests for uploaded-file durability across an ephemeral host
filesystem (e.g. a Render web service without a persistent disk, which
wipes local storage on every container restart). Uploaded bytes are kept
in ConnectionFile.file_data so app/core/file_storage.materialize_file can
rewrite the on-disk copy on demand instead of failing reads."""
import io
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.database import Base
from tests.conftest import TestingSessionLocal, test_engine
from app.models.connection import Connection
from app.models.connection_file import ConnectionFile
from app.core.file_storage import materialize_file
from app.connectors.factory import build_connector

client = TestClient(app)


def _register_and_login(email: str) -> str:
    client.post("/auth/register", json={"email": email, "password": "password123"})
    resp = client.post("/auth/login", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_project(token: str) -> int:
    resp = client.post("/projects", json={"name": "Persistence Project", "domain": "retail"}, headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


CUSTOMERS_CSV = b"customer_id,name\n1,Alice\n2,Bob\n"


def _upload_and_wipe_disk(token: str, project_id: int) -> ConnectionFile:
    resp = client.post(
        f"/projects/{project_id}/connect/files",
        files=[("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv"))],
        headers=_auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    file_id = resp.json()[0]["id"]

    db = TestingSessionLocal()
    try:
        connection_file = db.query(ConnectionFile).filter(ConnectionFile.id == file_id).first()
        stored_path = Path(connection_file.stored_path)
        assert stored_path.exists()
        assert connection_file.file_data == CUSTOMERS_CSV
        stored_path.unlink()  # simulate the ephemeral disk being wiped
        assert not stored_path.exists()
        return connection_file
    finally:
        db.close()


def test_connect_files_persists_raw_bytes_in_db():
    token = _register_and_login("persist-bytes@test.com")
    project_id = _create_project(token)
    connection_file = _upload_and_wipe_disk(token, project_id)
    assert connection_file.file_data == CUSTOMERS_CSV


def test_materialize_file_rewrites_missing_file_from_db_copy():
    token = _register_and_login("materialize@test.com")
    project_id = _create_project(token)
    connection_file = _upload_and_wipe_disk(token, project_id)

    path = materialize_file(connection_file)
    assert Path(path).exists()
    assert Path(path).read_bytes() == CUSTOMERS_CSV


def test_dashboard_survives_disk_wipe_after_upload():
    """The dashboard's fail-fast connector-reachability check must not 502
    just because the ephemeral disk was wiped, as long as the DB copy of
    the file is still there."""
    token = _register_and_login("dashboard-persist@test.com")
    project_id = _create_project(token)
    _upload_and_wipe_disk(token, project_id)

    resp = client.post(f"/projects/{project_id}/discover", headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text

    resp = client.get(f"/projects/{project_id}/dashboard", headers=_auth_headers(token))
    assert resp.status_code != 502, resp.text


def test_connection_health_survives_disk_wipe_after_upload():
    token = _register_and_login("health-persist@test.com")
    project_id = _create_project(token)
    _upload_and_wipe_disk(token, project_id)

    resp = client.post(f"/projects/{project_id}/data-source/test-connection", headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["health"]["status"] == "healthy"


def test_build_connector_never_raises_when_db_copy_missing_too():
    """A ConnectionFile from before this feature existed (no file_data) with
    its on-disk copy gone must fail lazily inside the connector read, not
    eagerly when the connector is constructed — preserving every existing
    endpoint's error handling."""
    token = _register_and_login("legacy-missing@test.com")
    project_id = _create_project(token)
    connection_file = _upload_and_wipe_disk(token, project_id)

    db = TestingSessionLocal()
    try:
        cf = db.query(ConnectionFile).filter(ConnectionFile.id == connection_file.id).first()
        cf.file_data = None  # simulate a pre-fix row with nothing to rehydrate from
        db.commit()

        connection = db.query(Connection).filter(Connection.id == cf.connection_id).first()
        connector = build_connector(connection)  # must not raise here
        try:
            connector.get_tables()
            raised = False
        except Exception:
            raised = True
        assert raised, "expected the lazy file read to fail once the file is truly gone"
    finally:
        db.close()

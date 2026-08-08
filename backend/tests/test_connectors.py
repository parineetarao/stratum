import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.connectors.csv_connector import CSVConnector, MultiFileConnector

client = TestClient(app)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _register_and_login(email: str) -> str:
    client.post("/auth/register", json={"email": email, "password": "password123"})
    resp = client.post("/auth/login", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_project(token: str) -> int:
    resp = client.post("/projects", json={"name": "Files Project", "domain": "retail"}, headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def _csv_bytes(rows: list[dict]) -> bytes:
    header = ",".join(rows[0].keys())
    lines = [",".join(str(v) for v in row.values()) for row in rows]
    return ("\n".join([header] + lines) + "\n").encode("utf-8")


CUSTOMERS_CSV = _csv_bytes([
    {"customer_id": 1, "name": "Alice"},
    {"customer_id": 2, "name": "Bob"},
])

ORDERS_CSV = _csv_bytes([
    {"order_id": 1, "customer_id": 1, "total": 100},
    {"order_id": 2, "customer_id": 2, "total": 50},
])


# ---------------------------------------------------------------------------
# CSVConnector - single file (unit)
# ---------------------------------------------------------------------------

def test_single_csv_connector_reports_one_table(tmp_path):
    file_path = tmp_path / "customers.csv"
    file_path.write_bytes(CUSTOMERS_CSV)

    connector = CSVConnector(str(file_path), table_name="customers")
    assert connector.get_tables() == ["customers"]
    assert connector.get_row_count("customers") == 2
    columns = {c["name"] for c in connector.get_columns("customers")}
    assert columns == {"customer_id", "name"}


def test_excel_single_sheet_uses_base_table_name(tmp_path):
    pd = pytest.importorskip("pandas")
    file_path = tmp_path / "products.xlsx"
    pd.DataFrame({"id": [1, 2], "name": ["A", "B"]}).to_excel(file_path, index=False)

    connector = CSVConnector(str(file_path), table_name="products")
    assert connector.get_tables() == ["products"]


def test_excel_multi_sheet_creates_one_table_per_sheet(tmp_path):
    pd = pytest.importorskip("pandas")
    file_path = tmp_path / "workbook.xlsx"
    with pd.ExcelWriter(file_path) as writer:
        pd.DataFrame({"id": [1]}).to_excel(writer, sheet_name="Customers", index=False)
        pd.DataFrame({"id": [1]}).to_excel(writer, sheet_name="Orders", index=False)

    connector = CSVConnector(str(file_path), table_name="workbook")
    tables = set(connector.get_tables())
    assert tables == {"workbook_customers", "workbook_orders"}


# ---------------------------------------------------------------------------
# MultiFileConnector (unit)
# ---------------------------------------------------------------------------

def test_multi_file_connector_aggregates_tables(tmp_path):
    customers_path = tmp_path / "customers.csv"
    customers_path.write_bytes(CUSTOMERS_CSV)
    orders_path = tmp_path / "orders.csv"
    orders_path.write_bytes(ORDERS_CSV)

    connector = MultiFileConnector([
        (str(customers_path), "customers"),
        (str(orders_path), "orders"),
    ])

    assert set(connector.get_tables()) == {"customers", "orders"}
    assert connector.get_row_count("customers") == 2
    assert connector.get_row_count("orders") == 2

    with pytest.raises(ValueError):
        connector.get_row_count("does_not_exist")


def test_multi_file_connector_run_query_joins_across_files(tmp_path):
    customers_path = tmp_path / "customers.csv"
    customers_path.write_bytes(CUSTOMERS_CSV)
    orders_path = tmp_path / "orders.csv"
    orders_path.write_bytes(ORDERS_CSV)

    connector = MultiFileConnector([
        (str(customers_path), "customers"),
        (str(orders_path), "orders"),
    ])

    df = connector.run_query(
        "SELECT c.name, o.total FROM customers c JOIN orders o "
        "ON c.customer_id = o.customer_id ORDER BY c.name"
    )
    assert list(df["name"]) == ["Alice", "Bob"]
    assert list(df["total"]) == [100, 50]


# ---------------------------------------------------------------------------
# Upload API (integration)
# ---------------------------------------------------------------------------

def test_upload_single_csv_via_connect_files(tmp_path):
    token = _register_and_login("single-file@test.com")
    project_id = _create_project(token)

    resp = client.post(
        f"/projects/{project_id}/connect/files",
        files=[("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv"))],
        headers=_auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body) == 1
    assert body[0]["table_name"] == "customers"


def test_upload_multiple_csvs_creates_multiple_tables():
    token = _register_and_login("multi-file@test.com")
    project_id = _create_project(token)

    resp = client.post(
        f"/projects/{project_id}/connect/files",
        files=[
            ("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv")),
            ("files", ("orders.csv", io.BytesIO(ORDERS_CSV), "text/csv")),
        ],
        headers=_auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    table_names = {f["table_name"] for f in resp.json()}
    assert table_names == {"customers", "orders"}

    listing = client.get(f"/projects/{project_id}/connection/files", headers=_auth_headers(token))
    assert listing.status_code == 200
    assert len(listing.json()) == 2


def test_upload_csv_then_excel_in_same_project():
    pd = pytest.importorskip("pandas")
    token = _register_and_login("mixed-file@test.com")
    project_id = _create_project(token)

    client.post(
        f"/projects/{project_id}/connect/files",
        files=[("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv"))],
        headers=_auth_headers(token),
    )

    excel_buf = io.BytesIO()
    pd.DataFrame({"id": [1]}).to_excel(excel_buf, index=False)
    excel_buf.seek(0)
    resp = client.post(
        f"/projects/{project_id}/connect/files",
        files=[("files", ("payments.xlsx", excel_buf,
                           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))],
        headers=_auth_headers(token),
    )
    assert resp.status_code == 200, resp.text

    listing = client.get(f"/projects/{project_id}/connection/files", headers=_auth_headers(token))
    table_names = {f["table_name"] for f in listing.json()}
    assert table_names == {"customers", "payments"}


def test_duplicate_table_name_gets_suffixed():
    token = _register_and_login("dup-file@test.com")
    project_id = _create_project(token)

    client.post(
        f"/projects/{project_id}/connect/files",
        files=[("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv"))],
        headers=_auth_headers(token),
    )
    resp = client.post(
        f"/projects/{project_id}/connect/files",
        files=[("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv"))],
        headers=_auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    table_names = [f["table_name"] for f in resp.json()]
    assert table_names == ["customers_2"]


def test_remove_one_file_keeps_others():
    token = _register_and_login("remove-file@test.com")
    project_id = _create_project(token)

    resp = client.post(
        f"/projects/{project_id}/connect/files",
        files=[
            ("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv")),
            ("files", ("orders.csv", io.BytesIO(ORDERS_CSV), "text/csv")),
        ],
        headers=_auth_headers(token),
    )
    file_ids = {f["table_name"]: f["id"] for f in resp.json()}

    del_resp = client.delete(
        f"/projects/{project_id}/connection/files/{file_ids['orders']}",
        headers=_auth_headers(token),
    )
    assert del_resp.status_code == 204

    listing = client.get(f"/projects/{project_id}/connection/files", headers=_auth_headers(token))
    remaining = {f["table_name"] for f in listing.json()}
    assert remaining == {"customers"}


def test_metadata_discovery_returns_multiple_tables():
    token = _register_and_login("discover-file@test.com")
    project_id = _create_project(token)

    client.post(
        f"/projects/{project_id}/connect/files",
        files=[
            ("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv")),
            ("files", ("orders.csv", io.BytesIO(ORDERS_CSV), "text/csv")),
        ],
        headers=_auth_headers(token),
    )

    resp = client.post(f"/projects/{project_id}/discover", headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    table_names = {t["table_name"] for t in resp.json()["tables"]}
    assert table_names == {"customers", "orders"}


def test_profiling_runs_per_uploaded_table():
    token = _register_and_login("profile-file@test.com")
    project_id = _create_project(token)

    client.post(
        f"/projects/{project_id}/connect/files",
        files=[
            ("files", ("customers.csv", io.BytesIO(CUSTOMERS_CSV), "text/csv")),
            ("files", ("orders.csv", io.BytesIO(ORDERS_CSV), "text/csv")),
        ],
        headers=_auth_headers(token),
    )
    client.post(f"/projects/{project_id}/discover", headers=_auth_headers(token))

    resp = client.post(f"/projects/{project_id}/profile", headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    profiled_tables = {t["table_name"] for t in resp.json()["tables"]}
    assert profiled_tables == {"customers", "orders"}


def test_postgres_connection_unaffected_by_file_model():
    """A PostgreSQL connection must not gain ConnectionFile rows or be
    routed through the multi-file connector."""
    token = _register_and_login("pg-file@test.com")
    project_id = _create_project(token)

    resp = client.post(
        f"/projects/{project_id}/connect/postgres",
        json={"connection_string": "postgresql://user:pass@localhost:5432/doesnotexist"},
        headers=_auth_headers(token),
    )
    # No real Postgres reachable in CI, so the connect call itself fails --
    # what matters is that it fails at the connection-test stage, not by
    # being coerced into file-upload logic.
    assert resp.status_code == 400
    assert "Connection failed" in resp.json()["detail"]

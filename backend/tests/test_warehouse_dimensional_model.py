"""
Tests for the dimensional-modeling upgrade to warehouse_designer.py /
sandbox_engine.py: dimension deduplication, dw_id surrogate keys, fact
surrogate-key rewiring, and the extended star-schema validation checks.
"""
import duckdb
import pytest

from app.engine import warehouse_designer as wd
from app.engine import sandbox_engine as se
from app.engine.kpi_engine import is_warehouse_technical_key, find_best_measure_column


def _customers_orders_schema():
    return [
        {
            "table_name": "customers",
            "row_count": 3,
            "columns": [
                {"name": "customer_id", "type": "varchar", "is_primary_key": True},
                {"name": "customer_name", "type": "varchar"},
                {"name": "region", "type": "varchar"},
            ],
        },
        {
            "table_name": "orders",
            "row_count": 4,
            "columns": [
                {"name": "order_id", "type": "integer", "is_primary_key": True},
                {
                    "name": "customer_id", "type": "varchar",
                    "foreign_key": {
                        "referenced_table": "customers",
                        "referenced_column": "customer_id"
                    },
                },
                {"name": "amount", "type": "numeric"},
            ],
        },
    ]


def _design():
    return wd.design_warehouse(
        _customers_orders_schema(),
        overrides={"orders": "fact", "customers": "dimension"}
    )


# ---------------------------------------------------------------------
# DDL-generation level tests (no DB execution)
# ---------------------------------------------------------------------

def test_design_classifies_and_wires_surrogate_key():
    design = _design()
    dim = next(d for d in design["dimension_tables"] if d["source_table"] == "customers")
    fact = next(f for f in design["fact_tables"] if f["source_table"] == "orders")

    assert dim["natural_key"] == ["customer_id"]
    assert dim["deduplicated"] is True
    assert dim["surrogate_key"] == "dw_id"

    assert len(fact["surrogate_key_joins"]) == 1
    link = fact["surrogate_key_joins"][0]
    assert link["dw_key_name"] == "dw_customers_key"
    assert link["column_name"] == "customer_id"
    assert link["warehouse_table"] == "dim_customers"


def test_dimension_ddl_dedup_uses_partition_and_row_number():
    design = _design()
    dim = next(d for d in design["dimension_tables"] if d["source_table"] == "customers")
    ddl = dim["ddl_duckdb"]
    assert "ROW_NUMBER() OVER (ORDER BY customer_id) AS dw_id" in ddl
    assert "PARTITION BY customer_id" in ddl
    assert "_dw_dedup_rank = 1" in ddl


def test_dimension_ddl_without_natural_key_skips_dedup():
    table = {
        "table_name": "logs",
        "columns": [
            {"name": "event", "type": "varchar"},
            {"name": "value", "type": "numeric"},
        ],
    }
    ddl = wd.generate_dimension_ddl_duckdb(table, "dim_logs", natural_key_columns=[])
    assert "PARTITION BY" not in ddl
    assert "ROW_NUMBER() OVER () AS dw_id" in ddl


def test_fact_ddl_preserves_original_fk_column_and_adds_surrogate():
    design = _design()
    fact = next(f for f in design["fact_tables"] if f["source_table"] == "orders")
    ddl = fact["ddl_duckdb"]
    assert "src.customer_id" in ddl  # original FK column preserved
    assert "LEFT JOIN dim_customers AS _dwjoin_0 ON src.customer_id = _dwjoin_0.customer_id" in ddl
    assert "_dwjoin_0.dw_id AS dw_customers_key" in ddl


def test_build_surrogate_key_joins_skips_fact_to_fact_references():
    foreign_keys = [
        {"column_name": "customer_id", "references_table": "customers", "references_column": "customer_id"},
        {"column_name": "parent_order_id", "references_table": "orders", "references_column": "order_id"},
    ]
    dim_warehouse_names = {"customers": "dim_customers"}
    joins = wd.build_surrogate_key_joins(foreign_keys, dim_warehouse_names)
    assert len(joins) == 1
    assert joins[0]["references_table"] == "customers"


# ---------------------------------------------------------------------
# End-to-end DuckDB execution tests
# ---------------------------------------------------------------------

@pytest.fixture
def duck_conn(tmp_path):
    conn = duckdb.connect(str(tmp_path / "test.duckdb"))
    conn.execute("CREATE TABLE customers (customer_id VARCHAR, customer_name VARCHAR, region VARCHAR)")
    conn.execute(
        "INSERT INTO customers VALUES "
        "('C01','Alice','West'), ('C01','Alice','West'), ('C02','Bob','East')"
    )
    conn.execute("CREATE TABLE orders (order_id INTEGER, customer_id VARCHAR, amount DOUBLE)")
    conn.execute(
        "INSERT INTO orders VALUES "
        "(101,'C01',500), (102,'C01',700), (103,'C02',300), (104,'C99',50)"
    )
    design = _design()
    dim = next(d for d in design["dimension_tables"] if d["source_table"] == "customers")
    fact = next(f for f in design["fact_tables"] if f["source_table"] == "orders")
    conn.execute(dim["ddl_duckdb"])
    conn.execute(fact["ddl_duckdb"])
    yield conn
    conn.close()


def test_dimension_deduplication(duck_conn):
    rows = duck_conn.execute(
        "SELECT customer_id, COUNT(*) FROM dim_customers GROUP BY customer_id"
    ).fetchall()
    assert len(rows) == 2
    assert all(count == 1 for _, count in rows)


def test_surrogate_key_uniqueness(duck_conn):
    total = duck_conn.execute("SELECT COUNT(*) FROM dim_customers").fetchone()[0]
    distinct = duck_conn.execute("SELECT COUNT(DISTINCT dw_id) FROM dim_customers").fetchone()[0]
    assert total == distinct == 2


def test_fact_fk_rewiring_resolves_to_dimension_dw_id(duck_conn):
    dw_id_for_c01 = duck_conn.execute(
        "SELECT dw_id FROM dim_customers WHERE customer_id = 'C01'"
    ).fetchone()[0]
    fact_keys = duck_conn.execute(
        "SELECT dw_customers_key FROM fact_orders WHERE customer_id = 'C01'"
    ).fetchall()
    assert all(row[0] == dw_id_for_c01 for row in fact_keys)


def test_multiple_fact_rows_map_to_one_dimension_row(duck_conn):
    keys = duck_conn.execute(
        "SELECT dw_customers_key FROM fact_orders WHERE customer_id = 'C01'"
    ).fetchall()
    assert len(keys) == 2
    assert keys[0][0] == keys[1][0]


def test_missing_dimension_mapping_yields_null_surrogate_key(duck_conn):
    result = duck_conn.execute(
        "SELECT dw_customers_key FROM fact_orders WHERE customer_id = 'C99'"
    ).fetchone()
    assert result[0] is None


# ---------------------------------------------------------------------
# validate_warehouse() surrogate-key checks
# ---------------------------------------------------------------------

def test_validate_warehouse_reports_surrogate_key_checks(tmp_path, monkeypatch):
    monkeypatch.setattr(se, "SANDBOX_DIR", tmp_path)
    project_id = 999001
    design = _design()

    conn = duckdb.connect(se.get_sandbox_path(project_id))
    conn.execute("CREATE TABLE customers (customer_id VARCHAR, customer_name VARCHAR, region VARCHAR)")
    conn.execute(
        "INSERT INTO customers VALUES "
        "('C01','Alice','West'), ('C01','Alice','West'), ('C02','Bob','East')"
    )
    conn.execute("CREATE TABLE orders (order_id INTEGER, customer_id VARCHAR, amount DOUBLE)")
    conn.execute(
        "INSERT INTO orders VALUES "
        "(101,'C01',500), (102,'C01',700), (103,'C02',300), (104,'C99',50)"
    )
    dim = next(d for d in design["dimension_tables"] if d["source_table"] == "customers")
    fact = next(f for f in design["fact_tables"] if f["source_table"] == "orders")
    conn.execute(dim["ddl_duckdb"])
    conn.execute(fact["ddl_duckdb"])
    conn.close()

    result = se.validate_warehouse(project_id, design["fact_tables"], design["dimension_tables"])
    checks = result["surrogate_key_validations"]

    dw_id_check = next(c for c in checks if c["check"] == "dw_id_uniqueness")
    assert dw_id_check["status"] == "passed"

    nk_check = next(c for c in checks if c["check"] == "natural_key_uniqueness")
    assert nk_check["status"] == "passed"

    unmapped_check = next(c for c in checks if c["check"] == "unmapped_surrogate_key")
    assert unmapped_check["status"] == "warning"
    assert unmapped_check["unmapped_count"] == 1  # the C99 order


def test_validate_warehouse_warns_when_no_natural_key(tmp_path, monkeypatch):
    monkeypatch.setattr(se, "SANDBOX_DIR", tmp_path)
    project_id = 999002

    schema = [{
        "table_name": "logs",
        "row_count": 3,
        "columns": [
            {"name": "event", "type": "varchar"},
            {"name": "value", "type": "numeric"},
        ],
    }]
    design = wd.design_warehouse(schema, overrides={"logs": "dimension"})
    dim = design["dimension_tables"][0]
    assert dim["natural_key"] == []

    conn = duckdb.connect(se.get_sandbox_path(project_id))
    conn.execute("CREATE TABLE logs (event VARCHAR, value DOUBLE)")
    conn.execute("INSERT INTO logs VALUES ('a', 1), ('b', 2)")
    conn.execute(dim["ddl_duckdb"])
    conn.close()

    result = se.validate_warehouse(project_id, [], design["dimension_tables"])
    nk_check = next(
        c for c in result["surrogate_key_validations"]
        if c["check"] == "natural_key_uniqueness"
    )
    assert nk_check["status"] == "warning"


# ---------------------------------------------------------------------
# KPI engine safety: dw_ technical keys must never become measures
# ---------------------------------------------------------------------

def test_is_warehouse_technical_key():
    assert is_warehouse_technical_key("dw_id") is True
    assert is_warehouse_technical_key("dw_customers_key") is True
    assert is_warehouse_technical_key("dw_created_at") is False
    assert is_warehouse_technical_key("amount") is False
    assert is_warehouse_technical_key(None) is False


class _FakeConnector:
    def __init__(self, tables):
        self.tables = tables

    def run_query(self, sql):
        for name, df in self.tables.items():
            if f"FROM {name}" in sql:
                return df
        raise ValueError(f"unexpected query: {sql}")


def test_refresh_rebuilds_warehouse_tables_via_ddl(tmp_path, monkeypatch):
    import pandas as pd

    monkeypatch.setattr(se, "SANDBOX_DIR", tmp_path)
    project_id = 999003
    design = _design()
    dim = next(d for d in design["dimension_tables"] if d["source_table"] == "customers")
    fact = next(f for f in design["fact_tables"] if f["source_table"] == "orders")

    conn = duckdb.connect(se.get_sandbox_path(project_id))
    conn.execute("CREATE TABLE customers (customer_id VARCHAR, customer_name VARCHAR, region VARCHAR)")
    conn.execute("INSERT INTO customers VALUES ('C01','Alice','West')")
    conn.execute("CREATE TABLE orders (order_id INTEGER, customer_id VARCHAR, amount DOUBLE)")
    conn.execute("INSERT INTO orders VALUES (101,'C01',500)")
    conn.execute(dim["ddl_duckdb"])
    conn.execute(fact["ddl_duckdb"])
    conn.close()

    connector = _FakeConnector({
        "customers": pd.DataFrame({
            "customer_id": ["C01", "C02"],
            "customer_name": ["Alice", "Bob"],
            "region": ["West", "East"],
        }),
        "orders": pd.DataFrame({
            "order_id": [101, 105],
            "customer_id": ["C01", "C02"],
            "amount": [500.0, 900.0],
        }),
    })

    result = se.refresh_warehouse_data(
        project_id, connector, ["customers", "orders"],
        design["warehouse_table_names"], design["full_ddl_duckdb"]
    )
    assert "customers" in result["refreshed_tables"]
    assert "orders" in result["refreshed_tables"]

    conn = duckdb.connect(se.get_sandbox_path(project_id))
    dim_rows = conn.execute("SELECT customer_id FROM dim_customers ORDER BY dw_id").fetchall()
    assert [r[0] for r in dim_rows] == ["C01", "C02"]

    key_for_c02 = conn.execute(
        "SELECT dw_customers_key FROM fact_orders WHERE customer_id = 'C02'"
    ).fetchone()[0]
    dw_id_for_c02 = conn.execute(
        "SELECT dw_id FROM dim_customers WHERE customer_id = 'C02'"
    ).fetchone()[0]
    assert key_for_c02 == dw_id_for_c02
    conn.close()


def test_find_best_measure_column_never_selects_technical_keys():
    table = {
        "measures": [
            {"column_name": "dw_customers_key", "data_type": "integer"},
            {"column_name": "amount", "data_type": "numeric"},
        ]
    }
    # Simulate the numeric/PK/FK-cleared shape find_best_measure_column expects.
    table_with_columns = {
        "columns": [
            {"name": "dw_customers_key", "type": "integer"},
            {"name": "amount", "type": "numeric"},
        ]
    }
    result = find_best_measure_column(table_with_columns, ["amount", "key", "total"])
    assert result == "amount"

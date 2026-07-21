from app.engine.schema_drift import compute_drift, identify_affected_objects


def test_no_drift_identical_schemas():
    schema = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "id", "type": "integer",
                 "nullable": False, "is_primary_key": True},
                {"name": "amount", "type": "numeric",
                 "nullable": True, "is_primary_key": False}
            ]
        }
    ]
    drift = compute_drift(schema, schema)
    assert drift["has_changes"] is False
    assert drift["total_changes"] == 0


def test_detects_added_table():
    previous = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "id", "type": "integer",
                 "nullable": False, "is_primary_key": True}
            ]
        }
    ]
    current = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "id", "type": "integer",
                 "nullable": False, "is_primary_key": True}
            ]
        },
        {
            "table_name": "customers",
            "row_count": 500,
            "columns": [
                {"name": "id", "type": "integer",
                 "nullable": False, "is_primary_key": True}
            ]
        }
    ]
    drift = compute_drift(previous, current)
    assert drift["has_changes"] is True
    assert len(drift["added_tables"]) == 1
    assert drift["added_tables"][0]["table_name"] == "customers"


def test_detects_deleted_column():
    previous = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "id", "type": "integer",
                 "nullable": False, "is_primary_key": True},
                {"name": "legacy_code", "type": "varchar",
                 "nullable": True, "is_primary_key": False}
            ]
        }
    ]
    current = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "id", "type": "integer",
                 "nullable": False, "is_primary_key": True}
            ]
        }
    ]
    drift = compute_drift(previous, current)
    assert drift["has_changes"] is True
    assert len(drift["deleted_columns"]) == 1
    assert drift["deleted_columns"][0]["column_name"] == "legacy_code"
    assert drift["deleted_columns"][0]["severity"] == "critical"


def test_detects_modified_column_type():
    previous = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "amount", "type": "numeric",
                 "nullable": True, "is_primary_key": False}
            ]
        }
    ]
    current = [
        {
            "table_name": "orders",
            "row_count": 1000,
            "columns": [
                {"name": "amount", "type": "varchar",
                 "nullable": True, "is_primary_key": False}
            ]
        }
    ]
    drift = compute_drift(previous, current)
    assert drift["has_changes"] is True
    assert len(drift["modified_columns"]) == 1
    assert drift["modified_columns"][0]["old_type"] == "numeric"
    assert drift["modified_columns"][0]["new_type"] == "varchar"


def test_affected_kpi_detected():
    drift = {
        "deleted_tables": [{"table_name": "orders"}],
        "deleted_columns": [],
        "modified_columns": [],
        "added_tables": [],
        "added_columns": []
    }
    kpis = [
        {"name": "Total Revenue",
         "sql": "SELECT SUM(amount) as value FROM orders"}
    ]
    affected = identify_affected_objects(drift, None, kpis)
    assert len(affected["affected_kpis"]) == 1
    assert affected["affected_kpis"][0]["kpi_name"] == "Total Revenue"


def test_no_affected_objects_when_no_drift():
    drift = {
        "deleted_tables": [],
        "deleted_columns": [],
        "modified_columns": [],
        "added_tables": [],
        "added_columns": []
    }
    kpis = [
        {"name": "Total Revenue",
         "sql": "SELECT SUM(amount) as value FROM orders"}
    ]
    affected = identify_affected_objects(drift, None, kpis)
    assert len(affected["affected_kpis"]) == 0
    assert len(affected["affected_warehouse_tables"]) == 0
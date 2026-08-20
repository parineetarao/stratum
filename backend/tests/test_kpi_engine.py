import pandas as pd
import pytest
from app.engine.kpi_engine import (
    format_kpi_value,
    generate_kpi_sql,
    is_numeric,
    table_matches_keywords,
    column_matches_keywords,
    match_target_value,
    normalize_status_value,
    get_distinct_column_values,
    recommend_kpis,
)


def test_format_kpi_value_currency():
    assert format_kpi_value(24800000.0, "currency") == "$24.8M"
    assert format_kpi_value(1530.0, "USD") == "$1.5K"
    assert format_kpi_value(1.53, "$") == "$1.53"
    assert format_kpi_value(None, "currency") is None


def test_format_kpi_value_count_and_percentage():
    assert format_kpi_value(16245.0, "count") == "16,245"
    assert format_kpi_value(34.62, "percentage") == "34.62%"
    assert format_kpi_value(5.42, "days") == "5.42 days"


def test_keyword_matching():
    assert table_matches_keywords("payment", ["payment", "transaction"]) == 100
    assert table_matches_keywords("payment_history", ["payment"]) == 70
    assert column_matches_keywords("amount", ["amount", "price"]) == 100
    assert column_matches_keywords("total_amount", ["amount"]) == 85


def test_generate_kpi_sql():
    kpi_def = {"aggregation": "SUM"}
    table = {"source_table": "payment"}
    sql = generate_kpi_sql(kpi_def, table, "source", measure_col="amount")
    assert sql == "SELECT ROUND(SUM(amount)::NUMERIC, 2) as value FROM payment"

    kpi_def_count = {"aggregation": "COUNT"}
    sql_count = generate_kpi_sql(kpi_def_count, table, "source")
    assert sql_count == "SELECT COUNT(*) as value FROM payment"


def test_generate_kpi_sql_conditional_rate():
    kpi_def = {"aggregation": "CONDITIONAL_RATE"}
    table = {"source_table": "orders"}
    sql = generate_kpi_sql(
        kpi_def, table, "source", status_col="order_status", target_value="Cancelled"
    )
    assert sql == (
        "SELECT ROUND(COUNT(CASE WHEN order_status = 'Cancelled' THEN 1 END)::NUMERIC / "
        "NULLIF(COUNT(*), 0) * 100, 2) as value FROM orders"
    )

    # Missing status column or target value must not produce SQL.
    assert generate_kpi_sql(kpi_def, table, "source", target_value="Cancelled") is None
    assert generate_kpi_sql(kpi_def, table, "source", status_col="order_status") is None


def test_generate_kpi_sql_conditional_rate_escapes_quotes():
    kpi_def = {"aggregation": "CONDITIONAL_RATE"}
    table = {"source_table": "orders"}
    sql = generate_kpi_sql(
        kpi_def, table, "source", status_col="status", target_value="O'Brien"
    )
    assert "'O''Brien'" in sql


def test_normalize_status_value():
    assert normalize_status_value("Cancelled") == "cancelled"
    assert normalize_status_value("  CANCELED ") == "canceled"
    assert normalize_status_value(1) == "1"


def test_match_target_value_exact_normalized_match():
    observed = ["Active", "Cancelled", "Pending"]
    aliases = ["cancelled", "canceled"]
    assert match_target_value(observed, aliases) == "Cancelled"


def test_match_target_value_handles_alias_variants():
    # "Canceled" (one L) should match via the "canceled" alias.
    observed = ["Active", "Canceled", "Pending"]
    aliases = ["cancelled", "canceled"]
    assert match_target_value(observed, aliases) == "Canceled"


def test_match_target_value_no_match_returns_none():
    # An unrelated status value must never be guessed as a match.
    observed = ["Active", "Cancellation Requested", "Pending"]
    aliases = ["cancelled", "canceled"]
    assert match_target_value(observed, aliases) is None


def test_match_target_value_ignores_none_values():
    observed = [None, "Active"]
    aliases = ["cancelled"]
    assert match_target_value(observed, aliases) is None


class _FakeConnector:
    """Minimal connector stub for testing distinct-value discovery and
    end-to-end recommend_kpis() flows without a real database."""

    def __init__(self, sql_to_df):
        self.sql_to_df = sql_to_df
        self.queries = []

    def run_query(self, sql):
        self.queries.append(sql)
        for fragment, df in self.sql_to_df.items():
            if fragment in sql:
                return df
        return pd.DataFrame()


def test_get_distinct_column_values_uses_dedicated_query():
    connector = _FakeConnector({
        "DISTINCT order_status": pd.DataFrame({"value": ["Active", "Cancelled", "Pending"]})
    })
    values = get_distinct_column_values("orders", "order_status", "source", 1, connector)
    assert values == ["Active", "Cancelled", "Pending"]
    assert "SELECT DISTINCT order_status as value FROM orders" in connector.queries[0]


def test_get_distinct_column_values_empty_on_failure():
    connector = _FakeConnector({})

    class BrokenConnector:
        def run_query(self, sql):
            raise RuntimeError("boom")

    values = get_distinct_column_values("orders", "order_status", "source", 1, BrokenConnector())
    assert values == []


def _warehouse_design_with_orders_table(columns):
    return {
        "fact_tables": [{
            "source_table": "orders",
            "table_name": "orders",
            "fact_score": 90,
            "columns": columns,
        }],
        "dimension_tables": [],
    }


def test_recommend_kpis_conditional_rate_end_to_end_match():
    kpi_library_columns = [
        {"name": "order_id", "type": "integer", "is_primary_key": True},
        {"name": "order_status", "type": "varchar"},
    ]
    warehouse_design = _warehouse_design_with_orders_table(kpi_library_columns)
    source_schema = [{
        "table_name": "orders",
        "columns": kpi_library_columns,
    }]

    connector = _FakeConnector({
        "DISTINCT order_status": pd.DataFrame({"value": ["Active", "Cancelled", "Pending"]}),
        "CASE WHEN order_status": pd.DataFrame({"value": [25.0]}),
    })

    import app.engine.kpi_engine as kpi_engine_module
    original_library = kpi_engine_module.DOMAIN_KPI_LIBRARY
    try:
        kpi_engine_module.DOMAIN_KPI_LIBRARY = {
            "test_domain": [{
                "name": "Cancellation Rate",
                "description": "test",
                "category": "Quality",
                "unit": "percentage",
                "requires_fact_table": True,
                "measure_keywords": None,
                "measure_type": None,
                "aggregation": "CONDITIONAL_RATE",
                "identifier_keywords": None,
                "status_keywords": ["order_status", "status"],
                "target_value_aliases": ["cancelled", "canceled"],
                "date_required": False,
            }]
        }
        results = recommend_kpis(
            "test_domain", "source", 1, source_schema, warehouse_design, connector
        )
    finally:
        kpi_engine_module.DOMAIN_KPI_LIBRARY = original_library

    assert len(results) == 1
    kpi = results[0]
    assert kpi["name"] == "Cancellation Rate"
    assert "order_status = 'Cancelled'" in kpi["sql"]
    assert kpi["computed_value"] == 25.0
    assert kpi["evidence"]["target_value"] == "Cancelled"


def test_recommend_kpis_conditional_rate_skips_when_no_alias_match():
    kpi_library_columns = [
        {"name": "order_id", "type": "integer", "is_primary_key": True},
        {"name": "order_status", "type": "varchar"},
    ]
    warehouse_design = _warehouse_design_with_orders_table(kpi_library_columns)
    source_schema = [{
        "table_name": "orders",
        "columns": kpi_library_columns,
    }]

    # None of the observed values match the known aliases.
    connector = _FakeConnector({
        "DISTINCT order_status": pd.DataFrame({"value": ["Active", "Shipped", "Delivered"]}),
    })

    import app.engine.kpi_engine as kpi_engine_module
    original_library = kpi_engine_module.DOMAIN_KPI_LIBRARY
    try:
        kpi_engine_module.DOMAIN_KPI_LIBRARY = {
            "test_domain": [{
                "name": "Cancellation Rate",
                "description": "test",
                "category": "Quality",
                "unit": "percentage",
                "requires_fact_table": True,
                "measure_keywords": None,
                "measure_type": None,
                "aggregation": "CONDITIONAL_RATE",
                "identifier_keywords": None,
                "status_keywords": ["order_status", "status"],
                "target_value_aliases": ["cancelled", "canceled"],
                "date_required": False,
            }]
        }
        results = recommend_kpis(
            "test_domain", "source", 1, source_schema, warehouse_design, connector
        )
    finally:
        kpi_engine_module.DOMAIN_KPI_LIBRARY = original_library

    assert results == []


def test_conditional_rate_divide_by_zero_is_safe():
    # NULLIF(COUNT(*), 0) guards against division by zero; simulate the
    # database returning NULL (None) for an empty table.
    connector = _FakeConnector({
        "CASE WHEN status": pd.DataFrame({"value": [None]}),
    })
    from app.engine.kpi_engine import execute_kpi_sql
    sql = generate_kpi_sql(
        {"aggregation": "CONDITIONAL_RATE"}, {"source_table": "orders"}, "source",
        status_col="status", target_value="Cancelled"
    )
    value = execute_kpi_sql(sql, "source", 1, connector)
    assert value is None

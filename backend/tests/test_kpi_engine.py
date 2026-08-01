import pytest
from app.engine.kpi_engine import (
    format_kpi_value,
    generate_kpi_sql,
    is_numeric,
    table_matches_keywords,
    column_matches_keywords
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

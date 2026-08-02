"""
Chart Breakdown
===============
Builds analytical breakdown SQL (time-series or categorical) derived
from an approved KPI's own aggregation, so dashboard charts show a
genuine grouped/trend dataset instead of duplicating the KPI's single
scalar value as a one-bar chart.
"""

import re
from typing import Optional


def extract_measure_expression(sql: str) -> Optional[str]:
    """Extracts the aggregation expression from a KPI SQL string, e.g.
    "SELECT SUM(amount) as value FROM payment" -> "SUM(amount)"."""
    match = re.search(r'SELECT\s+(.*?)\s+as\s+value', sql, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()
    from_idx = sql.upper().find("FROM")
    if from_idx == -1:
        return None
    return sql[6:from_idx].strip().rstrip(',')


def extract_from_clause(sql: str) -> Optional[str]:
    """Extracts the FROM clause (and any WHERE/JOIN) up to but excluding
    any trailing GROUP BY / ORDER BY / LIMIT the original KPI SQL had."""
    from_idx = sql.upper().find("FROM")
    if from_idx == -1:
        return None
    tail = sql[from_idx:]
    for keyword in ("GROUP BY", "ORDER BY", "LIMIT"):
        idx = tail.upper().find(keyword)
        if idx != -1:
            tail = tail[:idx]
    return tail.strip()


def build_timeseries_sql(sql: str, date_column: str) -> Optional[str]:
    """Builds a monthly time-series version of a scalar KPI SQL."""
    measure = extract_measure_expression(sql)
    from_clause = extract_from_clause(sql)
    if not measure or not from_clause:
        return None
    return (
        f"SELECT DATE_TRUNC('month', {date_column}) as period, "
        f"{measure} as value "
        f"{from_clause} "
        f"GROUP BY DATE_TRUNC('month', {date_column}) "
        f"ORDER BY period"
    )


def build_categorical_sql(sql: str, dimension_column: str, limit: int = 10) -> Optional[str]:
    """Builds a top-N categorical breakdown of a scalar KPI SQL, grouped
    by the given dimension column instead of returning a single row."""
    measure = extract_measure_expression(sql)
    from_clause = extract_from_clause(sql)
    if not measure or not from_clause:
        return None
    return (
        f"SELECT {dimension_column}::text as label, "
        f"{measure} as value "
        f"{from_clause} "
        f"GROUP BY {dimension_column} "
        f"ORDER BY value DESC "
        f"LIMIT {limit}"
    )

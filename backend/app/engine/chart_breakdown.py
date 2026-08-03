"""
Chart Breakdown
===============
Builds analytical breakdown SQL (time-series or categorical) derived
from an approved KPI's own aggregation, so dashboard charts show a
genuine grouped/trend dataset instead of duplicating the KPI's single
scalar value as a one-bar chart.
"""

import re
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.engine.relationship_graph import JoinPath


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


def build_categorical_sql(
    sql: str,
    dimension_column: str,
    limit: int = 10,
    display_name: Optional[str] = None,
) -> Optional[str]:
    """Builds a top-N categorical breakdown of a scalar KPI SQL, grouped
    by the given dimension column instead of returning a single row.

    When the dimension is a bare foreign-key-style id column (no readable
    label available on the KPI's own table), display_name formats each
    row's label as "{display_name} {id}" (e.g. "Store 1") instead of
    exposing the raw numeric id."""
    measure = extract_measure_expression(sql)
    from_clause = extract_from_clause(sql)
    if not measure or not from_clause:
        return None
    if display_name and dimension_column.lower().endswith("_id"):
        label_expr = f"('{display_name} ' || {dimension_column}::text)"
    else:
        label_expr = f"{dimension_column}::text"
    return (
        f"SELECT {label_expr} as label, "
        f"{measure} as value "
        f"{from_clause} "
        f"GROUP BY {dimension_column} "
        f"ORDER BY value DESC "
        f"LIMIT {limit}"
    )


def extract_where_clause(sql: str) -> Optional[str]:
    match = re.search(r'\bWHERE\b', sql, re.IGNORECASE)
    if not match:
        return None
    tail = sql[match.start():]
    for keyword in ("GROUP BY", "ORDER BY", "LIMIT"):
        idx = tail.upper().find(keyword)
        if idx != -1:
            tail = tail[:idx]
    return tail.strip()


def build_joined_categorical_sql(
    kpi_sql: str,
    base_table: str,
    join_path: "JoinPath",
    limit: int = 10
) -> Optional[str]:
    """
    Builds a categorical breakdown of a KPI's own measure grouped by a
    real-world dimension reached by joining across foreign keys (e.g.
    rental -> inventory -> film_category -> category), rather than a
    column that only exists on the KPI's own table. This is what makes
    charts like "Revenue by Film Category" or "Top Films by Rentals"
    possible without ever hardcoding table names.
    """
    measure = extract_measure_expression(kpi_sql)
    if not measure:
        return None

    join_clauses = " ".join(
        f"JOIN {edge.to_table} ON {edge.from_table}.{edge.from_column} = {edge.to_table}.{edge.to_column}"
        for edge in join_path.edges
    )
    if getattr(join_path, "label_expr", None):
        # A precomputed expression (e.g. first_name || ' ' || last_name).
        label_expr = join_path.label_expr
    elif join_path.is_named_label:
        label_expr = f"{join_path.label_table}.{join_path.label_column}"
    else:
        # No readable label column exists on this dimension table — fall
        # back to a business-friendly "{Dimension} {id}" label (e.g.
        # "Store 1") instead of exposing the bare numeric id.
        display_name = join_path.label_table.replace("_", " ").title()
        label_expr = (
            f"('{display_name} ' || {join_path.label_table}.{join_path.label_column}::text)"
        )
    where_clause = extract_where_clause(kpi_sql)

    sql = f"SELECT {label_expr}::text as label, {measure} as value FROM {base_table} {join_clauses}"
    if where_clause:
        sql += f" {where_clause}"
    sql += f" GROUP BY {label_expr} ORDER BY value DESC LIMIT {limit}"
    return sql


# Ordinal buckets for a customer/user-level activity distribution:
# (inclusive lower bound, inclusive upper bound, label).
SEGMENTATION_BUCKETS = ((1, 5, "1-5"), (6, 10, "6-10"), (11, 20, "11-20"))


def build_segmentation_sql(base_table: str, id_column: str) -> str:
    """
    Builds a histogram-style breakdown of how many entities (customers,
    users, ...) fall into each activity bucket, based on how many rows
    they have in the fact table — e.g. "Customer Activity Distribution"
    (1-5 rentals, 6-10 rentals, ...) instead of a single average value.
    """
    case_lines = " ".join(
        f"WHEN cnt BETWEEN {lo} AND {hi} THEN '{label}'" for lo, hi, label in SEGMENTATION_BUCKETS
    )
    overflow_label = f"{SEGMENTATION_BUCKETS[-1][1] + 1}+"
    case_expr = f"CASE {case_lines} ELSE '{overflow_label}' END"

    return (
        f"SELECT {case_expr} as label, COUNT(*) as value, MIN(cnt) as sort_key "
        f"FROM (SELECT {id_column}, COUNT(*) as cnt FROM {base_table} GROUP BY {id_column}) as activity_counts "
        f"GROUP BY label ORDER BY sort_key"
    )

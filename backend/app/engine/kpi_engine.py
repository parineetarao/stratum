"""
KPI Engine
==========
Matches domain KPI definitions against the actual discovered schema.
Generates SQL dynamically based on what tables and columns are found.
Executes SQL against the appropriate environment based on analysis mode.

The engine does NOT hardcode table names.
It searches for tables and columns that match the KPI requirements
using the warehouse designer output and column name matching.

This makes KPI recommendation work for ANY database in the domain,
not just the specific sample database used during development.
"""

from typing import List, Dict, Any, Optional, Tuple
from app.domains import DOMAIN_KPI_LIBRARY
import re

def _is_partition_table(table_name: str) -> bool:
    """
    Detects PostgreSQL partition tables by naming pattern.
    Example: payment_p2022_03 is a partition of payment.
    These should be excluded from fact table selection so KPIs
    run against the parent table, not a monthly partition.
    """
    return bool(re.search(r'_p\d{4}_\d{2}$', table_name))

NUMERIC_TYPES = {
    "integer", "bigint", "smallint", "int", "int4", "int8",
    "numeric", "decimal", "real", "double precision", "float",
    "numeric(5, 2)", "numeric(4, 2)"
}


def normalize_type(type_str: str) -> str:
    return type_str.lower().split("(")[0].strip()


def is_numeric(col_type: str) -> bool:
    return normalize_type(col_type) in NUMERIC_TYPES


def column_matches_keywords(col_name: str, keywords: List[str]) -> int:
    """
    Returns a match score for a column name against a list of keywords.
    Higher score = better match.
    Exact match scores highest. Substring match scores lower.
    """
    col_lower = col_name.lower()
    for keyword in keywords:
        if col_lower == keyword:
            return 100
        if col_lower.endswith(f"_{keyword}") or col_lower.startswith(f"{keyword}_"):
            return 85
        if keyword in col_lower:
            return 70
    return 0


def table_matches_keywords(table_name: str, keywords: List[str]) -> int:
    table_lower = table_name.lower()
    for keyword in keywords:
        if table_lower == keyword:
            return 100
        if keyword in table_lower:
            return 70
    return 0


def find_best_fact_table(
    warehouse_design: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    fact_tables = warehouse_design.get("fact_tables", [])
    if not fact_tables:
        return None

    non_partition_facts = [
        t for t in fact_tables
        if not _is_partition_table(t.get("source_table", ""))
    ]

    tables_to_score = non_partition_facts if non_partition_facts else fact_tables
    return max(tables_to_score, key=lambda t: t.get("fact_score", 0))


def find_best_table_by_keywords(
    schema: List[Dict[str, Any]],
    table_keywords: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Searches all tables for the best match against table keywords.
    Used for KPIs that target dimension tables like customer or product.
    """
    best_score = 0
    best_table = None
    for table in schema:
        score = table_matches_keywords(table["table_name"], table_keywords)
        if score > best_score:
            best_score = score
            best_table = table
    return best_table if best_score >= 50 else None


def find_best_measure_column(
    table: Dict[str, Any],
    measure_keywords: List[str]
) -> Optional[str]:
    """
    Finds the best matching numeric column for a measure KPI.
    Requires both keyword match and numeric type.
    """
    best_score = 0
    best_col = None
    for col in table.get("columns", []):
        if not is_numeric(col.get("type", "") or col.get("data_type", "")):
            continue
        if col.get("is_primary_key"):
            continue
        if col.get("foreign_key") or col.get("foreign_key_info"):
            continue
        col_name = col.get("name") or col.get("column_name", "")
        score = column_matches_keywords(col_name, measure_keywords)
        if score > best_score:
            best_score = score
            best_col = col_name
    return best_col if best_score >= 50 else None


def find_best_identifier_column(
    table: Dict[str, Any],
    identifier_keywords: List[str]
) -> Optional[str]:
    """
    Finds the best matching identifier column for COUNT DISTINCT KPIs.
    """
    best_score = 0
    best_col = None
    for col in table.get("columns", []):
        col_name = col.get("name") or col.get("column_name", "")
        score = column_matches_keywords(col_name, identifier_keywords)
        if score > best_score:
            best_score = score
            best_col = col_name
    return best_col if best_score >= 50 else None


def find_best_null_column(
    table: Dict[str, Any],
    null_column_keywords: List[str]
) -> Optional[str]:
    """
    Finds a column likely to contain nulls for null rate KPIs.
    """
    best_score = 0
    best_col = None
    for col in table.get("columns", []):
        col_name = col.get("name") or col.get("column_name", "")
        score = column_matches_keywords(col_name, null_column_keywords)
        if score > best_score:
            best_score = score
            best_col = col_name
    return best_col if best_score >= 50 else None


def get_table_name_for_mode(
    table: Dict[str, Any],
    mode: str
) -> str:
    """
    Returns the correct table name based on analysis mode.
    Source mode uses source_table name.
    Warehouse mode uses warehouse_table name (fact_ or dim_ prefix).
    """
    if mode == "warehouse":
        return table.get("warehouse_table") or table.get("table_name")
    return table.get("source_table") or table.get("table_name")


def generate_kpi_sql(
    kpi_def: Dict[str, Any],
    table: Dict[str, Any],
    mode: str,
    measure_col: Optional[str] = None,
    identifier_col: Optional[str] = None,
    null_col: Optional[str] = None
) -> Optional[str]:
    """
    Generates SQL for a KPI based on its aggregation type.
    Uses the actual table and column names found in the schema.
    """
    table_name = get_table_name_for_mode(table, mode)
    agg = kpi_def["aggregation"]

    if agg == "COUNT":
        return f"SELECT COUNT(*) as value FROM {table_name}"

    elif agg == "SUM":
        if not measure_col:
            return None
        return (
            f"SELECT ROUND(SUM({measure_col})::NUMERIC, 2) as value "
            f"FROM {table_name}"
        )

    elif agg == "AVG":
        if not measure_col:
            return None
        return (
            f"SELECT ROUND(AVG({measure_col})::NUMERIC, 2) as value "
            f"FROM {table_name}"
        )

    elif agg == "MAX":
        if not measure_col:
            return None
        return (
            f"SELECT ROUND(MAX({measure_col})::NUMERIC, 2) as value "
            f"FROM {table_name}"
        )

    elif agg == "MIN":
        if not measure_col:
            return None
        return (
            f"SELECT ROUND(MIN({measure_col})::NUMERIC, 2) as value "
            f"FROM {table_name}"
        )

    elif agg == "COUNT_DISTINCT":
        if not identifier_col:
            return None
        return (
            f"SELECT COUNT(DISTINCT {identifier_col}) as value "
            f"FROM {table_name}"
        )

    elif agg == "SUM_PER_DISTINCT":
        if not measure_col or not identifier_col:
            return None
        return (
            f"SELECT ROUND("
            f"SUM({measure_col})::NUMERIC / "
            f"NULLIF(COUNT(DISTINCT {identifier_col}), 0)"
            f", 2) as value FROM {table_name}"
        )

    elif agg == "COUNT_PER_DISTINCT":
        if not identifier_col:
            return None
        return (
            f"SELECT ROUND("
            f"COUNT(*)::NUMERIC / "
            f"NULLIF(COUNT(DISTINCT {identifier_col}), 0)"
            f", 2) as value FROM {table_name}"
        )

    elif agg == "NULL_RATE":
        if not null_col:
            return None
        return (
            f"SELECT ROUND("
            f"COUNT(CASE WHEN {null_col} IS NULL THEN 1 END)::NUMERIC / "
            f"NULLIF(COUNT(*), 0) * 100"
            f", 2) as value FROM {table_name}"
        )

    return None


def execute_kpi_sql(
    sql: str,
    mode: str,
    project_id: int,
    connector
) -> Optional[float]:
    """
    Executes KPI SQL against the appropriate environment.
    Source mode uses the connector.
    Warehouse mode uses the DuckDB sandbox.
    """
    try:
        if mode == "warehouse":
            from app.engine.sandbox_engine import run_query_in_sandbox
            df = run_query_in_sandbox(project_id, sql)
        else:
            df = connector.run_query(sql)

        if df is not None and len(df) > 0 and "value" in df.columns:
            val = df["value"].iloc[0]
            if val is None:
                return None
            return float(val)
        return None
    except Exception:
        return None


def build_schema_lookup(schema: List[Dict[str, Any]]) -> Dict[str, Dict]:
    """
    Builds a lookup of table_name -> table dict for fast access.
    Handles both source schema (table_name key) and
    warehouse design output (source_table and warehouse_table keys).
    """
    lookup = {}
    for table in schema:
        name = table.get("table_name") or table.get("source_table")
        if name:
            lookup[name] = table
        wname = table.get("warehouse_table")
        if wname:
            lookup[wname] = table
    return lookup


def recommend_kpis(
    domain: str,
    mode: str,
    project_id: int,
    source_schema: List[Dict[str, Any]],
    warehouse_design: Dict[str, Any],
    connector
) -> List[Dict[str, Any]]:
    fact_tables = [
        t for t in warehouse_design.get("fact_tables", [])
        if not _is_partition_table(t.get("source_table", ""))
    ]
    dim_tables = warehouse_design.get("dimension_tables", [])
    all_warehouse_tables = fact_tables + dim_tables

    best_fact = find_best_fact_table({
        "fact_tables": fact_tables,
        "dimension_tables": dim_tables
    })
    
    filtered_design = {
        "fact_tables": fact_tables,
        "dimension_tables": dim_tables
    }
    """
    Main entry point for KPI recommendation.

    Parameters:
        domain: project domain (retail, banking etc.)
        mode: analysis mode (source or warehouse)
        project_id: used for sandbox routing in warehouse mode
        source_schema: discovered tables from source database
        warehouse_design: full warehouse design output with fact/dim tables
        connector: active connector for source database queries

    For each KPI in the domain library:
        1. Identify which table to query
        2. Find the best matching column
        3. Generate SQL using actual table and column names
        4. Execute SQL and capture value
        5. Compute confidence score

    Returns list of matched KPIs with computed values.
    """
    kpi_library = DOMAIN_KPI_LIBRARY.get(domain, [])

    fact_tables = warehouse_design.get("fact_tables", [])
    dim_tables = warehouse_design.get("dimension_tables", [])
    all_warehouse_tables = fact_tables + dim_tables

    best_fact = find_best_fact_table(warehouse_design)

    recommendations = []

    for kpi_def in kpi_library:
        target_table = None
        measure_col = None
        identifier_col = None
        null_col = None

        if kpi_def.get("requires_fact_table", True):
            if not best_fact:
                continue
            target_table = best_fact
        else:
            table_keywords = kpi_def.get("table_keywords", [])
            if table_keywords:
                for t in all_warehouse_tables:
                    src = t.get("source_table", "")
                    score = table_matches_keywords(src, table_keywords)
                    if score >= 50:
                        target_table = t
                        break
                if not target_table:
                    for t in source_schema:
                        score = table_matches_keywords(
                            t.get("table_name", ""), table_keywords
                        )
                        if score >= 50:
                            target_table = t
                            break
            else:
                target_table = best_fact

        if not target_table:
            continue

        if mode == "warehouse":
            table_for_columns = target_table
        else:
            src_name = (
                target_table.get("source_table")
                or target_table.get("table_name")
            )
            table_for_columns = next(
                (t for t in source_schema
                 if t.get("table_name") == src_name),
                target_table
            )

        agg = kpi_def["aggregation"]

        if kpi_def.get("measure_keywords"):
            measure_col = find_best_measure_column(
                table_for_columns, kpi_def["measure_keywords"]
            )
            if agg not in ("COUNT", "COUNT_DISTINCT") and not measure_col:
                continue

        if kpi_def.get("identifier_keywords"):
            identifier_col = find_best_identifier_column(
                table_for_columns, kpi_def["identifier_keywords"]
            )
            if agg in (
                "COUNT_DISTINCT", "SUM_PER_DISTINCT", "COUNT_PER_DISTINCT"
            ) and not identifier_col:
                continue

        if kpi_def.get("null_column_keywords"):
            null_col = find_best_null_column(
                table_for_columns, kpi_def["null_column_keywords"]
            )
            if agg == "NULL_RATE" and not null_col:
                continue

        sql = generate_kpi_sql(
            kpi_def, target_table, mode,
            measure_col, identifier_col, null_col
        )
        if not sql:
            continue

        confidence = 100
        if measure_col:
            score = column_matches_keywords(
                measure_col, kpi_def.get("measure_keywords", [])
            )
            confidence = min(confidence, score)
        if identifier_col and kpi_def.get("identifier_keywords"):
            score = column_matches_keywords(
                identifier_col, kpi_def.get("identifier_keywords", [])
            )
            confidence = min(confidence, score)

        value = execute_kpi_sql(sql, mode, project_id, connector)

        recommendations.append({
            "name": kpi_def["name"],
            "description": kpi_def["description"],
            "category": kpi_def["category"],
            "unit": kpi_def["unit"],
            "sql": sql,
            "mode": mode,
            "confidence_score": confidence,
            "computed_value": value,
            "is_approved": False,
        })

    recommendations.sort(key=lambda x: x["confidence_score"], reverse=True)
    return recommendations
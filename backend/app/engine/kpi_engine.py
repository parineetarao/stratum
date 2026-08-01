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

def _is_partition_table(table_name: Optional[str]) -> bool:
    """
    Detects PostgreSQL partition tables by naming pattern.
    Example: payment_p2022_03 is a partition of payment.
    These should be excluded from fact table selection so KPIs
    run against the parent table, not a monthly partition.
    """
    if not table_name or not isinstance(table_name, str):
        return False
    return bool(re.search(r'_p\d{4}_\d{2}$', table_name))

NUMERIC_TYPES = {
    "integer", "bigint", "smallint", "int", "int4", "int8",
    "numeric", "decimal", "real", "double precision", "float",
    "numeric(5, 2)", "numeric(4, 2)"
}


def normalize_type(type_str: str) -> str:
    if not type_str or not isinstance(type_str, str):
        return ""
    return type_str.lower().split("(")[0].strip()


def is_numeric(col_type: str) -> bool:
    return normalize_type(col_type) in NUMERIC_TYPES


def column_matches_keywords(col_name: Optional[str], keywords: List[str]) -> int:
    if not col_name or not isinstance(col_name, str):
        return 0
    col_lower = col_name.lower()
    for keyword in keywords:
        if col_lower == keyword:
            return 100
        if col_lower.endswith(f"_{keyword}") or col_lower.startswith(f"{keyword}_"):
            return 85
        if keyword in col_lower:
            return 70
    return 0


def table_matches_keywords(table_name: Optional[str], keywords: List[str]) -> int:
    if not table_name or not isinstance(table_name, str):
        return 0
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

    def safe_get_score(t: Any) -> float:
        if isinstance(t, dict):
            score = t.get("fact_score")
            return float(score) if isinstance(score, (int, float)) else 0.0
        return 0.0

    valid_facts = [t for t in fact_tables if isinstance(t, dict)]
    non_partition_facts = [
        t for t in valid_facts
        if not _is_partition_table(t.get("source_table") or t.get("table_name") or "")
    ]

    tables_to_score = non_partition_facts if non_partition_facts else valid_facts
    if not tables_to_score:
        return None
    return max(tables_to_score, key=safe_get_score)


def find_best_table_by_keywords(
    schema: List[Dict[str, Any]],
    table_keywords: List[str]
) -> Optional[Dict[str, Any]]:
    best_score = 0
    best_table = None
    for table in schema:
        if not isinstance(table, dict):
            continue
        score = table_matches_keywords(table.get("table_name") or table.get("source_table"), table_keywords)
        if score > best_score:
            best_score = score
            best_table = table
    return best_table if best_score >= 50 else None


def find_best_measure_column(
    table: Dict[str, Any],
    measure_keywords: List[str]
) -> Optional[str]:
    if not isinstance(table, dict):
        return None
    best_score = 0
    best_col = None
    cols = table.get("columns") or table.get("measures") or []
    for col in cols:
        if not isinstance(col, dict):
            continue
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
    if not isinstance(table, dict):
        return None
    best_score = 0
    best_col = None
    cols = table.get("columns") or table.get("attributes") or table.get("measures") or []
    for col in cols:
        if not isinstance(col, dict):
            continue
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
    if not isinstance(table, dict):
        return None
    best_score = 0
    best_col = None
    cols = table.get("columns") or table.get("attributes") or table.get("measures") or []
    for col in cols:
        if not isinstance(col, dict):
            continue
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
    if not isinstance(table, dict):
        return ""
    if mode == "warehouse":
        return table.get("warehouse_table") or table.get("table_name") or table.get("source_table") or ""
    return table.get("source_table") or table.get("table_name") or table.get("warehouse_table") or ""


def generate_kpi_sql(
    kpi_def: Dict[str, Any],
    table: Dict[str, Any],
    mode: str,
    measure_col: Optional[str] = None,
    identifier_col: Optional[str] = None,
    null_col: Optional[str] = None
) -> Optional[str]:
    table_name = get_table_name_for_mode(table, mode)
    if not table_name:
        return None
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


def format_kpi_value(value: Optional[float], unit: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    unit_str = (unit or "").lower().strip()

    if unit_str in ("currency", "usd", "$"):
        abs_val = abs(value)
        if abs_val >= 1_000_000:
            return f"${value / 1_000_000:.1f}M"
        elif abs_val >= 1_000:
            return f"${value / 1_000:.1f}K"
        else:
            return f"${value:,.2f}"

    if unit_str in ("inr", "₹"):
        abs_val = abs(value)
        if abs_val >= 10_000_000:
            return f"₹{value / 10_000_000:.2f}Cr"
        elif abs_val >= 100_000:
            return f"₹{value / 100_000:.1f}L"
        else:
            return f"₹{value:,.2f}"

    if unit_str in ("percentage", "%"):
        return f"{value:.2f}%"

    if unit_str in ("days", "day"):
        return f"{value:.2f} days"

    if unit_str in ("count", "integer", "int"):
        return f"{int(round(value)):,}"

    if unit_str in ("ratio", "decimal"):
        return f"{value:.2f}"

    if float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}"


def build_schema_lookup(schema: List[Dict[str, Any]]) -> Dict[str, Dict]:
    lookup = {}
    for table in schema:
        if not isinstance(table, dict):
            continue
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
    kpi_library = DOMAIN_KPI_LIBRARY.get(domain, [])

    fact_tables = [
        t for t in warehouse_design.get("fact_tables", [])
        if isinstance(t, dict) and not _is_partition_table(t.get("source_table") or t.get("table_name") or "")
    ]
    dim_tables = [t for t in warehouse_design.get("dimension_tables", []) if isinstance(t, dict)]
    all_warehouse_tables = fact_tables + dim_tables

    best_fact = find_best_fact_table({
        "fact_tables": fact_tables,
        "dimension_tables": dim_tables
    })

    recommendations = []

    for kpi_def in kpi_library:
        try:
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
                        src = t.get("source_table") or t.get("table_name") or ""
                        score = table_matches_keywords(src, table_keywords)
                        if score >= 50:
                            target_table = t
                            break
                    if not target_table:
                        for t in source_schema:
                            if not isinstance(t, dict):
                                continue
                            score = table_matches_keywords(
                                t.get("table_name") or t.get("source_table") or "", table_keywords
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
                     if isinstance(t, dict) and t.get("table_name") == src_name),
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
            formatted_value = format_kpi_value(value, kpi_def.get("unit"))

            tname = get_table_name_for_mode(target_table, mode)
            col_used = measure_col or identifier_col or null_col
            reasoning = (
                f"Recommended because {tname}.{col_used or 'rows'} is a numeric measure "
                f"or key linked to {domain} metrics."
            )
            evidence = {
                "table_name": tname,
                "column_used": col_used,
                "aggregation": agg,
                "match_score": confidence,
                "mode": mode
            }

            recommendations.append({
                "name": kpi_def["name"],
                "description": kpi_def["description"],
                "category": kpi_def["category"],
                "unit": kpi_def["unit"],
                "sql": sql,
                "mode": mode,
                "confidence_score": confidence,
                "computed_value": value,
                "formatted_value": formatted_value,
                "reasoning": reasoning,
                "evidence": evidence,
                "is_approved": False,
            })
        except Exception:
            continue

    recommendations.sort(key=lambda x: x["confidence_score"], reverse=True)
    return recommendations

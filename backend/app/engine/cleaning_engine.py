from typing import List, Dict, Any


def generate_cleaning_recommendations(
    tables: List[Dict[str, Any]],
    issues: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    recommendations = []

    table_lookup = {t["table_name"]: t for t in tables}

    for issue in issues:
        table_name = issue["table"]
        column_name = issue["column"]
        issue_type = issue["issue_type"]

        if issue_type == "duplicate_rows":
            table = table_lookup.get(table_name, {})
            recommendations.append({
                "operation": "drop_duplicates",
                "table": table_name,
                "column": None,
                "reason": issue["description"],
                "expected_impact": (
                    f"Removes {table.get('duplicate_count', 0)} duplicate rows "
                    f"from '{table_name}'"
                ),
                "confidence": "high",
                "sql_hint": f"DELETE FROM {table_name} WHERE ctid NOT IN "
                            f"(SELECT MIN(ctid) FROM {table_name} "
                            f"GROUP BY {_get_all_columns(table)})",
                "sandbox_sql": (
                    f"CREATE OR REPLACE TABLE {table_name} AS "
                    f"SELECT DISTINCT * FROM {table_name}"
                ),
            })

        elif issue_type == "high_null_rate":
            table = table_lookup.get(table_name, {})
            col_info = next(
                (c for c in table.get("columns", [])
                 if c["column_name"] == column_name),
                None
            )

            if col_info and col_info.get("numeric_stats"):
                median_val = col_info["numeric_stats"].get("median")
                impute_sql = (
                    f"UPDATE {table_name} SET {column_name} = {median_val} "
                    f"WHERE {column_name} IS NULL"
                )
                recommendations.append({
                    "operation": "impute_median",
                    "table": table_name,
                    "column": column_name,
                    "reason": issue["description"],
                    "expected_impact": (
                        f"Fills {col_info['null_count']} null values in "
                        f"'{column_name}' with median value {median_val}"
                    ),
                    "confidence": "medium",
                    "sql_hint": impute_sql,
                    "sandbox_sql": impute_sql,
                })
            else:
                flag_sql = (
                    f"SELECT COUNT(*) FROM {table_name} "
                    f"WHERE {column_name} IS NULL"
                )
                recommendations.append({
                    "operation": "flag_nulls",
                    "table": table_name,
                    "column": column_name,
                    "reason": issue["description"],
                    "expected_impact": (
                        f"Documents null values in '{column_name}' "
                        f"for downstream handling"
                    ),
                    "confidence": "low",
                    "sql_hint": flag_sql,
                    "sandbox_sql": flag_sql,
                })

        elif issue_type == "type_mismatch":
            recommendations.append({
                "operation": "cast_type",
                "table": table_name,
                "column": column_name,
                "reason": issue["description"],
                "expected_impact": (
                    f"Converts '{column_name}' to appropriate numeric type "
                    f"for analytical use"
                ),
                "confidence": "medium",
                "sql_hint": (
                    f"ALTER TABLE {table_name} "
                    f"ALTER COLUMN {column_name} TYPE NUMERIC "
                    f"USING {column_name}::NUMERIC"
                ),
                "sandbox_sql": (
                    f"ALTER TABLE {table_name} "
                    f"ALTER COLUMN {column_name} TYPE DOUBLE "
                    f"USING TRY_CAST({column_name} AS DOUBLE)"
                ),
            })

    return recommendations


def _get_all_columns(table: Dict[str, Any]) -> str:
    cols = [c["column_name"] for c in table.get("columns", [])]
    return ", ".join(cols) if cols else "*"

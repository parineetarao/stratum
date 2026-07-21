"""
Schema Drift Detection Engine
==============================
Compares two schema snapshots and categorises changes into:
    - added_tables: new tables not in previous snapshot
    - deleted_tables: tables removed since previous snapshot
    - added_columns: new columns in existing tables
    - deleted_columns: columns removed from existing tables
    - modified_columns: columns whose type or nullability changed

Also cross-references changes against warehouse design and KPI SQL
to identify which downstream objects are affected by each change.

This runs only when the user explicitly triggers a metadata refresh.
First discovery run has no previous snapshot so no drift is reported.
"""

from typing import List, Dict, Any, Optional, Set


def snapshot_to_lookup(snapshot: List[Dict[str, Any]]) -> Dict[str, Dict]:
    """
    Converts a schema snapshot list into a nested lookup dict.
    {table_name: {column_name: {type, nullable}}}
    Makes comparison O(1) per column instead of O(n).
    """
    lookup = {}
    for table in snapshot:
        table_name = table["table_name"]
        lookup[table_name] = {}
        for col in table.get("columns", []):
            col_name = col.get("name") or col.get("column_name", "")
            lookup[table_name][col_name] = {
                "type": col.get("type") or col.get("data_type", ""),
                "nullable": col.get("nullable", True),
                "is_primary_key": col.get("is_primary_key", False)
            }
    return lookup


def compute_drift(
    previous_snapshot: List[Dict[str, Any]],
    current_snapshot: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Compares previous and current schema snapshots.
    Returns a structured diff categorising all changes.
    """
    prev = snapshot_to_lookup(previous_snapshot)
    curr = snapshot_to_lookup(current_snapshot)

    prev_tables: Set[str] = set(prev.keys())
    curr_tables: Set[str] = set(curr.keys())

    added_tables = []
    for table_name in curr_tables - prev_tables:
        col_count = len(curr[table_name])
        added_tables.append({
            "table_name": table_name,
            "column_count": col_count,
            "severity": "info",
            "message": f"New table '{table_name}' detected with {col_count} columns"
        })

    deleted_tables = []
    for table_name in prev_tables - curr_tables:
        deleted_tables.append({
            "table_name": table_name,
            "severity": "critical",
            "message": f"Table '{table_name}' no longer exists in source database"
        })

    added_columns = []
    deleted_columns = []
    modified_columns = []

    for table_name in prev_tables & curr_tables:
        prev_cols = prev[table_name]
        curr_cols = curr[table_name]

        prev_col_names: Set[str] = set(prev_cols.keys())
        curr_col_names: Set[str] = set(curr_cols.keys())

        for col_name in curr_col_names - prev_col_names:
            added_columns.append({
                "table_name": table_name,
                "column_name": col_name,
                "new_type": curr_cols[col_name]["type"],
                "severity": "info",
                "message": (
                    f"New column '{col_name}' added to '{table_name}' "
                    f"(type: {curr_cols[col_name]['type']})"
                )
            })

        for col_name in prev_col_names - curr_col_names:
            deleted_columns.append({
                "table_name": table_name,
                "column_name": col_name,
                "old_type": prev_cols[col_name]["type"],
                "severity": "critical",
                "message": (
                    f"Column '{col_name}' removed from '{table_name}'"
                )
            })

        for col_name in prev_col_names & curr_col_names:
            prev_col = prev_cols[col_name]
            curr_col = curr_cols[col_name]

            changes = []
            if prev_col["type"] != curr_col["type"]:
                changes.append(
                    f"type changed from {prev_col['type']} to {curr_col['type']}"
                )
            if prev_col["nullable"] != curr_col["nullable"]:
                changes.append(
                    f"nullable changed from {prev_col['nullable']} "
                    f"to {curr_col['nullable']}"
                )

            if changes:
                modified_columns.append({
                    "table_name": table_name,
                    "column_name": col_name,
                    "changes": changes,
                    "old_type": prev_col["type"],
                    "new_type": curr_col["type"],
                    "severity": "warning",
                    "message": (
                        f"Column '{col_name}' in '{table_name}' modified: "
                        f"{'; '.join(changes)}"
                    )
                })

    has_changes = bool(
        added_tables or deleted_tables or
        added_columns or deleted_columns or modified_columns
    )

    return {
        "has_changes": has_changes,
        "added_tables": added_tables,
        "deleted_tables": deleted_tables,
        "added_columns": added_columns,
        "deleted_columns": deleted_columns,
        "modified_columns": modified_columns,
        "total_changes": (
            len(added_tables) + len(deleted_tables) +
            len(added_columns) + len(deleted_columns) +
            len(modified_columns)
        )
    }


def identify_affected_objects(
    drift: Dict[str, Any],
    warehouse_design: Optional[Dict[str, Any]],
    kpis: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Cross-references drift changes against warehouse design and KPIs.
    Returns which downstream objects are affected by each change.

    A warehouse table is affected if its source table was deleted
    or if a column it uses was deleted or modified.

    A KPI is affected if its SQL references a deleted or modified
    table or column name.
    """
    affected_warehouse = []
    affected_kpis = []

    deleted_table_names = {
        t["table_name"] for t in drift.get("deleted_tables", [])
    }
    deleted_column_refs = {
        (c["table_name"], c["column_name"])
        for c in drift.get("deleted_columns", [])
    }
    modified_column_refs = {
        (c["table_name"], c["column_name"])
        for c in drift.get("modified_columns", [])
    }

    if warehouse_design:
        all_tables = (
            warehouse_design.get("fact_tables", []) +
            warehouse_design.get("dimension_tables", [])
        )
        for wt in all_tables:
            source = wt.get("source_table", "")
            warehouse = wt.get("warehouse_table", "")

            if source in deleted_table_names:
                affected_warehouse.append({
                    "warehouse_table": warehouse,
                    "source_table": source,
                    "reason": f"Source table '{source}' was deleted",
                    "severity": "critical"
                })
                continue

            for table_name, col_name in deleted_column_refs:
                if table_name == source:
                    affected_warehouse.append({
                        "warehouse_table": warehouse,
                        "source_table": source,
                        "reason": (
                            f"Column '{col_name}' used in source "
                            f"table '{source}' was deleted"
                        ),
                        "severity": "critical"
                    })
                    break

    for kpi in kpis:
        kpi_sql = (kpi.get("sql") or "").lower()
        kpi_name = kpi.get("name", "")

        for table_name in deleted_table_names:
            if table_name.lower() in kpi_sql:
                affected_kpis.append({
                    "kpi_name": kpi_name,
                    "reason": (
                        f"References deleted table '{table_name}'"
                    ),
                    "severity": "critical"
                })
                break

        for table_name, col_name in deleted_column_refs:
            if (
                table_name.lower() in kpi_sql and
                col_name.lower() in kpi_sql
            ):
                affected_kpis.append({
                    "kpi_name": kpi_name,
                    "reason": (
                        f"References deleted column "
                        f"'{table_name}.{col_name}'"
                    ),
                    "severity": "critical"
                })
                break

        for table_name, col_name in modified_column_refs:
            if (
                table_name.lower() in kpi_sql and
                col_name.lower() in kpi_sql
            ):
                affected_kpis.append({
                    "kpi_name": kpi_name,
                    "reason": (
                        f"References modified column "
                        f"'{table_name}.{col_name}' — verify SQL still valid"
                    ),
                    "severity": "warning"
                })

    return {
        "affected_warehouse_tables": affected_warehouse,
        "affected_kpis": affected_kpis,
        "total_affected": len(affected_warehouse) + len(affected_kpis)
    }
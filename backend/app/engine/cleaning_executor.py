import os
import shutil
import uuid
import duckdb
from typing import List, Dict, Any
from app.engine.sandbox_engine import get_sandbox_path


def _compute_metric(conn, operation: str, table: str, column: str) -> int:
    if operation == "drop_duplicates":
        total = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        distinct = conn.execute(
            f"SELECT COUNT(*) FROM (SELECT DISTINCT * FROM {table})"
        ).fetchone()[0]
        return total - distinct
    if operation in ("impute_median", "flag_nulls"):
        return conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE {column} IS NULL"
        ).fetchone()[0]
    if operation == "cast_type":
        return conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE {column} IS NOT NULL "
            f"AND TRY_CAST({column} AS DOUBLE) IS NULL"
        ).fetchone()[0]
    return 0


def run_cleaning_preview(
    project_id: int,
    recommendations: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Executes approved cleaning operations against a throwaway copy of the
    sandbox DuckDB file. The real sandbox is never opened for writing here,
    so preview can never mutate source or sandbox data.
    """
    sandbox_path = get_sandbox_path(project_id)
    if not os.path.exists(sandbox_path):
        raise FileNotFoundError("Sandbox not initialized")

    tmp_path = f"{sandbox_path}.preview_{uuid.uuid4().hex}.duckdb"
    shutil.copyfile(sandbox_path, tmp_path)
    conn = duckdb.connect(tmp_path)
    results = []
    try:
        for rec in recommendations:
            table = rec["table_name"]
            column = rec.get("column_name")
            operation = rec["operation"]

            before = _compute_metric(conn, operation, table, column)
            error = None

            sandbox_sql = rec.get("sandbox_sql")
            if operation != "flag_nulls" and sandbox_sql:
                try:
                    conn.execute(sandbox_sql)
                except Exception as e:
                    error = str(e)

            after = before if error else _compute_metric(conn, operation, table, column)

            results.append({
                "recommendation_id": rec["id"],
                "operation": operation,
                "table_name": table,
                "column_name": column,
                "before": before,
                "after": after,
                "error": error,
            })
        return results
    finally:
        conn.close()
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

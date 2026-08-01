from app.engine.warehouse_designer import WAREHOUSE_SCHEMA
import duckdb
import os
from typing import List, Dict, Any
from app.connectors.base import BaseConnector

SANDBOX_DIR = "/app/sandboxes"
os.makedirs(SANDBOX_DIR, exist_ok=True)


def get_sandbox_path(project_id: int) -> str:
    return os.path.join(SANDBOX_DIR, f"project_{project_id}.duckdb")


def initialize_sandbox(
    project_id: int,
    connector: BaseConnector,
    source_tables: List[str]
) -> str:
    """
    Creates or replaces the DuckDB sandbox for a project.
    Copies all source tables from the connected database into DuckDB.
    Returns the sandbox path.
    """
    path = get_sandbox_path(project_id)
    conn = duckdb.connect(database=path)

    for table_name in source_tables:
        df = connector.run_query(f"SELECT * FROM {table_name}")
        conn.execute(f"DROP TABLE IF EXISTS {table_name}")
        conn.register(f"_temp_{table_name}", df)
        conn.execute(
            f"CREATE TABLE {table_name} AS "
            f"SELECT * FROM _temp_{table_name}"
        )
        conn.unregister(f"_temp_{table_name}")

    conn.close()
    return path


def _strip_leading_comments(raw_statement: str) -> str:
    """
    Splitting a multi-statement DDL script on ';' leaves each statement's
    preceding `-- comment` header (which has no semicolon of its own)
    glued onto the front of the next real statement. Naively checking
    `statement.startswith('--')` on that merged chunk discards the whole
    statement, not just the comment. This strips only the leading
    comment/blank lines and keeps the SQL that follows.
    """
    lines = raw_statement.splitlines()
    cleaned_lines = []
    still_in_leading_comments = True
    for line in lines:
        stripped = line.strip()
        if still_in_leading_comments and (stripped == "" or stripped.startswith("--")):
            continue
        still_in_leading_comments = False
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


def _reset_existing_warehouse_tables(conn) -> None:
    """
    Drops every previously created fact_/dim_ table (and, in DuckDB, their
    indexes along with them) before re-running the warehouse DDL. The
    generated DDL uses `CREATE TABLE IF NOT EXISTS` for tables but plain
    `CREATE INDEX`/`CREATE UNIQUE INDEX` (no `IF NOT EXISTS`) for indexes, so
    a second preview run would otherwise fail with "index already exists" —
    this makes every preview start from a clean, idempotent sandbox state
    instead of layering on top of a previous run's objects.
    """
    tables = conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'main'"
    ).fetchall()
    warehouse_tables = [
        t[0] for t in tables
        if t[0].startswith("fact_") or t[0].startswith("dim_")
    ]
    for table_name in warehouse_tables:
        conn.execute(f"DROP TABLE IF EXISTS {table_name}")


def execute_warehouse_ddl(project_id: int, ddl_script: str) -> Dict[str, Any]:
    """
    Executes the warehouse DDL script against the project sandbox.
    Creates fact and dim tables populated from source copies in DuckDB.
    Always resets any warehouse tables/indexes from a previous run first,
    so the preview is fully repeatable and idempotent.
    Returns validation results.
    """
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Sandbox not initialized for project {project_id}. "
            f"Load source data first."
        )

    conn = duckdb.connect(database=path)
    results = []

    _reset_existing_warehouse_tables(conn)

    statements = [s for s in (_strip_leading_comments(raw) for raw in ddl_script.split(";")) if s]

    for statement in statements:
        try:
            conn.execute(statement)
            results.append({
                "statement": statement[:80] + "...",
                "status": "success"
            })
        except Exception as e:
            results.append({
                "statement": statement[:80] + "...",
                "status": "error",
                "error": str(e)
            })

    tables = conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'main'"
    ).fetchall()

    conn.close()

    warehouse_tables = [
        t[0] for t in tables
        if t[0].startswith("fact_") or t[0].startswith("dim_")
    ]
    actual_statements = [
    r for r in results
    if not r["statement"].strip().startswith("--")
    and r["statement"].strip()
    ]
    success = all(r["status"] == "success" for r in actual_statements)
    return {
        "execution_results": results,
        "warehouse_tables_created": warehouse_tables,
        "success":success
    }


def refresh_warehouse_data(
    project_id: int,
    connector: BaseConnector,
    source_tables: List[str],
    warehouse_table_names: List[str]
) -> Dict[str, Any]:
    """
    Refreshes warehouse table data without changing schema.
    For each warehouse table, truncates and repopulates from source.
    Source tables are also refreshed with latest data.
    """
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        raise FileNotFoundError("Sandbox not found")

    conn = duckdb.connect(database=path)

    refreshed = []

    for table_name in source_tables:
        try:
            df = connector.run_query(f"SELECT * FROM {table_name}")
            conn.execute(f"DELETE FROM {table_name}")
            conn.register(f"_temp_{table_name}", df)
            conn.execute(
                f"INSERT INTO {table_name} "
                f"SELECT * FROM _temp_{table_name}"
            )
            conn.unregister(f"_temp_{table_name}")
            refreshed.append(table_name)
        except Exception as e:
            pass

    for wt in warehouse_table_names:
        source_name = wt.replace("fact_", "").replace("dim_", "")
        if source_name in source_tables:
            try:
                conn.execute(f"DELETE FROM {wt}")
                conn.execute(
                    f"INSERT INTO {wt} "
                    f"SELECT * FROM {source_name}"
                )
                refreshed.append(wt)
            except Exception:
                pass

    conn.close()

    return {
        "refreshed_tables": refreshed,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }


def run_query_in_sandbox(project_id: int, sql: str):
    """
    Executes any SQL query against the project sandbox.
    Used by SQL workspace and KPI execution.
    """
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        raise FileNotFoundError("Sandbox not initialized")

    conn = duckdb.connect(database=path)
    result = conn.execute(sql).df()
    conn.close()
    return result


def get_sandbox_tables(project_id: int) -> List[str]:
    """
    Returns all tables currently in the sandbox.
    Used to determine if warehouse tables exist.
    """
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        return []

    conn = duckdb.connect(database=path)
    tables = conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'main'"
    ).fetchall()
    conn.close()
    return [t[0] for t in tables]


def sandbox_exists(project_id: int) -> bool:
    return os.path.exists(get_sandbox_path(project_id))


def get_sandbox_total_rows(project_id: int) -> int:
    """Sums row counts across all tables currently in the sandbox."""
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        return 0

    conn = duckdb.connect(database=path)
    tables = conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'main'"
    ).fetchall()

    total = 0
    for (table_name,) in tables:
        total += conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]

    conn.close()
    return total


def get_sandbox_last_synced(project_id: int) -> str:
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        return None
    mtime = os.path.getmtime(path)
    return __import__("datetime").datetime.utcfromtimestamp(mtime).isoformat()
def get_sandbox_ddl(full_ddl: str) -> str:
    """
    Returns DDL suitable for DuckDB sandbox execution.
    DuckDB does not use schema prefixes in the same way.
    Strips stratum_warehouse. prefix for sandbox use.
    """
    return full_ddl.replace(
        f"{WAREHOUSE_SCHEMA}.", ""
    ).replace(
        "CREATE SCHEMA IF NOT EXISTS stratum_warehouse;", ""
    ).strip()
def create_warehouse_in_sandbox(project_id: int, ddl_duckdb: str):
    """
    Uses the DuckDB-specific DDL directly.
    No string replacement needed.
    """
    return execute_warehouse_ddl(project_id, ddl_duckdb)


def validate_warehouse(
    project_id: int,
    fact_tables: List[Dict[str, Any]],
    dimension_tables: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Runs read-only validation queries against the sandbox warehouse tables:
    row counts, fact->dimension join integrity (orphan FK rows), and sample
    aggregations on measure columns. Never mutates the sandbox.
    """
    path = get_sandbox_path(project_id)
    if not os.path.exists(path):
        raise FileNotFoundError("Sandbox not initialized")

    conn = duckdb.connect(database=path)

    row_counts: Dict[str, Any] = {}
    all_warehouse_tables = (
        [dt["warehouse_table"] for dt in dimension_tables] +
        [ft["warehouse_table"] for ft in fact_tables]
    )
    for wt in all_warehouse_tables:
        try:
            row_counts[wt] = conn.execute(
                f"SELECT COUNT(*) FROM {wt}"
            ).fetchone()[0]
        except Exception:
            row_counts[wt] = None

    join_validations = []
    for ft in fact_tables:
        fact_wt = ft["warehouse_table"]
        for fk in ft.get("foreign_keys", []):
            dim_wt = fk["references_warehouse_table"]
            fk_col = fk["column_name"]
            ref_col = fk.get("references_column") or fk_col
            try:
                orphan_count = conn.execute(
                    f"SELECT COUNT(*) FROM {fact_wt} f "
                    f"LEFT JOIN {dim_wt} d ON f.{fk_col} = d.{ref_col} "
                    f"WHERE f.{fk_col} IS NOT NULL AND d.{ref_col} IS NULL"
                ).fetchone()[0]
                join_validations.append({
                    "fact_table": fact_wt,
                    "dimension_table": dim_wt,
                    "foreign_key_column": fk_col,
                    "orphan_count": orphan_count,
                    "status": "passed" if orphan_count == 0 else "warning"
                })
            except Exception as e:
                join_validations.append({
                    "fact_table": fact_wt,
                    "dimension_table": dim_wt,
                    "foreign_key_column": fk_col,
                    "orphan_count": None,
                    "status": "error",
                    "error": str(e)
                })

    aggregation_validations = []
    for ft in fact_tables:
        fact_wt = ft["warehouse_table"]
        for measure in ft.get("measures", []):
            col = measure["column_name"]
            try:
                value = conn.execute(
                    f"SELECT SUM({col}) FROM {fact_wt}"
                ).fetchone()[0]
                aggregation_validations.append({
                    "table": fact_wt,
                    "column": col,
                    "aggregation": "SUM",
                    "result": float(value) if value is not None else None,
                    "status": "passed"
                })
            except Exception as e:
                aggregation_validations.append({
                    "table": fact_wt,
                    "column": col,
                    "aggregation": "SUM",
                    "result": None,
                    "status": "error",
                    "error": str(e)
                })

    conn.close()

    return {
        "row_counts": row_counts,
        "join_validations": join_validations,
        "aggregation_validations": aggregation_validations
    }
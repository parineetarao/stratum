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


def execute_warehouse_ddl(project_id: int, ddl_script: str) -> Dict[str, Any]:
    """
    Executes the warehouse DDL script against the project sandbox.
    Creates fact and dim tables populated from source copies in DuckDB.
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

    statements = [
        s.strip() for s in ddl_script.split(";")
        if s.strip() and not s.strip().startswith("--")
    ]

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
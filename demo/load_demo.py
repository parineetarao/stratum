"""
One-time loader that applies demo/demo_retail.sql to an external Postgres
database, for later use as the source connection behind Stratum's public
demo (not wired up yet - this script only populates the data).

Usage:
    DEMO_SETUP_DATABASE_URL=postgresql://user:pass@host:port/dbname \\
        python demo/load_demo.py

Safety:
    - Reads the target database from the DEMO_SETUP_DATABASE_URL env var
      only. Never hardcode credentials here or pass them on the command
      line.
    - demo_retail.sql itself does `DROP SCHEMA IF EXISTS demo_retail CASCADE`
      before recreating it, so this script only ever drops/recreates that
      one schema - it never touches `public` or any other schema, and is
      safe to rerun.
    - Not invoked from FastAPI startup or anywhere else in the app; this is
      a manual, explicit step you run yourself against Render Postgres.
"""
import os
import sys
from pathlib import Path

SQL_PATH = Path(__file__).resolve().parent / "demo_retail.sql"


def main() -> int:
    database_url = os.environ.get("DEMO_SETUP_DATABASE_URL")
    if not database_url:
        print(
            "DEMO_SETUP_DATABASE_URL is not set. Refusing to run - "
            "this script never hardcodes a connection string.",
            file=sys.stderr,
        )
        return 1

    if not SQL_PATH.exists():
        print(
            f"{SQL_PATH} not found. Generate it first with "
            "'python demo/generate_demo_dataset.py'.",
            file=sys.stderr,
        )
        return 1

    try:
        import psycopg2
    except ImportError:
        print(
            "psycopg2 is not installed in this environment. Run this from "
            "the backend venv (psycopg2-binary is already a dependency).",
            file=sys.stderr,
        )
        return 1

    sql = SQL_PATH.read_text(encoding="utf-8")

    print(f"Connecting to target database and applying {SQL_PATH.name} ...")
    conn = psycopg2.connect(database_url)
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print("demo_retail schema loaded successfully.")
    except Exception:
        conn.rollback()
        print("Load failed, transaction rolled back. demo_retail was not modified.", file=sys.stderr)
        raise
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

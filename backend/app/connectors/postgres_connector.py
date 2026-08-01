from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any, Optional
import pandas as pd
from app.connectors.base import BaseConnector

WAREHOUSE_SCHEMA = "stratum_warehouse"


class PostgresConnector(BaseConnector):

    def __init__(self, connection_string: str, source_schema: str = "public"):
        self.connection_string = connection_string
        self.source_schema = source_schema
        self.engine = None

    def _get_engine(self):
        if self.engine is None:
            self.engine = create_engine(
                self.connection_string,
                connect_args={"connect_timeout": 5}
            )
        return self.engine

    def test_connection(self) -> bool:
        try:
            engine = self._get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError as e:
            raise ConnectionError(f"Failed to connect: {str(e)}")

    def get_available_schemas(self) -> List[str]:
        """Returns all non-system schemas available in the database."""
        inspector = inspect(self._get_engine())
        all_schemas = inspector.get_schema_names()
        excluded = {
            "information_schema", "pg_catalog",
            "pg_toast", WAREHOUSE_SCHEMA
        }
        return [s for s in all_schemas if s not in excluded]

    def _get_partition_child_tables(self, schema_name: str) -> set:
        """
        Postgres exposes a declaratively partitioned table's children (e.g.
        `payment_p2022_01`, a physical partition of `payment`) as ordinary
        base tables in information_schema — but querying the parent table
        already returns every partition's rows combined. Treating each
        child as its own logical table would massively over-count fact/
        dimension candidates for any partitioned schema. This returns the
        set of child table names so callers can exclude them.
        """
        query = text(
            "SELECT c.relname FROM pg_class c "
            "JOIN pg_namespace n ON c.relnamespace = n.oid "
            "WHERE n.nspname = :schema AND c.relispartition = true"
        )
        with self._get_engine().connect() as conn:
            rows = conn.execute(query, {"schema": schema_name}).fetchall()
        return {r[0] for r in rows}

    def get_tables(self) -> List[str]:
        inspector = inspect(self._get_engine())
        all_tables = inspector.get_table_names(schema=self.source_schema)
        partition_children = self._get_partition_child_tables(self.source_schema)
        return [t for t in all_tables if t not in partition_children]

    def get_tables_for_schema(self, schema_name: str) -> List[str]:
        """Metadata-only table listing for a schema other than the connected
        source schema — used to show per-schema counts in the catalog."""
        inspector = inspect(self._get_engine())
        all_tables = inspector.get_table_names(schema=schema_name)
        partition_children = self._get_partition_child_tables(schema_name)
        return [t for t in all_tables if t not in partition_children]

    def get_columns(self, table_name: str) -> List[Dict[str, Any]]:
        inspector = inspect(self._get_engine())
        columns = inspector.get_columns(
            table_name, schema=self.source_schema
        )
        return [
            {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True)
            }
            for col in columns
        ]

    def get_row_count(self, table_name: str) -> int:
        with self._get_engine().connect() as conn:
            result = conn.execute(
                text(
                    f'SELECT COUNT(*) FROM '
                    f'"{self.source_schema}"."{table_name}"'
                )
            )
            return result.scalar()

    def get_sample_values(
        self, table_name: str, column_name: str, limit: int = 100
    ) -> List[Any]:
        with self._get_engine().connect() as conn:
            result = conn.execute(
                text(
                    f'SELECT "{column_name}" FROM '
                    f'"{self.source_schema}"."{table_name}" '
                    f'WHERE "{column_name}" IS NOT NULL LIMIT {limit}'
                )
            )
            return [row[0] for row in result]

    def run_query(self, sql: str) -> pd.DataFrame:
        return pd.read_sql(sql, self._get_engine())

    def execute_write(self, sql: str) -> None:
        """Runs DML/DDL (UPDATE, DELETE, ALTER, ...) in a committed
        transaction. run_query/pd.read_sql only works for statements that
        return rows, so writes need this instead."""
        engine = self._get_engine()
        with engine.begin() as conn:
            conn.execute(text(sql))

    def get_primary_keys(self, table_name: str) -> List[str]:
        inspector = inspect(self._get_engine())
        pk_info = inspector.get_pk_constraint(
            table_name, schema=self.source_schema
        )
        return pk_info.get("constrained_columns", [])

    def get_foreign_keys(self, table_name: str) -> List[Dict[str, Any]]:
        inspector = inspect(self._get_engine())
        fks = inspector.get_foreign_keys(
            table_name, schema=self.source_schema
        )
        return [
            {
                "column": fk["constrained_columns"][0],
                "referenced_table": fk["referred_table"],
                "referenced_column": fk["referred_columns"][0]
            }
            for fk in fks
            if fk["constrained_columns"] and fk["referred_columns"]
        ]

    def get_sample_rows(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        with self._get_engine().connect() as conn:
            result = conn.execute(
                text(
                    f'SELECT * FROM "{self.source_schema}"."{table_name}" LIMIT {limit}'
                )
            )
            columns = list(result.keys())
            return [dict(zip(columns, row)) for row in result.fetchall()]

    def get_indexes(self, table_name: str) -> List[Dict[str, Any]]:
        inspector = inspect(self._get_engine())
        indexes = inspector.get_indexes(table_name, schema=self.source_schema)
        result = [
            {
                "name": idx["name"],
                "columns": [c for c in idx.get("column_names", []) if c],
                "is_unique": bool(idx.get("unique", False)),
                "is_primary": False,
            }
            for idx in indexes
        ]
        primary_keys = self.get_primary_keys(table_name)
        if primary_keys:
            result.insert(0, {
                "name": f"{table_name}_pkey",
                "columns": primary_keys,
                "is_unique": True,
                "is_primary": True,
            })
        return result

    def get_constraints(self, table_name: str) -> List[Dict[str, Any]]:
        inspector = inspect(self._get_engine())
        constraints: List[Dict[str, Any]] = []

        pk = inspector.get_pk_constraint(table_name, schema=self.source_schema)
        if pk.get("constrained_columns"):
            constraints.append({
                "name": pk.get("name") or f"{table_name}_pkey",
                "type": "primary_key",
                "definition": f'PRIMARY KEY ({", ".join(pk["constrained_columns"])})',
            })

        for fk in inspector.get_foreign_keys(table_name, schema=self.source_schema):
            if fk["constrained_columns"] and fk["referred_columns"]:
                constraints.append({
                    "name": fk.get("name") or f"{table_name}_fkey",
                    "type": "foreign_key",
                    "definition": (
                        f'FOREIGN KEY ({", ".join(fk["constrained_columns"])}) '
                        f'REFERENCES {fk["referred_table"]}({", ".join(fk["referred_columns"])})'
                    ),
                })

        for uq in inspector.get_unique_constraints(table_name, schema=self.source_schema):
            constraints.append({
                "name": uq.get("name") or "unique_constraint",
                "type": "unique",
                "definition": f'UNIQUE ({", ".join(uq["column_names"])})',
            })

        try:
            for ck in inspector.get_check_constraints(table_name, schema=self.source_schema):
                constraints.append({
                    "name": ck.get("name") or "check_constraint",
                    "type": "check",
                    "definition": ck.get("sqltext", ""),
                })
        except NotImplementedError:
            pass

        return constraints

    def get_table_size_bytes(self, table_name: str) -> Optional[int]:
        with self._get_engine().connect() as conn:
            result = conn.execute(
                text("SELECT pg_total_relation_size(:full_name)"),
                {"full_name": f'"{self.source_schema}"."{table_name}"'}
            )
            return result.scalar()

    def get_last_analyzed(self, table_name: str) -> Optional[str]:
        with self._get_engine().connect() as conn:
            result = conn.execute(
                text(
                    "SELECT GREATEST(last_analyze, last_autoanalyze) FROM pg_stat_user_tables "
                    "WHERE schemaname = :schema AND relname = :table"
                ),
                {"schema": self.source_schema, "table": table_name}
            )
            value = result.scalar()
            return value.isoformat() if value else None

    def get_server_info(self) -> Dict[str, Any]:
        """Live server metadata for display purposes. Best-effort — callers
        should tolerate individual fields coming back as None."""
        with self._get_engine().connect() as conn:
            version = conn.execute(text("SHOW server_version")).scalar()
            encoding = conn.execute(text("SHOW server_encoding")).scalar()
            collation = conn.execute(text("SHOW lc_collate")).scalar()
            size_bytes = conn.execute(
                text("SELECT pg_database_size(current_database())")
            ).scalar()
            return {
                "server_version": version,
                "encoding": encoding,
                "collation": collation,
                "database_size_bytes": size_bytes,
            }

    def dispose(self):
        if self.engine:
            self.engine.dispose()
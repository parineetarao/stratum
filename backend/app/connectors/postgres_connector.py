from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any
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
            self.engine = create_engine(self.connection_string)
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

    def get_tables(self) -> List[str]:
        inspector = inspect(self._get_engine())
        return inspector.get_table_names(schema=self.source_schema)

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

    def dispose(self):
        if self.engine:
            self.engine.dispose()
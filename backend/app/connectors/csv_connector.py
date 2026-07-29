import csv
import duckdb
import pandas as pd
from typing import List, Dict, Any, Optional, TypedDict
from app.connectors.base import BaseConnector


class CsvDialectInfo(TypedDict):
    encoding: Optional[str]
    delimiter: Optional[str]


def detect_csv_dialect(file_path: str, sample_bytes: int = 8192) -> CsvDialectInfo:
    """Best-effort encoding/delimiter detection for display purposes, read
    from a small prefix of the file rather than the full dataset."""
    for encoding in ("utf-8", "latin-1"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                sample = f.read(sample_bytes)
            try:
                delimiter = csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
            except csv.Error:
                delimiter = None
            return {"encoding": encoding, "delimiter": delimiter}
        except (UnicodeDecodeError, OSError):
            continue
    return {"encoding": None, "delimiter": None}


class CSVConnector(BaseConnector):

    def __init__(self, file_path: str, table_name: str = "uploaded_data"):
        self.file_path = file_path
        self.table_name = table_name
        self.conn = None
        self.df = None

    def _get_connection(self):
        if self.conn is None:
            self.conn = duckdb.connect(database=":memory:")
            if self.file_path.endswith(".csv"):
                self.df = pd.read_csv(self.file_path)
            elif self.file_path.endswith((".xlsx", ".xls")):
                self.df = pd.read_excel(self.file_path)
            else:
                raise ValueError("Unsupported file type. Use CSV or Excel.")
            self.conn.register(self.table_name, self.df)
        return self.conn

    def test_connection(self) -> bool:
        try:
            self._get_connection()
            return True
        except Exception as e:
            raise ConnectionError(f"Failed to load file: {str(e)}")

    def get_tables(self) -> List[str]:
        return [self.table_name]

    def get_columns(self, table_name: str) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute(f"DESCRIBE {table_name}").fetchall()
        return [
            {
                "name": row[0],
                "type": row[1],
                "nullable": True
            }
            for row in result
        ]

    def get_row_count(self, table_name: str) -> int:
        conn = self._get_connection()
        result = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        return result[0]

    def get_sample_values(self, table_name: str, column_name: str, limit: int = 100) -> List[Any]:
        conn = self._get_connection()
        result = conn.execute(
            f"SELECT {column_name} FROM {table_name} WHERE {column_name} IS NOT NULL LIMIT {limit}"
        ).fetchall()
        return [row[0] for row in result]

    def run_query(self, sql: str) -> pd.DataFrame:
        conn = self._get_connection()
        return conn.execute(sql).df()

    def get_primary_keys(self, table_name: str) -> List[str]:
        return []

    def get_foreign_keys(self, table_name: str) -> List[Dict[str, Any]]:
        return []
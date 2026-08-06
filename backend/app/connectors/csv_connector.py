import csv
import duckdb
import pandas as pd
from typing import List, Dict, Any, Optional, TypedDict
from app.connectors.base import BaseConnector


class CsvDialectInfo(TypedDict):
    encoding: Optional[str]
    delimiter: Optional[str]


CSV_ENCODING_CANDIDATES = ("utf-8", "utf-8-sig", "cp1252", "latin1")


def detect_csv_dialect(file_path: str, sample_bytes: int = 8192) -> CsvDialectInfo:
    """Best-effort encoding/delimiter detection, read from a small prefix of
    the file rather than the full dataset. Tries encodings in the same order
    used to actually load the file, so the reported encoding matches what
    gets passed to pd.read_csv()."""
    for encoding in CSV_ENCODING_CANDIDATES:
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


def read_csv_with_fallback_encoding(file_path: str, **kwargs) -> pd.DataFrame:
    """Load a CSV with pandas, trying encodings in order until one decodes
    successfully. cp1252/latin1 rarely raise UnicodeDecodeError (they map
    every byte), so they act as safe final fallbacks."""
    last_error: Optional[Exception] = None
    for encoding in CSV_ENCODING_CANDIDATES:
        try:
            return pd.read_csv(file_path, encoding=encoding, **kwargs)
        except UnicodeDecodeError as e:
            last_error = e
            continue
    raise last_error


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
                self.df = read_csv_with_fallback_encoding(self.file_path)
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

    def get_sample_rows(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
        columns = [d[0] for d in cursor.description]
        rows = cursor.fetchall()
        return [
            {
                col: (None if isinstance(val, float) and pd.isna(val) else val)
                for col, val in zip(columns, row)
            }
            for row in rows
        ]

    def get_indexes(self, table_name: str) -> List[Dict[str, Any]]:
        return []

    def get_constraints(self, table_name: str) -> List[Dict[str, Any]]:
        return []
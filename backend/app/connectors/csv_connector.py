import csv
import re
import duckdb
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple, TypedDict
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


def _slugify_table_name(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", name.strip()).strip("_").lower()
    return slug or "sheet"


class CSVConnector(BaseConnector):
    """Loads a single uploaded CSV/Excel file. A CSV maps to one table
    (`table_name`). An Excel workbook maps one table per sheet: a
    single-sheet workbook keeps `table_name` as-is, a multi-sheet workbook
    gets one table per sheet named `f"{table_name}_{sheet_slug}"`."""

    def __init__(self, file_path: str, table_name: str = "uploaded_data"):
        self.file_path = file_path
        self.table_name = table_name
        self.conn = None
        self.tables: Dict[str, pd.DataFrame] = {}

    def _get_connection(self):
        if self.conn is None:
            self.conn = duckdb.connect(database=":memory:")
            if self.file_path.endswith(".csv"):
                self.tables[self.table_name] = read_csv_with_fallback_encoding(self.file_path)
            elif self.file_path.endswith((".xlsx", ".xls")):
                workbook = pd.ExcelFile(self.file_path)
                sheet_names = workbook.sheet_names
                for sheet_name in sheet_names:
                    name = (
                        self.table_name
                        if len(sheet_names) == 1
                        else f"{self.table_name}_{_slugify_table_name(sheet_name)}"
                    )
                    self.tables[name] = workbook.parse(sheet_name)
            else:
                raise ValueError("Unsupported file type. Use CSV or Excel.")
            for name, df in self.tables.items():
                self.conn.register(name, df)
        return self.conn

    def test_connection(self) -> bool:
        try:
            self._get_connection()
            return True
        except Exception as e:
            raise ConnectionError(f"Failed to load file: {str(e)}")

    def get_tables(self) -> List[str]:
        self._get_connection()
        return list(self.tables.keys())

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
        """
        CSV/Excel data carries no declared constraints, so a primary key
        is inferred from the data itself: a column qualifies only if
        every row has a non-null value and all values are unique — the
        same definition a real PRIMARY KEY enforces in a database.

        When multiple columns qualify (e.g. both an id column and an
        incidentally-unique email column), the one that looks like an
        identifier by name/type is preferred, so a free-text column
        doesn't get picked over a real id column. Returns at most one
        column: composite keys aren't inferred, since every downstream
        caller (relationship inference, warehouse design) assumes a
        single-column primary key per table.
        """
        self._get_connection()
        df = self.tables.get(table_name)
        if df is None or len(df) == 0:
            return []

        row_count = len(df)
        candidates = [
            col for col in df.columns
            if not df[col].isnull().any() and df[col].nunique() == row_count
        ]
        if not candidates:
            return []

        table_token = table_name.lower()
        column_order = {col: i for i, col in enumerate(df.columns)}

        def rank(col: str):
            lower = col.lower()
            is_named_id = lower == "id" or lower == f"{table_token}_id"
            ends_with_id = lower.endswith("_id")
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            return (
                0 if is_named_id else 1,
                0 if ends_with_id else 1,
                0 if is_numeric else 1,
                column_order[col],
            )

        return [min(candidates, key=rank)]

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


class MultiFileConnector(BaseConnector):
    """Aggregates multiple uploaded CSV/Excel files (each an independent
    CSVConnector) behind a single BaseConnector, so downstream code (schema
    discovery, profiling, relationships, warehouse, KPIs, SQL workspace,
    dashboard) sees one flat table namespace regardless of how many files
    back a project."""

    def __init__(self, files: List[Tuple[str, str]]):
        # files: list of (stored_path, table_name) pairs, one per uploaded file.
        self._file_connectors = [
            CSVConnector(path, table_name=table_name) for path, table_name in files
        ]
        self._by_table: Dict[str, CSVConnector] = {}
        self._combined_conn: Optional[duckdb.DuckDBPyConnection] = None

    def _build_index(self):
        if not self._by_table:
            for connector in self._file_connectors:
                for table in connector.get_tables():
                    self._by_table[table] = connector

    def _connector_for(self, table_name: str) -> CSVConnector:
        self._build_index()
        if table_name not in self._by_table:
            raise ValueError(f"Unknown table: {table_name}")
        return self._by_table[table_name]

    def test_connection(self) -> bool:
        for connector in self._file_connectors:
            connector.test_connection()
        return True

    def get_tables(self) -> List[str]:
        self._build_index()
        return list(self._by_table.keys())

    def get_columns(self, table_name: str) -> List[Dict[str, Any]]:
        return self._connector_for(table_name).get_columns(table_name)

    def get_row_count(self, table_name: str) -> int:
        return self._connector_for(table_name).get_row_count(table_name)

    def get_sample_values(self, table_name: str, column_name: str, limit: int = 100) -> List[Any]:
        return self._connector_for(table_name).get_sample_values(table_name, column_name, limit)

    def run_query(self, sql: str) -> pd.DataFrame:
        if self._combined_conn is None:
            self._build_index()
            self._combined_conn = duckdb.connect(database=":memory:")
            for table_name, connector in self._by_table.items():
                connector._get_connection()
                self._combined_conn.register(table_name, connector.tables[table_name])
        return self._combined_conn.execute(sql).df()

    def get_primary_keys(self, table_name: str) -> List[str]:
        return self._connector_for(table_name).get_primary_keys(table_name)

    def get_foreign_keys(self, table_name: str) -> List[Dict[str, Any]]:
        return self._connector_for(table_name).get_foreign_keys(table_name)

    def get_sample_rows(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        return self._connector_for(table_name).get_sample_rows(table_name, limit)

    def get_indexes(self, table_name: str) -> List[Dict[str, Any]]:
        return self._connector_for(table_name).get_indexes(table_name)

    def get_constraints(self, table_name: str) -> List[Dict[str, Any]]:
        return self._connector_for(table_name).get_constraints(table_name)
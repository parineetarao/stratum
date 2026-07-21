from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import pandas as pd

class BaseConnector(ABC):

    @abstractmethod
    def test_connection(self) -> bool:
        """Verify the connection works. Returns True or raises an exception."""
        pass

    @abstractmethod
    def get_tables(self) -> List[str]:
        """Return a list of all table names in the connected source."""
        pass

    @abstractmethod
    def get_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """Return column info for a table: name, type, nullable."""
        pass

    @abstractmethod
    def get_row_count(self, table_name: str) -> int:
        """Return the total number of rows in a table."""
        pass

    @abstractmethod
    def get_sample_values(self, table_name: str, column_name: str, limit: int = 100) -> List[Any]:
        """Return a sample of values from a specific column."""
        pass

    @abstractmethod
    def run_query(self, sql: str) -> pd.DataFrame:
        """Execute a SQL query and return results as a DataFrame."""
        pass

    @abstractmethod
    def get_primary_keys(self, table_name: str) -> List[str]:
        """Return list of primary key column names for a table."""
        pass

    @abstractmethod
    def get_foreign_keys(self, table_name: str) -> List[Dict[str, Any]]:
        """Return foreign key relationships for a table."""
        pass
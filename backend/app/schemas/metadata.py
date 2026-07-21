from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class ForeignKeyInfo(BaseModel):
    column: str
    referenced_table: str
    referenced_column: str

class ColumnMetadata(BaseModel):
    name: str
    type: str
    nullable: bool
    is_primary_key: bool
    foreign_key: Optional[ForeignKeyInfo] = None

class TableMetadata(BaseModel):
    table_name: str
    row_count: int
    column_count: int
    columns: List[ColumnMetadata]
    primary_keys: List[str]
    foreign_keys: List[Dict[str, Any]]

class SchemaResponse(BaseModel):
    project_id: int
    table_count: int
    tables: List[TableMetadata]
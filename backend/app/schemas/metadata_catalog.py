from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime
from app.models.connection import ConnectionType
from app.schemas.metadata import ColumnMetadata


class SchemaSummary(BaseModel):
    name: str
    table_count: int
    is_source_schema: bool = False


class CatalogTableSummary(BaseModel):
    table_name: str
    schema_name: str
    row_count: int
    column_count: int
    last_updated: Optional[datetime] = None


class CatalogOverview(BaseModel):
    project_id: int
    source_type: ConnectionType
    source_schema: str
    schema_count: int
    table_count: int
    column_count: int
    total_rows_approx: int
    schemas: List[SchemaSummary]
    tables: List[CatalogTableSummary]
    last_refreshed_at: Optional[datetime] = None


class IndexInfo(BaseModel):
    name: str
    columns: List[str]
    is_unique: bool
    is_primary: bool = False


class ConstraintInfo(BaseModel):
    name: str
    type: str
    definition: str


class TableDetailResponse(BaseModel):
    table_name: str
    schema_name: str
    row_count: int
    column_count: int
    columns: List[ColumnMetadata]
    data_size_bytes: Optional[int] = None
    primary_key: List[str]
    indexes: List[IndexInfo]
    index_count: int
    constraints: List[ConstraintInfo]
    constraint_count: int
    last_analyzed_at: Optional[datetime] = None
    sample_data: List[Dict[str, Any]]
    ddl: str

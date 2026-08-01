from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class MeasureColumn(BaseModel):
    column_name: str
    data_type: str
    suggested_aggregations: List[str]


class DimensionColumn(BaseModel):
    column_name: str
    data_type: str
    is_date: bool
    is_descriptive: bool


class ForeignKeyRef(BaseModel):
    column_name: str
    references_table: str
    references_warehouse_table: str
    references_column: Optional[str] = None


class FactTableDesign(BaseModel):
    source_table: str
    warehouse_table: str
    fact_score: float
    measures: List[MeasureColumn]
    dimensions: List[DimensionColumn]
    foreign_keys: List[ForeignKeyRef] = []
    primary_key: List[str] = []
    row_count: int
    ddl: str
    classification_reasons: List[str]


class DimensionTableDesign(BaseModel):
    source_table: str
    warehouse_table: str
    attributes: List[DimensionColumn]
    foreign_keys: List[ForeignKeyRef] = []
    primary_key: List[str] = []
    row_count: int
    ddl: str
    classification_reasons: List[str]


class WarehouseDesignResponse(BaseModel):
    project_id: int
    design_id: int
    schema_type: str
    fact_count: int
    dimension_count: int
    fact_tables: List[FactTableDesign]
    dimension_tables: List[DimensionTableDesign]
    full_ddl: str
    full_ddl_postgres: Optional[str] = None
    full_ddl_duckdb: Optional[str] = None
    is_approved: bool

    class Config:
        from_attributes = True


class WarehouseApproval(BaseModel):
    is_approved: bool


class WarehouseClassificationOverride(BaseModel):
    table_name: str
    classification: str  # "fact" | "dimension"


class WarehouseTableResult(BaseModel):
    table_name: str
    row_count: Optional[int] = None


class JoinValidation(BaseModel):
    fact_table: str
    dimension_table: str
    foreign_key_column: str
    orphan_count: Optional[int] = None
    status: str  # "passed" | "warning" | "error"
    error: Optional[str] = None


class AggregationValidation(BaseModel):
    table: str
    column: str
    aggregation: str
    result: Optional[float] = None
    status: str  # "passed" | "error"
    error: Optional[str] = None


class WarehousePreviewResponse(BaseModel):
    project_id: int
    status: str  # "success" | "warning" | "failed"
    sandbox_initialized: bool
    tables_created: List[WarehouseTableResult]
    join_validations: List[JoinValidation]
    aggregation_validations: List[AggregationValidation]
    execution_time_ms: int
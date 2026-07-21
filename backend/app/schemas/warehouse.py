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


class FactTableDesign(BaseModel):
    source_table: str
    warehouse_table: str
    fact_score: float
    measures: List[MeasureColumn]
    dimensions: List[DimensionColumn]
    row_count: int
    ddl: str
    classification_reasons: List[str]


class DimensionTableDesign(BaseModel):
    source_table: str
    warehouse_table: str
    attributes: List[DimensionColumn]
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
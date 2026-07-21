from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class NumericStats(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    std_dev: float


class TopValue(BaseModel):
    value: str
    count: int


class ColumnProfileResponse(BaseModel):
    column_name: str
    declared_type: str
    total_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    uniqueness_ratio: float
    top_values: List[TopValue]
    numeric_stats: Optional[NumericStats] = None
    suspected_type_mismatch: bool

    class Config:
        from_attributes = True


class TableProfileResponse(BaseModel):
    table_name: str
    row_count: int
    duplicate_count: int
    duplicate_percentage: float
    column_count: int
    columns: List[ColumnProfileResponse]


class ProfilingResponse(BaseModel):
    project_id: int
    run_id: int
    table_count: int
    total_columns_profiled: int
    tables: List[TableProfileResponse]
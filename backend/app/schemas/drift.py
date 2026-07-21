from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class DriftChange(BaseModel):
    table_name: str
    column_name: Optional[str] = None
    severity: str
    message: str
    old_type: Optional[str] = None
    new_type: Optional[str] = None
    changes: Optional[List[str]] = None


class AffectedObject(BaseModel):
    warehouse_table: Optional[str] = None
    kpi_name: Optional[str] = None
    source_table: Optional[str] = None
    reason: str
    severity: str


class SchemaDriftResponse(BaseModel):
    project_id: int
    has_changes: bool
    total_changes: int
    snapshot_compared_at: Optional[str]
    current_snapshot_at: str
    added_tables: List[DriftChange]
    deleted_tables: List[DriftChange]
    added_columns: List[DriftChange]
    deleted_columns: List[DriftChange]
    modified_columns: List[DriftChange]
    affected_warehouse_tables: List[AffectedObject]
    affected_kpis: List[AffectedObject]
    total_affected_objects: int
    recommendation: str
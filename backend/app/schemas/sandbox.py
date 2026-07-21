from pydantic import BaseModel
from typing import List, Optional


class SandboxExecuteResponse(BaseModel):
    project_id: int
    success: bool
    message: str
    tables_loaded: List[str]


class SandboxRefreshResponse(BaseModel):
    project_id: int
    refreshed_tables: List[str]
    timestamp: str


class SandboxStatusResponse(BaseModel):
    project_id: int
    initialized: bool
    source_tables: List[str]
    warehouse_tables: List[str]
    has_warehouse: bool


class SandboxScheduleRequest(BaseModel):
    interval_hours: int

class SandboxContextResponse(BaseModel):
    project_id: int
    connection_type: str
    sandbox_role: str
    description: str
    can_apply_to_source: bool
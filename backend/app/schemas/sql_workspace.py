from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime


class SQLExecuteRequest(BaseModel):
    sql: str
    environment: str = "source"


class SQLExecuteResponse(BaseModel):
    success: bool
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None


class SQLExplainRequest(BaseModel):
    sql: str
    environment: str = "source"


class SQLExplainResponse(BaseModel):
    explanation: str
    tables_used: List[str]
    operations: List[str]


class SaveQueryRequest(BaseModel):
    name: str
    sql: str
    environment: str = "source"


class SavedQueryResponse(BaseModel):
    id: int
    project_id: int
    name: str
    sql: str
    environment: str
    created_at: datetime

    class Config:
        from_attributes = True


class QueryHistoryResponse(BaseModel):
    project_id: int
    queries: List[SavedQueryResponse]
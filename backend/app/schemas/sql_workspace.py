from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime


class SQLExecuteRequest(BaseModel):
    sql: Optional[str] = None
    environment: str = "source"
    query_id: Optional[str] = None


class SQLExecuteResponse(BaseModel):
    success: bool
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None
    explain_plan: Optional[str] = None
    rows_scanned: Optional[int] = None


class SQLExplainRequest(BaseModel):
    sql: Optional[str] = None
    environment: str = "source"
    query_id: Optional[str] = None


class SQLExplainResponse(BaseModel):
    explanation: str
    tables_used: List[str]
    operations: List[str]
    business_question: str = ""
    suggestions: List[str] = []


class SQLOptimizeRequest(BaseModel):
    sql: str
    environment: str = "source"


class SQLOptimizeResponse(BaseModel):
    suggestions: List[str]
    index_recommendations: List[str]
    rewritten_sql: Optional[str] = None


class SQLGenerateRequest(BaseModel):
    prompt: str
    environment: str = "source"


class SQLGenerateResponse(BaseModel):
    sql: str
    explanation: str = ""


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
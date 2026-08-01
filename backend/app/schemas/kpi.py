from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class KPIResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    sql: str
    mode: str
    confidence_score: int
    confidence_label: Optional[str] = None
    computed_value: Optional[float] = None
    formatted_value: Optional[str] = None
    reasoning: Optional[str] = None
    evidence: Optional[dict] = None
    status: str = "pending"
    is_approved: bool = False
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KPIApproval(BaseModel):
    is_approved: Optional[bool] = None
    status: Optional[str] = None


class KPIGenerateRequest(BaseModel):
    mode: Optional[str] = "source"


class KPIBulkApproveRequest(BaseModel):
    mode: Optional[str] = "source"


class KPIListResponse(BaseModel):
    project_id: int
    mode: str
    total: int
    approved: int
    pending: int = 0
    skipped: int = 0
    high_confidence_count: int = 0
    medium_confidence_count: int = 0
    low_confidence_count: int = 0
    kpis: List[KPIResponse]


class KPIRefreshResponse(BaseModel):
    project_id: int
    refreshed: int
    kpis: List[KPIResponse]
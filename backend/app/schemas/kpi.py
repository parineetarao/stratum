from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class KPIResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    unit: Optional[str]
    sql: str
    mode: str
    confidence_score: int
    computed_value: Optional[float]
    is_approved: bool

    class Config:
        from_attributes = True


class KPIApproval(BaseModel):
    is_approved: bool


class KPIListResponse(BaseModel):
    project_id: int
    mode: str
    total: int
    approved: int
    kpis: List[KPIResponse]


class KPIRefreshResponse(BaseModel):
    project_id: int
    refreshed: int
    kpis: List[KPIResponse]
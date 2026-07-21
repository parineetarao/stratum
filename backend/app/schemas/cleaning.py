from pydantic import BaseModel
from typing import List, Optional
from app.models.cleaning import CleaningStatus


class CleaningRecommendationResponse(BaseModel):
    id: int
    project_id: int
    operation: str
    table_name: str
    column_name: Optional[str]
    reason: Optional[str]
    expected_impact: Optional[str]
    confidence: Optional[str]
    sql_hint: Optional[str]
    status: CleaningStatus

    class Config:
        from_attributes = True


class CleaningDecision(BaseModel):
    status: CleaningStatus


class CleaningListResponse(BaseModel):
    project_id: int
    total: int
    pending: int
    approved: int
    rejected: int
    recommendations: List[CleaningRecommendationResponse]
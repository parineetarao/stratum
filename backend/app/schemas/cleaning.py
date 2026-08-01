from pydantic import BaseModel
from typing import List, Literal, Optional
from datetime import datetime
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
    sandbox_sql: Optional[str] = None
    status: CleaningStatus
    applied: bool = False
    applied_at: Optional[datetime] = None
    execution_error: Optional[str] = None

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


class CleaningBulkDecisionRequest(BaseModel):
    action: Literal[
        "approve_high_confidence",
        "reject_low_confidence",
        "reset_all",
    ]


class CleaningPreviewResult(BaseModel):
    recommendation_id: int
    operation: str
    table_name: str
    column_name: Optional[str]
    before: int
    after: int
    error: Optional[str] = None


class CleaningPreviewResponse(BaseModel):
    project_id: int
    results: List[CleaningPreviewResult]


class CleaningApplyRequest(BaseModel):
    recommendation_ids: Optional[List[int]] = None


class CleaningApplyResult(BaseModel):
    recommendation_id: int
    success: bool
    error: Optional[str] = None


class CleaningApplyResponse(BaseModel):
    project_id: int
    results: List[CleaningApplyResult]
    applied_count: int
    failed_count: int

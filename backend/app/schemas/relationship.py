from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.models.relationship import RelationshipStatus, ConfidenceTier

class RelationshipExplanation(BaseModel):
    reasons: List[str]
    signals: Dict[str, bool]

class RelationshipResponse(BaseModel):
    id: int
    project_id: int
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    name_similarity_score: int
    value_overlap_score: int
    confidence_score: int
    confidence_tier: ConfidenceTier
    explanation: Optional[Dict[str, Any]]
    status: RelationshipStatus

    class Config:
        from_attributes = True

class RelationshipDecision(BaseModel):
    status: RelationshipStatus

class RelationshipListResponse(BaseModel):
    project_id: int
    total_inferred: int
    auto_accepted: int
    pending_review: int
    relationships: List[RelationshipResponse]
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.sql import func
from app.database import Base
import enum

class RelationshipStatus(str, enum.Enum):
    auto_accepted = "auto_accepted"
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"

class ConfidenceTier(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

class InferredRelationship(Base):
    __tablename__ = "inferred_relationships"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    from_table = Column(String, nullable=False)
    from_column = Column(String, nullable=False)
    to_table = Column(String, nullable=False)
    to_column = Column(String, nullable=False)
    name_similarity_score = Column(Integer, default=0)
    value_overlap_score = Column(Integer, default=0)
    confidence_score = Column(Integer, nullable=False)
    confidence_tier = Column(Enum(ConfidenceTier), nullable=False)
    explanation = Column(JSON, nullable=True)
    status = Column(Enum(RelationshipStatus), default=RelationshipStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.sql import func
from app.database import Base
import enum


class CleaningStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class CleaningRecommendation(Base):
    __tablename__ = "cleaning_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    operation = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    column_name = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    expected_impact = Column(String, nullable=True)
    confidence = Column(String, nullable=True)
    sql_hint = Column(String, nullable=True)
    sandbox_sql = Column(String, nullable=True)
    status = Column(Enum(CleaningStatus), default=CleaningStatus.pending)
    applied = Column(Boolean, default=False, nullable=False)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    execution_error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
from sqlalchemy import (
    Column, Integer, String, Float,
    Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.sql import func
from app.database import Base


class KPI(Base):
    __tablename__ = "kpis"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    sql = Column(String, nullable=False)
    mode = Column(String, nullable=False, default="source")
    confidence_score = Column(Integer, default=0)
    computed_value = Column(Float, nullable=True)
    formatted_value = Column(String, nullable=True)
    reasoning = Column(String, nullable=True)
    evidence = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, approved, skipped
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
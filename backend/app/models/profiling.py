from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class ProfilingRun(Base):
    __tablename__ = "profiling_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    table_count = Column(Integer, default=0)
    total_columns_profiled = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    column_profiles = relationship(
        "ColumnProfile",
        back_populates="run",
        cascade="all, delete-orphan"
    )


class ColumnProfile(Base):
    __tablename__ = "column_profiles"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("profiling_runs.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    table_name = Column(String, nullable=False)
    column_name = Column(String, nullable=False)
    declared_type = Column(String, nullable=True)
    row_count = Column(Integer, default=0)
    null_count = Column(Integer, default=0)
    null_percentage = Column(Float, default=0.0)
    unique_count = Column(Integer, default=0)
    uniqueness_ratio = Column(Float, default=0.0)
    duplicate_count = Column(Integer, default=0)
    duplicate_percentage = Column(Float, default=0.0)
    top_values = Column(JSON, nullable=True)
    numeric_stats = Column(JSON, nullable=True)
    suspected_type_mismatch = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("ProfilingRun", back_populates="column_profiles")
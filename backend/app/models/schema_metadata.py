from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class DiscoveredTable(Base):
    __tablename__ = "discovered_tables"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    table_name = Column(String, nullable=False)
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    primary_keys = Column(JSON, nullable=True)
    foreign_keys = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    columns = relationship("DiscoveredColumn", back_populates="table", cascade="all, delete-orphan")

class DiscoveredColumn(Base):
    __tablename__ = "discovered_columns"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    table_id = Column(Integer, ForeignKey("discovered_tables.id"), nullable=False)
    table_name = Column(String, nullable=False)
    column_name = Column(String, nullable=False)
    data_type = Column(String, nullable=False)
    is_nullable = Column(Boolean, default=True)
    is_primary_key = Column(Boolean, default=False)
    foreign_key_info = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    table = relationship("DiscoveredTable", back_populates="columns")
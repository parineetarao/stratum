from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class WarehouseDesign(Base):
    __tablename__ = "warehouse_designs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    schema_type = Column(String, nullable=False)
    fact_tables = Column(JSON, nullable=False)
    dimension_tables = Column(JSON, nullable=False)
    full_ddl = Column(String, nullable=True)
    fact_count = Column(Integer, default=0)
    dimension_count = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    warehouse_table_names = Column(JSON, nullable=True)
    full_ddl_postgres = Column(String, nullable=True)
    full_ddl_duckdb = Column(String, nullable=True)
    overrides = Column(JSON, nullable=True)
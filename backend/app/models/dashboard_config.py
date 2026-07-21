from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class DashboardConfig(Base):
    __tablename__ = "dashboard_configs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    kpi_id = Column(Integer, ForeignKey("kpis.id"), nullable=False)
    chart_type = Column(String, nullable=False, default="bar")
    custom_title = Column(String, nullable=True)
    color_scheme = Column(String, nullable=True, default="default")
    x_label = Column(String, nullable=True)
    y_label = Column(String, nullable=True)
    grid_position = Column(Integer, default=0)
    grid_width = Column(Integer, default=6)
    is_visible = Column(Boolean, default=True)
    chart_options = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class DashboardConfig(Base):
    __tablename__ = "dashboard_configs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    # Charts are analytical widgets independent of any single KPI (a KPI's
    # own measure can power several distinct breakdowns), so persistence
    # is keyed by this stable widget identity rather than kpi_id.
    widget_key = Column(String, nullable=False, index=True)
    kpi_id = Column(Integer, ForeignKey("kpis.id"), nullable=True)
    # All of these are nullable with no server-side default: None means
    # "not customized" so a partial update (e.g. renaming a chart) never
    # silently overwrites the freshly computed chart_type/grid_position
    # for fields the request didn't touch.
    chart_type = Column(String, nullable=True)
    custom_title = Column(String, nullable=True)
    color_scheme = Column(String, nullable=True)
    x_label = Column(String, nullable=True)
    y_label = Column(String, nullable=True)
    grid_position = Column(Integer, nullable=True)
    grid_width = Column(Integer, nullable=True)
    is_visible = Column(Boolean, nullable=True)
    chart_options = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
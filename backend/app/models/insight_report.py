from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class InsightReport(Base):
    """The latest persisted AI insight report for a project — regenerated
    on every "Generate New Insights" click, but kept around so the
    Dashboard panel and the standalone Insights page can both read the
    same result without re-calling the LLM."""
    __tablename__ = "insight_reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    domain = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    executive_summary = Column(String, nullable=True)
    findings = Column(JSON, nullable=True)
    trends = Column(JSON, nullable=True)
    anomalies = Column(JSON, nullable=True)
    opportunities = Column(JSON, nullable=True)
    recommended_actions = Column(JSON, nullable=True)
    critical_risk_or_opportunity = Column(JSON, nullable=True)
    kpis_analyzed = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

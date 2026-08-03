from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class InsightFinding(BaseModel):
    title: str
    observation: str
    action: str
    sentiment: str = "warning"


class CriticalInsight(BaseModel):
    type: str
    title: str
    description: str
    recommended_action: str


class InsightsResponse(BaseModel):
    project_id: int
    domain: str
    success: bool
    executive_summary: str
    findings: List[InsightFinding]
    critical_risk_or_opportunity: Optional[Dict[str, Any]] = None
    kpis_analyzed: int
    generated_at: Optional[str] = None
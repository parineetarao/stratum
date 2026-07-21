from pydantic import BaseModel
from typing import List, Optional


class QualityIssue(BaseModel):
    severity: str
    table: str
    column: Optional[str]
    issue_type: str
    description: str
    metric: Optional[float]


class QualityReportResponse(BaseModel):
    project_id: int
    run_id: int
    overall_score: int
    completeness_score: float
    uniqueness_score: float
    consistency_score: float
    total_issues: int
    critical_issues: int
    warning_issues: int
    issues: List[QualityIssue]
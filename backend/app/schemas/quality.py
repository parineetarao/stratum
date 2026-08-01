from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class QualityIssue(BaseModel):
    severity: str
    table: str
    column: Optional[str]
    issue_type: str
    description: str
    metric: Optional[float]


class TableQualityScore(BaseModel):
    table_name: str
    score: int
    status: str
    issue_count: int


class IssueImpactSummary(BaseModel):
    duplicate_records: int
    duplicate_tables: int
    missing_values: int
    missing_value_tables: int
    invalid_formats: int
    invalid_format_tables: int


class QualityReportResponse(BaseModel):
    project_id: int
    run_id: int
    profiled_at: datetime
    overall_score: int
    completeness_score: float
    uniqueness_score: float
    consistency_score: float
    potential_score: int
    total_issues: int
    critical_issues: int
    warning_issues: int
    issues: List[QualityIssue]
    table_scores: List[TableQualityScore]
    issue_impact: IssueImpactSummary
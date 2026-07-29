from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime
from app.models.project import DomainEnum, AnalysisMode
from app.models.connection import ConnectionType

StageStatus = Literal["completed", "requires_review", "in_progress", "pending"]
ProjectStatus = Literal["setup_incomplete", "active", "needs_review", "completed"]


class WorkflowStage(BaseModel):
    id: str
    label: str
    route: str
    status: StageStatus
    is_current: bool


class NextStep(BaseModel):
    stage_id: str
    title: str
    description: str
    cta_label: str
    route: str


class SourceSummary(BaseModel):
    is_connected: bool
    connection_type: Optional[ConnectionType] = None
    connected_at: Optional[datetime] = None
    source_schema: Optional[str] = None
    database_name: Optional[str] = None
    original_filename: Optional[str] = None


class MetadataSummary(BaseModel):
    has_run: bool
    table_count: int
    total_rows: Optional[int] = None
    last_discovered_at: Optional[datetime] = None


class QualitySummary(BaseModel):
    has_run: bool
    overall_score: Optional[int] = None
    status_label: Optional[str] = None
    critical_issues: Optional[int] = None
    warning_issues: Optional[int] = None
    run_at: Optional[datetime] = None


class ActivityEvent(BaseModel):
    label: str
    timestamp: datetime


class TableSummary(BaseModel):
    table_name: str
    row_count: Optional[int] = None
    column_count: Optional[int] = None


class TablesOverview(BaseModel):
    has_run: bool
    schema_name: Optional[str] = None
    table_count: int
    tables: List[TableSummary] = []


class ProjectOverviewProject(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    domain: Optional[DomainEnum]
    analysis_mode: Optional[AnalysisMode]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectOverviewResponse(BaseModel):
    project: ProjectOverviewProject
    status: ProjectStatus
    status_label: str
    source: SourceSummary
    workflow: List[WorkflowStage]
    overall_progress_pct: int
    current_stage_id: Optional[str]
    next_step: Optional[NextStep]
    metadata_summary: MetadataSummary
    quality_summary: QualitySummary
    tables_overview: TablesOverview
    activity: List[ActivityEvent]

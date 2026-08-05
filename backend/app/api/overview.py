from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.schema_metadata import DiscoveredTable
from app.models.schema_snapshot import SchemaSnapshot
from app.models.relationship import InferredRelationship, RelationshipStatus
from app.models.profiling import ProfilingRun
from app.models.cleaning import CleaningRecommendation, CleaningStatus
from app.models.warehouse import WarehouseDesign
from app.models.kpi import KPI
from app.models.saved_query import SavedQuery
from app.models.dashboard_config import DashboardConfig
from app.api.deps import get_optional_user, get_project_for_access
from app.api.quality import load_profiling_tables
from app.engine.quality_scorer import score_profile
from app.core.connection_string import parse_postgres_connection_string
from app.schemas.overview import (
    ProjectOverviewResponse, ProjectOverviewProject, WorkflowStage, NextStep,
    SourceSummary, MetadataSummary, QualitySummary, ActivityEvent,
    TableSummary, TablesOverview
)

router = APIRouter(prefix="/projects", tags=["Overview"])

STAGE_DEFS = [
    ("data_source", "Data Source", "/data-source"),
    ("metadata", "Metadata", "/metadata"),
    ("relationships", "Relationships", "/relationships"),
    ("data_quality", "Data Quality", "/data-quality"),
    ("cleaning", "Cleaning", "/cleaning"),
    ("warehouse", "Warehouse", "/warehouse"),
    ("kpis", "KPIs", "/kpis"),
    ("sql_workspace", "SQL Workspace", "/sql"),
    ("dashboard", "Dashboard", "/dashboard"),
    ("insights", "Insights", "/insights"),
]

NEXT_STEP_COPY = {
    "data_source": (
        "Connect your data source",
        "Link a PostgreSQL database or upload a CSV file to get started.",
    ),
    "metadata": (
        "Run metadata discovery",
        "Scan your connected source to discover tables, columns, and schema structure.",
    ),
    "relationships": (
        "Review inferred relationships",
        "Stratum inferred relationships between tables. Review and confirm them.",
    ),
    "data_quality": (
        "Run data quality checks",
        "Profile your data to validate completeness, accuracy, and consistency.",
    ),
    "cleaning": (
        "Review cleaning recommendations",
        "Approve or reject suggested cleaning operations before modeling.",
    ),
    "warehouse": (
        "Generate warehouse model",
        "Design fact and dimension tables from your source schema.",
    ),
    "kpis": (
        "Define KPIs",
        "Review and approve recommended KPIs for your domain.",
    ),
    "sql_workspace": (
        "Open SQL Workspace",
        "Write and run queries against your source or warehouse.",
    ),
    "dashboard": (
        "Build your dashboard",
        "Visualize approved KPIs as charts on a live dashboard.",
    ),
    "insights": (
        "Generate insights",
        "Generate AI-powered executive insights from your approved KPIs.",
    ),
}


@router.get("/{project_id}/overview", response_model=ProjectOverviewResponse)
def get_project_overview(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    project = get_project_for_access(project_id, db, current_user.id if current_user else None)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()

    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()

    latest_snapshot = db.query(SchemaSnapshot).filter(
        SchemaSnapshot.project_id == project_id
    ).order_by(SchemaSnapshot.created_at.desc()).first()

    relationships = db.query(InferredRelationship).filter(
        InferredRelationship.project_id == project_id
    ).all()

    latest_profiling_run = db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).order_by(ProfilingRun.created_at.desc()).first()

    cleaning_recs = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id
    ).all()

    warehouse_design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()

    kpis = db.query(KPI).filter(KPI.project_id == project_id).all()

    saved_queries = db.query(SavedQuery).filter(
        SavedQuery.project_id == project_id
    ).all()

    dashboard_configs = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id
    ).all()

    # ---- Source summary ----
    source = SourceSummary(is_connected=connection is not None)
    if connection:
        source.connection_type = connection.connection_type
        source.connected_at = connection.created_at
        if connection.connection_type == ConnectionType.postgresql:
            source.source_schema = connection.source_schema
            source.database_name = parse_postgres_connection_string(connection.connection_string)["database"]
        else:
            source.original_filename = connection.original_filename

    # ---- Metadata summary ----
    total_rows = None
    if tables:
        total_rows = sum(t.row_count or 0 for t in tables)
    metadata_summary = MetadataSummary(
        has_run=len(tables) > 0,
        table_count=len(tables),
        total_rows=total_rows,
        last_discovered_at=latest_snapshot.created_at if latest_snapshot else None,
    )

    # ---- Quality summary ----
    quality_summary = QualitySummary(has_run=latest_profiling_run is not None)
    if latest_profiling_run:
        profile_tables = load_profiling_tables(latest_profiling_run.id, db)
        report = score_profile(profile_tables)
        score = report["overall_score"]
        if score >= 80:
            status_label = "Good"
        elif score >= 50:
            status_label = "Needs Review"
        else:
            status_label = "Critical"
        quality_summary.overall_score = score
        quality_summary.status_label = status_label
        quality_summary.critical_issues = report["critical_issues"]
        quality_summary.warning_issues = report["warning_issues"]
        quality_summary.run_at = latest_profiling_run.created_at

    # ---- Tables overview ----
    table_summaries = [
        TableSummary(table_name=t.table_name, row_count=t.row_count, column_count=t.column_count)
        for t in sorted(tables, key=lambda t: t.table_name)[:8]
    ]
    tables_overview = TablesOverview(
        has_run=len(tables) > 0,
        schema_name=connection.source_schema if connection and connection.connection_type == ConnectionType.postgresql else None,
        table_count=len(tables),
        tables=table_summaries,
    )

    # ---- Workflow stage status ----
    def relationships_status() -> str:
        if not relationships:
            return "pending"
        pending = sum(1 for r in relationships if r.status == RelationshipStatus.pending)
        return "requires_review" if pending > 0 else "completed"

    def cleaning_status() -> str:
        if not cleaning_recs:
            return "pending"
        pending = sum(1 for r in cleaning_recs if r.status == CleaningStatus.pending)
        return "requires_review" if pending > 0 else "completed"

    def warehouse_status() -> str:
        if not warehouse_design:
            return "pending"
        return "completed" if warehouse_design.is_approved else "requires_review"

    def kpis_status() -> str:
        if not kpis:
            return "pending"
        approved = sum(1 for k in kpis if k.is_approved)
        return "completed" if approved == len(kpis) else "requires_review"

    stage_status = {
        "data_source": "completed" if connection else "pending",
        "metadata": "completed" if tables else "pending",
        "relationships": relationships_status(),
        "data_quality": "completed" if latest_profiling_run else "pending",
        "cleaning": cleaning_status(),
        "warehouse": warehouse_status(),
        "kpis": kpis_status(),
        "sql_workspace": "completed" if saved_queries else "pending",
        "dashboard": "completed" if dashboard_configs else "pending",
        "insights": "pending",
    }

    current_stage_id = next(
        (stage_id for stage_id, _, _ in STAGE_DEFS if stage_status[stage_id] != "completed"),
        None
    )

    workflow: List[WorkflowStage] = [
        WorkflowStage(
            id=stage_id,
            label=label,
            route=route,
            status=stage_status[stage_id],
            is_current=(stage_id == current_stage_id),
        )
        for stage_id, label, route in STAGE_DEFS
    ]

    completed_count = sum(1 for s in workflow if s.status == "completed")
    overall_progress_pct = round((completed_count / len(STAGE_DEFS)) * 100)

    next_step = None
    if current_stage_id:
        title, description = NEXT_STEP_COPY[current_stage_id]
        route = next(r for sid, _, r in STAGE_DEFS if sid == current_stage_id)
        next_step = NextStep(
            stage_id=current_stage_id,
            title=title,
            description=description,
            cta_label="Continue",
            route=route,
        )

    # ---- Project status ----
    if not connection:
        status = "setup_incomplete"
        status_label = "Setup Incomplete"
    elif any(s.status == "requires_review" for s in workflow):
        status = "needs_review"
        status_label = "Needs Review"
    elif current_stage_id is None:
        status = "completed"
        status_label = "Completed"
    else:
        status = "active"
        status_label = "Active"

    # ---- Activity (derived only from real timestamps we already have) ----
    activity: List[ActivityEvent] = []
    if project.created_at:
        activity.append(ActivityEvent(label="Project created", timestamp=project.created_at))

    if connection and connection.created_at:
        type_label = "PostgreSQL" if connection.connection_type == ConnectionType.postgresql else "file"
        activity.append(ActivityEvent(
            label=f"Data source connected ({type_label})",
            timestamp=connection.created_at,
        ))

    if latest_snapshot and latest_snapshot.created_at:
        activity.append(ActivityEvent(
            label=f"Metadata discovered ({len(tables)} tables)",
            timestamp=latest_snapshot.created_at,
        ))

    if relationships:
        valid_rel_dates = [r.created_at for r in relationships if r.created_at is not None]
        if valid_rel_dates:
            activity.append(ActivityEvent(
                label=f"Relationships inferred ({len(relationships)})",
                timestamp=min(valid_rel_dates),
            ))

    if latest_profiling_run and latest_profiling_run.created_at:
        activity.append(ActivityEvent(
            label="Data quality checks completed",
            timestamp=latest_profiling_run.created_at,
        ))

    if warehouse_design and warehouse_design.created_at:
        activity.append(ActivityEvent(
            label="Warehouse model generated",
            timestamp=warehouse_design.created_at,
        ))

    if kpis:
        valid_kpi_dates = [k.created_at for k in kpis if k.created_at is not None]
        if valid_kpi_dates:
            activity.append(ActivityEvent(
                label=f"KPIs generated ({len(kpis)})",
                timestamp=min(valid_kpi_dates),
            ))

    from datetime import datetime, timezone
    fallback_dt = datetime.min.replace(tzinfo=timezone.utc)
    activity.sort(key=lambda e: e.timestamp if e.timestamp is not None else fallback_dt, reverse=True)
    activity = activity[:8]

    return ProjectOverviewResponse(
        project=ProjectOverviewProject.model_validate(project),
        is_demo=project.is_demo,
        status=status,
        status_label=status_label,
        source=source,
        workflow=workflow,
        overall_progress_pct=overall_progress_pct,
        current_stage_id=current_stage_id,
        next_step=next_step,
        metadata_summary=metadata_summary,
        quality_summary=quality_summary,
        tables_overview=tables_overview,
        activity=activity,
    )

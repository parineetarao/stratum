from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.models.kpi import KPI
from app.schemas.dashboard import (
    DashboardResponse, DashboardChart, KPISummaryCard,
    DashboardRefreshResponse, ChartConfigUpdate, ChartConfigResponse,
    DashboardReportResponse, ReportSection
)
from app.api.deps import get_current_user
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.chart_selector import format_value, get_supported_chart_types
from app.engine.kpi_engine import execute_kpi_sql
from app.engine.sandbox_engine import run_query_in_sandbox
from app.engine.dashboard_chart_planner import (
    generate_candidates, classify_result, curate, FinalizedChart
)
from app.models.dashboard_config import DashboardConfig
from app.ai.insight_generator import generate_insights

router = APIRouter(prefix="/projects", tags=["Dashboard"])


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )
    else:
        return CSVConnector(connection.file_path)


def run_sql(sql: str, mode: str, project_id: int, connector):
    if mode == "warehouse":
        return run_query_in_sandbox(project_id, sql)
    return connector.run_query(sql)


def to_rows(df) -> List[dict]:
    if df is None or len(df) == 0:
        return []
    rows = []
    for _, row in df.iterrows():
        rows.append({
            "period": str(row.get("period", "")) if "period" in row else None,
            "label": str(row.get("label", "")) if "label" in row else None,
            "value": float(row.get("value", 0)) if "value" in row else None,
        })
    return rows


def build_kpi_dicts(kpis: List[KPI]) -> List[dict]:
    return [
        {
            "id": k.id,
            "name": k.name,
            "category": k.category,
            "unit": k.unit,
            "sql": k.sql,
            "mode": k.mode,
            "computed_value": k.computed_value,
        }
        for k in kpis
    ]


def build_kpi_cards(kpis: List[KPI]) -> List[KPISummaryCard]:
    """Scalar summary cards — always the KPI's own value, never a chart."""
    return [
        KPISummaryCard(
            kpi_id=k.id,
            kpi_name=k.name,
            category=k.category,
            unit=k.unit,
            computed_value=k.computed_value,
            formatted_value=format_value(k.computed_value, k.unit or ""),
            sql=k.sql,
            mode=k.mode,
        )
        for k in kpis
    ]


def build_analytical_charts(
    db: Session,
    project_id: int,
    kpi_dicts: List[dict],
    connector
) -> List[DashboardChart]:
    """
    Generates the curated set of analytical breakdown charts: every
    candidate is executed, validated (rejecting anything that resolves
    to fewer than 2 rows — indistinguishable from a scalar value), then
    narrowed to a diverse final set and overlaid with any saved config.
    """
    candidates = generate_candidates(db, project_id, kpi_dicts)

    finalized: List[FinalizedChart] = []
    for candidate in candidates:
        try:
            df = run_sql(candidate.sql, candidate.mode, project_id, connector)
            rows = to_rows(df)
        except Exception:
            rows = []
        result = classify_result(candidate, rows)
        if result:
            finalized.append(result)

    curated = curate(finalized)

    configs = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id
    ).all()
    configs_by_key = {c.widget_key: c for c in configs}

    charts = []
    for i, chart in enumerate(curated):
        config = configs_by_key.get(chart.widget_key)
        custom_title = config.custom_title if config else None
        charts.append(DashboardChart(
            widget_key=chart.widget_key,
            title=custom_title or chart.title,
            custom_title=custom_title,
            # A saved config only overrides a field the user actually
            # touched — an untouched field (None) always falls back to
            # the freshly computed value, never a generic hardcoded one.
            chart_type=config.chart_type if config and config.chart_type is not None else chart.chart_type,
            chart_form=chart.chart_form,
            value_label=chart.value_label,
            sql=chart.sql,
            mode=chart.mode,
            unit=chart.unit,
            category=chart.category,
            source_kpi_id=chart.source_kpi_id,
            chart_data=[
                {"period": r["period"], "value": r["value"], "label": r["label"]}
                for r in chart.rows
            ],
            grid_position=config.grid_position if config and config.grid_position is not None else i,
            grid_width=config.grid_width if config and config.grid_width is not None else 6,
            is_visible=config.is_visible if config and config.is_visible is not None else True,
            supported_chart_types=get_supported_chart_types(chart.unit),
        ))

    charts.sort(key=lambda c: c.grid_position)
    return charts


@router.get("/{project_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assembles the dashboard: scalar KPI summary cards plus a curated
    set of analytical breakdown charts derived from those KPIs'
    measures and the schema's own dimensions/relationships.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    approved_kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == True
    ).all()

    if not approved_kpis:
        raise HTTPException(
            status_code=400,
            detail="No approved KPIs found. Approve KPIs first."
        )

    mode = project.analysis_mode or AnalysisMode.source
    mode_str = mode.value if hasattr(mode, 'value') else str(mode)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    connector = get_connector(connection)
    try:
        kpi_dicts = build_kpi_dicts(approved_kpis)
        charts = build_analytical_charts(db, project_id, kpi_dicts, connector)
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    domain = project.domain
    domain_str = domain.value if hasattr(domain, 'value') else str(domain)

    return DashboardResponse(
        project_id=project_id,
        project_name=project.name,
        domain=domain_str,
        mode=mode_str,
        total_kpis=len(approved_kpis),
        kpi_cards=build_kpi_cards(approved_kpis),
        charts=charts,
        last_refreshed=datetime.now(timezone.utc).isoformat()
    )


@router.post("/{project_id}/dashboard/refresh",
             response_model=DashboardRefreshResponse)
def refresh_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-executes all approved KPI SQL queries and updates stored values,
    then rebuilds the analytical charts from the refreshed data.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    approved_kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == True
    ).all()

    if not approved_kpis:
        raise HTTPException(
            status_code=400,
            detail="No approved KPIs to refresh"
        )

    mode = project.analysis_mode or AnalysisMode.source
    mode_str = mode.value if hasattr(mode, 'value') else str(mode)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    connector = get_connector(connection)
    try:
        for kpi in approved_kpis:
            kpi.computed_value = execute_kpi_sql(kpi.sql, mode_str, project_id, connector)
        db.commit()
        for k in approved_kpis:
            db.refresh(k)

        kpi_dicts = build_kpi_dicts(approved_kpis)
        charts = build_analytical_charts(db, project_id, kpi_dicts, connector)
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    return DashboardRefreshResponse(
        project_id=project_id,
        refreshed_kpis=len(approved_kpis),
        kpi_cards=build_kpi_cards(approved_kpis),
        charts=charts,
        last_refreshed=datetime.now(timezone.utc).isoformat()
    )


@router.post("/{project_id}/dashboard/config/{widget_key}",
             response_model=ChartConfigResponse)
def save_chart_config(
    project_id: int,
    widget_key: str,
    config: ChartConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves or updates chart configuration for a specific widget.
    Called when the user changes chart type, title, size, or visibility.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id,
        DashboardConfig.widget_key == widget_key
    ).first()

    if existing:
        for field, value in config.dict(exclude_none=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Only the fields this request actually set are stored — an
        # absent field stays None so it defers to the freshly computed
        # value on every load, instead of locking in a generic default
        # (e.g. "bar") for everything the caller didn't touch.
        new_config = DashboardConfig(
            project_id=project_id,
            widget_key=widget_key,
            **config.dict(exclude_none=True)
        )
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config


@router.get("/{project_id}/dashboard/report",
            response_model=DashboardReportResponse)
def generate_dashboard_report(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a structured report of the entire project analysis.
    Contains quality score, KPI summary, and AI insights.
    Frontend uses this data to generate a downloadable PDF.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    approved_kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == True
    ).all()

    from app.models.profiling import ProfilingRun
    latest_run = db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).order_by(ProfilingRun.created_at.desc()).first()

    quality_score = None
    if latest_run:
        from app.engine.quality_scorer import score_profile
        from app.api.quality import load_profiling_tables
        tables = load_profiling_tables(latest_run.id, db)
        report = score_profile(tables)
        quality_score = report["overall_score"]

    domain = project.domain
    domain_str = domain.value if hasattr(domain, 'value') else str(domain)

    kpi_summary = [
        {
            "name": k.name,
            "value": k.computed_value,
            "formatted_value": format_value(k.computed_value, k.unit or ""),
            "unit": k.unit,
            "category": k.category,
            "sql": k.sql
        }
        for k in approved_kpis
    ]

    insights_result = None
    if approved_kpis:
        insights_result = generate_insights(
            domain=domain_str,
            kpis=kpi_summary,
            quality_score=quality_score
        )

    sections = [
        ReportSection(
            title="Project Overview",
            content=(
                f"Project: {project.name}\n"
                f"Domain: {domain_str.title()}\n"
                f"Data Quality Score: {quality_score or 'Not assessed'}/100\n"
                f"KPIs Analysed: {len(approved_kpis)}"
            )
        ),
        ReportSection(
            title="Key Performance Indicators",
            content="\n".join([
                f"{k['name']}: {k['formatted_value']}"
                for k in kpi_summary
            ])
        )
    ]

    if insights_result and insights_result.get("success"):
        sections.append(ReportSection(
            title="Executive Summary",
            content=insights_result.get("executive_summary", "")
        ))

    return DashboardReportResponse(
        project_id=project_id,
        project_name=project.name,
        domain=domain_str,
        generated_at=datetime.now(timezone.utc).isoformat(),
        quality_score=quality_score,
        total_kpis=len(approved_kpis),
        kpi_summary=kpi_summary,
        executive_summary=insights_result.get("executive_summary") if insights_result else None,
        findings=insights_result.get("findings") if insights_result else None,
        sections=sections
    )

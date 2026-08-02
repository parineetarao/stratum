from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.models.kpi import KPI
from app.schemas.dashboard import (
    DashboardResponse, DashboardChart,
    DashboardRefreshResponse, ChartDataPoint
)
from app.api.deps import get_current_user
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.chart_selector import build_dashboard_charts, format_value
from app.engine.kpi_engine import execute_kpi_sql
from app.engine.sandbox_engine import run_query_in_sandbox, sandbox_exists
from app.models.dashboard_config import DashboardConfig
from app.schemas.dashboard import ChartConfigUpdate, ChartConfigResponse, DashboardReportResponse, ReportSection
from app.models.profiling import ProfilingRun
from app.api.quality import load_profiling_tables
from app.engine.quality_scorer import score_profile
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


def execute_timeseries(
    sql: str,
    mode: str,
    project_id: int,
    connector
) -> List[ChartDataPoint]:
    """
    Executes a time series SQL query and returns formatted data points.
    Used to populate line charts on the dashboard.
    """
    try:
        if mode == "warehouse":
            df = run_query_in_sandbox(project_id, sql)
        else:
            df = connector.run_query(sql)

        if df is None or len(df) == 0:
            return []

        points = []
        for _, row in df.iterrows():
            period = str(row.get("period", "")) if "period" in row else None
            value = float(row.get("value", 0)) if "value" in row else None
            points.append(ChartDataPoint(period=period, value=value))
        return points
    except Exception:
        return []


def apply_dashboard_configs(
    charts_config: List[dict],
    db: Session,
    project_id: int
) -> List[dict]:
    """
    Overlays any saved DashboardConfig rows onto the auto-computed
    chart configs, so user customizations (chart type, custom title,
    size, position, visibility) persist across refreshes.
    """
    configs = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id
    ).all()
    configs_by_kpi = {c.kpi_id: c for c in configs}

    for chart in charts_config:
        config = configs_by_kpi.get(chart.get("kpi_id"))
        if not config:
            continue
        if config.chart_type:
            chart["chart_type"] = config.chart_type
        if config.custom_title:
            chart["custom_title"] = config.custom_title
            chart["title"] = config.custom_title
        if config.color_scheme:
            chart["color_scheme"] = config.color_scheme
        if config.x_label:
            chart["x_label"] = config.x_label
        if config.y_label:
            chart["y_label"] = config.y_label
        chart["grid_position"] = config.grid_position
        chart["grid_width"] = config.grid_width
        chart["is_visible"] = config.is_visible

    charts_config.sort(key=lambda c: c.get("grid_position") or 0)
    return charts_config


def build_chart_response(
    chart: dict,
    mode: str,
    project_id: int,
    connector
) -> DashboardChart:
    """
    Builds a complete DashboardChart object including chart data
    for time series charts.
    """
    chart_data = None

    if chart.get("timeseries_sql") and chart.get("chart_type") == "line":
        chart_data = execute_timeseries(
            chart["timeseries_sql"], mode, project_id, connector
        )

    return DashboardChart(
        kpi_id=chart["kpi_id"],
        kpi_name=chart["kpi_name"],
        category=chart.get("category"),
        unit=chart.get("unit"),
        computed_value=chart.get("computed_value"),
        formatted_value=chart.get("formatted_value", "N/A"),
        sql=chart.get("sql", ""),
        mode=chart.get("mode", "source"),
        chart_type=chart.get("chart_type", "card"),
        title=chart.get("title", ""),
        value_label=chart.get("value_label", ""),
        has_chart=chart.get("has_chart", False),
        color_scheme=chart.get("color_scheme", "default"),
        x_label=chart.get("x_label"),
        y_label=chart.get("y_label"),
        grid_position=chart.get("grid_position", 0),
        grid_width=chart.get("grid_width", 6),
        timeseries_sql=chart.get("timeseries_sql"),
        donut_value=chart.get("donut_value"),
        donut_max=chart.get("donut_max"),
        chart_data=chart_data,
        supported_chart_types=chart.get("supported_chart_types", []),
        custom_title=chart.get("custom_title"),
        is_visible=chart.get("is_visible", True)
    )


@router.get("/{project_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assembles the complete dashboard from all approved KPIs.
    Selects chart types, executes time series queries for line charts,
    and returns everything the frontend needs to render the dashboard.
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

    kpi_dicts = [
        {
            "id": k.id,
            "name": k.name,
            "description": k.description,
            "category": k.category,
            "unit": k.unit,
            "sql": k.sql,
            "mode": k.mode,
            "computed_value": k.computed_value,
            "confidence_score": k.confidence_score,
            "is_approved": k.is_approved
        }
        for k in approved_kpis
    ]

    charts_config = build_dashboard_charts(kpi_dicts)
    charts_config = apply_dashboard_configs(charts_config, db, project_id)

    connector = get_connector(connection)

    try:
        chart_responses = [
            build_chart_response(chart, mode_str, project_id, connector)
            for chart in charts_config
        ]
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
        charts=chart_responses,
        last_refreshed=datetime.utcnow().isoformat()
    )


@router.post("/{project_id}/dashboard/refresh",
             response_model=DashboardRefreshResponse)
def refresh_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-executes all approved KPI SQL queries and updates stored values.
    Called when the user clicks the Refresh button on the dashboard.
    Returns updated chart data with fresh values.
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
            new_value = execute_kpi_sql(
                kpi.sql, mode_str, project_id, connector
            )
            kpi.computed_value = new_value
        db.commit()
        for k in approved_kpis:
            db.refresh(k)

        kpi_dicts = [
            {
                "id": k.id,
                "name": k.name,
                "category": k.category,
                "unit": k.unit,
                "sql": k.sql,
                "mode": k.mode,
                "computed_value": k.computed_value
            }
            for k in approved_kpis
        ]

        charts_config = build_dashboard_charts(kpi_dicts)
        charts_config = apply_dashboard_configs(charts_config, db, project_id)
        chart_responses = [
            build_chart_response(chart, mode_str, project_id, connector)
            for chart in charts_config
        ]
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    return DashboardRefreshResponse(
        project_id=project_id,
        refreshed_kpis=len(approved_kpis),
        charts=chart_responses,
        last_refreshed=datetime.utcnow().isoformat()
    )

@router.post("/{project_id}/dashboard/config/{kpi_id}",
             response_model=ChartConfigResponse)
def save_chart_config(
    project_id: int,
    kpi_id: int,
    config: ChartConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves or updates chart configuration for a specific KPI.
    Called when user changes chart type, colors, labels, or position.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id,
        DashboardConfig.kpi_id == kpi_id
    ).first()

    if existing:
        for field, value in config.dict(exclude_none=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_config = DashboardConfig(
            project_id=project_id,
            kpi_id=kpi_id,
            chart_type=config.chart_type or "bar",
            custom_title=config.custom_title,
            color_scheme=config.color_scheme or "default",
            x_label=config.x_label,
            y_label=config.y_label,
            grid_position=config.grid_position or 0,
            grid_width=config.grid_width or 6,
            is_visible=config.is_visible if config.is_visible is not None else True,
            chart_options=config.chart_options
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
    The backend provides the structured data, frontend handles PDF rendering.
    This keeps PDF generation in the browser where it is fastest
    and avoids server-side PDF library dependencies.
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
        from app.ai.insight_generator import generate_insights
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
        generated_at=datetime.utcnow().isoformat(),
        quality_score=quality_score,
        total_kpis=len(approved_kpis),
        kpi_summary=kpi_summary,
        executive_summary=insights_result.get("executive_summary") if insights_result else None,
        findings=insights_result.get("findings") if insights_result else None,
        sections=sections
    )
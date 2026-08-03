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
    generate_candidates, classify_result, curate, FinalizedChart, axis_metadata
)
from app.models.dashboard_config import DashboardConfig
from app.models.saved_query import SavedQuery
from app.engine.sandbox_engine import sandbox_exists
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/projects", tags=["Dashboard"])


class QueryWidgetCreate(BaseModel):
    saved_query_id: int
    chart_type: str = "bar"
    x_column: str
    y_column: str
    title: Optional[str] = None


def _check_connector_reachable(connector) -> None:
    """
    Fails fast with a clean error if the underlying data source can't be
    reached, instead of letting every downstream KPI/chart query retry
    and fail against a dead connection one at a time — which previously
    compounded into a multi-minute hang that looked like an infinite
    loading spinner on the dashboard.
    """
    if not hasattr(connector, 'test_connection'):
        return
    try:
        connector.test_connection()
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to the data source: {e}"
        )


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
        raw_value = row.get("value") if "value" in row else None
        try:
            value = float(raw_value) if raw_value is not None else None
        except (TypeError, ValueError):
            value = None
        rows.append({
            "period": str(row.get("period", "")) if "period" in row else None,
            "label": str(row.get("label", "")) if "label" in row else None,
            "value": value,
        })
    return rows


PLACEHOLDER_TITLES = {
    "my custom title", "untitled", "chart title", "new chart",
    "new widget", "widget title", "custom title", "title",
}


def _clean_custom_title(custom_title: Optional[str]) -> Optional[str]:
    """
    A saved custom_title is only honored if it's a real, user-meaningful
    title. A blank/whitespace-only value or a known placeholder (e.g.
    "My Custom Title" left over from a demo/test) is treated as if the
    user never set one, so the freshly generated default title is shown
    instead of a meaningless one.
    """
    if custom_title is None:
        return None
    trimmed = custom_title.strip()
    if not trimmed or trimmed.lower() in PLACEHOLDER_TITLES:
        return None
    return trimmed


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
    Generates every chart-worthy analytical breakdown: each candidate is
    executed and validated (rejecting anything that resolves to fewer
    than 2 rows — indistinguishable from a scalar value). A diverse
    ~5-6 chart subset is curated as the default visible grid, but every
    other chart-worthy breakdown is still returned (is_visible=False)
    so the Add Widget drawer can offer them, rather than discarding
    candidates the curation step didn't pick for the default layout.
    A saved config always wins over both the curated default and the
    freshly computed value for whichever fields it actually touched.
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

    curated_keys = {c.widget_key for c in curate(finalized)}

    configs = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id
    ).all()
    configs_by_key = {c.widget_key: c for c in configs}

    charts = []
    for i, chart in enumerate(finalized):
        config = configs_by_key.get(chart.widget_key)
        custom_title = _clean_custom_title(config.custom_title if config else None)
        default_visible = chart.widget_key in curated_keys
        meta = axis_metadata(chart.chart_form, chart.value_label, chart.metric_name, chart.unit)
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
            is_visible=config.is_visible if config and config.is_visible is not None else default_visible,
            color_scheme=config.color_scheme if config else None,
            supported_chart_types=get_supported_chart_types(chart.unit),
            x_field=meta["x_field"],
            y_field=meta["y_field"],
            x_axis_label=meta["x_axis_label"],
            y_axis_label=meta["y_axis_label"],
            series_name=meta["series_name"],
        ))

    charts.sort(key=lambda c: c.grid_position)
    return charts


def build_query_widget_charts(
    db: Session,
    project_id: int,
    connector
) -> List[DashboardChart]:
    """
    Rebuilds each persisted saved-query widget (a DashboardConfig row
    whose chart_options carries a saved_query_id) by re-executing the
    saved query's SQL, so query-based widgets reflect current data on
    every dashboard load just like KPI-derived charts.
    """
    configs = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id,
        DashboardConfig.widget_key.like("query%")
    ).all()

    charts: List[DashboardChart] = []
    for config in configs:
        opts = config.chart_options or {}
        saved_query_id = opts.get("saved_query_id")
        x_column = opts.get("x_column")
        y_column = opts.get("y_column")
        if not saved_query_id or not x_column or not y_column:
            continue

        saved_query = db.query(SavedQuery).filter(
            SavedQuery.id == saved_query_id,
            SavedQuery.project_id == project_id
        ).first()
        if not saved_query:
            continue

        try:
            df = run_sql(saved_query.sql, saved_query.environment, project_id, connector)
        except Exception:
            df = None

        chart_data = []
        if df is not None and x_column in df.columns and y_column in df.columns:
            for _, row in df.iterrows():
                try:
                    value = float(row[y_column]) if row[y_column] is not None else None
                except (TypeError, ValueError):
                    value = None
                chart_data.append({
                    "period": None,
                    "label": str(row[x_column]) if row[x_column] is not None else None,
                    "value": value,
                })

        custom_title = _clean_custom_title(config.custom_title)
        x_label = x_column.replace("_", " ").title()
        y_label = y_column.replace("_", " ").title()
        charts.append(DashboardChart(
            widget_key=config.widget_key,
            title=custom_title or saved_query.name,
            custom_title=custom_title,
            chart_type=config.chart_type or "bar",
            chart_form="categorical",
            value_label=x_label,
            sql=saved_query.sql,
            mode=saved_query.environment,
            unit="",
            category=None,
            source_kpi_id=None,
            chart_data=chart_data,
            grid_position=config.grid_position if config.grid_position is not None else 999,
            grid_width=config.grid_width if config.grid_width is not None else 6,
            is_visible=config.is_visible if config.is_visible is not None else True,
            color_scheme=config.color_scheme,
            supported_chart_types=["bar", "horizontal_bar", "line", "area", "donut", "pie", "table"],
            x_field="label",
            y_field="value",
            x_axis_label=x_label,
            y_axis_label=y_label,
            series_name=y_label,
        ))

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
    _check_connector_reachable(connector)
    try:
        kpi_dicts = build_kpi_dicts(approved_kpis)
        charts = build_analytical_charts(db, project_id, kpi_dicts, connector)
        charts += build_query_widget_charts(db, project_id, connector)
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
    _check_connector_reachable(connector)
    try:
        for kpi in approved_kpis:
            kpi.computed_value = execute_kpi_sql(kpi.sql, mode_str, project_id, connector)
        db.commit()
        for k in approved_kpis:
            db.refresh(k)

        kpi_dicts = build_kpi_dicts(approved_kpis)
        charts = build_analytical_charts(db, project_id, kpi_dicts, connector)
        charts += build_query_widget_charts(db, project_id, connector)
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


@router.post("/{project_id}/dashboard/widgets/query", response_model=DashboardChart)
def add_query_widget(
    project_id: int,
    payload: QueryWidgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Turns a saved SQL Workspace query into a real dashboard widget: the
    query is executed, the chosen columns are validated against the
    result, and a DashboardConfig row is persisted (widget_key
    'query{id}', chart_options carrying the saved_query_id + chosen
    columns so it can be re-executed on every future dashboard load).
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    saved_query = db.query(SavedQuery).filter(
        SavedQuery.id == payload.saved_query_id,
        SavedQuery.project_id == project_id
    ).first()
    if not saved_query:
        raise HTTPException(status_code=404, detail="Saved query not found")

    if payload.chart_type not in ("bar", "horizontal_bar", "line", "area", "donut", "pie", "table"):
        raise HTTPException(status_code=400, detail="Unsupported chart type")

    if saved_query.environment == "warehouse" and not sandbox_exists(project_id):
        raise HTTPException(status_code=400, detail="Sandbox not initialized for this query's environment")

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    connector = get_connector(connection)
    try:
        try:
            df = run_sql(saved_query.sql, saved_query.environment, project_id, connector)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to execute saved query: {e}")
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    if df is None or len(df) == 0:
        raise HTTPException(status_code=400, detail="Saved query returned no rows to chart")

    if payload.x_column not in df.columns or payload.y_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Columns not found in query result. Available: {list(df.columns)}"
        )

    widget_key = f"query{saved_query.id}"
    max_position = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id
    ).count()

    chart_options = {
        "saved_query_id": saved_query.id,
        "x_column": payload.x_column,
        "y_column": payload.y_column,
    }

    existing = db.query(DashboardConfig).filter(
        DashboardConfig.project_id == project_id,
        DashboardConfig.widget_key == widget_key
    ).first()
    if existing:
        existing.chart_type = payload.chart_type
        existing.custom_title = payload.title or existing.custom_title
        existing.chart_options = chart_options
        existing.is_visible = True
        db.commit()
        db.refresh(existing)
        config = existing
    else:
        config = DashboardConfig(
            project_id=project_id,
            widget_key=widget_key,
            chart_type=payload.chart_type,
            custom_title=payload.title,
            chart_options=chart_options,
            grid_position=max_position,
            grid_width=6,
            is_visible=True,
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    chart_data = []
    for _, row in df.iterrows():
        try:
            value = float(row[payload.y_column]) if row[payload.y_column] is not None else None
        except (TypeError, ValueError):
            value = None
        chart_data.append({
            "period": None,
            "label": str(row[payload.x_column]) if row[payload.x_column] is not None else None,
            "value": value,
        })

    custom_title = _clean_custom_title(config.custom_title)
    x_label = payload.x_column.replace("_", " ").title()
    y_label = payload.y_column.replace("_", " ").title()
    return DashboardChart(
        widget_key=widget_key,
        title=custom_title or saved_query.name,
        custom_title=custom_title,
        chart_type=config.chart_type or payload.chart_type,
        chart_form="categorical",
        value_label=x_label,
        sql=saved_query.sql,
        mode=saved_query.environment,
        unit="",
        category=None,
        source_kpi_id=None,
        chart_data=chart_data,
        grid_position=config.grid_position or 0,
        grid_width=config.grid_width or 6,
        is_visible=True,
        color_scheme=config.color_scheme,
        supported_chart_types=["bar", "horizontal_bar", "line", "area", "donut", "pie", "table"],
        x_field="label",
        y_field="value",
        x_axis_label=x_label,
        y_axis_label=y_label,
        series_name=y_label,
    )


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

    from app.models.insight_report import InsightReport
    latest_report = db.query(InsightReport).filter(
        InsightReport.project_id == project_id
    ).order_by(InsightReport.created_at.desc()).first()
    insights_result = None
    if latest_report:
        insights_result = {
            "success": latest_report.success,
            "executive_summary": latest_report.executive_summary,
            "findings": latest_report.findings or [],
        }

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

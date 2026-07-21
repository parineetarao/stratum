from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.models.kpi import KPI
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.models.warehouse import WarehouseDesign
from app.schemas.kpi import KPIResponse, KPIApproval, KPIListResponse, KPIRefreshResponse
from app.api.deps import get_current_user
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.kpi_engine import recommend_kpis, execute_kpi_sql
from app.engine.sandbox_engine import get_sandbox_tables, sandbox_exists

router = APIRouter(prefix="/projects", tags=["KPIs"])


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )
    else:
        return CSVConnector(connection.file_path)


def build_source_schema(project_id: int, db: Session) -> List[dict]:
    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()
    schema = []
    for table in tables:
        columns = db.query(DiscoveredColumn).filter(
            DiscoveredColumn.table_id == table.id
        ).all()
        schema.append({
            "table_name": table.table_name,
            "columns": [
                {"name": col.column_name, "type": col.data_type}
                for col in columns
            ]
        })
    return schema


def build_warehouse_schema(project_id: int) -> List[dict]:
    """
    Reads the list of tables currently in the DuckDB sandbox.
    Used for warehouse mode KPI validation.
    Returns a minimal schema — table names and column names only.
    """
    if not sandbox_exists(project_id):
        return []

    from app.engine.sandbox_engine import run_query_in_sandbox
    try:
        df = run_query_in_sandbox(
            project_id,
            "SELECT table_name, column_name FROM "
            "information_schema.columns WHERE table_schema = 'main' "
            "ORDER BY table_name, ordinal_position"
        )
        schema_dict = {}
        for _, row in df.iterrows():
            tname = row["table_name"]
            cname = row["column_name"]
            if tname not in schema_dict:
                schema_dict[tname] = []
            schema_dict[tname].append({"name": cname, "type": "unknown"})

        return [
            {"table_name": tname, "columns": cols}
            for tname, cols in schema_dict.items()
        ]
    except Exception:
        return []


@router.post("/{project_id}/recommend-kpis", response_model=KPIListResponse)
def recommend_project_kpis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.domain:
        raise HTTPException(
            status_code=400,
            detail="Select a domain for this project first"
        )

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    mode = project.analysis_mode or AnalysisMode.source
    mode_str = mode.value if hasattr(mode, 'value') else str(mode)

    source_schema = build_source_schema(project_id, db)

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()

    if not design:
        raise HTTPException(
            status_code=400,
            detail="Generate warehouse design first"
        )

    warehouse_design = {
        "fact_tables": design.fact_tables or [],
        "dimension_tables": design.dimension_tables or [],
    }

    if mode_str == "warehouse" and not sandbox_exists(project_id):
        raise HTTPException(
            status_code=400,
            detail=(
                "Warehouse mode selected but sandbox not initialized. "
                "Initialize sandbox and create warehouse first."
            )
        )

    connector = get_connector(connection)

    domain_str = (
        project.domain.value
        if hasattr(project.domain, 'value')
        else str(project.domain)
    )

    try:
        recommendations = recommend_kpis(
            domain=domain_str,
            mode=mode_str,
            project_id=project_id,
            source_schema=source_schema,
            warehouse_design=warehouse_design,
            connector=connector
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"KPI recommendation failed: {str(e)}"
        )
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    db.query(KPI).filter(KPI.project_id == project_id).delete()
    db.commit()

    saved_kpis = []
    for rec in recommendations:
        kpi = KPI(
            project_id=project_id,
            name=rec["name"],
            description=rec["description"],
            category=rec["category"],
            unit=rec["unit"],
            sql=rec["sql"],
            mode=rec["mode"],
            confidence_score=rec["confidence_score"],
            computed_value=rec["computed_value"],
            is_approved=False
        )
        db.add(kpi)
        db.flush()
        saved_kpis.append(kpi)

    db.commit()
    for k in saved_kpis:
        db.refresh(k)

    approved_count = sum(1 for k in saved_kpis if k.is_approved)

    return KPIListResponse(
        project_id=project_id,
        mode=mode_str,
        total=len(saved_kpis),
        approved=approved_count,
        kpis=saved_kpis
    )


@router.get("/{project_id}/kpis", response_model=KPIListResponse)
def get_project_kpis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    kpis = db.query(KPI).filter(
        KPI.project_id == project_id
    ).order_by(KPI.confidence_score.desc()).all()

    mode = project.analysis_mode or AnalysisMode.source
    mode_str = mode.value if hasattr(mode, 'value') else str(mode)
    approved_count = sum(1 for k in kpis if k.is_approved)

    return KPIListResponse(
        project_id=project_id,
        mode=mode_str,
        total=len(kpis),
        approved=approved_count,
        kpis=kpis
    )


@router.patch("/{project_id}/kpis/{kpi_id}/approve", response_model=KPIResponse)
def approve_kpi(
    project_id: int,
    kpi_id: int,
    approval: KPIApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    kpi = db.query(KPI).filter(
        KPI.id == kpi_id,
        KPI.project_id == project_id
    ).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")

    kpi.is_approved = approval.is_approved
    db.commit()
    db.refresh(kpi)
    return kpi


@router.post("/{project_id}/kpis/refresh", response_model=KPIRefreshResponse)
def refresh_kpi_values(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-executes SQL for all approved KPIs and updates computed values.
    Used by dashboard refresh button.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    approved_kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == True
    ).all()

    mode = project.analysis_mode or AnalysisMode.source
    mode_str = mode.value if hasattr(mode, 'value') else str(mode)

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
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    return KPIRefreshResponse(
        project_id=project_id,
        refreshed=len(approved_kpis),
        kpis=approved_kpis
    )
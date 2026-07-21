from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.warehouse import WarehouseDesign
from app.models.schema_metadata import DiscoveredTable
from app.schemas.sandbox import (
    SandboxStatusResponse,
    SandboxExecuteResponse,
    SandboxRefreshResponse,
    SandboxScheduleRequest
)
from app.api.deps import get_current_user
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.sandbox_engine import (
    initialize_sandbox,
    execute_warehouse_ddl,
    refresh_warehouse_data,
    get_sandbox_tables,
    sandbox_exists
)
from app.core.scheduler import scheduler
from apscheduler.triggers.interval import IntervalTrigger

router = APIRouter(prefix="/projects", tags=["Sandbox"])


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(connection.connection_string, source_schema=connection.source_schema or "public")
    else:
        return CSVConnector(connection.file_path)


@router.post("/{project_id}/sandbox/initialize",
             response_model=SandboxExecuteResponse)
def initialize_project_sandbox(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Copies all source tables from connected database into DuckDB sandbox.
    This is the first step before any sandbox operations.
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

    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()
    if not tables:
        raise HTTPException(
            status_code=400,
            detail="Run metadata discovery first"
        )

    source_table_names = [t.table_name for t in tables]
    connector = get_connector(connection)

    try:
        path = initialize_sandbox(
            project_id, connector, source_table_names
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Sandbox initialization failed: {str(e)}"
        )
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    return SandboxExecuteResponse(
        project_id=project_id,
        success=True,
        message=f"Sandbox initialized with {len(source_table_names)} tables",
        tables_loaded=source_table_names
    )


@router.post("/{project_id}/sandbox/create-warehouse",
             response_model=SandboxExecuteResponse)
def create_warehouse_in_sandbox(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes the warehouse DDL script against the sandbox.
    Creates fact and dim tables populated from source data in DuckDB.
    Source database is never touched.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not sandbox_exists(project_id):
        raise HTTPException(
            status_code=400,
            detail="Initialize sandbox first"
        )

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()
    if not design:
        raise HTTPException(
            status_code=400,
            detail="Generate warehouse design first"
        )

    try:
        result = execute_warehouse_ddl(project_id, design.full_ddl_duckdb or design.full_ddl)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Warehouse creation failed: {str(e)}"
        )

    return SandboxExecuteResponse(
        project_id=project_id,
        success=result["success"],
        message="Warehouse tables created in sandbox",
        tables_loaded=result["warehouse_tables_created"]
    )


@router.post("/{project_id}/sandbox/refresh",
             response_model=SandboxRefreshResponse)
def refresh_sandbox_warehouse(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Refreshes warehouse table data from current source database.
    Schema is unchanged. Only rows are updated.
    Use this when source data has changed and warehouse needs updating.
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

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()

    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()
    source_table_names = [t.table_name for t in tables]
    warehouse_table_names = design.warehouse_table_names or [] if design else []

    connector = get_connector(connection)

    try:
        result = refresh_warehouse_data(
            project_id,
            connector,
            source_table_names,
            warehouse_table_names
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Refresh failed: {str(e)}"
        )
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    return SandboxRefreshResponse(
        project_id=project_id,
        refreshed_tables=result["refreshed_tables"],
        timestamp=result["timestamp"]
    )


@router.get("/{project_id}/sandbox/status",
            response_model=SandboxStatusResponse)
def get_sandbox_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns current state of the project sandbox.
    Shows which tables exist and whether warehouse has been created.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not sandbox_exists(project_id):
        return SandboxStatusResponse(
            project_id=project_id,
            initialized=False,
            source_tables=[],
            warehouse_tables=[],
            has_warehouse=False
        )

    all_tables = get_sandbox_tables(project_id)
    source_tables = [
        t for t in all_tables
        if not t.startswith("fact_") and not t.startswith("dim_")
    ]
    warehouse_tables = [
        t for t in all_tables
        if t.startswith("fact_") or t.startswith("dim_")
    ]

    return SandboxStatusResponse(
        project_id=project_id,
        initialized=True,
        source_tables=source_tables,
        warehouse_tables=warehouse_tables,
        has_warehouse=len(warehouse_tables) > 0
    )
@router.post("/{project_id}/sandbox/schedule-refresh")
def schedule_warehouse_refresh(
    project_id: int,
    request: SandboxScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Schedules automatic warehouse refresh at a fixed interval.
    Stratum will automatically pull latest source data and
    update warehouse tables at the configured frequency.
    """
    job_id = f"warehouse_refresh_{project_id}"

    existing = scheduler.get_job(job_id)
    if existing:
        scheduler.remove_job(job_id)

    def refresh_job():
        from app.database import SessionLocal
        from app.engine.sandbox_engine import refresh_warehouse_data
        from app.models.connection import Connection
        from app.models.schema_metadata import DiscoveredTable
        from app.models.warehouse import WarehouseDesign

        job_db = SessionLocal()
        try:
            conn = job_db.query(Connection).filter(
                Connection.project_id == project_id
            ).first()
            tables = job_db.query(DiscoveredTable).filter(
                DiscoveredTable.project_id == project_id
            ).all()
            design = job_db.query(WarehouseDesign).filter(
                WarehouseDesign.project_id == project_id
            ).first()

            if not conn or not tables:
                return

            connector = get_connector(conn)
            source_names = [t.table_name for t in tables]
            warehouse_names = design.warehouse_table_names or [] if design else []

            refresh_warehouse_data(
                project_id, connector, source_names, warehouse_names
            )
        finally:
            job_db.close()

    scheduler.add_job(
        refresh_job,
        trigger=IntervalTrigger(hours=request.interval_hours),
        id=job_id,
        replace_existing=True
    )

    return {
        "project_id": project_id,
        "message": f"Warehouse will refresh every {request.interval_hours} hours",
        "interval_hours": request.interval_hours
    }


@router.get("/{project_id}/sandbox/context")
def get_sandbox_context(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns context-aware description of the sandbox role
    based on connection type. Used by frontend to adjust
    messaging without changing navigation structure.
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
        return {
            "project_id": project_id,
            "connection_type": "none",
            "sandbox_role": "sandbox",
            "description": "Connect a data source to begin.",
            "can_apply_to_source": False
        }

    if connection.connection_type == ConnectionType.postgresql:
        return {
            "project_id": project_id,
            "connection_type": "postgresql",
            "sandbox_role": "sandbox",
            "description": (
                "Isolated analytical environment. "
                "Warehouse tables are created here to protect "
                "your operational database."
            ),
            "can_apply_to_source": True
        }
    else:
        return {
            "project_id": project_id,
            "connection_type": connection.connection_type.value,
            "sandbox_role": "primary_database",
            "description": (
                "Your uploaded file has been loaded here as the "
                "primary analytical database. All analysis, "
                "warehouse creation, and KPI execution runs here."
            ),
            "can_apply_to_source": False
        }
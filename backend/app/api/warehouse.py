import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.warehouse import WarehouseDesign
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.models.connection import Connection, ConnectionType
from app.schemas.warehouse import (
    WarehouseDesignResponse, WarehouseApproval,
    FactTableDesign, DimensionTableDesign,
    MeasureColumn, DimensionColumn, ForeignKeyRef,
    WarehouseClassificationOverride, WarehousePreviewResponse,
    WarehouseTableResult, JoinValidation, AggregationValidation
)
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.warehouse_designer import design_warehouse
from app.engine.sandbox_engine import (
    initialize_sandbox, execute_warehouse_ddl, sandbox_exists, validate_warehouse
)

router = APIRouter(prefix="/projects", tags=["Warehouse"])


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )
    return CSVConnector(connection.file_path)


def build_schema_from_db(project_id: int, db: Session):
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
            "row_count": table.row_count or 0,
            "columns": [
                {
                    "name": col.column_name,
                    "type": col.data_type,
                    "is_primary_key": col.is_primary_key,
                    "is_nullable": col.is_nullable,
                    "foreign_key": col.foreign_key_info
                }
                for col in columns
            ]
        })
    return schema


def parse_design_response(
    design: WarehouseDesign,
    project_id: int
) -> WarehouseDesignResponse:
    fact_tables = [
        FactTableDesign(
            source_table=ft["source_table"],
            warehouse_table=ft["warehouse_table"],
            fact_score=ft["fact_score"],
            measures=[MeasureColumn(**m) for m in ft["measures"]],
            dimensions=[DimensionColumn(**d) for d in ft["dimensions"]],
            foreign_keys=[ForeignKeyRef(**fk) for fk in ft.get("foreign_keys", [])],
            primary_key=ft.get("primary_key", []),
            row_count=ft["row_count"],
            ddl=ft["ddl"],
            classification_reasons=ft["classification_reasons"]
        )
        for ft in design.fact_tables
    ]

    dimension_tables = [
        DimensionTableDesign(
            source_table=dt["source_table"],
            warehouse_table=dt["warehouse_table"],
            attributes=[DimensionColumn(**a) for a in dt["attributes"]],
            foreign_keys=[ForeignKeyRef(**fk) for fk in dt.get("foreign_keys", [])],
            primary_key=dt.get("primary_key", []),
            row_count=dt["row_count"],
            ddl=dt["ddl"],
            classification_reasons=dt["classification_reasons"]
        )
        for dt in design.dimension_tables
    ]

    return WarehouseDesignResponse(
        project_id=project_id,
        design_id=design.id,
        schema_type=design.schema_type,
        fact_count=design.fact_count,
        dimension_count=design.dimension_count,
        fact_tables=fact_tables,
        dimension_tables=dimension_tables,
        full_ddl=design.full_ddl or "",
        full_ddl_postgres=design.full_ddl_postgres,
        full_ddl_duckdb=design.full_ddl_duckdb,
        is_approved=design.is_approved
    )


@router.post("/{project_id}/warehouse-design",
             response_model=WarehouseDesignResponse)
def generate_warehouse_design(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    schema = build_schema_from_db(project_id, db)
    if not schema:
        raise HTTPException(
            status_code=400,
            detail="Run metadata discovery first"
        )

    # Load connection to get source schema
    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    source_schema = "public"
    if connection and connection.source_schema:
        source_schema = connection.source_schema

    design_result = design_warehouse(schema, source_schema=source_schema)

    db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).delete()
    db.commit()

    design = WarehouseDesign(
        project_id=project_id,
        schema_type=design_result["schema_type"],
        fact_tables=design_result["fact_tables"],
        dimension_tables=design_result["dimension_tables"],
        full_ddl=design_result["full_ddl_postgres"],
        full_ddl_postgres=design_result["full_ddl_postgres"],
        full_ddl_duckdb=design_result["full_ddl_duckdb"],
        fact_count=design_result["fact_count"],
        dimension_count=design_result["dimension_count"],
        warehouse_table_names=design_result["warehouse_table_names"],
        overrides={},
        is_approved=False
    )
    db.add(design)
    db.commit()
    db.refresh(design)

    return parse_design_response(design, project_id)


@router.get("/{project_id}/warehouse-design",
            response_model=WarehouseDesignResponse)
def get_warehouse_design(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()
    if not design:
        raise HTTPException(
            status_code=404,
            detail="No warehouse design found. Generate one first."
        )

    return parse_design_response(design, project_id)


@router.patch("/{project_id}/warehouse-design/approve",
              response_model=WarehouseDesignResponse)
def approve_warehouse_design(
    project_id: int,
    approval: WarehouseApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()
    if not design:
        raise HTTPException(
            status_code=404,
            detail="No warehouse design found"
        )

    design.is_approved = approval.is_approved
    db.commit()
    db.refresh(design)

    return parse_design_response(design, project_id)


@router.patch("/{project_id}/warehouse-design/classify",
              response_model=WarehouseDesignResponse)
def override_warehouse_classification(
    project_id: int,
    override: WarehouseClassificationOverride,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually reclassifies a single table as a fact or dimension table,
    then regenerates the warehouse design (DDL, diagram data) around it.
    """
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()
    if not design:
        raise HTTPException(
            status_code=404,
            detail="No warehouse design found. Generate one first."
        )

    if override.classification not in ("fact", "dimension"):
        raise HTTPException(
            status_code=400,
            detail="classification must be 'fact' or 'dimension'"
        )

    schema = build_schema_from_db(project_id, db)
    if not schema:
        raise HTTPException(
            status_code=400,
            detail="Run metadata discovery first"
        )

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    source_schema = "public"
    if connection and connection.source_schema:
        source_schema = connection.source_schema

    overrides = dict(design.overrides or {})
    overrides[override.table_name] = override.classification

    design_result = design_warehouse(
        schema, source_schema=source_schema, overrides=overrides
    )

    design.schema_type = design_result["schema_type"]
    design.fact_tables = design_result["fact_tables"]
    design.dimension_tables = design_result["dimension_tables"]
    design.full_ddl = design_result["full_ddl_postgres"]
    design.full_ddl_postgres = design_result["full_ddl_postgres"]
    design.full_ddl_duckdb = design_result["full_ddl_duckdb"]
    design.fact_count = design_result["fact_count"]
    design.dimension_count = design_result["dimension_count"]
    design.warehouse_table_names = design_result["warehouse_table_names"]
    design.overrides = overrides
    design.is_approved = False
    db.commit()
    db.refresh(design)

    return parse_design_response(design, project_id)


@router.post("/{project_id}/warehouse-design/preview",
             response_model=WarehousePreviewResponse)
def preview_warehouse(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Materializes the generated warehouse design inside the isolated DuckDB
    sandbox (initializing it first if needed), then validates fact->dimension
    join integrity and sample aggregations. The source database is never
    touched — everything runs against the sandbox copy.
    """
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()
    if not design:
        raise HTTPException(
            status_code=400,
            detail="Generate a warehouse design first"
        )

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    start = time.time()
    sandbox_initialized_now = False
    connector = get_connector(connection)

    try:
        if not sandbox_exists(project_id):
            tables = db.query(DiscoveredTable).filter(
                DiscoveredTable.project_id == project_id
            ).all()
            if not tables:
                raise HTTPException(
                    status_code=400,
                    detail="Run metadata discovery first"
                )
            source_table_names = [t.table_name for t in tables]
            initialize_sandbox(project_id, connector, source_table_names)
            sandbox_initialized_now = True

        try:
            ddl_result = execute_warehouse_ddl(
                project_id, design.full_ddl_duckdb or design.full_ddl
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Warehouse DDL execution failed: {str(e)}"
            )

        if not ddl_result["success"]:
            failed = [
                r for r in ddl_result["execution_results"]
                if r["status"] == "error"
            ]
            raise HTTPException(
                status_code=500,
                detail=f"Warehouse DDL execution failed: "
                       f"{failed[0]['error'] if failed else 'unknown error'}"
            )

        validation = validate_warehouse(
            project_id, design.fact_tables, design.dimension_tables
        )
    finally:
        if hasattr(connector, "dispose"):
            connector.dispose()

    execution_time_ms = int((time.time() - start) * 1000)

    tables_created = [
        WarehouseTableResult(
            table_name=wt,
            row_count=validation["row_counts"].get(wt)
        )
        for wt in (design.warehouse_table_names or [])
    ]

    join_validations = [JoinValidation(**j) for j in validation["join_validations"]]
    aggregation_validations = [
        AggregationValidation(**a) for a in validation["aggregation_validations"]
    ]

    status = "success"
    if any(j.status == "error" for j in join_validations) or \
       any(a.status == "error" for a in aggregation_validations):
        status = "failed"
    elif any(j.status == "warning" for j in join_validations):
        status = "warning"

    return WarehousePreviewResponse(
        project_id=project_id,
        status=status,
        sandbox_initialized=sandbox_initialized_now,
        tables_created=tables_created,
        join_validations=join_validations,
        aggregation_validations=aggregation_validations,
        execution_time_ms=execution_time_ms
    )
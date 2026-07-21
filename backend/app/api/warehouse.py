from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.warehouse import WarehouseDesign
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.schemas.warehouse import (
    WarehouseDesignResponse, WarehouseApproval,
    FactTableDesign, DimensionTableDesign,
    MeasureColumn, DimensionColumn
)
from app.api.deps import get_current_user
from app.engine.warehouse_designer import design_warehouse

router = APIRouter(prefix="/projects", tags=["Warehouse"])


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
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    schema = build_schema_from_db(project_id, db)
    if not schema:
        raise HTTPException(
            status_code=400,
            detail="Run metadata discovery first"
        )

    # Load connection to get source schema
    from app.models.connection import Connection
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
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
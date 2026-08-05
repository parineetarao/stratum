from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.project import Project, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.models.kpi import KPI
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.models.warehouse import WarehouseDesign
from app.schemas.kpi import (
    KPIResponse, KPIApproval, KPIListResponse, KPIRefreshResponse,
    KPIGenerateRequest, KPIBulkApproveRequest
)
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.kpi_engine import recommend_kpis, execute_kpi_sql, format_kpi_value
from app.engine.sandbox_engine import sandbox_exists

router = APIRouter(prefix="/projects", tags=["KPIs"])


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )
    else:
        return CSVConnector(connection.file_path)


def get_confidence_label(score: int) -> str:
    if score >= 80:
        return "High"
    elif score >= 50:
        return "Medium"
    return "Low"


def build_kpi_response(kpi: KPI) -> KPIResponse:
    confidence_label = get_confidence_label(kpi.confidence_score or 0)
    fmt_val = kpi.formatted_value or format_kpi_value(kpi.computed_value, kpi.unit)
    status_str = kpi.status or ("approved" if kpi.is_approved else "pending")
    return KPIResponse(
        id=kpi.id,
        project_id=kpi.project_id,
        name=kpi.name,
        description=kpi.description,
        category=kpi.category,
        unit=kpi.unit,
        sql=kpi.sql,
        mode=kpi.mode,
        confidence_score=kpi.confidence_score or 0,
        confidence_label=confidence_label,
        computed_value=kpi.computed_value,
        formatted_value=fmt_val,
        reasoning=kpi.reasoning,
        evidence=kpi.evidence,
        status=status_str,
        is_approved=kpi.is_approved,
        created_at=kpi.created_at,
    )


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


def assemble_kpi_list_response(project_id: int, mode_str: str, kpis: List[KPI]) -> KPIListResponse:
    kpi_responses = [build_kpi_response(k) for k in kpis]
    approved_count = sum(1 for k in kpi_responses if k.status == "approved" or k.is_approved)
    skipped_count = sum(1 for k in kpi_responses if k.status == "skipped")
    pending_count = sum(1 for k in kpi_responses if k.status == "pending" and not k.is_approved)

    high_count = sum(1 for k in kpi_responses if k.confidence_label == "High")
    med_count = sum(1 for k in kpi_responses if k.confidence_label == "Medium")
    low_count = sum(1 for k in kpi_responses if k.confidence_label == "Low")

    return KPIListResponse(
        project_id=project_id,
        mode=mode_str,
        total=len(kpi_responses),
        approved=approved_count,
        pending=pending_count,
        skipped=skipped_count,
        high_confidence_count=high_count,
        medium_confidence_count=med_count,
        low_confidence_count=low_count,
        kpis=kpi_responses
    )


@router.get("/{project_id}/kpis", response_model=KPIListResponse)
def get_project_kpis(
    project_id: int,
    mode: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    project = get_project_for_access(project_id, db, current_user.id if current_user else None)

    mode_str = mode or (
        project.analysis_mode.value
        if hasattr(project.analysis_mode, 'value')
        else str(project.analysis_mode or "source")
    )

    kpis = db.query(KPI).filter(
        KPI.project_id == project_id
    ).order_by(KPI.confidence_score.desc()).all()

    return assemble_kpi_list_response(project_id, mode_str, kpis)


@router.post("/{project_id}/kpis/generate", response_model=KPIListResponse)
@router.post("/{project_id}/recommend-kpis", response_model=KPIListResponse)
def generate_project_kpis(
    project_id: int,
    payload: Optional[KPIGenerateRequest] = None,
    mode: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

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

    req_mode = (payload and payload.mode) or mode or (
        project.analysis_mode.value
        if hasattr(project.analysis_mode, 'value')
        else str(project.analysis_mode or "source")
    )

    if req_mode == "warehouse" and not sandbox_exists(project_id):
        raise HTTPException(
            status_code=400,
            detail=(
                "Warehouse mode selected but sandbox not initialized. "
                "Initialize sandbox and create warehouse first."
            )
        )

    if req_mode in ("source", "warehouse"):
        project.analysis_mode = AnalysisMode[req_mode]
        db.commit()

    source_schema = build_source_schema(project_id, db)

    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()

    warehouse_design = {
        "fact_tables": (design.fact_tables if design else []) or [],
        "dimension_tables": (design.dimension_tables if design else []) or [],
    }

    connector = get_connector(connection)

    domain_str = (
        project.domain.value
        if hasattr(project.domain, 'value')
        else str(project.domain)
    )

    try:
        recommendations = recommend_kpis(
            domain=domain_str,
            mode=req_mode,
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

    existing_kpis = db.query(KPI).filter(KPI.project_id == project_id).all()
    approved_names = {k.name for k in existing_kpis if k.is_approved or k.status == "approved"}

    # Delete unapproved existing KPIs to replace with new recommendations
    db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == False,
        (KPI.status == "pending") | (KPI.status == "skipped") | (KPI.status == None)
    ).delete(synchronize_session=False)
    db.commit()
    db.expire_all()

    saved_kpis = []
    for rec in recommendations:
        if rec["name"] in approved_names:
            continue

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
            formatted_value=rec.get("formatted_value"),
            reasoning=rec.get("reasoning"),
            evidence=rec.get("evidence"),
            status="pending",
            is_approved=False
        )
        db.add(kpi)
        saved_kpis.append(kpi)

    db.commit()

    all_kpis = db.query(KPI).filter(
        KPI.project_id == project_id
    ).order_by(KPI.confidence_score.desc()).all()

    return assemble_kpi_list_response(project_id, req_mode, all_kpis)


@router.post("/{project_id}/kpis/{kpi_id}/approve", response_model=KPIResponse)
@router.patch("/{project_id}/kpis/{kpi_id}/approve", response_model=KPIResponse)
def approve_kpi(
    project_id: int,
    kpi_id: int,
    approval: Optional[KPIApproval] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    kpi = db.query(KPI).filter(
        KPI.id == kpi_id,
        KPI.project_id == project_id
    ).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")

    kpi.is_approved = True
    kpi.status = "approved"
    db.commit()
    db.refresh(kpi)
    return build_kpi_response(kpi)


@router.post("/{project_id}/kpis/{kpi_id}/skip", response_model=KPIResponse)
def skip_kpi(
    project_id: int,
    kpi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    kpi = db.query(KPI).filter(
        KPI.id == kpi_id,
        KPI.project_id == project_id
    ).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")

    kpi.is_approved = False
    kpi.status = "skipped"
    db.commit()
    db.refresh(kpi)
    return build_kpi_response(kpi)


@router.post("/{project_id}/kpis/{kpi_id}/restore", response_model=KPIResponse)
@router.post("/{project_id}/kpis/{kpi_id}/unapprove", response_model=KPIResponse)
def restore_kpi(
    project_id: int,
    kpi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    kpi = db.query(KPI).filter(
        KPI.id == kpi_id,
        KPI.project_id == project_id
    ).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")

    kpi.is_approved = False
    kpi.status = "pending"
    db.commit()
    db.refresh(kpi)
    return build_kpi_response(kpi)


@router.post("/{project_id}/kpis/bulk-approve", response_model=KPIListResponse)
def bulk_approve_high_confidence_kpis(
    project_id: int,
    payload: Optional[KPIBulkApproveRequest] = None,
    mode: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    mode_str = (payload and payload.mode) or mode or (
        project.analysis_mode.value
        if hasattr(project.analysis_mode, 'value')
        else str(project.analysis_mode or "source")
    )

    kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        (KPI.status == "pending") | (KPI.status == None),
        KPI.is_approved == False,
        KPI.confidence_score >= 80
    ).all()

    for kpi in kpis:
        kpi.is_approved = True
        kpi.status = "approved"

    db.commit()

    all_kpis = db.query(KPI).filter(
        KPI.project_id == project_id
    ).order_by(KPI.confidence_score.desc()).all()

    return assemble_kpi_list_response(project_id, mode_str, all_kpis)


@router.get("/{project_id}/kpis/{kpi_id}/sql")
def get_kpi_sql(
    project_id: int,
    kpi_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)

    kpi = db.query(KPI).filter(
        KPI.id == kpi_id,
        KPI.project_id == project_id
    ).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")

    return {
        "kpi_id": kpi.id,
        "name": kpi.name,
        "sql": kpi.sql,
        "mode": kpi.mode,
        "reasoning": kpi.reasoning,
        "evidence": kpi.evidence
    }


@router.post("/{project_id}/kpis/refresh", response_model=KPIRefreshResponse)
def refresh_kpi_values(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

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
            kpi.formatted_value = format_kpi_value(new_value, kpi.unit)

        db.commit()
        for k in approved_kpis:
            db.refresh(k)
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    kpi_responses = [build_kpi_response(k) for k in approved_kpis]
    return KPIRefreshResponse(
        project_id=project_id,
        refreshed=len(approved_kpis),
        kpis=kpi_responses
    )
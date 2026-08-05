from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.cleaning import CleaningRecommendation, CleaningStatus
from app.schemas.cleaning import (
    CleaningRecommendationResponse,
    CleaningDecision,
    CleaningListResponse,
    CleaningBulkDecisionRequest,
    CleaningPreviewResponse,
    CleaningPreviewResult,
    CleaningApplyRequest,
    CleaningApplyResponse,
    CleaningApplyResult,
)
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.postgres_connector import PostgresConnector
from app.engine.sandbox_engine import (
    run_query_in_sandbox,
    sandbox_exists,
)
from app.engine.cleaning_executor import run_cleaning_preview

router = APIRouter(prefix="/projects", tags=["Cleaning"])


def _get_project(project_id: int, db: Session, current_user: Optional[User]) -> Project:
    return get_project_for_access(project_id, db, current_user.id if current_user else None)


def _get_mutable_project(project_id: int, db: Session, current_user: User) -> Project:
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)
    return project


def _list_response(project_id: int, recs) -> CleaningListResponse:
    return CleaningListResponse(
        project_id=project_id,
        total=len(recs),
        pending=sum(1 for r in recs if r.status == CleaningStatus.pending),
        approved=sum(1 for r in recs if r.status == CleaningStatus.approved),
        rejected=sum(1 for r in recs if r.status == CleaningStatus.rejected),
        recommendations=recs
    )


@router.get("/{project_id}/cleaning-recommendations",
            response_model=CleaningListResponse)
def get_cleaning_recommendations(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    _get_project(project_id, db, current_user)

    recs = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id
    ).all()

    if not recs:
        raise HTTPException(
            status_code=404,
            detail="No cleaning recommendations found. Generate quality report first."
        )

    return _list_response(project_id, recs)


@router.patch(
    "/{project_id}/cleaning-recommendations/{rec_id}/decide",
    response_model=CleaningRecommendationResponse
)
def decide_cleaning_recommendation(
    project_id: int,
    rec_id: int,
    decision: CleaningDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mutable_project(project_id, db, current_user)

    rec = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.id == rec_id,
        CleaningRecommendation.project_id == project_id
    ).first()
    if not rec:
        raise HTTPException(
            status_code=404,
            detail="Recommendation not found"
        )

    rec.status = decision.status
    db.commit()
    db.refresh(rec)
    return rec


@router.post(
    "/{project_id}/cleaning-recommendations/bulk-decide",
    response_model=CleaningListResponse
)
def bulk_decide_cleaning_recommendations(
    project_id: int,
    request: CleaningBulkDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mutable_project(project_id, db, current_user)

    recs = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id
    ).all()
    if not recs:
        raise HTTPException(
            status_code=404,
            detail="No cleaning recommendations found. Generate quality report first."
        )

    if request.action == "approve_high_confidence":
        for r in recs:
            if r.confidence == "high" and r.status == CleaningStatus.pending:
                r.status = CleaningStatus.approved
    elif request.action == "reject_low_confidence":
        for r in recs:
            if r.confidence == "low" and r.status == CleaningStatus.pending:
                r.status = CleaningStatus.rejected
    elif request.action == "reset_all":
        for r in recs:
            if not r.applied:
                r.status = CleaningStatus.pending

    db.commit()
    for r in recs:
        db.refresh(r)

    return _list_response(project_id, recs)


@router.post("/{project_id}/cleaning/preview", response_model=CleaningPreviewResponse)
def preview_cleaning(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mutable_project(project_id, db, current_user)

    if not sandbox_exists(project_id):
        raise HTTPException(
            status_code=400,
            detail="Initialize the sandbox before previewing changes"
        )

    approved = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id,
        CleaningRecommendation.status == CleaningStatus.approved
    ).all()
    if not approved:
        raise HTTPException(
            status_code=400,
            detail="Approve at least one recommendation before previewing"
        )

    rec_dicts = [
        {
            "id": r.id,
            "operation": r.operation,
            "table_name": r.table_name,
            "column_name": r.column_name,
            "sandbox_sql": r.sandbox_sql,
        }
        for r in approved
    ]

    try:
        raw_results = run_cleaning_preview(project_id, rec_dicts)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CleaningPreviewResponse(
        project_id=project_id,
        results=[CleaningPreviewResult(**r) for r in raw_results]
    )


@router.post("/{project_id}/cleaning/apply", response_model=CleaningApplyResponse)
def apply_cleaning_recommendations(
    project_id: int,
    request: CleaningApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_mutable_project(project_id, db, current_user)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    query = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id,
        CleaningRecommendation.status == CleaningStatus.approved
    )
    if request.recommendation_ids:
        query = query.filter(
            CleaningRecommendation.id.in_(request.recommendation_ids)
        )
    recs = query.all()
    if not recs:
        raise HTTPException(
            status_code=400,
            detail="No approved recommendations to apply"
        )

    is_postgres = connection.connection_type == ConnectionType.postgresql

    if not is_postgres and not sandbox_exists(project_id):
        raise HTTPException(
            status_code=400,
            detail="Initialize the sandbox before applying changes"
        )

    connector = None
    if is_postgres:
        connector = PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )

    results = []
    try:
        for rec in recs:
            try:
                if rec.operation != "flag_nulls":
                    if is_postgres:
                        connector.execute_write(rec.sql_hint)
                    else:
                        run_query_in_sandbox(project_id, rec.sandbox_sql or rec.sql_hint)
                rec.applied = True
                rec.applied_at = func.now()
                rec.execution_error = None
                results.append(CleaningApplyResult(
                    recommendation_id=rec.id, success=True, error=None
                ))
            except Exception as e:
                rec.execution_error = str(e)
                results.append(CleaningApplyResult(
                    recommendation_id=rec.id, success=False, error=str(e)
                ))
        db.commit()
    finally:
        if connector and hasattr(connector, 'dispose'):
            connector.dispose()

    applied_count = sum(1 for r in results if r.success)
    return CleaningApplyResponse(
        project_id=project_id,
        results=results,
        applied_count=applied_count,
        failed_count=len(results) - applied_count
    )

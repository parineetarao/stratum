from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.profiling import ProfilingRun, ColumnProfile
from app.models.cleaning import CleaningRecommendation, CleaningStatus
from app.schemas.quality import QualityReportResponse, QualityIssue
from app.schemas.cleaning import (
    CleaningRecommendationResponse,
    CleaningDecision,
    CleaningListResponse
)
from app.api.deps import get_current_user
from app.engine.quality_scorer import score_profile
from app.engine.cleaning_engine import generate_cleaning_recommendations

router = APIRouter(prefix="/projects", tags=["Quality"])


def load_profiling_tables(run_id: int, db: Session) -> List[dict]:
    col_profiles = db.query(ColumnProfile).filter(
        ColumnProfile.run_id == run_id
    ).all()

    tables_dict = {}
    for cp in col_profiles:
        if cp.table_name not in tables_dict:
            tables_dict[cp.table_name] = {
                "table_name": cp.table_name,
                "row_count": cp.row_count,
                "duplicate_count": cp.duplicate_count,
                "duplicate_percentage": cp.duplicate_percentage,
                "columns": []
            }
        tables_dict[cp.table_name]["columns"].append({
            "column_name": cp.column_name,
            "declared_type": cp.declared_type or "",
            "null_percentage": cp.null_percentage,
            "null_count": cp.null_count,
            "unique_count": cp.unique_count,
            "uniqueness_ratio": cp.uniqueness_ratio,
            "total_count": cp.row_count,
            "suspected_type_mismatch": cp.suspected_type_mismatch,
            "numeric_stats": cp.numeric_stats,
            "top_values": cp.top_values or []
        })

    return list(tables_dict.values())


@router.post("/{project_id}/quality-report", response_model=QualityReportResponse)
def generate_quality_report(
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

    run = db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).order_by(ProfilingRun.created_at.desc()).first()
    if not run:
        raise HTTPException(
            status_code=400,
            detail="Run profiling first before generating a quality report"
        )

    tables = load_profiling_tables(run.id, db)
    report = score_profile(tables)

    db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id
    ).delete()

    recommendations = generate_cleaning_recommendations(
        tables, report["issues"]
    )
    for rec in recommendations:
        db_rec = CleaningRecommendation(
            project_id=project_id,
            operation=rec["operation"],
            table_name=rec["table"],
            column_name=rec.get("column"),
            reason=rec.get("reason"),
            expected_impact=rec.get("expected_impact"),
            confidence=rec.get("confidence"),
            sql_hint=rec.get("sql_hint")
        )
        db.add(db_rec)
    db.commit()

    return QualityReportResponse(
        project_id=project_id,
        run_id=run.id,
        overall_score=report["overall_score"],
        completeness_score=report["completeness_score"],
        uniqueness_score=report["uniqueness_score"],
        consistency_score=report["consistency_score"],
        total_issues=report["total_issues"],
        critical_issues=report["critical_issues"],
        warning_issues=report["warning_issues"],
        issues=[QualityIssue(**i) for i in report["issues"]]
    )


@router.get("/{project_id}/quality-report", response_model=QualityReportResponse)
def get_quality_report(
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

    run = db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).order_by(ProfilingRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No profiling run found")

    tables = load_profiling_tables(run.id, db)
    report = score_profile(tables)

    return QualityReportResponse(
        project_id=project_id,
        run_id=run.id,
        overall_score=report["overall_score"],
        completeness_score=report["completeness_score"],
        uniqueness_score=report["uniqueness_score"],
        consistency_score=report["consistency_score"],
        total_issues=report["total_issues"],
        critical_issues=report["critical_issues"],
        warning_issues=report["warning_issues"],
        issues=[QualityIssue(**i) for i in report["issues"]]
    )


@router.get("/{project_id}/cleaning-recommendations",
            response_model=CleaningListResponse)
def get_cleaning_recommendations(
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

    recs = db.query(CleaningRecommendation).filter(
        CleaningRecommendation.project_id == project_id
    ).all()

    if not recs:
        raise HTTPException(
            status_code=404,
            detail="No cleaning recommendations found. Generate quality report first."
        )

    return CleaningListResponse(
        project_id=project_id,
        total=len(recs),
        pending=sum(1 for r in recs if r.status == CleaningStatus.pending),
        approved=sum(1 for r in recs if r.status == CleaningStatus.approved),
        rejected=sum(1 for r in recs if r.status == CleaningStatus.rejected),
        recommendations=recs
    )


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
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
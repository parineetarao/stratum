from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.kpi import KPI
from app.models.insight_report import InsightReport
from app.schemas.insights import InsightsResponse, InsightFinding
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.ai.insight_generator import generate_insights
from app.engine.chart_selector import format_value

router = APIRouter(prefix="/projects", tags=["Insights"])


def _get_owned_project(db: Session, project_id: int, user: Optional[User]) -> Project:
    return get_project_for_access(project_id, db, user.id if user else None)


def _report_to_response(report: InsightReport) -> InsightsResponse:
    findings = [
        InsightFinding(
            title=f.get("title", ""),
            observation=f.get("observation", ""),
            action=f.get("action", ""),
            sentiment=f.get("sentiment", "warning")
        )
        for f in (report.findings or [])
    ]
    return InsightsResponse(
        project_id=report.project_id,
        domain=report.domain or "",
        success=report.success,
        executive_summary=report.executive_summary or "",
        findings=findings,
        critical_risk_or_opportunity=report.critical_risk_or_opportunity,
        kpis_analyzed=report.kpis_analyzed or 0,
        generated_at=report.created_at.isoformat() if report.created_at else None
    )


@router.post("/{project_id}/insights", response_model=InsightsResponse)
def generate_executive_insights(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates AI executive insights from approved KPI values via the
    backend-only Groq client, then persists the result as the single
    project-level report shared by the Dashboard panel and the
    standalone Insights page.
    """
    project = _get_owned_project(db, project_id, current_user)
    ensure_project_is_mutable(project)

    approved_kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == True
    ).all()

    if not approved_kpis:
        raise HTTPException(
            status_code=400,
            detail="No approved KPIs found. Approve KPIs before generating insights."
        )

    domain = project.domain
    domain_str = domain.value if hasattr(domain, 'value') else str(domain)

    kpi_data = [
        {
            "name": k.name,
            "computed_value": k.computed_value,
            "unit": k.unit or "",
            "formatted_value": format_value(k.computed_value, k.unit or "")
        }
        for k in approved_kpis
    ]

    result = generate_insights(
        domain=domain_str,
        kpis=kpi_data
    )

    report = InsightReport(
        project_id=project_id,
        domain=domain_str,
        success=result["success"],
        executive_summary=result["executive_summary"],
        findings=result.get("findings", []),
        critical_risk_or_opportunity=result.get("critical_risk_or_opportunity"),
        kpis_analyzed=len(approved_kpis)
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return _report_to_response(report)


@router.get("/{project_id}/insights/latest", response_model=InsightsResponse)
def get_latest_insights(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns the most recently generated, persisted insight report for
    this project — the same report the Dashboard panel and the
    standalone Insights page both read, so neither triggers its own
    separate Groq call just to display what was already generated.
    """
    _get_owned_project(db, project_id, current_user)

    report = db.query(InsightReport).filter(
        InsightReport.project_id == project_id
    ).order_by(InsightReport.created_at.desc()).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="No insights have been generated for this project yet."
        )

    return _report_to_response(report)
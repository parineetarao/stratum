from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.kpi import KPI
from app.schemas.insights import InsightsResponse, InsightFinding
from app.api.deps import get_current_user
from app.ai.insight_generator import generate_insights
from app.engine.chart_selector import format_value

router = APIRouter(prefix="/projects", tags=["Insights"])


@router.post("/{project_id}/insights", response_model=InsightsResponse)
def generate_executive_insights(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates AI executive insights from approved KPI values.
    Makes one structured Groq API call and returns parsed insights.
    Results are not stored — regenerated on each call.
    The user can click Regenerate to get fresh insights at any time.
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

    findings = [
        InsightFinding(
            title=f.get("title", ""),
            observation=f.get("observation", ""),
            action=f.get("action", "")
        )
        for f in result.get("findings", [])
    ]

    return InsightsResponse(
        project_id=project_id,
        domain=domain_str,
        success=result["success"],
        executive_summary=result["executive_summary"],
        findings=findings,
        critical_risk_or_opportunity=result.get("critical_risk_or_opportunity"),
        kpis_analyzed=len(approved_kpis)
    )
"""
Public demo discovery.

The single project flagged Project.is_demo=True is Stratum's public,
read-only demo — this route lets the landing page find its id without
authentication and without the frontend hardcoding a numeric id that
differs between local/deployed environments. Response is deliberately
limited to routing information only: no owner, no connection, no
credentials.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.project import Project, DomainEnum

router = APIRouter(tags=["Public Demo"])


class PublicDemoProjectResponse(BaseModel):
    id: int
    name: str
    domain: Optional[DomainEnum] = None


@router.get("/demo", response_model=PublicDemoProjectResponse)
def get_public_demo_project(db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.is_demo == True).first()
    if not project:
        raise HTTPException(status_code=404, detail="No public demo project is configured")
    return project

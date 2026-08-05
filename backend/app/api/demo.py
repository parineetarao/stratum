from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.project import Project
from app.demo.curated_queries import list_curated_queries

router = APIRouter(prefix="/demo", tags=["Demo"])


class DemoProjectResponse(BaseModel):
    project_id: int


class DemoQueryResponse(BaseModel):
    id: str
    title: str
    sql: str


@router.get("/project", response_model=DemoProjectResponse)
def get_demo_project(db: Session = Depends(get_db)):
    """
    Public, unauthenticated lookup for the single read-only demo project.
    Used by the landing page's "Explore Demo" CTA and the /demo redirect
    page to find where to send visitors.
    """
    project = db.query(Project).filter(Project.is_demo == True).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Demo is temporarily unavailable. Please check back soon."
        )
    return DemoProjectResponse(project_id=project.id)


@router.get("/queries", response_model=List[DemoQueryResponse])
def get_demo_queries():
    """
    Public list of curated demo SQL queries (id, title, SQL text) the demo
    SQL Workspace lets visitors run. Safe to expose - it's exactly the SQL
    that will execute, nothing more.
    """
    return list_curated_queries()

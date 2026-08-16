from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=ProjectResponse)
def create_project(
    request: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        domain=request.domain
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Eager-load the 1:1 connection so the frontend can render data-source
    # status straight from this list instead of firing one
    # GET /projects/{id}/connection request per project.
    return (
        db.query(Project)
        .options(joinedload(Project.connection))
        .filter(Project.user_id == current_user.id)
        .all()
    )

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    return get_project_for_access(project_id, db, current_user.id if current_user else None)

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    request: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    if request.name is not None:
        project.name = request.name
    if request.description is not None:
        project.description = request.description
    if request.domain is not None:
        project.domain = request.domain

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    db.delete(project)
    db.commit()
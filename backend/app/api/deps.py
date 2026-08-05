from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.project import Project

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Same as get_current_user but returns None instead of raising when no
    (or an invalid) token is supplied - lets anonymous requests reach
    read-only endpoints that allow public demo access.
    """
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()


def get_project_for_access(
    project_id: int,
    db: Session,
    user_id: Optional[int]
) -> Project:
    """
    Resolves a project for a read: the public demo project is readable by
    anyone (user_id may be None), any other project requires the caller to
    own it. Used by every module's project-scoped GET endpoint so anonymous
    demo browsing works without duplicating the demo-or-owner check per file.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.is_demo:
        return project
    if user_id is not None and project.user_id == user_id:
        return project
    raise HTTPException(status_code=404, detail="Project not found")


def ensure_project_is_mutable(project: Project) -> None:
    """
    Blocks write/recompute actions against the read-only public demo
    project. Must be called at the top of every mutating endpoint after
    the project has been resolved.
    """
    if project.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action is unavailable in the public demo. Create an account and project to use the full workflow."
        )
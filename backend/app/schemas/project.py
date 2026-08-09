from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.project import DomainEnum, AnalysisMode
from app.models.connection import ConnectionType


# Deliberately omits `connection_string`, which may contain embedded
# credentials — this is nested into the project list response, which the
# frontend uses to render data-source status without a per-project fetch.
class ProjectConnectionSummary(BaseModel):
    id: int
    connection_type: ConnectionType
    source_schema: Optional[str] = None
    original_filename: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    domain: Optional[DomainEnum] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[DomainEnum] = None
    analysis_mode: Optional[AnalysisMode] = None

class ProjectResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    domain: Optional[DomainEnum]
    analysis_mode: Optional[AnalysisMode]
    created_at: datetime
    updated_at: Optional[datetime]
    connection: Optional[ProjectConnectionSummary] = None

    class Config:
        from_attributes = True
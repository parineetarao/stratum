from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.project import DomainEnum, AnalysisMode

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

    class Config:
        from_attributes = True
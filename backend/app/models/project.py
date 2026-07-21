from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
import enum


class DomainEnum(str, enum.Enum):
    banking = "banking"
    finance = "finance"
    retail = "retail"
    healthcare = "healthcare"
    manufacturing = "manufacturing"
    logistics = "logistics"

class AnalysisMode(str, enum.Enum):
    source = "source"
    warehouse = "warehouse"

class Project(Base):
    __tablename__ = "projects"
    connection = relationship("Connection", back_populates="project", uselist=False)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    domain = Column(Enum(DomainEnum), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    analysis_mode = Column(
    Enum(AnalysisMode),
    default=AnalysisMode.source
)

    owner = relationship("User", back_populates="projects")


from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ConnectionType(str, enum.Enum):
    postgresql = "postgresql"
    csv = "csv"
    excel = "excel"


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"),
                        nullable=False, unique=True)
    connection_type = Column(Enum(ConnectionType), nullable=False)
    connection_string = Column(String, nullable=True)
    source_schema = Column(String, nullable=True, default="public")
    file_path = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="connection")
    files = relationship(
        "ConnectionFile",
        back_populates="connection",
        cascade="all, delete-orphan",
        order_by="ConnectionFile.id",
    )
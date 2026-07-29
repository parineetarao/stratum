from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from app.database import Base
import enum


class ActivityEventType(str, enum.Enum):
    connection_created = "connection_created"
    connection_updated = "connection_updated"
    file_uploaded = "file_uploaded"
    file_replaced = "file_replaced"
    test_succeeded = "test_succeeded"
    test_failed = "test_failed"
    metadata_discovered = "metadata_discovered"
    metadata_refreshed = "metadata_refreshed"
    schema_drift_detected = "schema_drift_detected"


class ActivityStatus(str, enum.Enum):
    success = "success"
    error = "error"
    info = "info"


class ConnectionActivity(Base):
    __tablename__ = "connection_activity"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    event_type = Column(Enum(ActivityEventType), nullable=False)
    status = Column(Enum(ActivityStatus), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def record_activity(
    db: Session,
    project_id: int,
    event_type: ActivityEventType,
    status: ActivityStatus,
    message: str,
) -> ConnectionActivity:
    entry = ConnectionActivity(
        project_id=project_id,
        event_type=event_type,
        status=status,
        message=message,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

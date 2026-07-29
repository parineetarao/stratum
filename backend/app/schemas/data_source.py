from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime
from app.models.connection import ConnectionType
from app.models.connection_activity import ActivityEventType, ActivityStatus

HealthStatus = Literal["healthy", "unhealthy", "unknown"]


class PostgresConnectionDetails(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    user: Optional[str] = None
    sslmode: Optional[str] = None
    source_schema: Optional[str] = None
    connection_method: str = "Direct Connection"


class PostgresServerInfo(BaseModel):
    server_version: Optional[str] = None
    encoding: Optional[str] = None
    collation: Optional[str] = None


class CsvFileDetails(BaseModel):
    original_filename: Optional[str] = None
    file_extension: Optional[str] = None
    file_size_bytes: Optional[int] = None
    encoding: Optional[str] = None
    delimiter: Optional[str] = None


class ConnectionHealth(BaseModel):
    status: HealthStatus
    message: str
    checked_at: datetime


class DataSourceStats(BaseModel):
    table_count: int
    total_columns: Optional[int] = None
    total_rows: Optional[int] = None
    size_bytes: Optional[int] = None
    last_sync_at: Optional[datetime] = None


class ActivityLogEntry(BaseModel):
    id: int
    event_type: ActivityEventType
    status: ActivityStatus
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class DataSourceDetailResponse(BaseModel):
    project_id: int
    connection_type: ConnectionType
    connected_at: datetime
    health: ConnectionHealth
    stats: DataSourceStats
    postgres: Optional[PostgresConnectionDetails] = None
    postgres_info: Optional[PostgresServerInfo] = None
    csv: Optional[CsvFileDetails] = None
    recent_activity: List[ActivityLogEntry] = []


class DataSourceTestResponse(BaseModel):
    health: ConnectionHealth

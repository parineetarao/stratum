from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.connection import ConnectionType


class PostgresConnectionRequest(BaseModel):
    connection_string: str
    source_schema: str = "public"


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    tables_found: Optional[int] = None
    schemas_available: Optional[list] = None


class ConnectionResponse(BaseModel):
    id: int
    project_id: int
    connection_type: ConnectionType
    connection_string: Optional[str] = None
    source_schema: Optional[str] = "public"
    original_filename: Optional[str] = None

    class Config:
        from_attributes = True


class ConnectionFileResponse(BaseModel):
    id: int
    connection_id: int
    original_filename: str
    file_type: str
    table_name: str
    encoding: Optional[str] = None
    delimiter: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True
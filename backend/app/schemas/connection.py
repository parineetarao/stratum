from pydantic import BaseModel
from typing import Optional
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
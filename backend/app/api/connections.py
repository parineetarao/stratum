from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.schemas.connection import (
    PostgresConnectionRequest,
    ConnectionTestResponse,
    ConnectionResponse
)
from app.api.deps import get_current_user
from app.connectors.postgres_connector import PostgresConnector
import shutil
import os

router = APIRouter(prefix="/projects", tags=["Connections"])

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_project_or_404(project_id: int, user_id: int, db: Session) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/{project_id}/test-connection",
             response_model=ConnectionTestResponse)
def test_postgres_connection(
    project_id: int,
    request: PostgresConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(project_id, current_user.id, db)
    try:
        connector = PostgresConnector(
            request.connection_string,
            source_schema=request.source_schema
        )
        connector.test_connection()
        tables = connector.get_tables()
        schemas = connector.get_available_schemas()
        connector.dispose()
        return ConnectionTestResponse(
            success=True,
            message="Connection successful",
            tables_found=len(tables),
            schemas_available=schemas
        )
    except Exception as e:
        return ConnectionTestResponse(
            success=False,
            message=str(e)
        )


@router.post("/{project_id}/connect/postgres",
             response_model=ConnectionResponse)
def connect_postgres(
    project_id: int,
    request: PostgresConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(project_id, current_user.id, db)

    try:
        connector = PostgresConnector(
            request.connection_string,
            source_schema=request.source_schema
        )
        connector.test_connection()
        connector.dispose()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Connection failed: {str(e)}"
        )

    existing = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()

    connection = Connection(
        project_id=project_id,
        connection_type=ConnectionType.postgresql,
        connection_string=request.connection_string,
        source_schema=request.source_schema
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection

@router.post("/{project_id}/connect/file", response_model=ConnectionResponse)
async def connect_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(project_id, current_user.id, db)

    filename = file.filename
    if not filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    project_upload_dir = os.path.join(UPLOAD_DIR, str(project_id))
    os.makedirs(project_upload_dir, exist_ok=True)
    file_path = os.path.join(project_upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extension = filename.split(".")[-1].lower()
    conn_type = ConnectionType.csv if extension == "csv" else ConnectionType.excel

    existing = db.query(Connection).filter(Connection.project_id == project_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    connection = Connection(
        project_id=project_id,
        connection_type=conn_type,
        file_path=file_path,
        original_filename=filename
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection

@router.get("/{project_id}/connection", response_model=ConnectionResponse)
def get_connection(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    get_project_or_404(project_id, current_user.id, db)
    connection = db.query(Connection).filter(Connection.project_id == project_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found for this project")
    return connection
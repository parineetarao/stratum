from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.schema_metadata import DiscoveredTable
from app.models.schema_snapshot import SchemaSnapshot
from app.models.connection_activity import (
    ConnectionActivity, ActivityEventType, ActivityStatus, record_activity
)
from app.schemas.connection import (
    PostgresConnectionRequest,
    ConnectionTestResponse,
    ConnectionResponse,
    ConnectionFileResponse
)
from app.schemas.data_source import (
    DataSourceDetailResponse, DataSourceTestResponse, ConnectionHealth,
    DataSourceStats, PostgresConnectionDetails, PostgresServerInfo,
    CsvFileDetails, ActivityLogEntry
)
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.models.connection_file import ConnectionFile
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import detect_csv_dialect
from app.connectors.factory import build_connector
from app.core.connection_string import parse_postgres_connection_string
from app.core.naming import sanitize_filename, sanitize_table_name
from app.config import settings
from pathlib import Path
import shutil

router = APIRouter(prefix="/projects", tags=["Connections"])

UPLOAD_DIR = Path(settings.UPLOAD_DIR)

def get_project_or_404(project_id: int, user_id: int, db: Session) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_connection_or_404(project_id: int, db: Session) -> Connection:
    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="No connection found for this project"
        )
    return connection


def check_connection_health(connection: Connection) -> ConnectionHealth:
    """Live, best-effort connectivity check against the stored connection."""
    now = datetime.now(timezone.utc)
    try:
        if connection.connection_type == ConnectionType.postgresql:
            connector = PostgresConnector(
                connection.connection_string,
                source_schema=connection.source_schema or "public"
            )
            try:
                connector.test_connection()
            finally:
                connector.dispose()
            return ConnectionHealth(
                status="healthy",
                message="Your data source is accessible and responsive.",
                checked_at=now,
            )
        else:
            files = connection.files
            if files:
                missing = [f for f in files if not Path(f.stored_path).exists()]
                if missing:
                    return ConnectionHealth(
                        status="unhealthy",
                        message=f"{len(missing)} uploaded file(s) could not be found on disk.",
                        checked_at=now,
                    )
            elif not connection.file_path or not Path(connection.file_path).exists():
                return ConnectionHealth(
                    status="unhealthy",
                    message="The uploaded file could not be found on disk.",
                    checked_at=now,
                )
            build_connector(connection).test_connection()
            return ConnectionHealth(
                status="healthy",
                message="The uploaded file(s) are readable and valid.",
                checked_at=now,
            )
    except Exception as e:
        return ConnectionHealth(status="unhealthy", message=str(e), checked_at=now)

@router.post("/{project_id}/test-connection",
             response_model=ConnectionTestResponse)
def test_postgres_connection(
    project_id: int,
    request: PostgresConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)
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
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

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
    is_update = existing is not None
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

    parsed = parse_postgres_connection_string(request.connection_string)
    record_activity(
        db, project_id,
        ActivityEventType.connection_updated if is_update else ActivityEventType.connection_created,
        ActivityStatus.success,
        f"{'Reconnected to' if is_update else 'Connected to'} PostgreSQL database "
        f"'{parsed['database'] or 'unknown'}' on schema '{request.source_schema}'."
    )
    return connection

ALLOWED_FILE_EXTENSIONS = (".csv", ".xlsx", ".xls")


def _save_upload_to_disk(project_id: int, file: UploadFile) -> tuple[Path, str]:
    filename = sanitize_filename(file.filename or "")
    if not filename.lower().endswith(ALLOWED_FILE_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    project_upload_dir = UPLOAD_DIR / str(project_id)
    project_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = project_upload_dir / filename

    # Avoid clobbering an existing file on disk that belongs to a different
    # ConnectionFile row (e.g. re-uploading a file with the same name).
    if file_path.exists():
        stem, suffix = Path(filename).stem, Path(filename).suffix
        counter = 1
        while file_path.exists():
            file_path = project_upload_dir / f"{stem}_{counter}{suffix}"
            counter += 1

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path, filename


def _unique_table_name(db: Session, connection_id: int, base_name: str) -> str:
    existing_names = {
        row[0] for row in db.query(ConnectionFile.table_name).filter(
            ConnectionFile.connection_id == connection_id
        ).all()
    }
    if base_name not in existing_names:
        return base_name
    counter = 2
    while f"{base_name}_{counter}" in existing_names:
        counter += 1
    return f"{base_name}_{counter}"


@router.post("/{project_id}/connect/file", response_model=ConnectionResponse)
async def connect_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Backward-compatible single-file upload: replaces the entire data
    source (all previously uploaded files) with this one file. Used by the
    original single-CSV-project flow and the "replace dataset" dialog."""
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    file_path, filename = _save_upload_to_disk(project_id, file)
    extension = filename.split(".")[-1].lower()
    conn_type = ConnectionType.csv if extension == "csv" else ConnectionType.excel

    existing = db.query(Connection).filter(Connection.project_id == project_id).first()
    is_replace = existing is not None
    if existing:
        db.delete(existing)
        db.commit()

    connection = Connection(
        project_id=project_id,
        connection_type=conn_type,
        file_path=str(file_path),
        original_filename=filename
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    dialect = detect_csv_dialect(str(file_path)) if extension == "csv" else {"encoding": None, "delimiter": None}
    table_name = sanitize_table_name(filename)
    db.add(ConnectionFile(
        connection_id=connection.id,
        original_filename=filename,
        stored_path=str(file_path),
        file_type=conn_type.value,
        table_name=table_name,
        encoding=dialect["encoding"],
        delimiter=dialect["delimiter"],
    ))
    db.commit()

    record_activity(
        db, project_id,
        ActivityEventType.file_replaced if is_replace else ActivityEventType.file_uploaded,
        ActivityStatus.success,
        f"{'Replaced dataset with' if is_replace else 'Uploaded'} '{filename}'."
    )
    return connection


@router.post("/{project_id}/connect/files", response_model=List[ConnectionFileResponse])
async def connect_files(
    project_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add one or more files to the project's file-based data source. Unlike
    /connect/file, this is additive: existing uploaded files are kept, and
    each new file becomes its own logical table. Can be called repeatedly to
    add more files over time."""
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    connection = db.query(Connection).filter(Connection.project_id == project_id).first()
    if connection and connection.connection_type == ConnectionType.postgresql:
        raise HTTPException(
            status_code=400,
            detail="This project is connected to a PostgreSQL database; remove that connection before uploading files."
        )

    is_new_connection = connection is None
    if is_new_connection:
        connection = Connection(project_id=project_id, connection_type=ConnectionType.csv)
        db.add(connection)
        db.commit()
        db.refresh(connection)

    created: List[ConnectionFile] = []
    for file in files:
        file_path, filename = _save_upload_to_disk(project_id, file)
        extension = filename.split(".")[-1].lower()
        file_type = "csv" if extension == "csv" else "excel"
        dialect = detect_csv_dialect(str(file_path)) if extension == "csv" else {"encoding": None, "delimiter": None}

        base_table_name = sanitize_table_name(filename)
        table_name = _unique_table_name(db, connection.id, base_table_name)

        connection_file = ConnectionFile(
            connection_id=connection.id,
            original_filename=filename,
            stored_path=str(file_path),
            file_type=file_type,
            table_name=table_name,
            encoding=dialect["encoding"],
            delimiter=dialect["delimiter"],
        )
        db.add(connection_file)
        db.commit()
        db.refresh(connection_file)
        created.append(connection_file)

        record_activity(
            db, project_id,
            ActivityEventType.connection_created if is_new_connection else ActivityEventType.file_uploaded,
            ActivityStatus.success,
            f"Uploaded '{filename}' as table '{table_name}'."
        )
        is_new_connection = False

    # Keep legacy single-file fields pointing at the most recent upload so
    # older code paths that read connection.file_path still see something sane.
    connection.original_filename = created[-1].original_filename
    connection.file_path = created[-1].stored_path
    db.commit()

    return created


@router.get("/{project_id}/connection/files", response_model=List[ConnectionFileResponse])
def list_connection_files(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)
    connection = get_connection_or_404(project_id, db)
    return connection.files


@router.delete("/{project_id}/connection/files/{file_id}", status_code=204)
def delete_connection_file(
    project_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)
    connection = get_connection_or_404(project_id, db)

    connection_file = db.query(ConnectionFile).filter(
        ConnectionFile.id == file_id,
        ConnectionFile.connection_id == connection.id
    ).first()
    if not connection_file:
        raise HTTPException(status_code=404, detail="File not found on this connection")

    stored_path = Path(connection_file.stored_path)
    filename = connection_file.original_filename
    db.delete(connection_file)
    db.commit()

    if stored_path.exists():
        try:
            stored_path.unlink()
        except OSError:
            pass

    record_activity(
        db, project_id,
        ActivityEventType.file_replaced,
        ActivityStatus.success,
        f"Removed '{filename}' from the data source."
    )
    return None

@router.get("/{project_id}/connection", response_model=ConnectionResponse)
def get_connection(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)
    connection = db.query(Connection).filter(Connection.project_id == project_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found for this project")
    return connection


@router.get("/{project_id}/data-source", response_model=DataSourceDetailResponse)
def get_data_source_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)
    connection = get_connection_or_404(project_id, db)

    health = check_connection_health(connection)

    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()
    latest_snapshot = db.query(SchemaSnapshot).filter(
        SchemaSnapshot.project_id == project_id
    ).order_by(SchemaSnapshot.created_at.desc()).first()

    total_rows = sum(t.row_count or 0 for t in tables) if tables else None
    total_columns = sum(t.column_count or 0 for t in tables) if tables else None

    postgres_details = None
    postgres_info = None
    csv_details = None
    size_bytes = None

    if connection.connection_type == ConnectionType.postgresql:
        parsed = parse_postgres_connection_string(connection.connection_string)
        postgres_details = PostgresConnectionDetails(
            host=parsed["host"],
            port=parsed["port"],
            database=parsed["database"],
            user=parsed["user"],
            sslmode=parsed["sslmode"],
            source_schema=connection.source_schema,
        )
        if health.status == "healthy":
            try:
                connector = PostgresConnector(
                    connection.connection_string,
                    source_schema=connection.source_schema or "public"
                )
                try:
                    info = connector.get_server_info()
                finally:
                    connector.dispose()
                postgres_info = PostgresServerInfo(
                    server_version=info["server_version"],
                    encoding=info["encoding"],
                    collation=info["collation"],
                )
                size_bytes = info["database_size_bytes"]
            except Exception:
                pass
    else:
        dialect = detect_csv_dialect(connection.file_path) if connection.file_path else {
            "encoding": None, "delimiter": None
        }
        file_size = None
        if connection.file_path and Path(connection.file_path).exists():
            file_size = Path(connection.file_path).stat().st_size
        extension = (
            connection.original_filename.split(".")[-1].lower()
            if connection.original_filename and "." in connection.original_filename
            else None
        )
        csv_details = CsvFileDetails(
            original_filename=connection.original_filename,
            file_extension=extension,
            file_size_bytes=file_size,
            encoding=dialect["encoding"],
            delimiter=dialect["delimiter"],
        )
        size_bytes = file_size

    recent_activity = db.query(ConnectionActivity).filter(
        ConnectionActivity.project_id == project_id
    ).order_by(ConnectionActivity.created_at.desc()).limit(8).all()

    return DataSourceDetailResponse(
        project_id=project_id,
        connection_type=connection.connection_type,
        connected_at=connection.created_at,
        health=health,
        stats=DataSourceStats(
            table_count=len(tables),
            total_columns=total_columns,
            total_rows=total_rows,
            size_bytes=size_bytes,
            last_sync_at=latest_snapshot.created_at if latest_snapshot else None,
        ),
        postgres=postgres_details,
        postgres_info=postgres_info,
        csv=csv_details,
        recent_activity=[ActivityLogEntry.model_validate(a) for a in recent_activity],
    )


@router.post("/{project_id}/data-source/test-connection", response_model=DataSourceTestResponse)
def test_stored_connection(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)
    connection = get_connection_or_404(project_id, db)

    health = check_connection_health(connection)
    record_activity(
        db, project_id,
        ActivityEventType.test_succeeded if health.status == "healthy" else ActivityEventType.test_failed,
        ActivityStatus.success if health.status == "healthy" else ActivityStatus.error,
        health.message,
    )
    return DataSourceTestResponse(health=health)


@router.get("/{project_id}/data-source/activity", response_model=List[ActivityLogEntry])
def get_data_source_activity(
    project_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)
    entries = db.query(ConnectionActivity).filter(
        ConnectionActivity.project_id == project_id
    ).order_by(ConnectionActivity.created_at.desc()).limit(min(limit, 200)).all()
    return [ActivityLogEntry.model_validate(e) for e in entries]
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.models.schema_snapshot import SchemaSnapshot
from app.models.warehouse import WarehouseDesign
from app.models.kpi import KPI
from app.models.connection_activity import ActivityEventType, ActivityStatus, record_activity
from app.schemas.metadata import SchemaResponse, TableMetadata, ColumnMetadata, ForeignKeyInfo
from app.schemas.drift import SchemaDriftResponse, DriftChange, AffectedObject
from app.schemas.metadata_catalog import (
    CatalogOverview, SchemaSummary, CatalogTableSummary,
    TableDetailResponse, IndexInfo, ConstraintInfo
)
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.metadata_discovery import discover_schema
from app.engine.schema_drift import compute_drift, identify_affected_objects
from app.engine.metadata_catalog import build_ddl
from datetime import datetime
from typing import List, Dict
import os

router = APIRouter(prefix="/projects", tags=["Metadata"])
logger = logging.getLogger("stratum.metadata")


def _connection_source_type(connection: Connection) -> str:
    return getattr(connection.connection_type, "value", str(connection.connection_type))


def _connection_target_description(connection: Connection) -> str:
    """Non-secret description of what the connector points at, safe to log."""
    if connection.connection_type in (ConnectionType.csv, ConnectionType.excel):
        return f"file_path={connection.file_path}"
    return f"source_schema={connection.source_schema or 'public'}"


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )
    elif connection.connection_type in (ConnectionType.csv, ConnectionType.excel):
        return CSVConnector(connection.file_path)
    else:
        raise ValueError(f"Unsupported connection type: {connection.connection_type}")


def get_project_and_connection(project_id: int, user_id: Optional[int], db: Session):
    project = get_project_for_access(project_id, db, user_id)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="No connection found. Connect a database first."
        )
    return project, connection

def schema_to_snapshot_format(schema) -> List[Dict]:
    result = []
    for table in schema.get("tables", []):
        result.append({
            "table_name": table["table_name"],
            "row_count": table["row_count"],
            "columns": [
                {
                    "name": col["name"],
                    "type": col["type"],
                    "nullable": col["nullable"],
                    "is_primary_key": col["is_primary_key"]
                }
                for col in table["columns"]
            ]
        })
    return result


@router.post("/{project_id}/discover", response_model=SchemaResponse)
def discover_metadata(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project, connection = get_project_and_connection(
        project_id, current_user.id, db
    )
    ensure_project_is_mutable(project)
    connector = get_connector(connection)

    try:
        schema = discover_schema(connector)
    except Exception as e:
        logger.exception(
            "Metadata discovery failed: project_id=%s source_type=%s %s",
            project_id,
            _connection_source_type(connection),
            _connection_target_description(connection),
        )
        raise HTTPException(
            status_code=500, detail=f"Metadata discovery failed: {str(e)}"
        )
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    try:
        tables_to_delete = db.query(DiscoveredTable).filter(
            DiscoveredTable.project_id == project_id
        ).all()
        for table in tables_to_delete:
            db.query(DiscoveredColumn).filter(
                DiscoveredColumn.table_id == table.id
            ).delete()
        db.query(DiscoveredTable).filter(
            DiscoveredTable.project_id == project_id
        ).delete()
        db.commit()

        for table_data in schema["tables"]:
            db_table = DiscoveredTable(
                project_id=project_id,
                table_name=table_data["table_name"],
                row_count=table_data["row_count"],
                column_count=table_data["column_count"],
                primary_keys=table_data["primary_keys"],
                foreign_keys=table_data["foreign_keys"]
            )
            db.add(db_table)
            db.flush()

            for col_data in table_data["columns"]:
                db_col = DiscoveredColumn(
                    project_id=project_id,
                    table_id=db_table.id,
                    table_name=table_data["table_name"],
                    column_name=col_data["name"],
                    data_type=col_data["type"],
                    is_nullable=col_data["nullable"],
                    is_primary_key=col_data["is_primary_key"],
                    foreign_key_info=col_data["foreign_key"]
                )
                db.add(db_col)

        db.commit()

        current_snapshot_data = schema_to_snapshot_format(schema)
        new_snapshot = SchemaSnapshot(
            project_id=project_id,
            snapshot=current_snapshot_data
        )
        db.add(new_snapshot)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception(
            "Persisting discovered metadata failed: project_id=%s source_type=%s %s",
            project_id,
            _connection_source_type(connection),
            _connection_target_description(connection),
        )
        raise HTTPException(
            status_code=500, detail=f"Metadata discovery failed: {str(e)}"
        )

    record_activity(
        db, project_id,
        ActivityEventType.metadata_discovered,
        ActivityStatus.success,
        f"Discovered {schema['table_count']} table(s)."
    )

    return SchemaResponse(
        project_id=project_id,
        table_count=schema["table_count"],
        tables=[
            TableMetadata(
                table_name=t["table_name"],
                row_count=t["row_count"],
                column_count=t["column_count"],
                columns=[
                    ColumnMetadata(
                        name=c["name"],
                        type=c["type"],
                        nullable=c["nullable"],
                        is_primary_key=c["is_primary_key"],
                        foreign_key=ForeignKeyInfo(**c["foreign_key"])
                        if c["foreign_key"] else None
                    )
                    for c in t["columns"]
                ],
                primary_keys=t["primary_keys"],
                foreign_keys=t["foreign_keys"]
            )
            for t in schema["tables"]
        ]
    )


@router.post("/{project_id}/refresh-schema",
             response_model=SchemaDriftResponse)
def refresh_schema_with_drift(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-runs metadata discovery and compares against the last snapshot.
    Returns a drift report showing what changed and what is affected.
    Only available after at least one previous discovery run.
    """
    project, connection = get_project_and_connection(
        project_id, current_user.id, db
    )
    ensure_project_is_mutable(project)

    snapshots = db.query(SchemaSnapshot).filter(
        SchemaSnapshot.project_id == project_id
    ).order_by(SchemaSnapshot.created_at.desc()).all()

    if len(snapshots) < 1:
        raise HTTPException(
            status_code=400,
            detail="Run metadata discovery first before checking for drift."
        )

    previous_snapshot = snapshots[0].snapshot
    previous_snapshot_time = snapshots[0].created_at.isoformat()

    connector = get_connector(connection)
    try:
        schema = discover_schema(connector)
    except Exception as e:
        logger.exception(
            "Metadata discovery (refresh-schema) failed: project_id=%s source_type=%s %s",
            project_id,
            _connection_source_type(connection),
            _connection_target_description(connection),
        )
        raise HTTPException(
            status_code=500, detail=f"Metadata discovery failed: {str(e)}"
        )
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    current_snapshot_data = schema_to_snapshot_format(schema)

    drift = compute_drift(previous_snapshot, current_snapshot_data)

    warehouse_design = None
    design = db.query(WarehouseDesign).filter(
        WarehouseDesign.project_id == project_id
    ).first()
    if design:
        warehouse_design = {
            "fact_tables": design.fact_tables or [],
            "dimension_tables": design.dimension_tables or []
        }

    approved_kpis = db.query(KPI).filter(
        KPI.project_id == project_id,
        KPI.is_approved == True
    ).all()
    kpi_list = [
        {"name": k.name, "sql": k.sql}
        for k in approved_kpis
    ]

    affected = identify_affected_objects(drift, warehouse_design, kpi_list)

    if drift["has_changes"]:
        new_snapshot = SchemaSnapshot(
            project_id=project_id,
            snapshot=current_snapshot_data
        )
        db.add(new_snapshot)

        tables_to_delete = db.query(DiscoveredTable).filter(
            DiscoveredTable.project_id == project_id
        ).all()
        for table in tables_to_delete:
            db.query(DiscoveredColumn).filter(
                DiscoveredColumn.table_id == table.id
            ).delete()
        db.query(DiscoveredTable).filter(
            DiscoveredTable.project_id == project_id
        ).delete()
        db.commit()

        for table_data in schema["tables"]:
            db_table = DiscoveredTable(
                project_id=project_id,
                table_name=table_data["table_name"],
                row_count=table_data["row_count"],
                column_count=table_data["column_count"],
                primary_keys=table_data["primary_keys"],
                foreign_keys=table_data["foreign_keys"]
            )
            db.add(db_table)
            db.flush()

            for col_data in table_data["columns"]:
                db_col = DiscoveredColumn(
                    project_id=project_id,
                    table_id=db_table.id,
                    table_name=table_data["table_name"],
                    column_name=col_data["name"],
                    data_type=col_data["type"],
                    is_nullable=col_data["nullable"],
                    is_primary_key=col_data["is_primary_key"],
                    foreign_key_info=col_data["foreign_key"]
                )
                db.add(db_col)

        db.commit()

    recommendation = "No changes detected. Schema is stable."
    if drift["has_changes"]:
        if drift["deleted_tables"] or drift["deleted_columns"]:
            recommendation = (
                "Critical changes detected. Review affected KPIs and "
                "warehouse tables and regenerate where necessary."
            )
        elif drift["modified_columns"]:
            recommendation = (
                "Column modifications detected. Verify KPI SQL is still "
                "valid for modified columns."
            )
        else:
            recommendation = (
                "New tables or columns detected. Consider regenerating "
                "warehouse design to include new data."
            )

    record_activity(
        db, project_id,
        ActivityEventType.schema_drift_detected if drift["has_changes"] else ActivityEventType.metadata_refreshed,
        ActivityStatus.success,
        f"Refreshed metadata — {drift['total_changes']} change(s) detected."
        if drift["has_changes"] else "Refreshed metadata. No changes detected."
    )

    def to_drift_changes(items: List[Dict]) -> List[DriftChange]:
        return [
            DriftChange(
                table_name=item["table_name"],
                column_name=item.get("column_name"),
                severity=item["severity"],
                message=item["message"],
                old_type=item.get("old_type"),
                new_type=item.get("new_type"),
                changes=item.get("changes")
            )
            for item in items
        ]

    def to_affected_objects(items: List[Dict]) -> List[AffectedObject]:
        return [
            AffectedObject(
                warehouse_table=item.get("warehouse_table"),
                kpi_name=item.get("kpi_name"),
                source_table=item.get("source_table"),
                reason=item["reason"],
                severity=item["severity"]
            )
            for item in items
        ]

    return SchemaDriftResponse(
        project_id=project_id,
        has_changes=drift["has_changes"],
        total_changes=drift["total_changes"],
        snapshot_compared_at=previous_snapshot_time,
        current_snapshot_at=datetime.utcnow().isoformat(),
        added_tables=to_drift_changes(drift["added_tables"]),
        deleted_tables=to_drift_changes(drift["deleted_tables"]),
        added_columns=to_drift_changes(drift["added_columns"]),
        deleted_columns=to_drift_changes(drift["deleted_columns"]),
        modified_columns=to_drift_changes(drift["modified_columns"]),
        affected_warehouse_tables=to_affected_objects(
            affected["affected_warehouse_tables"]
        ),
        affected_kpis=to_affected_objects(affected["affected_kpis"]),
        total_affected_objects=affected["total_affected"],
        recommendation=recommendation
    )


@router.get("/{project_id}/schema", response_model=SchemaResponse)
def get_schema(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)

    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()

    if not tables:
        raise HTTPException(
            status_code=404,
            detail="No schema discovered yet. Run discovery first."
        )

    result = []
    for table in tables:
        columns = db.query(DiscoveredColumn).filter(
            DiscoveredColumn.table_id == table.id
        ).all()

        result.append(TableMetadata(
            table_name=table.table_name,
            row_count=table.row_count or 0,
            column_count=table.column_count or 0,
            columns=[
                ColumnMetadata(
                    name=col.column_name,
                    type=col.data_type,
                    nullable=col.is_nullable,
                    is_primary_key=col.is_primary_key,
                    foreign_key=ForeignKeyInfo(**col.foreign_key_info)
                    if col.foreign_key_info else None
                )
                for col in columns
            ],
            primary_keys=table.primary_keys or [],
            foreign_keys=table.foreign_keys or []
        ))

    return SchemaResponse(
        project_id=project_id,
        table_count=len(tables),
        tables=result
    )


@router.get("/{project_id}/catalog", response_model=CatalogOverview)
def get_metadata_catalog(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Normalized data-catalog overview (schemas + tables) for the Metadata
    page. Backed by persisted discovery results — run discovery first.
    """
    project, connection = get_project_and_connection(
        project_id, current_user.id if current_user else None, db
    )

    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).order_by(DiscoveredTable.table_name).all()

    if not tables:
        raise HTTPException(
            status_code=404,
            detail="No schema discovered yet. Run discovery first."
        )

    is_csv = connection.connection_type in (ConnectionType.csv, ConnectionType.excel)
    source_schema = "dataset" if is_csv else (connection.source_schema or "public")

    total_columns = sum(t.column_count or 0 for t in tables)
    total_rows = sum(t.row_count or 0 for t in tables)

    latest_snapshot = db.query(SchemaSnapshot).filter(
        SchemaSnapshot.project_id == project_id
    ).order_by(SchemaSnapshot.created_at.desc()).first()

    schemas = [SchemaSummary(name=source_schema, table_count=len(tables), is_source_schema=True)]

    if not is_csv:
        try:
            connector = PostgresConnector(
                connection.connection_string,
                source_schema=connection.source_schema or "public"
            )
            try:
                available = connector.get_available_schemas()
                for schema_name in available:
                    if schema_name == source_schema:
                        continue
                    try:
                        count = len(connector.get_tables_for_schema(schema_name))
                    except Exception:
                        logger.exception(
                            "Failed to count tables for secondary schema: "
                            "project_id=%s source_type=%s schema_name=%s",
                            project_id, _connection_source_type(connection), schema_name,
                        )
                        count = None
                    schemas.append(SchemaSummary(
                        name=schema_name,
                        table_count=count or 0,
                        is_source_schema=False,
                    ))
            finally:
                connector.dispose()
        except Exception:
            logger.exception(
                "Failed to enumerate secondary schemas for catalog overview: "
                "project_id=%s source_type=%s",
                project_id, _connection_source_type(connection),
            )

    table_summaries = [
        CatalogTableSummary(
            table_name=t.table_name,
            schema_name=source_schema,
            row_count=t.row_count or 0,
            column_count=t.column_count or 0,
            last_updated=t.created_at,
        )
        for t in tables
    ]

    return CatalogOverview(
        project_id=project_id,
        source_type=connection.connection_type,
        source_schema=source_schema,
        schema_count=len(schemas),
        table_count=len(tables),
        column_count=total_columns,
        total_rows_approx=total_rows,
        schemas=schemas,
        tables=table_summaries,
        last_refreshed_at=latest_snapshot.created_at if latest_snapshot else None,
    )


@router.get("/{project_id}/catalog/tables/{table_name}", response_model=TableDetailResponse)
def get_catalog_table_detail(
    project_id: int,
    table_name: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Full detail for a single table: columns (persisted), plus best-effort
    live indexes/constraints/sample rows/size/DDL from the source connector.
    """
    project, connection = get_project_and_connection(
        project_id, current_user.id if current_user else None, db
    )

    db_table = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id,
        DiscoveredTable.table_name == table_name,
    ).first()
    if not db_table:
        raise HTTPException(
            status_code=404,
            detail="Table not found. Run discovery first."
        )

    db_columns = db.query(DiscoveredColumn).filter(
        DiscoveredColumn.table_id == db_table.id
    ).all()

    is_csv = connection.connection_type in (ConnectionType.csv, ConnectionType.excel)
    schema_name = "dataset" if is_csv else (connection.source_schema or "public")

    column_metas = [
        ColumnMetadata(
            name=c.column_name,
            type=c.data_type,
            nullable=c.is_nullable,
            is_primary_key=c.is_primary_key,
            foreign_key=ForeignKeyInfo(**c.foreign_key_info) if c.foreign_key_info else None,
        )
        for c in db_columns
    ]

    indexes: List[IndexInfo] = []
    constraints: List[ConstraintInfo] = []
    sample_data: List[Dict] = []
    data_size_bytes = None
    last_analyzed_at = None

    connector = get_connector(connection)
    try:
        indexes = [IndexInfo(**i) for i in connector.get_indexes(table_name)]
        constraints = [ConstraintInfo(**c) for c in connector.get_constraints(table_name)]
        sample_data = connector.get_sample_rows(table_name, limit=5)
        if isinstance(connector, PostgresConnector):
            data_size_bytes = connector.get_table_size_bytes(table_name)
            last_analyzed_at = connector.get_last_analyzed(table_name)
        elif connection.file_path and os.path.exists(connection.file_path):
            data_size_bytes = os.path.getsize(connection.file_path)
    except Exception:
        logger.exception(
            "Failed to load live table detail: project_id=%s source_type=%s "
            "table_name=%s %s",
            project_id, _connection_source_type(connection), table_name,
            _connection_target_description(connection),
        )
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    ddl = build_ddl(
        table_name=table_name,
        columns=[
            {"name": c.column_name, "type": c.data_type, "nullable": c.is_nullable}
            for c in db_columns
        ],
        primary_keys=db_table.primary_keys or [],
        foreign_keys=db_table.foreign_keys or [],
    )

    return TableDetailResponse(
        table_name=table_name,
        schema_name=schema_name,
        row_count=db_table.row_count or 0,
        column_count=db_table.column_count or 0,
        columns=column_metas,
        data_size_bytes=data_size_bytes,
        primary_key=db_table.primary_keys or [],
        indexes=indexes,
        index_count=len(indexes),
        constraints=constraints,
        constraint_count=len(constraints),
        last_analyzed_at=last_analyzed_at,
        sample_data=sample_data,
        ddl=ddl,
    )
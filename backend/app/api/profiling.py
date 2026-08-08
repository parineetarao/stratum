from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.profiling import ProfilingRun, ColumnProfile
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.schemas.profiling import (
    ProfilingResponse, TableProfileResponse, ColumnProfileResponse,
    NumericStats, TopValue
)
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.factory import build_connector as get_connector
from app.engine.profiler import profile_database

router = APIRouter(prefix="/projects", tags=["Profiling"])


def build_schema_from_db(project_id: int, db: Session) -> List[dict]:
    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()

    schema = []
    for table in tables:
        columns = db.query(DiscoveredColumn).filter(
            DiscoveredColumn.table_id == table.id
        ).all()
        schema.append({
            "table_name": table.table_name,
            "columns": [
                {"name": col.column_name, "type": col.data_type}
                for col in columns
            ]
        })
    return schema


@router.post("/{project_id}/profile", response_model=ProfilingResponse)
def run_profiling(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    schema = build_schema_from_db(project_id, db)
    if not schema:
        raise HTTPException(
            status_code=400,
            detail="Run metadata discovery first"
        )

    connector = get_connector(connection)

    try:
        profiling_results = profile_database(connector, schema)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profiling failed: {str(e)}")
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    old_runs = db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).all()
    for old_run in old_runs:
        db.query(ColumnProfile).filter(
            ColumnProfile.run_id == old_run.id
        ).delete()
    db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).delete()
    db.commit()

    total_columns = sum(len(t["columns"]) for t in profiling_results)

    run = ProfilingRun(
        project_id=project_id,
        table_count=len(profiling_results),
        total_columns_profiled=total_columns
    )
    db.add(run)
    db.flush()

    for table_data in profiling_results:
        if "error" in table_data:
            continue
        for col_data in table_data["columns"]:
            col_profile = ColumnProfile(
                run_id=run.id,
                project_id=project_id,
                table_name=table_data["table_name"],
                column_name=col_data["column_name"],
                declared_type=col_data["declared_type"],
                row_count=col_data["total_count"],
                null_count=col_data["null_count"],
                null_percentage=col_data["null_percentage"],
                unique_count=col_data["unique_count"],
                uniqueness_ratio=col_data["uniqueness_ratio"],
                duplicate_count=table_data["duplicate_count"],
                duplicate_percentage=table_data["duplicate_percentage"],
                top_values=col_data["top_values"],
                numeric_stats=col_data["numeric_stats"],
                suspected_type_mismatch=col_data["suspected_type_mismatch"]
            )
            db.add(col_profile)

    db.commit()
    db.refresh(run)

    tables_response = []
    for table_data in profiling_results:
        if "error" in table_data:
            continue

        col_responses = []
        for col_data in table_data["columns"]:
            numeric_stats = None
            if col_data["numeric_stats"]:
                numeric_stats = NumericStats(**col_data["numeric_stats"])

            top_values = [
                TopValue(**tv) for tv in col_data["top_values"]
            ]

            col_responses.append(ColumnProfileResponse(
                column_name=col_data["column_name"],
                declared_type=col_data["declared_type"],
                total_count=col_data["total_count"],
                null_count=col_data["null_count"],
                null_percentage=col_data["null_percentage"],
                unique_count=col_data["unique_count"],
                uniqueness_ratio=col_data["uniqueness_ratio"],
                top_values=top_values,
                numeric_stats=numeric_stats,
                suspected_type_mismatch=col_data["suspected_type_mismatch"]
            ))

        tables_response.append(TableProfileResponse(
            table_name=table_data["table_name"],
            row_count=table_data["row_count"],
            duplicate_count=table_data["duplicate_count"],
            duplicate_percentage=table_data["duplicate_percentage"],
            column_count=len(col_responses),
            columns=col_responses
        ))

    return ProfilingResponse(
        project_id=project_id,
        run_id=run.id,
        table_count=len(tables_response),
        total_columns_profiled=total_columns,
        tables=tables_response
    )


@router.get("/{project_id}/profile", response_model=ProfilingResponse)
def get_profiling(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)

    run = db.query(ProfilingRun).filter(
        ProfilingRun.project_id == project_id
    ).order_by(ProfilingRun.created_at.desc()).first()

    if not run:
        raise HTTPException(
            status_code=404,
            detail="No profiling results found. Run profiling first."
        )

    col_profiles = db.query(ColumnProfile).filter(
        ColumnProfile.run_id == run.id
    ).all()

    tables_dict = {}
    for cp in col_profiles:
        if cp.table_name not in tables_dict:
            tables_dict[cp.table_name] = {
                "table_name": cp.table_name,
                "row_count": cp.row_count,
                "duplicate_count": cp.duplicate_count,
                "duplicate_percentage": cp.duplicate_percentage,
                "columns": []
            }

        numeric_stats = None
        if cp.numeric_stats:
            numeric_stats = NumericStats(**cp.numeric_stats)

        top_values = []
        if cp.top_values:
            top_values = [TopValue(**tv) for tv in cp.top_values]

        tables_dict[cp.table_name]["columns"].append(
            ColumnProfileResponse(
                column_name=cp.column_name,
                declared_type=cp.declared_type or "",
                total_count=cp.row_count,
                null_count=cp.null_count,
                null_percentage=cp.null_percentage,
                unique_count=cp.unique_count,
                uniqueness_ratio=cp.uniqueness_ratio,
                top_values=top_values,
                numeric_stats=numeric_stats,
                suspected_type_mismatch=cp.suspected_type_mismatch
            )
        )

    tables_response = [
        TableProfileResponse(
            table_name=t["table_name"],
            row_count=t["row_count"],
            duplicate_count=t["duplicate_count"],
            duplicate_percentage=t["duplicate_percentage"],
            column_count=len(t["columns"]),
            columns=t["columns"]
        )
        for t in tables_dict.values()
    ]

    return ProfilingResponse(
        project_id=project_id,
        run_id=run.id,
        table_count=len(tables_response),
        total_columns_profiled=sum(len(t.columns) for t in tables_response),
        tables=tables_response
    )
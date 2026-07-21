import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.models.saved_query import SavedQuery
from app.schemas.sql_workspace import (
    SQLExecuteRequest, SQLExecuteResponse,
    SQLExplainRequest, SQLExplainResponse,
    SaveQueryRequest, SavedQueryResponse,
    QueryHistoryResponse
)
from app.api.deps import get_current_user
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.sandbox_engine import run_query_in_sandbox, sandbox_exists
from app.ai.sql_explainer import explain_sql

router = APIRouter(prefix="/projects", tags=["SQL Workspace"])


def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public"
        )
    else:
        return CSVConnector(connection.file_path)


@router.post("/{project_id}/sql/execute", response_model=SQLExecuteResponse)
def execute_sql(
    project_id: int,
    request: SQLExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes SQL against either the source database or sandbox.
    Environment is determined by the request body, not project mode,
    so users can query both environments from the same workspace.
    Returns results as columns and rows for frontend table rendering.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    environment = request.environment

    start_time = time.time()

    try:
        if environment == "warehouse":
            if not sandbox_exists(project_id):
                raise HTTPException(
                    status_code=400,
                    detail="Sandbox not initialized"
                )
            df = run_query_in_sandbox(project_id, request.sql)
        else:
            connection = db.query(Connection).filter(
                Connection.project_id == project_id
            ).first()
            if not connection:
                raise HTTPException(
                    status_code=404,
                    detail="No connection found"
                )
            connector = get_connector(connection)
            try:
                df = connector.run_query(request.sql)
            finally:
                if hasattr(connector, 'dispose'):
                    connector.dispose()

        execution_time = (time.time() - start_time) * 1000

        if df is None or len(df) == 0:
            return SQLExecuteResponse(
                success=True,
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=round(execution_time, 2)
            )

        columns = list(df.columns)
        rows = []
        for _, row in df.iterrows():
            row_data = []
            for val in row:
                if hasattr(val, 'item'):
                    row_data.append(val.item())
                elif val is None:
                    row_data.append(None)
                else:
                    row_data.append(str(val) if not isinstance(
                        val, (int, float, bool)
                    ) else val)
            rows.append(row_data)

        return SQLExecuteResponse(
            success=True,
            columns=columns,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=round(execution_time, 2)
        )

    except HTTPException:
        raise
    except Exception as e:
        execution_time = (time.time() - start_time) * 1000
        return SQLExecuteResponse(
            success=False,
            columns=[],
            rows=[],
            row_count=0,
            execution_time_ms=round(execution_time, 2),
            error=str(e)
        )


@router.post("/{project_id}/sql/explain", response_model=SQLExplainResponse)
def explain_sql_query(
    project_id: int,
    request: SQLExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends SQL to Groq and returns plain English explanation.
    Used by the AI assistant panel in the SQL workspace.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = explain_sql(request.sql)

    return SQLExplainResponse(
        explanation=result["explanation"],
        tables_used=result["tables_used"],
        operations=result["operations"]
    )


@router.post("/{project_id}/sql/save", response_model=SavedQueryResponse)
def save_query(
    project_id: int,
    request: SaveQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves a named SQL query to the project.
    Saved queries appear in query history and can be reloaded.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = SavedQuery(
        project_id=project_id,
        name=request.name,
        sql=request.sql,
        environment=request.environment
    )
    db.add(query)
    db.commit()
    db.refresh(query)
    return query


@router.get("/{project_id}/sql/history", response_model=QueryHistoryResponse)
def get_query_history(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all saved queries for a project ordered by most recent.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    queries = db.query(SavedQuery).filter(
        SavedQuery.project_id == project_id
    ).order_by(SavedQuery.created_at.desc()).all()

    return QueryHistoryResponse(
        project_id=project_id,
        queries=queries
    )


@router.delete("/{project_id}/sql/history/{query_id}")
def delete_saved_query(
    project_id: int,
    query_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.project_id == project_id
    ).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    db.delete(query)
    db.commit()
    return {"message": "Query deleted"}
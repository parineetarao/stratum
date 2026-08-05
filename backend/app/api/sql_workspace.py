import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project, AnalysisMode
from app.models.connection import Connection, ConnectionType
from app.models.saved_query import SavedQuery
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.schemas.sql_workspace import (
    SQLExecuteRequest, SQLExecuteResponse,
    SQLExplainRequest, SQLExplainResponse,
    SQLOptimizeRequest, SQLOptimizeResponse,
    SQLGenerateRequest, SQLGenerateResponse,
    SaveQueryRequest, SavedQueryResponse,
    QueryHistoryResponse
)
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.sandbox_engine import run_query_in_sandbox, sandbox_exists
from app.ai.sql_explainer import explain_sql
from app.ai.sql_optimizer import optimize_sql
from app.ai.sql_generator_ai import generate_sql_from_prompt
from app.demo.curated_queries import get_curated_query

router = APIRouter(prefix="/projects", tags=["SQL Workspace"])


def build_schema_context(project_id: int, db: Session, limit_tables: int = 25) -> str:
    """
    Builds a compact 'table(col1, col2, ...)' string from discovered schema
    metadata to ground AI prompts in the project's real tables/columns.
    """
    tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).order_by(DiscoveredTable.table_name).limit(limit_tables).all()

    if not tables:
        return ""

    parts = []
    for table in tables:
        columns = db.query(DiscoveredColumn).filter(
            DiscoveredColumn.table_id == table.id
        ).all()
        col_str = ", ".join(f"{c.column_name} {c.data_type}" for c in columns)
        parts.append(f"{table.table_name}({col_str})")

    return "; ".join(parts)


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
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Executes SQL against either the source database or sandbox.
    Environment is determined by the request body, not project mode,
    so users can query both environments from the same workspace.
    Returns results as columns and rows for frontend table rendering.

    Demo project: never trusts request.sql. Only a query_id from the
    curated, backend-owned mapping may be executed - arbitrary SQL sent
    by the browser is rejected outright.
    """
    project = get_project_for_access(project_id, db, current_user.id if current_user else None)

    if project.is_demo:
        curated = get_curated_query(request.query_id) if request.query_id else None
        if not curated:
            raise HTTPException(
                status_code=400,
                detail="Only curated demo queries can be run in the public demo."
            )
        sql_to_run = curated["sql"]
    else:
        if not request.sql:
            raise HTTPException(status_code=400, detail="sql is required")
        sql_to_run = request.sql

    environment = request.environment

    start_time = time.time()

    try:
        if environment == "warehouse":
            if not sandbox_exists(project_id):
                raise HTTPException(
                    status_code=400,
                    detail="Sandbox not initialized"
                )
            df = run_query_in_sandbox(project_id, sql_to_run)
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
                df = connector.run_query(sql_to_run)
            finally:
                if hasattr(connector, 'dispose'):
                    connector.dispose()

        execution_time = (time.time() - start_time) * 1000

        explain_plan = None
        try:
            if environment == "warehouse":
                plan_df = run_query_in_sandbox(project_id, f"EXPLAIN {sql_to_run}")
                if plan_df is not None and len(plan_df) > 0:
                    explain_plan = "\n".join(
                        " ".join(str(v) for v in row) for row in plan_df.itertuples(index=False)
                    )
            else:
                connection = db.query(Connection).filter(
                    Connection.project_id == project_id
                ).first()
                if connection and connection.connection_type == ConnectionType.postgresql:
                    plan_connector = get_connector(connection)
                    try:
                        plan_df = plan_connector.run_query(f"EXPLAIN {sql_to_run}")
                        if plan_df is not None and len(plan_df) > 0:
                            explain_plan = "\n".join(
                                str(row[0]) for row in plan_df.itertuples(index=False)
                            )
                    finally:
                        if hasattr(plan_connector, 'dispose'):
                            plan_connector.dispose()
        except Exception:
            explain_plan = None

        if df is None or len(df) == 0:
            return SQLExecuteResponse(
                success=True,
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=round(execution_time, 2),
                explain_plan=explain_plan
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
            execution_time_ms=round(execution_time, 2),
            explain_plan=explain_plan
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

    Demo project: only a curated query_id may be explained; free-text sql
    is ignored so nothing user-supplied reaches the LLM prompt.
    """
    project = get_project_for_access(project_id, db, current_user.id)

    if project.is_demo:
        curated = get_curated_query(request.query_id) if request.query_id else None
        if not curated:
            raise HTTPException(
                status_code=400,
                detail="Only curated demo queries can be explained in the public demo."
            )
        sql_text = curated["sql"]
    else:
        if not request.sql:
            raise HTTPException(status_code=400, detail="sql is required")
        sql_text = request.sql

    schema_context = build_schema_context(project_id, db)
    result = explain_sql(sql_text, schema_context)

    return SQLExplainResponse(
        explanation=result["explanation"],
        tables_used=result["tables_used"],
        operations=result["operations"],
        business_question=result.get("business_question", ""),
        suggestions=result.get("suggestions", [])
    )


@router.post("/{project_id}/sql/optimize", response_model=SQLOptimizeResponse)
def optimize_sql_query(
    project_id: int,
    request: SQLOptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends SQL to Groq and returns performance/index suggestions.
    Used by the AI assistant panel's Optimize tab.
    """
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    schema_context = build_schema_context(project_id, db)
    result = optimize_sql(request.sql, schema_context)

    return SQLOptimizeResponse(
        suggestions=result["suggestions"],
        index_recommendations=result["index_recommendations"],
        rewritten_sql=result["rewritten_sql"]
    )


@router.post("/{project_id}/sql/generate", response_model=SQLGenerateResponse)
def generate_sql_query(
    project_id: int,
    request: SQLGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Translates a natural-language request into SQL using Groq.
    Used by the AI assistant panel's Generate tab.
    """
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    schema_context = build_schema_context(project_id, db)
    result = generate_sql_from_prompt(request.prompt, schema_context)

    return SQLGenerateResponse(
        sql=result["sql"],
        explanation=result["explanation"]
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
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

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
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns all saved queries for a project ordered by most recent.
    """
    get_project_for_access(project_id, db, current_user.id if current_user else None)

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
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    query = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.project_id == project_id
    ).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    db.delete(query)
    db.commit()
    return {"message": "Query deleted"}
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import auth, projects, connections, metadata, relationships
from app.api import profiling as profiling_router
from app.api import quality as quality_router
from app.api import cleaning as cleaning_router
from app.api import warehouse as warehouse_router
from app.api import kpis as kpis_router
from app.api import sql_workspace as sql_router
from app.api import sandbox as sandbox_router
from app.api import dashboard as dashboard_router
from app.api import insights as insights_router
from app.api import overview as overview_router
from app.models import user, project, connection, connection_file, schema_metadata, relationship
from app.models import profiling as profiling_model
from app.models import cleaning as cleaning_model
from app.models import warehouse as warehouse_model
from app.models import kpi as kpi_model
from app.models import saved_query as saved_query_model
from app.core.scheduler import scheduler
from app.config import settings
from app.database import SessionLocal
import logging

logger = logging.getLogger("stratum.startup")

def ensure_kpi_table_columns():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if inspector.has_table("kpis"):
        existing_cols = {c["name"] for c in inspector.get_columns("kpis")}
        new_cols = [
            ("formatted_value", "VARCHAR"),
            ("reasoning", "TEXT"),
            ("evidence", "TEXT"),
            ("status", "VARCHAR DEFAULT 'pending'"),
        ]
        with engine.connect() as conn:
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE kpis ADD COLUMN {col_name} {col_type}"))
                    except Exception:
                        pass
            conn.commit()

def ensure_project_table_columns():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if inspector.has_table("projects"):
        existing_cols = {c["name"] for c in inspector.get_columns("projects")}
        if "is_demo" not in existing_cols:
            with engine.connect() as conn:
                try:
                    conn.execute(text(
                        "ALTER TABLE projects ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false"
                    ))
                    conn.commit()
                except Exception:
                    pass

def ensure_connection_files_table():
    """Idempotent table creation for already-deployed databases that predate
    multi-file upload support. Only creates the table if missing; never
    touches existing connections/data."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if not inspector.has_table("connection_files"):
        Base.metadata.tables["connection_files"].create(bind=engine)

def init_db():
    """Optional dev-only schema bootstrap. Production/CI schema changes are
    expected to go through Alembic migrations; set AUTO_CREATE_TABLES=true
    to fall back to create_all() for quick local setup."""
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
        ensure_kpi_table_columns()
    # Safe to run unconditionally: idempotent, checks column/table existence
    # first, so it also backfills already-deployed databases.
    ensure_project_table_columns()
    ensure_connection_files_table()

init_db()


app = FastAPI(
    title="Stratum",
    description="Enterprise Analytics Engineering Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
        "https://stratum-frontend.onrender.com"],
    allow_origin_regex=r"https://.*\.(vercel\.app|onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler.start()

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(connections.router)
app.include_router(metadata.router)
app.include_router(relationships.router)
app.include_router(profiling_router.router)
app.include_router(quality_router.router)
app.include_router(cleaning_router.router)
app.include_router(warehouse_router.router)
app.include_router(sandbox_router.router)
app.include_router(kpis_router.router)
app.include_router(sql_router.router)
app.include_router(dashboard_router.router)
app.include_router(insights_router.router)
app.include_router(overview_router.router)

@app.on_event("startup")
def seed_demo_on_startup():
    if not settings.SEED_DEMO_PROJECT:
        return
    from app.demo.seed_demo import seed_demo_project
    db = SessionLocal()
    try:
        seed_demo_project(db)
    except Exception:
        logger.exception("demo project seeding failed at startup")
    finally:
        db.close()

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()

@app.get("/health")
def health():
    return {"status": "ok", "service": "stratum-backend"}
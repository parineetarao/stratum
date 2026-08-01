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
from app.models import user, project, connection, schema_metadata, relationship
from app.models import profiling as profiling_model
from app.models import cleaning as cleaning_model
from app.models import warehouse as warehouse_model
from app.models import kpi as kpi_model
from app.models import saved_query as saved_query_model
from app.core.scheduler import scheduler

Base.metadata.create_all(bind=engine)

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

ensure_kpi_table_columns()


app = FastAPI(
    title="Stratum",
    description="Enterprise Analytics Engineering Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
        "https://stratum-frontend.onrender.com",
        "https://*.onrender.com",
        "https://*.vercel.app",],
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

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()

@app.get("/health")
def health():
    return {"status": "ok", "service": "stratum-backend"}
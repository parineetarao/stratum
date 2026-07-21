from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import auth, projects, connections, metadata, relationships
from app.api import profiling as profiling_router
from app.api import quality as quality_router
from app.api import warehouse as warehouse_router
from app.api import kpis as kpis_router
from app.api import sql_workspace as sql_router
from app.api import sandbox as sandbox_router
from app.api import dashboard as dashboard_router
from app.api import insights as insights_router
from app.models import user, project, connection, schema_metadata, relationship
from app.models import profiling as profiling_model
from app.models import cleaning as cleaning_model
from app.models import warehouse as warehouse_model
from app.models import kpi as kpi_model
from app.models import saved_query as saved_query_model
from app.core.scheduler import scheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Stratum",
    description="Enterprise Analytics Engineering Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
app.include_router(warehouse_router.router)
app.include_router(sandbox_router.router)
app.include_router(kpis_router.router)
app.include_router(sql_router.router)
app.include_router(dashboard_router.router)
app.include_router(insights_router.router)

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()

@app.get("/health")
def health():
    return {"status": "ok", "service": "stratum-backend"}
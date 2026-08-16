"""
LEGACY / inactive path. The public demo is no longer seeded by this
script - it's the "Retail Analytics Demo" project (built manually
against the demo_retail schema, see demo/load_demo.py), flagged via
backend/scripts/mark_demo_project.py (a one-off, run once against the
deployed database). Project.is_demo remains the only runtime signal
the app relies on; this file is kept only so the Pagila walkthrough it
was originally built for still works if SEED_DEMO_PROJECT is
deliberately re-enabled for some other purpose.

Idempotent, non-destructive seeding of a demo project ("Pagila DVD
Rental Analysis"). Drives the same engine pipeline the interactive
workflow uses (metadata discovery, relationship inference, profiling,
quality scoring, cleaning recommendations, warehouse design, KPI
generation, insight generation) by calling the real API handler
functions directly, so every module ends up with genuinely computed data
instead of hand-authored fixtures.

Gated by SEED_DEMO_PROJECT (defaults to False - confirm it stays unset
or false wherever the Retail Analytics Demo is the intended public
demo). Safe to call on every app startup regardless: it no-ops as soon
as ANY project has is_demo=True, which the Retail Analytics Demo
already will after the one-off script runs - so this seed can never
override or compete with it. Requires DEMO_DATABASE_URL to point at a
Postgres database already loaded with the Pagila schema/data (see
pagila-schema.sql / pagila-data.sql at the repo root) - this script
never loads data into that database itself, it only registers it as
the demo project's source.
"""
import logging
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.project import Project, DomainEnum, AnalysisMode
from app.models.connection import Connection, ConnectionType

logger = logging.getLogger("stratum.demo_seed")

DEMO_USER_EMAIL = "demo@stratum.internal"
DEMO_PROJECT_NAME = "Pagila DVD Rental Analysis"


def _get_or_create_demo_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if user:
        return user
    user = User(
        email=DEMO_USER_EMAIL,
        hashed_password=hash_password(__import__("secrets").token_urlsafe(32)),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("demo seed: created system demo owner user %s", DEMO_USER_EMAIL)
    return user


def seed_demo_project(db: Session) -> None:
    if not settings.SEED_DEMO_PROJECT:
        return

    existing = db.query(Project).filter(Project.is_demo == True).first()
    if existing:
        logger.info("demo seed: demo project already exists (id=%s), skipping", existing.id)
        return

    if not settings.DEMO_DATABASE_URL:
        logger.warning("demo seed: SEED_DEMO_PROJECT is set but DEMO_DATABASE_URL is empty, skipping")
        return

    logger.info("demo seed: no demo project found, seeding %s", DEMO_PROJECT_NAME)

    # Local imports: these router modules import app.main indirectly via
    # app.api.deps and friends, so import lazily to avoid circular imports
    # when this module is loaded from app.main at startup.
    from app.api.metadata import discover_metadata
    from app.api.relationships import run_relationship_inference
    from app.api.profiling import run_profiling
    from app.api.quality import generate_quality_report
    from app.api.cleaning import bulk_decide_cleaning_recommendations
    from app.api.warehouse import generate_warehouse_design, approve_warehouse_design, preview_warehouse
    from app.api.kpis import generate_project_kpis, bulk_approve_high_confidence_kpis, approve_kpi
    from app.api.insights import generate_executive_insights
    from app.models.kpi import KPI
    from app.models.saved_query import SavedQuery
    from app.models.dashboard_config import DashboardConfig
    from app.schemas.cleaning import CleaningBulkDecisionRequest
    from app.schemas.warehouse import WarehouseApproval
    from app.schemas.kpi import KPIGenerateRequest
    from app.demo.curated_queries import CURATED_DEMO_QUERIES

    demo_user = _get_or_create_demo_user(db)

    project = Project(
        user_id=demo_user.id,
        name=DEMO_PROJECT_NAME,
        description="A completed analytics engineering walkthrough of the Pagila DVD rental dataset.",
        domain=DomainEnum.retail,
        analysis_mode=AnalysisMode.warehouse,
        is_demo=False,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    connection = Connection(
        project_id=project.id,
        connection_type=ConnectionType.postgresql,
        connection_string=settings.DEMO_DATABASE_URL,
        source_schema="public",
    )
    db.add(connection)
    db.commit()

    try:
        logger.info("demo seed: discovering metadata")
        discover_metadata(project_id=project.id, db=db, current_user=demo_user)

        logger.info("demo seed: inferring relationships")
        run_relationship_inference(project_id=project.id, db=db, current_user=demo_user)

        logger.info("demo seed: profiling data")
        run_profiling(project_id=project.id, db=db, current_user=demo_user)

        logger.info("demo seed: generating quality report + cleaning recommendations")
        generate_quality_report(project_id=project.id, db=db, current_user=demo_user)
        bulk_decide_cleaning_recommendations(
            project_id=project.id,
            request=CleaningBulkDecisionRequest(action="approve_high_confidence"),
            db=db,
            current_user=demo_user,
        )

        logger.info("demo seed: designing warehouse")
        generate_warehouse_design(project_id=project.id, db=db, current_user=demo_user)
        approve_warehouse_design(
            project_id=project.id,
            approval=WarehouseApproval(is_approved=True),
            db=db,
            current_user=demo_user,
        )
        preview_warehouse(project_id=project.id, db=db, current_user=demo_user)

        logger.info("demo seed: generating KPIs")
        generate_project_kpis(
            project_id=project.id,
            payload=KPIGenerateRequest(mode="warehouse"),
            mode=None,
            db=db,
            current_user=demo_user,
        )
        bulk_approve_high_confidence_kpis(
            project_id=project.id, payload=None, mode="warehouse", db=db, current_user=demo_user
        )
        remaining = db.query(KPI).filter(
            KPI.project_id == project.id, KPI.is_approved == False
        ).all()
        for kpi in remaining:
            approve_kpi(project_id=project.id, kpi_id=kpi.id, approval=None, db=db, current_user=demo_user)

        logger.info("demo seed: generating executive insights")
        generate_executive_insights(project_id=project.id, db=db, current_user=demo_user)

        logger.info("demo seed: creating dashboard chart widgets")
        dashboard_widgets = [
            ("demo_monthly_rentals", "line", "month", "rental_count"),
            ("demo_revenue_by_category", "donut", "category", "revenue"),
            ("demo_store_comparison", "bar", "store_id", "rental_count"),
        ]
        for grid_position, (query_id, chart_type, x_column, y_column) in enumerate(dashboard_widgets):
            curated = CURATED_DEMO_QUERIES[query_id]
            saved_query = SavedQuery(
                project_id=project.id,
                name=curated["title"],
                sql=curated["sql"],
                environment="source",
            )
            db.add(saved_query)
            db.commit()
            db.refresh(saved_query)

            db.add(DashboardConfig(
                project_id=project.id,
                widget_key=f"query{saved_query.id}",
                chart_type=chart_type,
                chart_options={
                    "saved_query_id": saved_query.id,
                    "x_column": x_column,
                    "y_column": y_column,
                },
                grid_position=grid_position,
                grid_width=6,
                is_visible=True,
            ))
        db.commit()

        project.is_demo = True
        db.commit()
        logger.info("demo seed: completed successfully for project id=%s", project.id)
    except Exception:
        logger.exception("demo seed: pipeline failed, rolling back demo project")
        db.rollback()
        db.query(Connection).filter(Connection.project_id == project.id).delete()
        db.query(Project).filter(Project.id == project.id).delete()
        db.commit()
        raise

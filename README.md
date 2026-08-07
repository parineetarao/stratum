# Stratum

Stratum is an enterprise analytics engineering platform that automates the entire data-to-insights pipeline. Users can connect PostgreSQL databases or upload CSV and Excel files, after which Stratum discovers schemas, infers relationships, profiles and cleans data, generates analytical warehouses, recommends KPIs, builds interactive dashboards, and produces AI-generated executive insights—all within a single integrated platform.

## Overview

Turning a raw CSV export or an operational Postgres database into something a business user can query and trust is normally a manual, multi-step process: someone has to inspect the schema, guess at relationships between tables, check for data quality issues, decide which columns matter, write SQL, and eventually build a dashboard. Stratum automates this pipeline for a given domain (retail, banking, finance, healthcare, manufacturing, logistics) while keeping a human in the loop at the points that matter — reviewing cleaning recommendations and approving KPIs before any AI-generated interpretation is produced.

Each unit of work in Stratum is a **project**: a domain, a connected data source, and the pipeline results (schema catalog, relationships, profiling, quality scores, warehouse design, KPIs, dashboards, insights) that belong to it.

## Key Features

**Data Ingestion**
- CSV and Excel upload with automatic encoding detection and delimiter sniffing
- Live PostgreSQL connections with full schema introspection

**Metadata & Schema Intelligence**
- Automatic discovery of tables, columns, types, primary keys, foreign keys, and constraints
- Relationship inference between tables using weighted name similarity and value-overlap signals (fuzzy matching via rapidfuzz)
- Schema drift detection between snapshots

**Data Quality & Cleaning**
- Per-column statistical profiling
- Weighted data quality scoring (completeness, uniqueness, consistency)
- Generated cleaning recommendations, executed safely against an isolated sandbox rather than the source data

**Warehouse Design**
- Automatic fact/dimension classification using structural heuristics (row-count percentile, foreign-key count, numeric measure density, date columns)
- Star/snowflake schema DDL generation

**KPI & Analytics**
- Domain-specific KPI catalogs (retail, banking, finance, healthcare, manufacturing, logistics)
- KPIs matched against the discovered schema and their SQL generated dynamically — no hardcoded table names
- Confidence scoring and human approval workflow before a KPI is used downstream

**SQL Workspace**
- In-browser SQL editor (CodeMirror) running against a per-project DuckDB sandbox
- AI-assisted query generation from natural language, plain-English query explanation, and optimization suggestions
- Saved queries and query history

**Dashboards**
- Rule-based chart type selection (e.g. percentage metrics → donut, date dimensions → line, categorical → bar)
- Dashboard chart-grid generation from approved KPIs, rendered with ECharts

**AI Insights**
- A single structured Groq call over approved KPIs and profiling results produces an executive summary, findings, trends, anomalies, opportunities, and recommended actions
- Insight reports are persisted per project so the LLM is not re-invoked on every page view

**Authentication & Project Management**
- JWT access tokens with a separate refresh-token flow
- Project-scoped access control, including a read-only public demo project mode

## Architecture

```
Next.js Frontend
        |
        v
FastAPI Backend
        |
        v
Analytics Engines   (metadata discovery, profiling, quality scoring,
        |            cleaning, warehouse design, KPI matching, chart planning)
        v
Connector Layer     (BaseConnector abstraction)
        |
        v
PostgreSQL / CSV / Excel   (external data sources)

Backend also talks to, independently of the connector layer:

  PostgreSQL (application database)
      -- stores users, projects, discovered schema, KPIs,
         warehouse designs, dashboards, insight reports

  Groq API
      -- powers AI SQL generation/explanation/optimization
         and executive insight report generation
```

## End-to-End Workflow

```
Create Project
  -> Select Domain (retail / banking / finance / healthcare / manufacturing / logistics)
  -> Connect Data Source (CSV, Excel, or PostgreSQL)
  -> Discover Metadata (tables, columns, types, keys)
  -> Infer Relationships (foreign keys between tables)
  -> Profile Data (per-column statistics)
  -> Assess Quality (completeness / uniqueness / consistency score)
  -> Review Cleaning Recommendations (apply against sandbox)
  -> Generate Warehouse (fact/dimension classification, star schema DDL)
  -> Recommend & Approve KPIs (domain catalog matched to schema)
  -> Query in SQL Workspace (DuckDB sandbox, AI-assisted SQL)
  -> Generate Dashboard (chart grid from approved KPIs)
  -> Generate AI Insights (executive summary from approved KPIs + profiling)
```

## Technical Architecture

- **Connector abstraction**: all data sources implement a common `BaseConnector` interface (`get_tables`, `get_columns`, `get_foreign_keys`, `run_query`, etc.), so the engine layer never depends on whether the underlying source is Postgres, CSV, or Excel.
- **Engine / API separation**: the `engine/` package contains pure-Python analytics logic with no HTTP or LLM concerns; `api/` routes are thin wrappers that call into engines and persist results. `ai/` isolates the Groq-backed modules (SQL generation, explanation, optimization, insight generation) from the deterministic engine layer.
- **Project-centric persistence**: every pipeline stage (discovered schema, relationships, profiling runs, quality scores, cleaning recommendations, warehouse design, KPIs, saved queries, dashboards, insight reports) is persisted against the owning project, so results don't need to be recomputed on every page load.
- **DuckDB sandbox**: each project gets an isolated `.duckdb` file that mirrors the source tables. Cleaning operations, SQL workspace queries, and warehouse materialization all run against this sandbox, leaving the original source untouched.
- **KPI approval before AI insight generation**: KPIs are computed and confidence-scored deterministically, then require human approval before they are eligible to feed the AI insight generator — the LLM interprets vetted numbers rather than deciding what's important.
- **Persisted `InsightReport`**: AI-generated insight reports are stored per project rather than regenerated on every view, keeping LLM usage deliberate and reproducible.

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Application framework |
| React 18 / TypeScript | UI |
| Tailwind CSS | Styling |
| Zustand | Client state management |
| @xyflow/react + dagre | Relationship and warehouse graph visualization |
| ECharts | Dashboard charts |
| CodeMirror (@uiw/react-codemirror) | SQL editor |
| Framer Motion | Landing page animation |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | API framework |
| Uvicorn | ASGI server |
| SQLAlchemy 2.0 | ORM |
| Alembic | Migration framework (configured, see Limitations) |
| Pydantic v2 | Request/response schemas and settings |
| python-jose / passlib / bcrypt | JWT auth and password hashing |
| APScheduler | Background scheduler (wired up, currently no jobs registered) |

### Database / Data Processing
| Technology | Purpose |
|---|---|
| PostgreSQL | Application database and a supported external data source |
| DuckDB | Per-project query sandbox |
| pandas / openpyxl | CSV and Excel parsing |
| rapidfuzz | Fuzzy matching for relationship inference |

### AI
| Technology | Purpose |
|---|---|
| Groq API | SQL generation/explanation/optimization, executive insight generation |

### Infrastructure / Deployment
| Technology | Purpose |
|---|---|
| Docker Compose | Local multi-service dev environment (db, backend, frontend) |
| Vercel | Frontend hosting |
| Render | Backend and application database hosting |

## Repository Structure

```
backend/
  app/
    api/          FastAPI route modules (auth, projects, metadata, relationships,
                   profiling, quality, cleaning, warehouse, kpis, sql_workspace,
                   sandbox, dashboard, insights, overview)
    engine/        Deterministic analytics logic (profiling, quality scoring,
                   relationship inference, warehouse design, KPI matching,
                   chart planning, DuckDB sandbox management)
    connectors/    BaseConnector interface + CSV/Excel and PostgreSQL implementations
    models/        SQLAlchemy ORM models
    schemas/       Pydantic request/response schemas
    ai/            Groq-backed SQL and insight generation modules
    domains/       Per-vertical KPI/rule catalogs (retail, banking, finance,
                   healthcare, manufacturing, logistics)
    core/          Security (JWT/password hashing), scheduler, connection strings

frontend/
  app/           Next.js App Router pages, including the per-project workspace
                 (data-source, metadata, relationships, data-quality, cleaning,
                 warehouse, kpis, sql, dashboard, insights)
  components/    UI components grouped by feature (auth, projects, workspace, landing)
  lib/           API client, auth helpers, formatting utilities
```

## Local Setup

### Backend

```bash
git clone <repo-url>
cd analytics-platform/backend

python -m venv venv
source venv/bin/activate   # venv\Scripts\activate on Windows

pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=
JWT_SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GROQ_API_KEY=
UPLOAD_DIR=
SANDBOX_DIR=
AUTO_CREATE_TABLES=true
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd analytics-platform/frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the app:

```bash
npm run dev
```

## Docker Setup

A `docker-compose.yml` at the repository root brings up all three services for local development:

```bash
docker compose up
```

This starts:
- `db` — PostgreSQL 15 with a health check
- `backend` — FastAPI via Uvicorn with `--reload`, port 8000
- `frontend` — Next.js dev server, port 3000

Environment variables for each service are read from `.env` files as described above; see `docker-compose.yml` for the exact variable wiring.

## Deployment

The production setup targets:
- **Frontend** → Vercel
- **Backend** → Render
- **Application database** → Render PostgreSQL

The backend's CORS configuration explicitly allows `*.vercel.app` and `*.onrender.com` origins, confirming this split. There is no committed Vercel/Render configuration file in the repo — both services are configured through their respective dashboards, with the same environment variables described in Local Setup (`DATABASE_URL`, `JWT_SECRET_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_API_URL`, etc.) set as platform secrets rather than committed files.

## Design Decisions

- **Connector abstraction over source-specific logic**: adding a new data source means implementing one interface, not touching every engine module.
- **Persisted intermediate analytics state**: every pipeline stage writes its result to the database, so the UI can show prior results instantly instead of recomputing a multi-step pipeline on every visit.
- **Human approval before AI interpretation**: KPIs must be reviewed and approved before they're passed to the insight generator, which keeps the LLM from making judgment calls about what matters in the data.
- **DuckDB sandbox instead of mutating source data**: cleaning operations and ad hoc SQL run against a disposable per-project DuckDB file, so a live source connection (or the original CSV) is never at risk.
- **Next.js API proxying**: the frontend calls the FastAPI backend through a configured base URL rather than embedding backend logic in the frontend, keeping the two deployable and scalable independently.
- **JWT + refresh-token auth**: short-lived JWT access tokens paired with a refresh token, rather than long-lived sessions, to limit the exposure window of a leaked access token.

## Current Limitations / Future Improvements

- **Alembic is configured but has no migration history** — schema changes currently rely on `Base.metadata.create_all` (behind an `AUTO_CREATE_TABLES` flag) plus a small number of manual idempotent `ALTER TABLE` patches at startup. Generating and committing real migrations is the main outstanding schema-management gap.
- **Uploads and DuckDB sandboxes are stored on the local filesystem**, which doesn't survive redeploys or scale past a single backend instance. Moving to object storage (e.g. S3) is a natural next step.
- **APScheduler is initialized but no jobs are registered** — it's wired into app startup/shutdown but not yet used for anything (e.g. scheduled re-profiling or refresh).
- **One data source connection per project** — the connector model doesn't currently support multiple sources feeding a single project.
- **LLM calls (SQL generation, insight generation) run synchronously** within the request/response cycle rather than as background jobs, so latency is tied directly to the Groq API's response time.

## Screenshots / Demo

_Screenshots or a link to a live deployment can be added here._

## License / Author

No license file is currently included in this repository. All rights reserved by the author unless a license is added.

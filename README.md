Stratum

Stratum is an end-to-end analytics engineering platform that enables organizations to transform raw operational data into analytics-ready assets through a guided workflow. It combines automated metadata discovery, data quality analysis, warehouse design, KPI recommendation, and SQL-based analytics while keeping users in control of every major transformation.

Unlike traditional BI tools that begin after a warehouse already exists, Stratum assists throughout the analytics engineering lifecycle—from connecting raw data sources to generating validated analytical models and dashboards.

Features
Data Source Management
Connect PostgreSQL databases
Upload CSV datasets
Connection health monitoring
Source statistics and metadata
Schema refresh
Schema drift detection
Metadata Discovery

Automatically discovers:

Tables
Columns
Data types
Constraints
Primary keys
Foreign keys
Row counts
Sample data

Supports both PostgreSQL and CSV datasets through a unified metadata model.

Relationship Discovery
Interactive ER diagram
Automatic relationship inference
Confidence scoring
Human approval workflow
Search and filtering
Bulk approval of high-confidence relationships

Accepted relationships are stored within Stratum and reused by downstream modules without modifying the original database.

Data Quality Analysis

Generate comprehensive profiling reports including:

Completeness
Consistency
Uniqueness
Validity
Overall quality score
Table-level health metrics
Critical issue detection
Cleaning Recommendations

Automatically generates cleaning recommendations such as:

Null handling
Duplicate removal
Type conversion
Missing value handling

Each recommendation includes:

confidence score
affected columns
expected impact
generated SQL

All transformations are previewed inside an isolated sandbox before affecting production data.

Warehouse Generation

Automatically converts operational schemas into analytical warehouse models.

Features include:

Fact and dimension classification
Warehouse visualization
DDL generation
Classification overrides
Warehouse validation
Sandbox execution
Join validation
Aggregation validation
KPI Recommendation Engine

Generate business KPIs from either:

Source Database
Warehouse Sandbox

Each KPI contains:

computed value
generated SQL
confidence score
recommendation reasoning
approval workflow

Approved KPIs are passed directly into dashboard generation.

SQL Workspace

Interactive SQL environment supporting:

Source Database execution
Warehouse Sandbox execution
SQL formatting
Query history
Schema browser
Saved queries
SQL explanation

Modules across the platform can open the SQL Workspace with preloaded queries.

Dashboard

Generate interactive business dashboards from approved KPIs.

Includes:

KPI summary cards
Configurable visualizations
Dashboard persistence
Refreshable metrics
Executive summaries
AI Insights

Automatically generates:

Executive summaries
Key findings
Trends
Anomalies
Business opportunities
Human-in-the-Loop Workflow
Connect Data Source
        ↓
Metadata Discovery
        ↓
Relationship Discovery
        ↓
Data Quality Profiling
        ↓
Cleaning Recommendations
        ↓
Warehouse Generation
        ↓
KPI Recommendation
        ↓
SQL Workspace
        ↓
Dashboard
        ↓
AI Insights

Every major transformation is reviewable before being applied, ensuring transparency and control throughout the analytics pipeline.

Sandbox Architecture

Stratum includes an isolated analytical sandbox that allows users to safely validate transformations without modifying production data.

The sandbox is used to:

Preview cleaning operations
Validate warehouse generation
Execute generated warehouse DDL
Run KPI queries
Explore analytical models before deployment
Tech Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
React Flow
Framer Motion
Backend
FastAPI
SQLAlchemy
Pydantic
Alembic
Databases
PostgreSQL
DuckDB (Sandbox)
AI & Analytics
Groq API
Rule-based inference engine
Metadata discovery engine
Warehouse generation engine
KPI recommendation engine
Architecture
Frontend (Next.js)

        │

 REST API

        │

Backend (FastAPI)

        │

 ├── Authentication
 ├── Metadata Engine
 ├── Relationship Engine
 ├── Profiling Engine
 ├── Cleaning Engine
 ├── Warehouse Engine
 ├── KPI Engine
 ├── SQL Engine
 └── Sandbox Services

        │

 ├── PostgreSQL
 ├── CSV
 └── DuckDB Sandbox
Project Structure
stratum/

├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
│
├── backend/
│   ├── api/
│   ├── engine/
│   ├── models/
│   ├── sandbox/
│   ├── services/
│   └── schemas/
│
├── docker-compose.yml
├── README.md
└── .env.example
Running Locally
Clone the repository
git clone https://github.com/<username>/stratum.git
cd stratum
Backend
cd backend

python -m venv .venv

source .venv/bin/activate
# Windows
# .venv\Scripts\activate

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload
Frontend
cd frontend

npm install

npm run dev
Environment Variables

Create a .env file:

DATABASE_URL=
JWT_SECRET_KEY=
GROQ_API_KEY=
Design Principles

Stratum is built around five engineering principles:

Transparency — Every recommendation is explainable.
Human Control — Users approve important transformations before execution.
Safety — Transformations are validated inside an isolated sandbox.
SQL Visibility — Generated SQL is always inspectable.
Modularity — Each stage of the analytics workflow is independent yet integrated.
Key Engineering Highlights
Full-stack architecture using Next.js and FastAPI
Metadata-driven analytics workflow
Unified support for PostgreSQL and CSV sources
Interactive ER visualization using React Flow
Automated relationship inference
Data profiling and quality scoring
Human-reviewed cleaning workflows
Automated warehouse generation
Sandbox-based warehouse validation
Dynamic KPI recommendation engine
SQL-first analytics workflow
Dashboard generation from approved KPIs
Modular, service-oriented backend architecture
License

This project is licensed under the MIT License.

Author

Parineeta Rao

B.Tech – Artificial Intelligence & Data Science
K. J. Somaiya Institute of Technology

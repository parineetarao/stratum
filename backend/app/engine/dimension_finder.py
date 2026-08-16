"""
Dimension Finder
================
Inspects discovered schema metadata for a KPI's source table and
classifies its columns into date columns and categorical columns
that can be used to build a meaningful chart breakdown.

A KPI's scalar SQL (e.g. "SELECT COUNT(*) as value FROM rental")
carries no grouping information by itself. This module looks at the
table's other columns to decide whether a time-series or categorical
breakdown is possible, so the dashboard never fabricates a chart from
a query that has no real dimension to group by.
"""

import re
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.schema_metadata import DiscoveredColumn

DATE_TYPE_KEYWORDS = ["date", "timestamp"]
CATEGORICAL_TYPE_KEYWORDS = ["char", "text", "enum", "bool"]
CATEGORICAL_NAME_KEYWORDS = [
    "category", "region", "store", "status", "type", "rating",
    "country", "city", "department", "channel", "segment", "genre"
]
EXCLUDE_NAME_KEYWORDS = ["uuid", "created_at", "updated_at", "password"]

# A subset of categorical columns that name an actual place, generic to
# any schema (not tied to the demo dataset) — used to offer a geographic
# breakdown (map chart) instead of a plain categorical one.
GEO_NAME_KEYWORDS = ["country", "state", "region", "province", "city", "location"]


def is_geo_column(column_name: str) -> bool:
    name = (column_name or "").lower()
    return any(k in name for k in GEO_NAME_KEYWORDS)


def extract_table_name(sql: str) -> Optional[str]:
    """Extracts the first table referenced after FROM in a KPI SQL string."""
    match = re.search(r'FROM\s+([\w."]+)', sql, re.IGNORECASE)
    if not match:
        return None
    raw = match.group(1).replace('"', '')
    return raw.split('.')[-1]


def find_dimensions(
    db: Session,
    project_id: int,
    table_name: Optional[str]
) -> Dict[str, List[str]]:
    """
    Returns the date columns and categorical columns available on a
    KPI's source table, based on previously discovered schema metadata.
    Returns empty lists if no metadata is available (e.g. warehouse
    sandbox tables, or a project that hasn't run schema discovery),
    which causes the KPI to remain a summary card only.
    """
    empty: Dict[str, List[str]] = {"date_columns": [], "categorical_columns": []}
    if not table_name:
        return empty

    columns = db.query(DiscoveredColumn).filter(
        DiscoveredColumn.project_id == project_id,
        DiscoveredColumn.table_name == table_name
    ).all()
    if not columns:
        return empty

    date_columns: List[str] = []
    categorical_columns: List[str] = []

    for col in columns:
        if col.is_primary_key:
            continue

        name = (col.column_name or "").lower()
        data_type = (col.data_type or "").lower()

        if any(k in name for k in EXCLUDE_NAME_KEYWORDS):
            continue

        if any(k in data_type for k in DATE_TYPE_KEYWORDS) or name.endswith("_at") or "date" in name:
            date_columns.append(col.column_name)
            continue

        if name.endswith("_id"):
            # Foreign-key-like column (store_id, category_id, actor_id)
            # is a usable grouping dimension.
            categorical_columns.append(col.column_name)
            continue

        if any(k in name for k in CATEGORICAL_NAME_KEYWORDS) or any(k in data_type for k in CATEGORICAL_TYPE_KEYWORDS):
            categorical_columns.append(col.column_name)

    return {"date_columns": date_columns, "categorical_columns": categorical_columns}

"""
Relationship Graph
==================
Builds a foreign-key graph from discovered schema metadata and finds
short join paths from a "fact" table (where a KPI's measure lives) to
a "dimension" table that has a human-readable label column (name,
title, category, ...). This is what lets the dashboard build charts
like "Revenue by Film Category" or "Top Films by Rentals" generically,
for any project, without hardcoding table or column names.
"""

from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.schema_metadata import DiscoveredColumn

LABEL_NAME_KEYWORDS = ["name", "title", "label", "category", "description"]
# Columns that are text but identify one specific person/record rather
# than a reusable category (a customer's own name, login, contact info)
# — grouping by these produces a near-unique, meaningless "breakdown".
EXCLUDE_LABEL_KEYWORDS = [
    "password", "email", "phone", "address", "fulltext", "uuid",
    "first_name", "last_name", "username", "picture"
]
LABEL_TYPE_KEYWORDS = ["char", "text"]
MIN_DEPTH_FOR_ID_FALLBACK = 2


@dataclass
class JoinEdge:
    from_table: str
    from_column: str
    to_table: str
    to_column: str


@dataclass
class JoinPath:
    """A chain of joins from a base table to a labeled dimension table."""
    edges: List[JoinEdge]
    label_table: str
    label_column: str
    is_named_label: bool = True
    # When set, used verbatim as the SQL label expression instead of
    # "{label_table}.{label_column}" — e.g. a first_name || ' ' ||
    # last_name concatenation for a person-like dimension table.
    label_expr: Optional[str] = None

    @property
    def dimension_table(self) -> str:
        return self.label_table


def build_fk_graph(db: Session, project_id: int) -> Dict[str, List[JoinEdge]]:
    """
    Builds a bidirectional adjacency list from foreign-key metadata.
    Foreign keys only ever point "child -> parent" (e.g.
    film_category.film_id -> film), so a join path that needs to fan
    back out through a many-to-many junction table (film -> film_category
    -> category) requires walking that edge in reverse. Both directions
    are added here so BFS can traverse either way; the reversed edge
    still encodes the correct join columns for its direction.
    """
    columns = db.query(DiscoveredColumn).filter(
        DiscoveredColumn.project_id == project_id
    ).all()

    graph: Dict[str, List[JoinEdge]] = {}
    for col in columns:
        fk = col.foreign_key_info
        if not fk or not isinstance(fk, dict):
            continue
        referenced_table = fk.get("referenced_table")
        referenced_column = fk.get("referenced_column")
        if not referenced_table or not referenced_column:
            continue
        graph.setdefault(col.table_name, []).append(
            JoinEdge(col.table_name, col.column_name, referenced_table, referenced_column)
        )
        graph.setdefault(referenced_table, []).append(
            JoinEdge(referenced_table, referenced_column, col.table_name, col.column_name)
        )
    return graph


def _table_columns(db: Session, project_id: int, table_name: str) -> List[DiscoveredColumn]:
    return db.query(DiscoveredColumn).filter(
        DiscoveredColumn.project_id == project_id,
        DiscoveredColumn.table_name == table_name
    ).all()


def _named_label_column(columns: List[DiscoveredColumn]) -> Optional[str]:
    """A genuine human-readable category label: name/title/category/
    description columns first, then any other non-id text column."""
    for col in columns:
        name = (col.column_name or "").lower()
        data_type = (col.data_type or "").lower()
        if col.is_primary_key or name.endswith("_id"):
            continue
        if any(k in name for k in EXCLUDE_LABEL_KEYWORDS):
            continue
        if any(k in name for k in LABEL_NAME_KEYWORDS) and any(k in data_type for k in LABEL_TYPE_KEYWORDS):
            return col.column_name

    for col in columns:
        name = (col.column_name or "").lower()
        data_type = (col.data_type or "").lower()
        if col.is_primary_key or name.endswith("_id"):
            continue
        if any(k in name for k in EXCLUDE_LABEL_KEYWORDS):
            continue
        if any(k in data_type for k in LABEL_TYPE_KEYWORDS):
            return col.column_name

    return None


FULL_NAME_COLUMN_PAIRS = (("first_name", "last_name"),)


def _full_name_expr(columns: List[DiscoveredColumn], table_name: str) -> Optional[str]:
    """A person-like dimension table (staff, actor, customer, ...) has no
    single 'name' column but a first_name/last_name pair — those are
    individually excluded as label candidates (too identifying alone),
    but concatenated they make a genuine, readable category label like
    "Mike Hillyer" instead of a bare id. Generic: works for any table
    with this column-naming convention, not just Pagila's staff table."""
    names = {(col.column_name or "").lower(): col.column_name for col in columns}
    for first, last in FULL_NAME_COLUMN_PAIRS:
        if first in names and last in names:
            return f"({table_name}.{names[first]} || ' ' || {table_name}.{names[last]})"
    return None


def _is_junction_table(columns: List[DiscoveredColumn]) -> bool:
    """A pure many-to-many join table (composite primary key, e.g.
    film_category) has no identity of its own worth charting by —
    it's just a hop on the way to a real dimension."""
    return sum(1 for c in columns if c.is_primary_key) >= 2


def _single_primary_key(columns: List[DiscoveredColumn]) -> Optional[str]:
    pks = [c.column_name for c in columns if c.is_primary_key]
    return pks[0] if len(pks) == 1 else None


def find_dimension_paths(
    db: Session,
    project_id: int,
    base_table: str,
    max_depth: int = 4,
    max_paths: int = 8
) -> List[JoinPath]:
    """
    Breadth-first searches the FK graph starting at base_table, looking
    for tables (up to max_depth hops away) that make a usable chart
    dimension. Each distinct table reached is resolved to either:
      - a genuine text label (category.name, film.title, ...), or
      - as a fallback for tables ≥2 hops away with no label column of
        their own (e.g. store), the table's own id — still a real,
        distinct dimension, just an unnamed one.
    Junction tables with a composite key (e.g. film_category) are never
    used as a dimension themselves, only passed through en route to one.
    Named-label paths are returned before id-fallback ones.
    """
    graph = build_fk_graph(db, project_id)
    visited = {base_table}
    queue = deque([(base_table, [])])
    named_paths: List[JoinPath] = []
    fallback_paths: List[JoinPath] = []
    seen_dimension_tables = set()

    while queue and (len(named_paths) + len(fallback_paths)) < max_paths * 2:
        table, edges = queue.popleft()
        if len(edges) >= max_depth:
            continue

        for edge in graph.get(table, []):
            if edge.to_table in visited:
                continue
            visited.add(edge.to_table)
            new_edges = edges + [edge]
            depth = len(new_edges)

            columns = _table_columns(db, project_id, edge.to_table)
            is_junction = _is_junction_table(columns)

            if edge.to_table not in seen_dimension_tables and not is_junction:
                full_name_expr = _full_name_expr(columns, edge.to_table)
                label_column = _named_label_column(columns)
                if full_name_expr:
                    seen_dimension_tables.add(edge.to_table)
                    named_paths.append(JoinPath(
                        edges=new_edges, label_table=edge.to_table,
                        label_column="name", is_named_label=True,
                        label_expr=full_name_expr,
                    ))
                elif label_column:
                    seen_dimension_tables.add(edge.to_table)
                    named_paths.append(JoinPath(
                        edges=new_edges, label_table=edge.to_table,
                        label_column=label_column, is_named_label=True
                    ))
                elif depth >= MIN_DEPTH_FOR_ID_FALLBACK:
                    pk_column = _single_primary_key(columns)
                    if pk_column:
                        seen_dimension_tables.add(edge.to_table)
                        fallback_paths.append(JoinPath(
                            edges=new_edges, label_table=edge.to_table,
                            label_column=pk_column, is_named_label=False
                        ))

            queue.append((edge.to_table, new_edges))

    return (named_paths + fallback_paths)[:max_paths]

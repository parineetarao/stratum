"""
Dashboard Chart Planner
=======================
Generates the dashboard's chart grid as a curated set of distinct,
meaningful analytical breakdowns — never a re-plot of a single scalar
KPI value. This is intentionally decoupled from the KPI summary cards:
a KPI card always shows the KPI's own scalar value, while a chart here
represents a genuine grouped, ranked, compositional, or time-series
dataset derived from that KPI's measure and the schema's own foreign
keys (so nothing here is Pagila-specific — it works from whatever
tables and relationships a project's schema discovery has found).

Flow:
    1. generate_candidates() builds every plausible chart (unexecuted
       SQL) from each approved KPI: a time-series if a date column
       exists, a categorical breakdown from the KPI's own table, a
       joined breakdown from any reachable dimension table, and a
       customer/user activity distribution if a customer-like FK
       exists.
    2. The router executes each candidate's SQL and calls
       classify_result() to decide, from the actual row count, whether
       it's chart-worthy at all and which visual form fits best.
    3. curate() picks a diverse ~5-6 chart final set.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from app.engine.dimension_finder import extract_table_name, find_dimensions, is_geo_column
from app.engine.relationship_graph import find_dimension_paths
from app.engine.chart_breakdown import (
    build_timeseries_sql,
    build_categorical_sql,
    build_joined_categorical_sql,
    build_segmentation_sql,
)

CUSTOMER_NAME_KEYWORDS = ["customer", "user", "client", "member", "subscriber"]
MAX_TOTAL_CHARTS = 5
DISPLAY_LIMIT = 10
DONUT_MAX_GROUPS = 6
BAR_MAX_GROUPS = 20
# Probed one row over the largest tier so the actual count of distinct
# groups can be told apart from "there are far more than we can show" —
# without this a 16-category set and a 1000-film set both look
# identical once truncated to the same small LIMIT.
CATEGORICAL_FETCH_LIMIT = BAR_MAX_GROUPS + 1


@dataclass
class ChartCandidate:
    widget_key: str
    title: str
    chart_form: str  # time_series | categorical | segmentation
    value_label: str
    sql: str
    mode: str
    unit: str
    source_kpi_id: Optional[int]
    category: Optional[str]
    dimension_table: Optional[str] = None
    # The KPI's own business-friendly name (e.g. "Total Rentals",
    # "Revenue") — used to build a meaningful y-axis label/series name
    # distinct from the dimension being grouped by (value_label).
    metric_name: str = ""


@dataclass
class FinalizedChart:
    widget_key: str
    title: str
    chart_type: str
    chart_form: str
    value_label: str
    sql: str
    mode: str
    unit: str
    source_kpi_id: Optional[int]
    category: Optional[str]
    rows: List[Dict[str, Any]] = field(default_factory=list)
    metric_name: str = ""


def axis_metadata(chart_form: str, value_label: str, metric_name: str, unit: str) -> Dict[str, str]:
    """
    Derives business-friendly axis fields/labels from a finalized chart's
    metadata, generically (no chart-specific hardcoding) so the frontend
    never has to guess or hardcode axis titles per chart.
    """
    metric = metric_name or value_label or "Value"
    y_label = f"{metric} ({unit.title()})" if unit and unit.lower() not in ("", "count") else metric

    if chart_form == "time_series":
        return {"x_field": "period", "y_field": "value", "x_axis_label": "Date", "y_axis_label": y_label, "series_name": metric}

    x_label = value_label or "Category"
    return {"x_field": "label", "y_field": "value", "x_axis_label": x_label, "y_axis_label": y_label, "series_name": metric}


def _customer_id_column(categorical_columns: List[str]) -> Optional[str]:
    for col in categorical_columns:
        name = col.lower()
        if any(k in name for k in CUSTOMER_NAME_KEYWORDS):
            return col
    return None


def _geo_column(categorical_columns: List[str]) -> Optional[str]:
    for col in categorical_columns:
        if is_geo_column(col):
            return col
    return None


GENERIC_LABEL_COLUMNS = {"name", "title", "label"}


def _dimension_label(column_name: str, table_name: Optional[str] = None) -> str:
    # A column literally called "name"/"title" doesn't describe the
    # dimension itself — the table it lives on does (category.name ->
    # "Category", not "Name").
    if table_name and column_name.lower() in GENERIC_LABEL_COLUMNS:
        return table_name.replace("_", " ").title()
    return column_name.replace("_id", "").replace("_", " ").title()


def generate_candidates(db, project_id: int, kpis: List[Dict[str, Any]]) -> List[ChartCandidate]:
    candidates: List[ChartCandidate] = []
    seen_dimension_tables: set = set()

    for kpi in kpis:
        kpi_id = kpi.get("id")
        sql = kpi.get("sql") or ""
        mode = kpi.get("mode", "source")
        unit = kpi.get("unit") or ""
        category = kpi.get("category")
        name = kpi.get("name") or ""
        base_table = extract_table_name(sql)
        if not base_table:
            continue

        dims = find_dimensions(db, project_id, base_table)
        date_columns = dims.get("date_columns") or []
        categorical_columns = dims.get("categorical_columns") or []

        if date_columns:
            ts_sql = build_timeseries_sql(sql, date_columns[0])
            if ts_sql:
                candidates.append(ChartCandidate(
                    widget_key=f"kpi{kpi_id}_timeseries",
                    title=f"{name} Over Time",
                    chart_form="time_series",
                    value_label="Trend",
                    sql=ts_sql,
                    mode=mode,
                    unit=unit,
                    source_kpi_id=kpi_id,
                    category=category,
                    metric_name=name,
                ))

        customer_col = _customer_id_column(categorical_columns)
        if customer_col:
            seg_sql = build_segmentation_sql(base_table, customer_col)
            candidates.append(ChartCandidate(
                widget_key=f"kpi{kpi_id}_segments",
                title="Customer Activity Distribution",
                chart_form="segmentation",
                value_label="Customers",
                sql=seg_sql,
                mode=mode,
                unit="count",
                source_kpi_id=kpi_id,
                category=category,
                metric_name="Customers",
            ))

        # A geographic breakdown using a place-name column already on the
        # KPI's own table (no join needed, so it works regardless of
        # whether the schema declares real foreign keys) — e.g.
        # customers.region or suppliers.supplier_region. Generic keyword
        # match, not tied to any specific dataset.
        geo_col = _geo_column(categorical_columns)
        if geo_col:
            geo_label = _dimension_label(geo_col)
            geo_sql = build_categorical_sql(sql, geo_col, limit=CATEGORICAL_FETCH_LIMIT, display_name=geo_label)
            if geo_sql:
                candidates.append(ChartCandidate(
                    widget_key=f"kpi{kpi_id}_geo_{geo_col}",
                    title=f"{name} by {geo_label}",
                    chart_form="geographic",
                    value_label=geo_label,
                    sql=geo_sql,
                    mode=mode,
                    unit=unit,
                    source_kpi_id=kpi_id,
                    category=category,
                    metric_name=name,
                ))

        # Joined breakdowns onto real dimension tables (category, film,
        # store, ...) reached by following the schema's own foreign keys.
        # This is computed once per base table (not per KPI), so two
        # KPIs sharing a table (e.g. "Total Transactions" and
        # "Transactions Per Customer", both on rental) don't fight over
        # or duplicate the same dimensions.
        all_paths = find_dimension_paths(db, project_id, base_table)
        for path in all_paths:
            if path.dimension_table in seen_dimension_tables:
                continue
            joined_sql = build_joined_categorical_sql(sql, base_table, path, limit=CATEGORICAL_FETCH_LIMIT)
            if not joined_sql:
                continue
            seen_dimension_tables.add(path.dimension_table)
            label = _dimension_label(path.label_column, path.label_table)
            candidates.append(ChartCandidate(
                widget_key=f"kpi{kpi_id}_by_{path.dimension_table}",
                title=f"{name} by {label}",
                chart_form="categorical",
                value_label=label,
                sql=joined_sql,
                mode=mode,
                unit=unit,
                source_kpi_id=kpi_id,
                category=category,
                dimension_table=path.dimension_table,
                metric_name=name,
            ))

        # A categorical breakdown using a dimension already on the KPI's
        # own table (no join needed) — only when this base table has no
        # joinable dimensions at all, so a ratio/derived KPI sharing a
        # table with an already-charted count KPI doesn't get a
        # redundant (and often nonsensical) breakdown of its own.
        if categorical_columns and not all_paths:
            col = categorical_columns[0]
            label = _dimension_label(col)
            cat_sql = build_categorical_sql(sql, col, limit=CATEGORICAL_FETCH_LIMIT, display_name=label)
            if cat_sql:
                candidates.append(ChartCandidate(
                    widget_key=f"kpi{kpi_id}_by_{col}",
                    title=f"{name} by {label}",
                    chart_form="categorical",
                    value_label=label,
                    sql=cat_sql,
                    mode=mode,
                    unit=unit,
                    source_kpi_id=kpi_id,
                    category=category,
                    metric_name=name,
                ))

    return candidates


def classify_result(candidate: ChartCandidate, rows: List[Dict[str, Any]]) -> Optional[FinalizedChart]:
    """
    Decides, from the actual executed row count, whether a candidate is
    chart-worthy and which visual form it should render as. A result
    with fewer than 2 rows is indistinguishable from a scalar value, so
    it is rejected outright rather than rendered as a fake chart.
    """
    if not rows or len(rows) < 2:
        return None

    if candidate.chart_form == "time_series":
        return FinalizedChart(
            widget_key=candidate.widget_key,
            title=candidate.title,
            chart_type="line",
            chart_form="time_series",
            value_label=candidate.value_label,
            sql=candidate.sql,
            mode=candidate.mode,
            unit=candidate.unit,
            source_kpi_id=candidate.source_kpi_id,
            category=candidate.category,
            rows=rows,
            metric_name=candidate.metric_name,
        )

    if candidate.chart_form == "segmentation":
        return FinalizedChart(
            widget_key=candidate.widget_key,
            title=candidate.title,
            chart_type="bar",
            chart_form="segmentation",
            value_label=candidate.value_label,
            sql=candidate.sql,
            mode=candidate.mode,
            unit=candidate.unit,
            source_kpi_id=candidate.source_kpi_id,
            category=candidate.category,
            rows=rows,
            metric_name=candidate.metric_name,
        )

    if candidate.chart_form == "geographic":
        # A map reads best with a modest number of regions — beyond that
        # a choropleth becomes visual noise, so fall back to the same
        # top-N treatment a ranked bar chart would get.
        rows_for_map = rows[:DISPLAY_LIMIT] if len(rows) > BAR_MAX_GROUPS else rows
        return FinalizedChart(
            widget_key=candidate.widget_key,
            title=candidate.title,
            chart_type="map",
            chart_form="geographic",
            value_label=candidate.value_label,
            sql=candidate.sql,
            mode=candidate.mode,
            unit=candidate.unit,
            source_kpi_id=candidate.source_kpi_id,
            category=candidate.category,
            rows=rows_for_map,
            metric_name=candidate.metric_name,
        )

    # Categorical: classify by how many distinct groups actually exist.
    # A small set reads well as a composition (donut); a large one is a
    # ranking (top-N, horizontal bar) — the fetch was probed one row
    # past BAR_MAX_GROUPS so hitting that count means there are more
    # groups than could ever fit a plain bar chart. Anything in between
    # gets a full vertical bar, one bar per category.
    title = candidate.title
    if len(rows) > BAR_MAX_GROUPS:
        rows = rows[:DISPLAY_LIMIT]
        chart_type = "horizontal_bar"
        title = f"Top {DISPLAY_LIMIT} {title}"
    elif len(rows) <= DONUT_MAX_GROUPS:
        chart_type = "donut"
    else:
        chart_type = "bar"

    return FinalizedChart(
        widget_key=candidate.widget_key,
        title=title,
        chart_type=chart_type,
        chart_form="categorical",
        value_label=candidate.value_label,
        sql=candidate.sql,
        mode=candidate.mode,
        unit=candidate.unit,
        source_kpi_id=candidate.source_kpi_id,
        category=candidate.category,
        rows=rows,
        metric_name=candidate.metric_name,
    )


def curate(charts: List[FinalizedChart], max_total: int = MAX_TOTAL_CHARTS + 1) -> List[FinalizedChart]:
    """
    Picks a visually diverse final set: at most one of each distinct
    slot where available, then fills remaining slots without repeating
    unnecessarily. Slots are matched on (chart_type, chart_form) rather
    than chart_type alone — segmentation and a plain categorical
    breakdown can both render as a bar chart, but they're different
    analytical stories and shouldn't compete for the same slot.
    """
    if len(charts) <= max_total:
        return charts

    def pick_best(chart_type: str, chart_form: Optional[str], pool: List[FinalizedChart]) -> Optional[FinalizedChart]:
        matches = [
            c for c in pool
            if c.chart_type == chart_type and (chart_form is None or c.chart_form == chart_form)
        ]
        if not matches:
            return None
        if chart_type == "donut":
            # A composition chart reads best with fewer, more evenly
            # split slices — prefer the smallest genuine category set.
            return min(matches, key=lambda c: len(c.rows))
        return matches[0]

    picked: List[FinalizedChart] = []
    remaining = list(charts)

    slots = [
        ("line", "time_series"),
        ("map", "geographic"),
        ("bar", "segmentation"),
        ("horizontal_bar", None),
        ("donut", None),
        ("bar", "categorical"),
    ]
    for chart_type, chart_form in slots:
        found = pick_best(chart_type, chart_form, remaining)
        if found:
            picked.append(found)
            remaining.remove(found)
        if len(picked) >= max_total:
            break

    for c in remaining:
        if len(picked) >= max_total:
            break
        picked.append(c)

    return picked

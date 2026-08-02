"""
Chart Selector
==============
Rule-based engine that determines the appropriate chart type for each
approved KPI. A KPI's own SQL only ever returns a single scalar value,
so it can never be charted directly — every chart on the dashboard is
a genuine breakdown (time-series or categorical) derived from the
KPI's measure and a compatible dimension discovered on its source
table (see dimension_finder.py / chart_breakdown.py).

Rules:
    percentage/rate KPIs         → donut chart (composition, no dimension needed)
    KPI with a date dimension    → line chart (monthly time series)
    KPI with a categorical dim   → bar chart (top-N breakdown)
    no usable dimension          → KPI card only, no chart is fabricated
"""

from typing import List, Dict, Any, Optional
from app.engine.chart_breakdown import build_timeseries_sql, build_categorical_sql


PERCENTAGE_UNITS = {"percentage", "rate", "ratio"}
CURRENCY_UNITS = {"currency"}
COUNT_UNITS = {"count"}

CHART_TYPE_OPTIONS = {
    "currency": ["line", "bar", "area", "card", "table"],
    "count": ["bar", "line", "area", "card", "table"],
    "percentage": ["donut", "bar", "card"],
    "default": ["bar", "card", "table"]
}


def _dimension_label(column_name: str) -> str:
    return column_name.replace("_id", "").replace("_", " ").title()


def get_supported_chart_types(unit: str) -> List[str]:
    unit_lower = (unit or "").lower()
    return CHART_TYPE_OPTIONS.get(unit_lower, CHART_TYPE_OPTIONS["default"])


def select_chart_type(
    kpi: Dict[str, Any],
    dimensions: Optional[Dict[str, List[str]]] = None
) -> Dict[str, Any]:
    """
    Determines chart type and generates chart configuration for a KPI.

    A KPI's own SQL always returns a single scalar value, so a chart is
    only produced when a real breakdown is possible: a date dimension
    on the KPI's source table (time series) or a categorical dimension
    (top-N breakdown). With no such dimension, the KPI stays a summary
    card and no chart is fabricated.

    Returns a chart config dict containing:
        chart_type: line, bar, donut, or card
        chart_form: time_series, categorical, composition, or None
        title: display title
        value_label: label for the value axis
        timeseries_sql / breakdown_sql: the derived SQL to execute, if any
        has_chart: whether to render a chart or just a KPI card
    """
    unit = (kpi.get("unit") or "").lower()
    name = kpi.get("name", "")
    sql = kpi.get("sql", "")
    value = kpi.get("computed_value")
    supported = get_supported_chart_types(unit)
    dimensions = dimensions or {"date_columns": [], "categorical_columns": []}

    if unit in PERCENTAGE_UNITS:
        return {
            "chart_type": "donut",
            "chart_form": "composition",
            "title": name,
            "value_label": "Percentage",
            "timeseries_sql": None,
            "breakdown_sql": None,
            "has_chart": True,
            "donut_value": value,
            "donut_max": 100,
            "supported_chart_types": supported
        }

    date_columns = dimensions.get("date_columns") or []
    categorical_columns = dimensions.get("categorical_columns") or []

    def categorical_candidate() -> Optional[Dict[str, Any]]:
        if not categorical_columns:
            return None
        dimension_column = categorical_columns[0]
        breakdown_sql = build_categorical_sql(sql, dimension_column)
        if not breakdown_sql:
            return None
        dimension_label = _dimension_label(dimension_column)
        return {
            "chart_type": "bar",
            "chart_form": "categorical",
            "title": f"{name} by {dimension_label}",
            "value_label": dimension_label,
            "timeseries_sql": None,
            "breakdown_sql": breakdown_sql,
            "has_chart": True,
            "supported_chart_types": supported
        }

    if date_columns:
        timeseries_sql = build_timeseries_sql(sql, date_columns[0])
        if timeseries_sql:
            config = {
                "chart_type": "line",
                "chart_form": "time_series",
                "title": f"{name} Over Time",
                "value_label": "Trend",
                "timeseries_sql": timeseries_sql,
                "breakdown_sql": None,
                "has_chart": True,
                "supported_chart_types": supported
            }
            # A time series with too few distinct periods to be worth
            # charting falls back to a categorical breakdown (if one
            # exists) rather than downgrading straight to a card.
            config["fallback"] = categorical_candidate()
            return config

    categorical = categorical_candidate()
    if categorical:
        return categorical

    return {
        "chart_type": "card",
        "chart_form": None,
        "title": name,
        "value_label": "",
        "timeseries_sql": None,
        "breakdown_sql": None,
        "has_chart": False,
        "supported_chart_types": supported
    }


def format_value(value: Optional[float], unit: str) -> str:
    """
    Formats a KPI value for display based on its unit.
    Currency values get a rupee/dollar prefix.
    Percentage values get a % suffix.
    Count values are shown as integers.
    """
    if value is None:
        return "N/A"

    unit = (unit or "").lower()

    if unit == "currency":
        if value >= 1_000_000:
            return f"${value/1_000_000:.1f}M"
        elif value >= 1_000:
            return f"${value/1_000:.1f}K"
        else:
            return f"${value:.2f}"

    if unit == "percentage":
        return f"{value:.1f}%"

    if unit == "count":
        if value >= 1_000_000:
            return f"{value/1_000_000:.1f}M"
        elif value >= 1_000:
            return f"{value/1_000:.1f}K"
        else:
            return f"{int(value):,}"

    return str(round(value, 2))


def build_dashboard_charts(
    kpis: List[Dict[str, Any]],
    dimensions_by_kpi: Optional[Dict[int, Dict[str, List[str]]]] = None
) -> List[Dict[str, Any]]:
    """
    Processes all approved KPIs and returns chart configurations.
    Each item in the returned list represents one dashboard element.
    """
    dimensions_by_kpi = dimensions_by_kpi or {}
    charts = []
    for kpi in kpis:
        dims = dimensions_by_kpi.get(kpi.get("id"))
        chart_config = select_chart_type(kpi, dims)
        charts.append({
            "kpi_id": kpi.get("id"),
            "kpi_name": kpi.get("name"),
            "category": kpi.get("category"),
            "unit": kpi.get("unit"),
            "computed_value": kpi.get("computed_value"),
            "formatted_value": format_value(
                kpi.get("computed_value"),
                kpi.get("unit", "")
            ),
            "sql": kpi.get("sql"),
            "mode": kpi.get("mode", "source"),
            **chart_config
        })
    return charts
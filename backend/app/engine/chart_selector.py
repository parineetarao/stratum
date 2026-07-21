"""
Chart Selector
==============
Rule-based engine that determines the appropriate chart type
for each approved KPI and generates time-series SQL variants
where applicable.

Rules:
    percentage/rate KPIs     → donut chart
    count KPIs               → bar chart or KPI card
    currency with time dim   → line chart (time series)
    currency without time    → KPI card + bar chart
    scalar single value      → KPI card only

Time series generation:
    For currency and count KPIs, attempts to generate a monthly
    trend version of the KPI SQL using DATE_TRUNC.
    Falls back to KPI card only if no date column is detected.
"""

from typing import List, Dict, Any, Optional


PERCENTAGE_UNITS = {"percentage", "rate", "ratio"}
CURRENCY_UNITS = {"currency"}
COUNT_UNITS = {"count"}

DATE_COLUMN_KEYWORDS = [
    "date", "time", "at", "on", "created", "updated",
    "payment_date", "rental_date", "order_date", "transaction_date"
]
CHART_TYPE_OPTIONS = {
    "currency": ["line", "bar", "area", "card", "table"],
    "count": ["bar", "line", "area", "card", "table"],
    "percentage": ["donut", "bar", "card"],
    "default": ["bar", "card", "table"]
}


def get_supported_chart_types(unit: str) -> List[str]:
    unit_lower = (unit or "").lower()
    return CHART_TYPE_OPTIONS.get(unit_lower, CHART_TYPE_OPTIONS["default"])


def detect_date_column(sql: str) -> Optional[str]:
    """
    Attempts to detect a date column in the SQL statement
    by looking for common date column name patterns.
    Returns the column name if found, None otherwise.
    """
    sql_lower = sql.lower()
    for keyword in DATE_COLUMN_KEYWORDS:
        if keyword in sql_lower:
            return keyword
    return None


def generate_timeseries_sql(
    original_sql: str,
    table_name: str,
    measure_expression: str,
    date_col: str
) -> Optional[str]:
    """
    Generates a monthly time series version of a scalar KPI SQL.
    Takes the original aggregation and adds DATE_TRUNC grouping.

    Example:
    Original: SELECT ROUND(SUM(amount)::NUMERIC, 2) as value FROM payment
    Generated: SELECT DATE_TRUNC('month', payment_date) as period,
               ROUND(SUM(amount)::NUMERIC, 2) as value
               FROM payment
               GROUP BY period ORDER BY period
    """
    try:
        from_idx = original_sql.upper().find("FROM")
        if from_idx == -1:
            return None

        from_clause = original_sql[from_idx:]

        return (
            f"SELECT DATE_TRUNC('month', {date_col}) as period, "
            f"{measure_expression} as value "
            f"{from_clause} "
            f"GROUP BY period ORDER BY period"
        )
    except Exception:
        return None


def select_chart_type(kpi: Dict[str, Any]) -> Dict[str, Any]:
    """
    Determines chart type and generates chart configuration for a KPI.

    Returns a chart config dict containing:
        chart_type: line, bar, donut, or card
        title: display title
        value_label: label for the value axis
        timeseries_sql: monthly breakdown SQL if applicable
        has_chart: whether to render a chart or just a KPI card
    """
    unit = (kpi.get("unit") or "").lower()
    name = kpi.get("name", "")
    sql = kpi.get("sql", "")
    value = kpi.get("computed_value")
    supported = get_supported_chart_types(unit)

    if unit in PERCENTAGE_UNITS:
        return {
            "chart_type": "donut",
            "title": name,
            "value_label": "Percentage",
            "timeseries_sql": None,
            "has_chart": True,
            "donut_value": value,
            "donut_max": 100,
            "supported_chart_types": supported
        }

    date_col = detect_date_column(sql)

    if unit in CURRENCY_UNITS:
        timeseries_sql = None
        if date_col:
            from_idx = sql.upper().find("FROM")
            if from_idx != -1:
                select_part = sql[7:from_idx].strip()
                from_part = sql[from_idx:]
                timeseries_sql = (
                    f"SELECT DATE_TRUNC('month', {date_col}) as period, "
                    f"{select_part} as value "
                    f"{from_part} "
                    f"GROUP BY DATE_TRUNC('month', {date_col}) "
                    f"ORDER BY period"
                )

        chart_type = "line" if timeseries_sql else "bar"

        return {
            "chart_type": chart_type,
            "title": name,
            "value_label": "Amount",
            "timeseries_sql": timeseries_sql,
            "has_chart": True,
            "supported_chart_types": supported
        }

    if unit in COUNT_UNITS:
        return {
            "chart_type": "bar",
            "title": name,
            "value_label": "Count",
            "timeseries_sql": None,
            "has_chart": value is not None and value > 0,
            "supported_chart_types": supported
        }

    return {
        "chart_type": "card",
        "title": name,
        "value_label": "",
        "timeseries_sql": None,
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
    kpis: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Processes all approved KPIs and returns chart configurations.
    Each item in the returned list represents one dashboard element.
    """
    charts = []
    for kpi in kpis:
        chart_config = select_chart_type(kpi)
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
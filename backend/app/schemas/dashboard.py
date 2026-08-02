from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class ChartDataPoint(BaseModel):
    period: Optional[str] = None
    value: Optional[float] = None
    label: Optional[str] = None


class ChartConfigUpdate(BaseModel):
    chart_type: Optional[str] = None
    custom_title: Optional[str] = None
    color_scheme: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    grid_position: Optional[int] = None
    grid_width: Optional[int] = None
    is_visible: Optional[bool] = None
    chart_options: Optional[Dict[str, Any]] = None


class ChartConfigResponse(BaseModel):
    id: int
    project_id: int
    widget_key: str
    kpi_id: Optional[int] = None
    chart_type: Optional[str] = None
    custom_title: Optional[str] = None
    color_scheme: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    grid_position: Optional[int] = None
    grid_width: Optional[int] = None
    is_visible: Optional[bool] = None
    chart_options: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class KPISummaryCard(BaseModel):
    """A scalar KPI value for the top summary row — never a chart."""
    kpi_id: int
    kpi_name: str
    category: Optional[str]
    unit: Optional[str]
    computed_value: Optional[float]
    formatted_value: str
    sql: str
    mode: str
    aggregation: Optional[str] = None
    chart_data: Optional[List[ChartDataPoint]] = None


class DashboardChart(BaseModel):
    """An analytical breakdown widget — always grouped, ranked,
    compositional, or time-series data, never a single scalar row."""
    widget_key: str
    title: str
    custom_title: Optional[str] = None
    chart_type: str
    chart_form: str
    value_label: str
    sql: str
    mode: str
    unit: Optional[str] = None
    category: Optional[str] = None
    source_kpi_id: Optional[int] = None
    chart_data: List[ChartDataPoint] = []
    grid_position: int = 0
    grid_width: int = 6
    is_visible: bool = True
    supported_chart_types: List[str] = []


class DashboardResponse(BaseModel):
    project_id: int
    project_name: str
    domain: str
    mode: str
    total_kpis: int
    kpi_cards: List[KPISummaryCard]
    charts: List[DashboardChart]
    last_refreshed: str


class DashboardRefreshResponse(BaseModel):
    project_id: int
    refreshed_kpis: int
    kpi_cards: List[KPISummaryCard]
    charts: List[DashboardChart]
    last_refreshed: str


class ReportSection(BaseModel):
    title: str
    content: str


class DashboardReportResponse(BaseModel):
    project_id: int
    project_name: str
    domain: str
    generated_at: str
    quality_score: Optional[int]
    total_kpis: int
    kpi_summary: List[Dict[str, Any]]
    executive_summary: Optional[str]
    findings: Optional[List[Dict[str, Any]]]
    sections: List[ReportSection]

from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime


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
    kpi_id: int
    chart_type: str
    custom_title: Optional[str]
    color_scheme: Optional[str]
    x_label: Optional[str]
    y_label: Optional[str]
    grid_position: int
    grid_width: int
    is_visible: bool
    chart_options: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class DashboardChart(BaseModel):
    kpi_id: int
    kpi_name: str
    category: Optional[str]
    unit: Optional[str]
    computed_value: Optional[float]
    formatted_value: str
    sql: str
    mode: str
    chart_type: str
    chart_form: Optional[str] = None
    title: str
    value_label: str
    has_chart: bool
    color_scheme: Optional[str] = "default"
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    grid_position: Optional[int] = 0
    grid_width: Optional[int] = 6
    timeseries_sql: Optional[str] = None
    donut_value: Optional[float] = None
    donut_max: Optional[float] = None
    chart_data: Optional[List[ChartDataPoint]] = None
    supported_chart_types: List[str] = []
    custom_title: Optional[str] = None
    is_visible: bool = True


class DashboardResponse(BaseModel):
    project_id: int
    project_name: str
    domain: str
    mode: str
    total_kpis: int
    charts: List[DashboardChart]
    last_refreshed: str


class DashboardRefreshResponse(BaseModel):
    project_id: int
    refreshed_kpis: int
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
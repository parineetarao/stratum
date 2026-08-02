import type { DashboardChart } from '@/lib/api';

// Reuses the category hues already established in KpiCard.tsx so dashboard
// charts read as the same visual system as the KPI explorer.
const CATEGORY_COLORS: Record<string, string> = {
  revenue: '#60a5fa',
  financial: '#60a5fa',
  customer: '#c084fc',
  user: '#c084fc',
  volume: '#2dd4bf',
  activity: '#2dd4bf',
  inventory: '#fbbf24',
  product: '#fbbf24',
  quality: '#22d3ee',
};

export function getSeriesColor(category: string | null | undefined): string {
  const cat = (category || '').toLowerCase();
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (cat.includes(key)) return CATEGORY_COLORS[key];
  }
  return '#8b7dff';
}

const AXIS_LABEL_STYLE = {
  color: 'rgba(226, 232, 240, 0.5)',
  fontSize: 11,
};

const GRID_LINE_STYLE = {
  color: 'rgba(148, 163, 184, 0.1)',
};

const TOOLTIP_BASE = {
  backgroundColor: '#0d1420',
  borderColor: 'rgba(148, 163, 184, 0.2)',
  borderWidth: 1,
  textStyle: { color: '#f4f4f5', fontSize: 12 },
  padding: [8, 12],
};

function pointLabel(point: { period?: string | null; label?: string | null }, fallback: string): string {
  if (point.label) return point.label;
  if (!point.period) return fallback;
  const d = new Date(point.period);
  if (Number.isNaN(d.getTime())) return point.period;
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function buildChartOption(chart: DashboardChart, chartType: string): Record<string, unknown> {
  const color = getSeriesColor(chart.category);
  const points = chart.chart_data || [];

  if (chartType === 'line' || chartType === 'area') {
    const categories = points.map((p) => pointLabel(p, chart.kpi_name));
    const values = points.map((p) => p.value ?? 0);
    return {
      color: [color],
      grid: { left: 44, right: 16, top: 20, bottom: 28 },
      tooltip: { trigger: 'axis', ...TOOLTIP_BASE },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: GRID_LINE_STYLE },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_STYLE,
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: GRID_LINE_STYLE },
        axisLabel: AXIS_LABEL_STYLE,
      },
      series: [
        {
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          areaStyle:
            chartType === 'area'
              ? {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: `${color}33` },
                      { offset: 1, color: `${color}00` },
                    ],
                  },
                }
              : undefined,
        },
      ],
    };
  }

  if (chartType === 'bar' || chartType === 'horizontal_bar') {
    const hasSeries = points.length > 0;
    const categories = hasSeries ? points.map((p) => pointLabel(p, chart.kpi_name)) : [chart.kpi_name];
    const values = hasSeries ? points.map((p) => p.value ?? 0) : [chart.computed_value ?? 0];
    const horizontal = chartType === 'horizontal_bar';

    const categoryAxis = {
      type: 'category' as const,
      data: categories,
      axisLine: { lineStyle: GRID_LINE_STYLE },
      axisTick: { show: false },
      axisLabel: AXIS_LABEL_STYLE,
    };
    const valueAxis = {
      type: 'value' as const,
      splitLine: { lineStyle: GRID_LINE_STYLE },
      axisLabel: AXIS_LABEL_STYLE,
    };

    return {
      color: [color],
      grid: horizontal ? { left: 90, right: 20, top: 20, bottom: 20 } : { left: 44, right: 16, top: 20, bottom: 28 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...TOOLTIP_BASE },
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [
        {
          type: 'bar',
          data: values,
          barMaxWidth: 36,
          itemStyle: { color, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        },
      ],
    };
  }

  if (chartType === 'donut' || chartType === 'pie') {
    const value = chart.donut_value ?? chart.computed_value ?? 0;
    const max = chart.donut_max ?? 100;
    const remainder = Math.max(0, max - value);
    return {
      tooltip: { trigger: 'item', ...TOOLTIP_BASE },
      series: [
        {
          type: 'pie',
          radius: chartType === 'donut' ? ['58%', '80%'] : ['0%', '80%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: '#080d16',
            borderWidth: 2,
          },
          data: [
            { value, name: chart.kpi_name, itemStyle: { color } },
            { value: remainder, name: 'Remaining', itemStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
          ],
        },
      ],
      graphic:
        chartType === 'donut'
          ? [
              {
                type: 'text',
                left: 'center',
                top: 'center',
                style: {
                  text: chart.formatted_value,
                  fill: '#f5f5f7',
                  fontSize: 20,
                  fontWeight: 700,
                },
              },
            ]
          : [],
    };
  }

  return {};
}

export const CHART_TYPE_LABELS: Record<string, string> = {
  line: 'Line',
  bar: 'Bar',
  horizontal_bar: 'Horizontal Bar',
  donut: 'Donut',
  pie: 'Pie',
  area: 'Area',
  table: 'Table',
  card: 'Card',
};

export function allowedChartTypesFor(chart: DashboardChart): string[] {
  const hasData = Boolean(chart.chart_data && chart.chart_data.length > 0);
  if (!hasData) return ['card'];

  const types = ['bar', 'horizontal_bar', 'donut', 'pie', 'table'];
  // Line/area only make sense for a genuine time-ordered series — a
  // categorical breakdown (by store, by category, ...) isn't a trend.
  if (chart.chart_form === 'time_series') types.unshift('area', 'line');
  return Array.from(new Set(types));
}

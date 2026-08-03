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
  // Domain-specific categories from backend/app/domains/*.py that don't
  // literally contain one of the keys above — mapped onto the existing
  // palette so the same visual system still diversifies instead of
  // everything collapsing into the fallback color.
  production: '#2dd4bf',
  coverage: '#22d3ee',
  costs: '#fbbf24',
  risk: '#f472b6',
};

// Fixed-order categorical palette for multi-slice/multi-bar charts —
// assigned by position, never cycled or re-derived per render.
const SLICE_PALETTE = ['#8b7dff', '#60a5fa', '#2dd4bf', '#fbbf24', '#c084fc', '#22d3ee', '#f472b6', '#a3e635'];

// Named presets a user can pick from the chart tile's three-dot menu to
// override the category-derived color. No color-picker — presets only.
export const PALETTE_PRESETS: Record<string, { label: string; color: string; slices: string[] }> = {
  blue: { label: 'Blue', color: '#60a5fa', slices: ['#60a5fa', '#3b82f6', '#93c5fd', '#1d4ed8', '#bfdbfe', '#2563eb'] },
  purple: { label: 'Purple', color: '#c084fc', slices: ['#c084fc', '#a855f7', '#d8b4fe', '#7e22ce', '#e9d5ff', '#9333ea'] },
  teal: { label: 'Teal', color: '#2dd4bf', slices: ['#2dd4bf', '#14b8a6', '#5eead4', '#0d9488', '#99f6e4', '#0f766e'] },
  amber: { label: 'Amber', color: '#fbbf24', slices: ['#fbbf24', '#f59e0b', '#fcd34d', '#d97706', '#fde68a', '#b45309'] },
  risk: { label: 'Risk', color: '#f87171', slices: ['#f87171', '#ef4444', '#fca5a5', '#dc2626', '#fecaca', '#b91c1c'] },
  mixed: { label: 'Mixed', color: '#8b7dff', slices: SLICE_PALETTE },
  monochrome: { label: 'Monochrome', color: '#94a3b8', slices: ['#94a3b8', '#64748b', '#cbd5e1', '#475569', '#e2e8f0', '#334155'] },
};

export function getSeriesColor(category: string | null | undefined, colorScheme?: string | null): string {
  if (colorScheme && PALETTE_PRESETS[colorScheme]) {
    return PALETTE_PRESETS[colorScheme].color;
  }
  const cat = (category || '').toLowerCase();
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (cat.includes(key)) return CATEGORY_COLORS[key];
  }
  return '#8b7dff';
}

function sliceColor(index: number, colorScheme?: string | null): string {
  const palette = (colorScheme && PALETTE_PRESETS[colorScheme]?.slices) || SLICE_PALETTE;
  return palette[index % palette.length];
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
  const color = getSeriesColor(chart.category, chart.color_scheme);
  const points = chart.chart_data || [];

  if (chartType === 'line' || chartType === 'area') {
    const categories = points.map((p) => pointLabel(p, chart.title));
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
    const categories = points.map((p) => pointLabel(p, chart.title));
    const values = points.map((p) => p.value ?? 0);
    const horizontal = chartType === 'horizontal_bar';

    const categoryAxis = {
      type: 'category' as const,
      data: categories,
      axisLine: { lineStyle: GRID_LINE_STYLE },
      axisTick: { show: false },
      axisLabel: AXIS_LABEL_STYLE,
      inverse: horizontal,
    };
    const valueAxis = {
      type: 'value' as const,
      splitLine: { lineStyle: GRID_LINE_STYLE },
      axisLabel: AXIS_LABEL_STYLE,
    };

    return {
      color: [color],
      grid: horizontal ? { left: 110, right: 20, top: 20, bottom: 20 } : { left: 44, right: 16, top: 20, bottom: 44 },
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
    const data = points.map((p, i) => ({
      value: p.value ?? 0,
      name: p.label || p.period || `Slice ${i + 1}`,
      itemStyle: { color: sliceColor(i, chart.color_scheme) },
    }));

    return {
      tooltip: { trigger: 'item', ...TOOLTIP_BASE },
      legend: {
        show: true,
        bottom: 0,
        left: 'center',
        textStyle: { color: 'rgba(226, 232, 240, 0.65)', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: 'pie',
          radius: chartType === 'donut' ? ['52%', '75%'] : ['0%', '75%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: '#080d16',
            borderWidth: 2,
          },
          data,
        },
      ],
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
};

export function allowedChartTypesFor(chart: DashboardChart): string[] {
  const hasData = Boolean(chart.chart_data && chart.chart_data.length > 0);
  if (!hasData) return [];

  const types = ['bar', 'horizontal_bar', 'donut', 'pie', 'table'];
  // Line/area only make sense for a genuine time-ordered series — a
  // categorical breakdown (by store, by category, ...) isn't a trend.
  if (chart.chart_form === 'time_series') types.unshift('area', 'line');
  return Array.from(new Set(types));
}

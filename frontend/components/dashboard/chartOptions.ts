import type { DashboardChart } from '@/lib/api';
import { ensureUsStatesMapRegistered, normalizeStateName, isRecognizedUsState } from './usStatesGeo';

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

const AXIS_NAME_STYLE = {
  color: 'rgba(226, 232, 240, 0.55)',
  fontSize: 11,
  fontWeight: 600 as const,
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

/** Coerces a chart_data value to a finite number — never lets a string,
 * null, or NaN reach ECharts, which would otherwise silently render as
 * a zero-height (or missing) bar/point. */
export function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Business-friendly value formatting for tooltips/labels, mirroring the
 * backend's format_value() semantics closely enough for display purposes
 * (the backend remains the source of truth for KPI card values). */
export function formatValue(value: number, unit?: string | null): string {
  const u = (unit || '').toLowerCase();
  if (u === 'currency') {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }
  if (u === 'percentage' || u === 'rate' || u === 'ratio') return `${value.toFixed(1)}%`;
  if (u === 'count' || u === '') {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  return String(Math.round(value * 100) / 100);
}

function unitSuffix(unit?: string | null): string {
  const u = (unit || '').toLowerCase();
  if (!u || u === 'count' || u === 'currency' || u === 'percentage' || u === 'rate' || u === 'ratio') return '';
  return ` ${u}`;
}

function pointLabel(point: { period?: string | null; label?: string | null }, fallback: string): string {
  if (point.label) return point.label;
  if (!point.period) return fallback;
  const d = new Date(point.period);
  if (Number.isNaN(d.getTime())) return point.period;
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** Truncates a long category label for axis display only — the full
 * label always remains available in the tooltip. */
function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return `${label.slice(0, maxLen - 1)}…`;
}

/**
 * Picks the value-axis min/max. Counts/totals start at zero by default
 * (the honest baseline). Only when the data range is narrow relative to
 * its magnitude — where a zero baseline would flatten every bar to the
 * same visual height — do we use a clearly labeled truncated axis, so
 * real differences stay readable without ever exaggerating them.
 */
function computeValueAxis(values: number[], axisLabel: string): Record<string, unknown> {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) {
    return { type: 'value', min: 0, name: axisLabel, nameLocation: 'middle', nameGap: 36, nameTextStyle: AXIS_NAME_STYLE, axisLabel: AXIS_LABEL_STYLE, splitLine: { lineStyle: GRID_LINE_STYLE } };
  }
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const range = max - min;
  const isNarrow = min > 0 && range > 0 && max > 0 && range / max < 0.15;

  if (isNarrow) {
    const padding = Math.max(range * 0.6, max * 0.02);
    return {
      type: 'value',
      min: Math.max(0, Math.floor(min - padding)),
      max: Math.ceil(max + padding),
      name: `${axisLabel} (truncated axis)`,
      nameLocation: 'middle',
      nameGap: 36,
      nameTextStyle: AXIS_NAME_STYLE,
      axisLabel: AXIS_LABEL_STYLE,
      splitLine: { lineStyle: GRID_LINE_STYLE },
    };
  }

  return {
    type: 'value',
    min: 0,
    name: axisLabel,
    nameLocation: 'middle',
    nameGap: 36,
    nameTextStyle: AXIS_NAME_STYLE,
    axisLabel: AXIS_LABEL_STYLE,
    splitLine: { lineStyle: GRID_LINE_STYLE },
  };
}

/**
 * Validates a chart is safe to render before ECharts ever sees it, per
 * the "never render a misleading chart" requirement. Returns a reason
 * string when the chart should be replaced with a fallback message, or
 * null when it's good to render.
 */
export function chartRenderIssue(chart: DashboardChart): string | null {
  const points = chart.chart_data || [];
  if (chart.chart_type === 'table') return null; // tables tolerate sparse/raw data
  if (points.length === 0) return 'no data';
  if (chart.chart_type === 'card') return 'scalar value must render as a KPI card, not a chart';

  const isTimeSeries = chart.chart_form === 'time_series';
  const hasNumericValues = points.every((p) => p.value === null || typeof p.value === 'number');
  if (!hasNumericValues) return 'non-numeric values';

  if (!isTimeSeries && (chart.chart_type === 'bar' || chart.chart_type === 'horizontal_bar' || chart.chart_type === 'donut' || chart.chart_type === 'pie' || chart.chart_type === 'map')) {
    const labels = points.map((p) => p.label || p.period || '');
    if (labels.some((l) => !l)) return 'missing category labels';
    const unique = new Set(labels);
    if (unique.size !== labels.length) return 'duplicate category labels';
  }

  if (chart.chart_type === 'map') {
    const recognized = points.some((p) => isRecognizedUsState(p.label));
    if (!recognized) return 'values do not correspond to recognized US states';
  }

  if (points.length === 1 && chart.chart_type !== 'donut' && chart.chart_type !== 'pie') {
    return 'single data point cannot be meaningfully charted';
  }

  return null;
}

export function buildChartOption(chart: DashboardChart, chartType: string): Record<string, unknown> {
  const color = getSeriesColor(chart.category, chart.color_scheme);
  const points = chart.chart_data || [];
  const unit = chart.unit;
  const seriesName = chart.series_name || chart.value_label || 'Value';
  const xAxisLabel = chart.x_axis_label || (chart.chart_form === 'time_series' ? 'Date' : chart.value_label || 'Category');
  const yAxisLabel = chart.y_axis_label || seriesName;

  if (chartType === 'line' || chartType === 'area') {
    const categories = points.map((p) => pointLabel(p, chart.title));
    const values = points.map((p) => toNumber(p.value));
    return {
      color: [color],
      grid: { left: 56, right: 16, top: 24, bottom: 44 },
      tooltip: {
        trigger: 'axis',
        ...TOOLTIP_BASE,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const first = arr[0] as { axisValue?: string; value?: number };
          const lines = arr.map((p) => {
            const pt = p as { seriesName?: string; value?: number };
            return `${pt.seriesName || seriesName}: <b>${formatValue(toNumber(pt.value), unit)}${unitSuffix(unit)}</b>`;
          });
          return [`${first?.axisValue ?? ''}`, ...lines].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: AXIS_NAME_STYLE,
        axisLine: { lineStyle: GRID_LINE_STYLE },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_STYLE,
      },
      yAxis: computeValueAxis(values, yAxisLabel),
      series: [
        {
          name: seriesName,
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
    const horizontal = chartType === 'horizontal_bar';
    // Ranked bars must read descending — the backend already orders
    // categorical breakdowns by value DESC, so this is a defensive
    // re-sort in case a saved-query widget's data isn't pre-sorted.
    const sortedPoints = [...points].sort((a, b) => toNumber(b.value) - toNumber(a.value));
    const rawLabels = sortedPoints.map((p) => pointLabel(p, chart.title));
    const values = sortedPoints.map((p) => toNumber(p.value));
    const fullLabelByIndex = rawLabels;

    // Long category names remain readable: horizontal bars get a wider
    // left margin and ellipsis only past a generous length (full text
    // stays available in the tooltip); vertical bars stay unrotated but
    // truncate before labels start overlapping.
    const maxLabelLen = horizontal ? 22 : 12;
    const displayLabels = rawLabels.map((l) => truncateLabel(l, maxLabelLen));
    const longestLabel = displayLabels.reduce((max, l) => Math.max(max, l.length), 0);
    const leftMargin = horizontal ? Math.min(220, Math.max(90, longestLabel * 7)) : 48;

    const categoryAxis = {
      type: 'category' as const,
      data: displayLabels,
      name: horizontal ? undefined : xAxisLabel,
      nameLocation: 'middle' as const,
      nameGap: 34,
      nameTextStyle: AXIS_NAME_STYLE,
      axisLine: { lineStyle: GRID_LINE_STYLE },
      axisTick: { show: false },
      axisLabel: AXIS_LABEL_STYLE,
      inverse: horizontal,
    };
    const valueAxis = computeValueAxis(values, horizontal ? xAxisLabel : yAxisLabel);

    return {
      color: [color],
      grid: horizontal
        ? { left: leftMargin, right: 24, top: 20, bottom: 36 }
        : { left: 56, right: 16, top: 20, bottom: 56 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...TOOLTIP_BASE,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p = arr[0] as { dataIndex?: number; value?: number };
          const idx = p?.dataIndex ?? 0;
          const label = fullLabelByIndex[idx] ?? '';
          const val = toNumber(p?.value);
          return `${label}<br/>${seriesName}: <b>${formatValue(val, unit)}${unitSuffix(unit)}</b>`;
        },
      },
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [
        {
          name: seriesName,
          type: 'bar',
          // Standard comparison bars are never stacked — each bar
          // stands alone against the shared value axis.
          data: values,
          barMaxWidth: 36,
          itemStyle: { color, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        },
      ],
    };
  }

  if (chartType === 'donut' || chartType === 'pie') {
    const total = points.reduce((sum, p) => sum + toNumber(p.value), 0);
    const data = points.map((p, i) => {
      const value = toNumber(p.value);
      const label = p.label || p.period || `Slice ${i + 1}`;
      return {
        value,
        name: label,
        itemStyle: { color: sliceColor(i, chart.color_scheme) },
      };
    });

    return {
      tooltip: {
        trigger: 'item',
        ...TOOLTIP_BASE,
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number };
          const value = toNumber(p.value);
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
          return `${p.name}<br/>${seriesName}: <b>${formatValue(value, unit)}${unitSuffix(unit)}</b> (${pct}%)`;
        },
      },
      legend: {
        show: true,
        bottom: 0,
        left: 'center',
        type: 'scroll',
        textStyle: { color: 'rgba(226, 232, 240, 0.65)', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        formatter: (name: string) => truncateLabel(name, 18),
      },
      series: [
        {
          name: seriesName,
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

  if (chartType === 'map') {
    const mapName = ensureUsStatesMapRegistered();
    // Only points that resolve to a real US state feature name are
    // handed to the map series — anything else (an unrecognized city,
    // a stray null) is silently dropped rather than plotted as a fake
    // "region", per the requirement that this renderer never blindly
    // paints arbitrary categories onto the US map.
    const byState = new Map<string, number>();
    for (const p of points) {
      const name = normalizeStateName(p.label);
      if (!name) continue;
      byState.set(name, (byState.get(name) || 0) + toNumber(p.value));
    }
    const data = Array.from(byState.entries()).map(([name, value]) => ({ name, value }));
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);

    return {
      tooltip: {
        trigger: 'item',
        ...TOOLTIP_BASE,
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number | string };
          // ECharts passes the raw string '-' for states with no matching
          // data entry — those still get a tooltip, just no value line.
          const hasValue = typeof p.value === 'number';
          const line = hasValue
            ? `${seriesName}: <b>${formatValue(toNumber(p.value), unit)}${unitSuffix(unit)}</b>`
            : `${seriesName}: <span style="opacity:0.6">no data</span>`;
          return `${p.name}<br/>${line}`;
        },
      },
      visualMap: {
        min: 0,
        max,
        left: 'left',
        bottom: 6,
        text: ['High', 'Low'],
        textStyle: { color: 'rgba(226, 232, 240, 0.55)', fontSize: 10 },
        calculable: false,
        itemWidth: 10,
        itemHeight: 70,
        inRange: { color: ['#131c2c', color] },
      },
      series: [
        {
          name: seriesName,
          type: 'map',
          map: mapName,
          roam: false,
          silent: false,
          // Every state in the GeoJSON is drawn regardless of whether it
          // has a data entry — states with no matching value keep this
          // neutral fill instead of disappearing from the map.
          itemStyle: { areaColor: '#161f30', borderColor: '#080d16', borderWidth: 0.75 },
          label: { show: false },
          emphasis: {
            label: { show: true, color: '#f4f4f5', fontSize: 10 },
            itemStyle: { areaColor: color },
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
  map: 'Map',
  table: 'Table',
};

export function allowedChartTypesFor(chart: DashboardChart): string[] {
  const hasData = Boolean(chart.chart_data && chart.chart_data.length > 0);
  if (!hasData) return [];

  const types = ['bar', 'horizontal_bar', 'donut', 'pie', 'table'];
  // Line/area only make sense for a genuine time-ordered series — a
  // categorical breakdown (by store, by category, ...) isn't a trend.
  if (chart.chart_form === 'time_series') types.unshift('area', 'line');
  // Map only makes sense when the data actually resolves to real US
  // states — offering it for an arbitrary categorical breakdown like
  // "by status" would just render an empty map.
  const looksLikeStates = (chart.chart_data || []).some((p) => isRecognizedUsState(p.label));
  if (looksLikeStates) types.push('map');
  return Array.from(new Set(types));
}

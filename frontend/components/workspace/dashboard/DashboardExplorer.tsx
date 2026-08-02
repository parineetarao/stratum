'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BarChart3, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  extractErrorMessage,
  generateInsights,
  getDashboard,
  getProjectKpis,
  refreshDashboard,
  saveChartConfig,
  type DashboardChart,
  type InsightsResponse,
  type KPIItem,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardKpiCard from '@/components/dashboard/DashboardKpiCard';
import KpiDetailsDrawer from '@/components/dashboard/KpiDetailsDrawer';
import ChartGrid from '@/components/dashboard/ChartGrid';
import AddWidgetDrawer from '@/components/dashboard/AddWidgetDrawer';
import AiInsightsPanel from '@/components/dashboard/AiInsightsPanel';
import type { ChartSize } from '@/components/dashboard/ChartTile';

type PageState = 'loading' | 'no_kpis' | 'failed' | 'ready';

const SIZE_TO_WIDTH: Record<ChartSize, number> = { small: 4, medium: 6, large: 12 };
const MAX_SUMMARY_CARDS = 6;
const MAX_GRID_CHARTS = 6;

function curateChartVisibility(chartable: DashboardChart[]): Set<number> {
  if (chartable.length <= MAX_GRID_CHARTS) {
    return new Set(chartable.map((c) => c.kpi_id));
  }
  const picked: DashboardChart[] = [];
  const pickFirst = (type: string) => {
    const found = chartable.find((c) => c.chart_type === type && !picked.includes(c));
    if (found) picked.push(found);
  };
  pickFirst('line');
  pickFirst('donut');
  for (const c of chartable) {
    if (picked.length >= MAX_GRID_CHARTS) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return new Set(picked.slice(0, MAX_GRID_CHARTS).map((c) => c.kpi_id));
}

export default function DashboardExplorer() {
  const { overview } = useWorkspace();
  const projectId = overview.project.id;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(overview.project.name);
  const [domain, setDomain] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [charts, setCharts] = useState<DashboardChart[]>([]);
  const [kpiItemsById, setKpiItemsById] = useState<Record<number, KPIItem>>({});

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<number | null>(null);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);

  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const hasCuratedRef = useRef(false);

  const load = useCallback(async () => {
    setPageState('loading');
    setErrorMessage(null);
    try {
      const [dashboard, kpiRes] = await Promise.all([
        getDashboard(projectId),
        getProjectKpis(projectId).catch(() => null),
      ]);
      setProjectName(dashboard.project_name);
      setDomain(dashboard.domain);
      setLastRefreshed(dashboard.last_refreshed);
      setCharts(dashboard.charts);
      if (kpiRes) {
        const map: Record<number, KPIItem> = {};
        kpiRes.kpis.forEach((k) => {
          map[k.id] = k;
        });
        setKpiItemsById(map);
      }
      setPageState('ready');
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not load the dashboard.');
      if (message.toLowerCase().includes('no approved kpis')) {
        setPageState('no_kpis');
      } else {
        setErrorMessage(message);
        setPageState('failed');
      }
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // One-time automatic curation: pick a balanced 4-6 chart subset from the
  // KPIs that support charts, and hide the rest (persisted so it's stable
  // on subsequent loads).
  useEffect(() => {
    if (pageState !== 'ready' || hasCuratedRef.current) return;
    const chartable = charts.filter((c) => c.has_chart);
    const alreadyConfigured = chartable.some((c) => c.grid_position !== 0 || c.is_visible === false);
    if (alreadyConfigured || chartable.length <= MAX_GRID_CHARTS) {
      hasCuratedRef.current = true;
      return;
    }
    hasCuratedRef.current = true;
    const toShow = curateChartVisibility(chartable);
    const toHide = chartable.filter((c) => !toShow.has(c.kpi_id));
    if (toHide.length === 0) return;

    setCharts((prev) => prev.map((c) => (toHide.some((h) => h.kpi_id === c.kpi_id) ? { ...c, is_visible: false } : c)));
    toHide.forEach((c) => {
      saveChartConfig(projectId, c.kpi_id, { is_visible: false }).catch(() => {});
    });
  }, [pageState, charts, projectId]);

  const summaryCharts = useMemo(() => charts.slice(0, MAX_SUMMARY_CARDS), [charts]);
  const gridCharts = useMemo(
    () => charts.filter((c) => c.has_chart && c.is_visible).slice(0, MAX_GRID_CHARTS),
    [charts]
  );
  const addableCharts = useMemo(
    () => charts.filter((c) => !gridCharts.some((g) => g.kpi_id === c.kpi_id)),
    [charts, gridCharts]
  );

  const selectedChart = charts.find((c) => c.kpi_id === selectedKpiId) || null;

  function updateChart(kpiId: number, patch: Partial<DashboardChart>) {
    setCharts((prev) => prev.map((c) => (c.kpi_id === kpiId ? { ...c, ...patch } : c)));
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const res = await refreshDashboard(projectId);
      setCharts(res.charts);
      setLastRefreshed(res.last_refreshed);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to refresh dashboard data.'));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSaveDashboard() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await Promise.all(
        charts.map((c, index) =>
          saveChartConfig(projectId, c.kpi_id, {
            chart_type: c.chart_type,
            custom_title: c.custom_title || undefined,
            grid_position: index,
            grid_width: c.grid_width,
            is_visible: c.is_visible,
          })
        )
      );
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save dashboard configuration.'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleSelectKpi(kpiId: number) {
    setSelectedKpiId(kpiId);
    const el = document.getElementById(`chart-tile-${kpiId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleChangeType(kpiId: number, chartType: string) {
    updateChart(kpiId, { chart_type: chartType });
    saveChartConfig(projectId, kpiId, { chart_type: chartType }).catch(() => {
      setErrorMessage('Failed to save chart type change.');
    });
  }

  function handleRename(kpiId: number, title: string) {
    updateChart(kpiId, { custom_title: title, title });
    saveChartConfig(projectId, kpiId, { custom_title: title }).catch(() => {
      setErrorMessage('Failed to save chart title.');
    });
  }

  function handleResize(kpiId: number, size: ChartSize) {
    const width = SIZE_TO_WIDTH[size];
    updateChart(kpiId, { grid_width: width });
    saveChartConfig(projectId, kpiId, { grid_width: width }).catch(() => {
      setErrorMessage('Failed to save chart size.');
    });
  }

  function handleRemoveFromGrid(kpiId: number) {
    updateChart(kpiId, { is_visible: false });
    saveChartConfig(projectId, kpiId, { is_visible: false }).catch(() => {
      setErrorMessage('Failed to update chart visibility.');
    });
  }

  function handleAddWidget(kpiId: number) {
    updateChart(kpiId, { is_visible: true });
    saveChartConfig(projectId, kpiId, { is_visible: true }).catch(() => {
      setErrorMessage('Failed to add widget.');
    });
    setIsAddWidgetOpen(false);
  }

  async function handleGenerateInsights() {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await generateInsights(projectId);
      setInsights(res);
    } catch (err) {
      setInsightsError(extractErrorMessage(err, 'Failed to generate AI insights.'));
    } finally {
      setInsightsLoading(false);
    }
  }

  function handleExportInsights() {
    if (!insights) return;
    const lines = [
      `Executive Summary — ${projectName}`,
      '',
      insights.executive_summary,
      '',
      'Key Findings',
      ...insights.findings.map((f) => `- [${f.sentiment.toUpperCase()}] ${f.title}: ${f.observation} -> ${f.action}`),
    ];
    if (insights.critical_risk_or_opportunity) {
      const c = insights.critical_risk_or_opportunity;
      lines.push('', `${c.type?.toUpperCase() || 'CRITICAL'}: ${c.title}`, c.description, `Action: ${c.recommended_action}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_insights.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 400, gap: 14 }}>
        <Loader2 size={32} className="animate-spin" color="#8b7dff" aria-hidden="true" />
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (pageState === 'no_kpis') {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ minHeight: 400, padding: 32, borderRadius: 12, background: '#070a0f', border: '1px solid rgba(148, 163, 184, 0.12)' }}
      >
        <BarChart3 size={32} style={{ color: '#a78bfa', marginBottom: 14 }} aria-hidden="true" />
        <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>No approved KPIs yet</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)', maxWidth: 420, marginBottom: 20 }}>
          The dashboard builds itself automatically from approved KPIs. Approve at least one KPI to get started.
        </p>
        <Link
          href={`/projects/${projectId}/kpis`}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Go to KPIs
        </Link>
      </div>
    );
  }

  if (pageState === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 400, gap: 14 }}>
        <AlertCircle size={26} style={{ color: '#fca5a5' }} aria-hidden="true" />
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.6)' }}>{errorMessage}</p>
        <button
          type="button"
          onClick={load}
          style={{ height: 38, padding: '0 18px', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.24)', background: 'rgba(148, 163, 184, 0.06)', color: '#f4f4f5', fontSize: 13, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        projectName={projectName}
        domain={domain}
        lastRefreshed={lastRefreshed}
        isRefreshing={isRefreshing}
        isSaving={isSaving}
        onRefresh={handleRefresh}
        onSave={handleSaveDashboard}
      />

      {errorMessage && (
        <div
          className="flex items-center"
          style={{ gap: 10, marginBottom: 20, padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.3)', background: 'rgba(248, 113, 113, 0.08)', color: '#fca5a5', fontSize: 13 }}
        >
          <AlertCircle size={16} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6"
        style={{ gap: 16, marginBottom: 28 }}
      >
        {summaryCharts.map((chart) => (
          <DashboardKpiCard
            key={chart.kpi_id}
            chart={chart}
            isSelected={selectedKpiId === chart.kpi_id}
            onSelect={handleSelectKpi}
          />
        ))}
      </div>

      <ChartGrid
        charts={gridCharts}
        projectId={projectId}
        highlightedKpiId={selectedKpiId}
        onChangeType={handleChangeType}
        onRename={handleRename}
        onResize={handleResize}
        onRemove={handleRemoveFromGrid}
        onAddWidget={() => setIsAddWidgetOpen(true)}
      />

      <AiInsightsPanel
        insights={insights}
        isLoading={insightsLoading}
        error={insightsError}
        onGenerate={handleGenerateInsights}
        onExport={handleExportInsights}
      />

      {selectedChart && (
        <KpiDetailsDrawer
          chart={selectedChart}
          kpiItem={kpiItemsById[selectedChart.kpi_id]}
          projectId={projectId}
          onClose={() => setSelectedKpiId(null)}
        />
      )}

      {isAddWidgetOpen && (
        <AddWidgetDrawer
          projectId={projectId}
          availableCharts={addableCharts}
          onAdd={handleAddWidget}
          onClose={() => setIsAddWidgetOpen(false)}
        />
      )}
    </div>
  );
}

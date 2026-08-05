'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  generateQualityReport,
  getQualityReport,
  exportQualityReport,
  runProfiling,
  extractErrorMessage,
  type QualityReportResponse,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { stageRoute } from '@/lib/workspaceNav';
import QualityScoreCard from './QualityScoreCard';
import QualityDimensionsPanel from './QualityDimensionsPanel';
import CriticalIssuesPanel from './CriticalIssuesPanel';
import TableHealthPanel from './TableHealthPanel';
import RecommendedNextStepCard from './RecommendedNextStepCard';
import DisabledInDemo from '@/components/workspace/demoGuard';

type LoadState = 'loading' | 'no-source' | 'empty' | 'failed' | 'ready';

function actionButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    height: 36,
    padding: '0 14px',
    borderRadius: 8,
    border: primary ? 'none' : '1px solid rgba(148, 163, 184, 0.24)',
    background: primary
      ? 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)'
      : 'rgba(148, 163, 184, 0.06)',
    color: primary ? '#fff' : '#f4f4f5',
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap',
  };
}

export default function DataQualityExplorer() {
  const { overview, refetch: refetchOverview } = useWorkspace();
  const projectId = overview.project.id;
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 900;

  const [state, setState] = useState<LoadState>('loading');
  const [report, setReport] = useState<QualityReportResponse | null>(null);

  const [isProfiling, setIsProfiling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    if (!overview.source.is_connected) {
      setState('no-source');
      return () => {};
    }

    let cancelled = false;
    setState('loading');

    getQualityReport(projectId)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setState('empty');
        } else {
          setState('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, overview.source.is_connected]);

  useEffect(() => load(), [load]);

  async function handleRunProfiling() {
    if (isProfiling) return;
    setIsProfiling(true);
    setActionMessage(null);
    try {
      await runProfiling(projectId);
      const newReport = await generateQualityReport(projectId);
      setReport(newReport);
      setState('ready');
      refetchOverview();
      setActionMessage({ tone: 'success', text: 'Profiling complete — quality report updated.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Profiling failed. Please try again.') });
    } finally {
      setIsProfiling(false);
    }
  }

  async function handleRefreshQuality() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setActionMessage(null);
    try {
      const data = await getQualityReport(projectId);
      setReport(data);
      setState('ready');
      setActionMessage({ tone: 'success', text: 'Quality report refreshed.' });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setState('empty');
      } else {
        setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not refresh quality report.') });
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleExportReport() {
    if (isExporting) return;
    setIsExporting(true);
    setActionMessage(null);
    try {
      const blob = await exportQualityReport(projectId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quality-report-${overview.project.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionMessage({ tone: 'success', text: 'Quality report exported.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Export failed. Please try again.') });
    } finally {
      setIsExporting(false);
    }
  }

  const header = (
    <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
      <div>
        <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Data Quality</h1>
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
          Assess the overall quality of your data and prioritize issues that need attention.
        </p>
      </div>

      <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
        <DisabledInDemo>
          <button type="button" onClick={handleRefreshQuality} disabled={isRefreshing} style={actionButtonStyle(isRefreshing)}>
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh Quality
          </button>
        </DisabledInDemo>
        <DisabledInDemo>
          <button type="button" onClick={handleRunProfiling} disabled={isProfiling} style={actionButtonStyle(isProfiling, true)}>
            {isProfiling ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            Run Profiling
          </button>
        </DisabledInDemo>
        <button
          type="button"
          onClick={handleExportReport}
          disabled={isExporting || state !== 'ready'}
          style={actionButtonStyle(isExporting || state !== 'ready')}
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
          Export Report
        </button>
      </div>
    </div>
  );

  const actionBanner = actionMessage && (
    <div
      role="status"
      className="flex items-center"
      style={{
        gap: 8,
        padding: '10px 14px',
        borderRadius: 8,
        border: actionMessage.tone === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
        background: actionMessage.tone === 'success' ? 'rgba(52, 211, 153, 0.07)' : 'rgba(248, 113, 113, 0.07)',
        fontSize: 13,
        color: actionMessage.tone === 'success' ? '#6ee7b7' : '#fca5a5',
      }}
    >
      {actionMessage.tone === 'success' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
      {actionMessage.text}
    </div>
  );

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 360 }}>
        <Loader2 size={26} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'no-source') {
    return (
      <div className="flex flex-col" style={{ gap: 20 }}>
        {header}
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            minHeight: 380,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '48px 24px',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#8b7dff',
              marginBottom: 20,
            }}
          >
            <Database size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>No data source connected</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
            Connect a PostgreSQL database or upload a CSV file before running data quality checks.
          </p>
          <Link href={stageRoute(projectId, 'data-source')} style={actionButtonStyle(false, true)}>
            Go to Data Source
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="flex flex-col" style={{ gap: 20 }}>
        {header}
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            minHeight: 320,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '40px 24px',
          }}
        >
          <XCircle size={24} style={{ color: '#fca5a5', marginBottom: 14 }} aria-hidden="true" />
          <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginBottom: 16 }}>
            The data quality report could not be loaded.
          </p>
          <button type="button" onClick={load} style={actionButtonStyle(false)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state === 'empty' || !report) {
    return (
      <div className="flex flex-col" style={{ gap: 20 }}>
        {header}
        {actionBanner}
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            minHeight: 380,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '48px 24px',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#8b7dff',
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>No profiling run yet</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
            Run profiling to assess completeness, consistency, and uniqueness across your dataset.
          </p>
          <DisabledInDemo>
            <button type="button" onClick={handleRunProfiling} disabled={isProfiling} style={actionButtonStyle(isProfiling, true)}>
              {isProfiling ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              Run Profiling
            </button>
          </DisabledInDemo>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {header}
      {actionBanner}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className="flex flex-col" style={{ gap: 16 }}>
          <QualityScoreCard report={report} />
          <CriticalIssuesPanel issues={report.issues} />
        </div>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <QualityDimensionsPanel report={report} />
          <TableHealthPanel tables={report.table_scores} />
        </div>
      </div>

      <RecommendedNextStepCard report={report} projectId={projectId} />
    </div>
  );
}

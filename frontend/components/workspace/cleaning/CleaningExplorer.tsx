'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  CheckCircle2,
  ChevronDown,
  Database,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Wand2,
  XCircle,
} from 'lucide-react';
import {
  getCleaningRecommendations,
  decideCleaningRecommendation,
  bulkDecideCleaningRecommendations,
  previewCleaning,
  applyCleaningRecommendations,
  getSandboxStatus,
  initializeSandbox,
  refreshSandbox,
  runProfiling,
  generateQualityReport,
  extractErrorMessage,
  type CleaningListResponse,
  type CleaningBulkAction,
  type CleaningPreviewResult,
  type SandboxStatusResponse,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { stageRoute } from '@/lib/workspaceNav';
import CleaningStatsStrip from './CleaningStatsStrip';
import RecommendationsList from './RecommendationsList';
import SandboxPanel from './SandboxPanel';
import ApplyConfirmModal from './ApplyConfirmModal';

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

export default function CleaningExplorer() {
  const { overview, refetch: refetchOverview } = useWorkspace();
  const projectId = overview.project.id;
  const isPostgres = overview.source.connection_type === 'postgresql';
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 960;
  const router = useRouter();

  const [state, setState] = useState<LoadState>('loading');
  const [report, setReport] = useState<CleaningListResponse | null>(null);
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatusResponse | null>(null);

  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRefreshingSandbox, setIsRefreshingSandbox] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [previewResults, setPreviewResults] = useState<CleaningPreviewResult[] | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isReprofiling, setIsReprofiling] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string; showReprofile?: boolean } | null>(
    null
  );

  const bulkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setBulkMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSandboxStatus = useCallback(() => {
    getSandboxStatus(projectId)
      .then(setSandboxStatus)
      .catch(() => setSandboxStatus(null));
  }, [projectId]);

  const load = useCallback(() => {
    if (!overview.source.is_connected) {
      setState('no-source');
      return () => {};
    }

    let cancelled = false;
    setState('loading');

    getCleaningRecommendations(projectId)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setState('ready');
        loadSandboxStatus();
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
  }, [projectId, overview.source.is_connected, loadSandboxStatus]);

  useEffect(() => load(), [load]);

  async function handleGenerateRecommendations() {
    setIsReprofiling(true);
    setActionMessage(null);
    try {
      await runProfiling(projectId);
      await generateQualityReport(projectId);
      const data = await getCleaningRecommendations(projectId);
      setReport(data);
      setState('ready');
      loadSandboxStatus();
      refetchOverview();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not generate recommendations.') });
    } finally {
      setIsReprofiling(false);
    }
  }

  async function handleDecide(id: number, status: 'approved' | 'rejected') {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await decideCleaningRecommendation(projectId, id, status);
      const data = await getCleaningRecommendations(projectId);
      setReport(data);
      setHasPreviewed(false);
      setPreviewResults(null);
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not update recommendation.') });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkAction(action: CleaningBulkAction) {
    setBulkMenuOpen(false);
    setIsBulkBusy(true);
    setActionMessage(null);
    try {
      const data = await bulkDecideCleaningRecommendations(projectId, action);
      setReport(data);
      setHasPreviewed(false);
      setPreviewResults(null);
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Bulk action failed.') });
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function handleInitializeSandbox() {
    setIsInitializing(true);
    setActionMessage(null);
    try {
      await initializeSandbox(projectId);
      loadSandboxStatus();
      setActionMessage({ tone: 'success', text: 'Sandbox initialized.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Sandbox initialization failed.') });
    } finally {
      setIsInitializing(false);
    }
  }

  async function handleRefreshSandbox() {
    setIsRefreshingSandbox(true);
    setActionMessage(null);
    try {
      await refreshSandbox(projectId);
      loadSandboxStatus();
      setActionMessage({ tone: 'success', text: 'Sandbox data refreshed.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Sandbox refresh failed.') });
    } finally {
      setIsRefreshingSandbox(false);
    }
  }

  async function handlePreview() {
    setIsPreviewing(true);
    setActionMessage(null);
    try {
      const result = await previewCleaning(projectId);
      setPreviewResults(result.results);
      setHasPreviewed(true);
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Preview failed.') });
      setHasPreviewed(false);
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleApplyConfirmed() {
    setIsApplying(true);
    try {
      const result = await applyCleaningRecommendations(projectId);
      const data = await getCleaningRecommendations(projectId);
      setReport(data);
      setShowApplyModal(false);
      if (result.failed_count === 0) {
        setActionMessage({
          tone: 'success',
          text: `Cleaning applied successfully. ${result.applied_count} change${result.applied_count === 1 ? '' : 's'} have been applied to your source.`,
          showReprofile: true,
        });
      } else {
        setActionMessage({
          tone: 'error',
          text: `${result.applied_count} applied, ${result.failed_count} failed. Check individual recommendations for details.`,
          showReprofile: result.applied_count > 0,
        });
      }
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Apply failed.') });
    } finally {
      setIsApplying(false);
    }
  }

  async function handleReprofile() {
    setIsReprofiling(true);
    try {
      await runProfiling(projectId);
      await generateQualityReport(projectId);
      refetchOverview();
      router.push(stageRoute(projectId, 'data-quality'));
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Re-run profiling failed.') });
    } finally {
      setIsReprofiling(false);
    }
  }

  const approvedCount = report?.approved ?? 0;
  const canPreview = approvedCount > 0 && (sandboxStatus?.initialized ?? false);
  const canApply = hasPreviewed && approvedCount > 0;

  const header = (
    <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
      <div>
        <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Cleaning</h1>
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
          Review cleaning recommendations and preview changes before applying to your source.
        </p>
      </div>

      <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div ref={bulkMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setBulkMenuOpen((v) => !v)}
            disabled={isBulkBusy || !report}
            style={actionButtonStyle(isBulkBusy || !report)}
          >
            {isBulkBusy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            Bulk Actions
            <ChevronDown size={13} aria-hidden="true" />
          </button>
          {bulkMenuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 40,
                width: 220,
                borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.18)',
                background: '#0a0d12',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                overflow: 'hidden',
                zIndex: 20,
              }}
            >
              {[
                { action: 'approve_high_confidence' as const, label: 'Approve All High Confidence' },
                { action: 'reject_low_confidence' as const, label: 'Reject All Low Confidence' },
                { action: 'reset_all' as const, label: 'Reset All to Pending' },
              ].map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => handleBulkAction(item.action)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f4f4f5',
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={handlePreview} disabled={!canPreview || isPreviewing} style={actionButtonStyle(!canPreview || isPreviewing, true)}>
          {isPreviewing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          Preview in Sandbox
        </button>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          disabled={!canApply}
          title={!hasPreviewed ? 'Preview changes in sandbox first' : undefined}
          style={actionButtonStyle(!canApply)}
        >
          Apply Approved to Source
        </button>
      </div>
    </div>
  );

  const actionBanner = actionMessage && (
    <div
      role="status"
      className="flex items-center justify-between"
      style={{
        gap: 12,
        padding: '10px 14px',
        borderRadius: 8,
        border: actionMessage.tone === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
        background: actionMessage.tone === 'success' ? 'rgba(52, 211, 153, 0.07)' : 'rgba(248, 113, 113, 0.07)',
        fontSize: 13,
        color: actionMessage.tone === 'success' ? '#6ee7b7' : '#fca5a5',
        flexWrap: 'wrap',
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        {actionMessage.tone === 'success' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
        {actionMessage.text}
      </div>
      {actionMessage.showReprofile && (
        <button type="button" onClick={handleReprofile} disabled={isReprofiling} style={actionButtonStyle(isReprofiling)}>
          {isReprofiling ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          Re-run Profiling
        </button>
      )}
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
          style={{ minHeight: 380, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.15)', background: '#05070a', padding: '48px 24px' }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(148, 163, 184, 0.06)', color: '#8b7dff', marginBottom: 20 }}
          >
            <Database size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>No data source connected</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
            Connect a PostgreSQL database or upload a CSV file before reviewing cleaning recommendations.
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
          style={{ minHeight: 320, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.15)', background: '#05070a', padding: '40px 24px' }}
        >
          <XCircle size={24} style={{ color: '#fca5a5', marginBottom: 14 }} aria-hidden="true" />
          <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginBottom: 16 }}>Cleaning recommendations could not be loaded.</p>
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
          style={{ minHeight: 380, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.15)', background: '#05070a', padding: '48px 24px' }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(148, 163, 184, 0.06)', color: '#8b7dff', marginBottom: 20 }}
          >
            <Wand2 size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>No cleaning recommendations yet</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
            Run profiling and generate a quality report to produce cleaning recommendations for this dataset.
          </p>
          <button type="button" onClick={handleGenerateRecommendations} disabled={isReprofiling} style={actionButtonStyle(isReprofiling, true)}>
            {isReprofiling ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}
            Generate Recommendations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {header}
      {actionBanner}
      <CleaningStatsStrip report={report} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1.6fr) minmax(280px, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <RecommendationsList
          recommendations={report.recommendations}
          projectId={projectId}
          isPostgres={isPostgres}
          onDecide={handleDecide}
          busyIds={busyIds}
        />

        <SandboxPanel
          status={sandboxStatus}
          isInitializing={isInitializing}
          isRefreshing={isRefreshingSandbox}
          isPreviewing={isPreviewing}
          previewResults={previewResults}
          onInitialize={handleInitializeSandbox}
          onRefresh={handleRefreshSandbox}
          onPreview={handlePreview}
        />
      </div>

      {showApplyModal && (
        <ApplyConfirmModal
          approvedCount={approvedCount}
          isApplying={isApplying}
          onConfirm={handleApplyConfirmed}
          onCancel={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
}

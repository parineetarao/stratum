'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Wand2 } from 'lucide-react';
import {
  approveKpi,
  bulkApproveHighConfidenceKpis,
  extractErrorMessage,
  generateProjectKpis,
  getProjectKpis,
  getSandboxStatus,
  restoreKpi,
  setProjectAnalysisMode,
  skipKpi,
  unapproveKpi,
  type KPIItem,
  type KPIListResponse,
  type SandboxStatusResponse,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import KpiCard from './KpiCard';
import KpiHeaderControls, { type KpiCategoryFilter } from './KpiHeaderControls';
import KpiApprovalBar from './KpiApprovalBar';

type PageState = 'loading' | 'empty' | 'failed' | 'ready';

export default function KpisExplorer() {
  const { overview } = useWorkspace();
  const projectId = overview.project.id;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [analysisMode, setAnalysisMode] = useState<'source' | 'warehouse'>(
    (overview.project.analysis_mode as 'source' | 'warehouse') || 'source'
  );
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatusResponse | null>(null);

  const [kpiResponse, setKpiResponse] = useState<KPIListResponse | null>(null);
  const [kpis, setKpis] = useState<KPIItem[]>([]);

  const [activeCategory, setActiveCategory] = useState<KpiCategoryFilter>('All');
  const [isReviewingApprovedOnly, setIsReviewingApprovedOnly] = useState(false);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Check sandbox availability
  useEffect(() => {
    getSandboxStatus(projectId)
      .then((status) => setSandboxStatus(status))
      .catch(() => setSandboxStatus(null));
  }, [projectId]);

  const isWarehouseAvailable = Boolean(
    sandboxStatus && sandboxStatus.initialized && sandboxStatus.has_warehouse
  );

  // Load KPIs for project
  const loadKpis = useCallback(
    async (modeToLoad: 'source' | 'warehouse') => {
      setPageState('loading');
      setErrorMessage(null);
      try {
        let res = await getProjectKpis(projectId, modeToLoad);
        if (res.kpis.length === 0) {
          // Try auto-generating if domain exists
          if (overview.project.domain) {
            try {
              res = await generateProjectKpis(projectId, modeToLoad);
            } catch {
              // Ignore auto-generation error and show empty state
            }
          }
        }
        setKpiResponse(res);
        setKpis(res.kpis);
        setPageState(res.kpis.length > 0 ? 'ready' : 'empty');
      } catch (err) {
        setErrorMessage(extractErrorMessage(err, 'Failed to load KPI recommendations.'));
        setPageState('failed');
      }
    },
    [projectId, overview.project.domain]
  );

  useEffect(() => {
    loadKpis(analysisMode);
  }, [loadKpis, analysisMode]);

  // Handle Analysis Mode Change
  async function handleModeChange(newMode: 'source' | 'warehouse') {
    if (newMode === 'warehouse' && !isWarehouseAvailable) return;
    setAnalysisMode(newMode);
    try {
      await setProjectAnalysisMode(projectId, newMode);
    } catch {
      // Non-blocking
    }
  }

  // Handle Regenerate KPIs
  async function handleRegenerate() {
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const res = await generateProjectKpis(projectId, analysisMode);
      setKpiResponse(res);
      setKpis(res.kpis);
      setPageState(res.kpis.length > 0 ? 'ready' : 'empty');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'KPI regeneration failed.'));
    } finally {
      setIsRegenerating(false);
    }
  }

  // Handle Bulk Approve High Confidence
  async function handleBulkApproveHighConfidence() {
    setIsBulkApproving(true);
    setErrorMessage(null);
    try {
      const res = await bulkApproveHighConfidenceKpis(projectId, analysisMode);
      setKpiResponse(res);
      setKpis(res.kpis);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Bulk approval failed.'));
    } finally {
      setIsBulkApproving(false);
    }
  }

  // Card Level Action Handlers
  async function handleApprove(kpiId: number) {
    try {
      const updated = await approveKpi(projectId, kpiId);
      setKpis((prev) =>
        prev.map((k) => (k.id === kpiId ? { ...k, ...updated, is_approved: true, status: 'approved' } : k))
      );
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to approve KPI.'));
    }
  }

  async function handleSkip(kpiId: number) {
    try {
      const updated = await skipKpi(projectId, kpiId);
      setKpis((prev) =>
        prev.map((k) => (k.id === kpiId ? { ...k, ...updated, is_approved: false, status: 'skipped' } : k))
      );
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to skip KPI.'));
    }
  }

  async function handleRestore(kpiId: number) {
    try {
      const updated = await restoreKpi(projectId, kpiId);
      setKpis((prev) =>
        prev.map((k) => (k.id === kpiId ? { ...k, ...updated, is_approved: false, status: 'pending' } : k))
      );
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to restore KPI.'));
    }
  }

  async function handleUnapprove(kpiId: number) {
    try {
      const updated = await unapproveKpi(projectId, kpiId);
      setKpis((prev) =>
        prev.map((k) => (k.id === kpiId ? { ...k, ...updated, is_approved: false, status: 'pending' } : k))
      );
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to remove KPI approval.'));
    }
  }

  // Filtered Cards Memoization
  const filteredKpis = useMemo(() => {
    let list = kpis;
    if (isReviewingApprovedOnly) {
      list = list.filter((k) => k.is_approved || k.status === 'approved');
    }
    if (activeCategory === 'All') return list;

    return list.filter((k) => {
      const cat = (k.category || '').toLowerCase();
      const target = activeCategory.toLowerCase();
      if (target === 'revenue') return cat.includes('revenue') || cat.includes('financial');
      if (target === 'customers') return cat.includes('customer') || cat.includes('user') || cat.includes('client');
      if (target === 'volume') return cat.includes('volume') || cat.includes('activity') || cat.includes('sales');
      if (target === 'inventory') return cat.includes('inventory') || cat.includes('product') || cat.includes('stock');
      if (target === 'quality') return cat.includes('quality');
      return cat === target;
    });
  }, [kpis, activeCategory, isReviewingApprovedOnly]);

  // Counts Calculation
  const approvedCount = useMemo(
    () => kpis.filter((k) => k.is_approved || k.status === 'approved').length,
    [kpis]
  );
  const highCount = useMemo(
    () =>
      kpis.filter(
        (k) => (k.is_approved || k.status === 'approved') && (k.confidence_score ?? 0) >= 80
      ).length,
    [kpis]
  );
  const mediumCount = useMemo(
    () =>
      kpis.filter(
        (k) =>
          (k.is_approved || k.status === 'approved') &&
          (k.confidence_score ?? 0) >= 50 &&
          (k.confidence_score ?? 0) < 80
      ).length,
    [kpis]
  );
  const lowCount = useMemo(
    () =>
      kpis.filter(
        (k) => (k.is_approved || k.status === 'approved') && (k.confidence_score ?? 0) < 50
      ).length,
    [kpis]
  );

  const highConfidencePendingCount = useMemo(
    () =>
      kpis.filter(
        (k) => !k.is_approved && k.status !== 'approved' && (k.confidence_score ?? 0) >= 80
      ).length,
    [kpis]
  );

  return (
    <div className="flex flex-col" style={{ minHeight: '80vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#f5f5f7', marginBottom: 4 }}>
          KPIs
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)' }}>
          Review and approve recommended KPIs for your analytical workspace.
        </p>
      </div>

      {/* Top Controls Row */}
      <KpiHeaderControls
        analysisMode={analysisMode}
        onModeChange={handleModeChange}
        isWarehouseAvailable={isWarehouseAvailable}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onRegenerate={handleRegenerate}
        onBulkApproveHighConfidence={handleBulkApproveHighConfidence}
        isRegenerating={isRegenerating}
        isBulkApproving={isBulkApproving}
        highConfidenceCount={highConfidencePendingCount}
      />

      {/* Error Message Toast/Banner */}
      {errorMessage && (
        <div
          className="flex items-center"
          style={{
            gap: 10,
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid rgba(248, 113, 113, 0.3)',
            background: 'rgba(248, 113, 113, 0.08)',
            color: '#fca5a5',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Content Area */}
      {pageState === 'loading' ? (
        <div
          className="flex flex-col items-center justify-center"
          style={{ minHeight: 320, gap: 14 }}
        >
          <Loader2 size={32} className="animate-spin" color="#8b7dff" aria-hidden="true" />
          <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)' }}>
            Evaluating schema and computing recommended KPIs...
          </p>
        </div>
      ) : pageState === 'empty' ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            minHeight: 320,
            padding: 32,
            borderRadius: 12,
            background: '#070a0f',
            border: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          <Sparkles size={32} style={{ color: '#a78bfa', marginBottom: 14 }} aria-hidden="true" />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
            No KPI recommendations available
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: 'rgba(226, 232, 240, 0.55)',
              maxWidth: 460,
              marginBottom: 20,
            }}
          >
            Click below to generate KPI recommendations based on your schema and domain metadata.
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            style={{
              height: 40,
              padding: '0 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#ffffff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isRegenerating ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Wand2 size={16} aria-hidden="true" />
            )}
            Generate KPIs
          </button>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          {filteredKpis.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{
                minHeight: 200,
                borderRadius: 12,
                background: '#070a0f',
                border: '1px solid rgba(148, 163, 184, 0.12)',
                color: 'rgba(226, 232, 240, 0.5)',
                fontSize: 13.5,
              }}
            >
              No KPIs match the selected category or filter.
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 20 }}
            >
              {filteredKpis.map((kpi) => (
                <KpiCard
                  key={kpi.id}
                  kpi={kpi}
                  projectId={projectId}
                  onApprove={handleApprove}
                  onSkip={handleSkip}
                  onRestore={handleRestore}
                  onUnapprove={handleUnapprove}
                />
              ))}
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <KpiApprovalBar
            projectId={projectId}
            approvedCount={approvedCount}
            highCount={highCount}
            mediumCount={mediumCount}
            lowCount={lowCount}
            onReviewSelections={() => setIsReviewingApprovedOnly(!isReviewingApprovedOnly)}
            isReviewingApprovedOnly={isReviewingApprovedOnly}
          />
        </>
      )}
    </div>
  );
}

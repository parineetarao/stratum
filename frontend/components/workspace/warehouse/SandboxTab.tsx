'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Boxes, CheckCircle2, Clock, Database, Loader2, RefreshCw, Terminal, XCircle } from 'lucide-react';
import {
  extractErrorMessage,
  getSandboxStatus,
  previewWarehouse,
  refreshSandbox,
  type SandboxStatusResponse,
  type WarehouseDesignResponse,
  type WarehousePreviewResponse,
} from '@/lib/api';
import { stageRoute } from '@/lib/workspaceNav';
import { formatCount } from '@/lib/formatCount';
import DisabledInDemo from '@/components/workspace/demoGuard';

function actionButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
    textDecoration: 'none',
  };
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return '—';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

function StatCard({ icon: Icon, value, label }: { icon: typeof Boxes; value: string | number; label: string }) {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        flex: 1,
        gap: 4,
        padding: '10px 6px',
        borderRadius: 8,
        background: 'rgba(148, 163, 184, 0.04)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
      }}
    >
      <Icon size={14} style={{ color: 'rgba(226,232,240,0.5)' }} aria-hidden="true" />
      <div style={{ fontSize: 13.5, fontWeight: 650, color: '#f5f5f7', textAlign: 'center' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(226, 232, 240, 0.45)', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 650,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: 'rgba(226, 232, 240, 0.45)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

export default function SandboxTab({ design, projectId }: { design: WarehouseDesignResponse; projectId: number }) {
  const [status, setStatus] = useState<SandboxStatusResponse | null>(null);
  const [preview, setPreview] = useState<WarehousePreviewResponse | null>(null);
  const [lastPreviewAt, setLastPreviewAt] = useState<Date | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    return getSandboxStatus(projectId)
      .then((s) => {
        setStatus(s);
        return s;
      })
      .catch(() => {
        setStatus(null);
        return null;
      });
  }, [projectId]);

  const runPreview = useCallback(async () => {
    setIsPreviewing(true);
    setError(null);
    try {
      const result = await previewWarehouse(projectId);
      setPreview(result);
      setLastPreviewAt(new Date());
      await loadStatus();
    } catch (err) {
      setError(extractErrorMessage(err, 'Warehouse preview failed.'));
    } finally {
      setIsPreviewing(false);
    }
  }, [projectId, loadStatus]);

  useEffect(() => {
    if (hasAttemptedAutoLoad) return;
    setHasAttemptedAutoLoad(true);
    loadStatus().then((s) => {
      // A warehouse already exists in the sandbox from a previous visit —
      // re-run validation so the tab always reflects real, current backend
      // state rather than a stale "ready" pill with no numbers behind it.
      if (s?.has_warehouse) {
        runPreview();
      }
    });
  }, [hasAttemptedAutoLoad, loadStatus, runPreview]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      await refreshSandbox(projectId);
      await runPreview();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not refresh sandbox data.'));
    } finally {
      setIsRefreshing(false);
    }
  }

  const sandboxSql = design.full_ddl_duckdb || design.full_ddl;
  const openInSqlWorkspaceHref = `${stageRoute(projectId, 'sql')}?${new URLSearchParams({
    sql: sandboxSql,
    env: 'warehouse',
  }).toString()}`;

  const isBusy = isPreviewing || isRefreshing;

  if (!preview && !isBusy) {
    return (
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(148, 163, 184, 0.06)',
            color: 'rgba(226,232,240,0.5)',
          }}
        >
          <Boxes size={19} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: '#f5f5f7', marginBottom: 6 }}>
            Sandbox not initialized
          </div>
          <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', lineHeight: 1.5 }}>
            Previews execute inside an isolated sandbox and never modify your source data.
          </p>
        </div>

        {error && (
          <div
            role="status"
            className="flex items-center"
            style={{
              gap: 8,
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid rgba(248, 113, 113, 0.3)',
              background: 'rgba(248, 113, 113, 0.07)',
              fontSize: 12.5,
              color: '#fca5a5',
            }}
          >
            <XCircle size={13} aria-hidden="true" />
            {error}
          </div>
        )}

        <DisabledInDemo>
          <button type="button" onClick={runPreview} disabled={isPreviewing} style={actionButtonStyle(isPreviewing, true)}>
            <Database size={14} aria-hidden="true" />
            Preview Warehouse
          </button>
        </DisabledInDemo>
      </div>
    );
  }

  if (isBusy && !preview) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ gap: 12, minHeight: 200 }}>
        <Loader2 size={22} className="animate-spin" style={{ color: '#8b7dff' }} aria-hidden="true" />
        <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', textAlign: 'center' }}>
          Executing warehouse DDL and validating in the sandbox…
        </p>
      </div>
    );
  }

  if (!preview) return null;

  const tablesCreated = preview.tables_created;
  const joinValidations = preview.join_validations;
  const aggregationValidations = preview.aggregation_validations;
  const totalRows = tablesCreated.reduce((sum, t) => sum + (t.row_count ?? 0), 0);
  const overallStatus = preview.status;
  const hasErrors =
    overallStatus === 'failed' ||
    joinValidations.some((j) => j.status === 'error') ||
    aggregationValidations.some((a) => a.status === 'error');

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div
        className="flex items-center justify-between"
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          border: hasErrors
            ? '1px solid rgba(248, 113, 113, 0.3)'
            : overallStatus === 'warning'
            ? '1px solid rgba(250, 204, 21, 0.3)'
            : '1px solid rgba(52, 211, 153, 0.3)',
          background: hasErrors
            ? 'rgba(248, 113, 113, 0.07)'
            : overallStatus === 'warning'
            ? 'rgba(250, 204, 21, 0.07)'
            : 'rgba(52, 211, 153, 0.07)',
        }}
      >
        <span
          className="flex items-center"
          style={{
            gap: 7,
            fontSize: 13,
            fontWeight: 650,
            color: hasErrors ? '#fca5a5' : overallStatus === 'warning' ? '#fbbf24' : '#6ee7b7',
          }}
        >
          {hasErrors ? (
            <XCircle size={14} aria-hidden="true" />
          ) : overallStatus === 'warning' ? (
            <AlertTriangle size={14} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={14} aria-hidden="true" />
          )}
          {hasErrors ? 'Validation Failed' : 'Warehouse Ready'}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>{formatRelativeTime(lastPreviewAt)}</span>
      </div>

      {error && (
        <div
          role="status"
          className="flex items-center"
          style={{
            gap: 8,
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid rgba(248, 113, 113, 0.3)',
            background: 'rgba(248, 113, 113, 0.07)',
            fontSize: 12.5,
            color: '#fca5a5',
          }}
        >
          <XCircle size={13} aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex items-center" style={{ gap: 8 }}>
        <StatCard icon={Database} value={tablesCreated.length} label="Warehouse tables" />
        <StatCard icon={Boxes} value={formatCount(totalRows)} label="Total rows" />
        <StatCard icon={Clock} value={`${preview.execution_time_ms}ms`} label="Exec time" />
      </div>

      <div>
        <SectionLabel>Created Warehouse Tables</SectionLabel>
        <div className="flex flex-col" style={{ gap: 6 }}>
          {tablesCreated.map((t) => {
            const ok = t.row_count !== null;
            return (
              <div
                key={t.table_name}
                className="flex items-center justify-between"
                style={{
                  padding: '7px 10px',
                  borderRadius: 7,
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  background: 'rgba(148, 163, 184, 0.03)',
                  fontSize: 12,
                }}
              >
                <span className="flex items-center" style={{ gap: 6, color: '#e2e8f0' }}>
                  {ok ? (
                    <CheckCircle2 size={12} style={{ color: '#34d399' }} aria-hidden="true" />
                  ) : (
                    <XCircle size={12} style={{ color: '#f87171' }} aria-hidden="true" />
                  )}
                  {t.table_name}
                </span>
                <span style={{ color: 'rgba(226,232,240,0.5)' }}>{ok ? `${formatCount(t.row_count)} rows` : 'not created'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Validation Summary</SectionLabel>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226,232,240,0.6)', marginBottom: 6 }}>
              Join Integrity
            </div>
            {joinValidations.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.4)' }}>No fact→dimension joins to validate.</p>
            ) : (
              <div className="flex flex-col" style={{ gap: 6 }}>
                {joinValidations.map((j) => (
                  <div
                    key={`${j.fact_table}-${j.foreign_key_column}`}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 7,
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      background: 'rgba(148, 163, 184, 0.03)',
                      fontSize: 11.5,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#e2e8f0' }}>
                        {j.fact_table}.{j.foreign_key_column} &rarr; {j.dimension_table}
                      </span>
                      <span
                        style={{
                          color: j.status === 'passed' ? '#34d399' : j.status === 'warning' ? '#fbbf24' : '#f87171',
                          fontWeight: 600,
                        }}
                      >
                        {j.status === 'passed' ? 'Valid' : j.status === 'warning' ? `${j.orphan_count} orphan` : 'Error'}
                      </span>
                    </div>
                    {j.status === 'error' && j.error && (
                      <div style={{ marginTop: 4, color: '#fca5a5', fontSize: 11 }}>{j.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226,232,240,0.6)', marginBottom: 6 }}>
              Sample Aggregations
            </div>
            {aggregationValidations.length === 0 ? (
              <p style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.4)' }}>No measure columns to aggregate.</p>
            ) : (
              <div className="flex flex-col" style={{ gap: 6 }}>
                {aggregationValidations.map((a) => (
                  <div
                    key={`${a.table}-${a.column}`}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 7,
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      background: 'rgba(148, 163, 184, 0.03)',
                      fontSize: 11.5,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#e2e8f0' }}>
                        {a.aggregation}({a.table}.{a.column})
                      </span>
                      <span style={{ color: a.status === 'passed' ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {a.status === 'passed' ? a.result?.toLocaleString() ?? '—' : 'Error'}
                      </span>
                    </div>
                    {a.status === 'error' && a.error && (
                      <div style={{ marginTop: 4, color: '#fca5a5', fontSize: 11 }}>{a.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <DisabledInDemo>
          <button type="button" onClick={handleRefresh} disabled={isRefreshing} style={actionButtonStyle(isRefreshing)}>
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
            {isRefreshing ? 'Rebuilding & revalidating…' : 'Refresh Sandbox Data'}
          </button>
        </DisabledInDemo>
        <Link href={openInSqlWorkspaceHref} style={actionButtonStyle(false, true)}>
          <Terminal size={14} aria-hidden="true" />
          Open in SQL Workspace
        </Link>
      </div>
    </div>
  );
}

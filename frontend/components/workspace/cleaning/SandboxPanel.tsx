'use client';

import { Boxes, CheckCircle2, Loader2, RefreshCw, Table2, Clock, Database } from 'lucide-react';
import type { CleaningPreviewResult, SandboxStatusResponse } from '@/lib/api';

function actionButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 34,
    padding: '0 14px',
    borderRadius: 8,
    border: primary ? 'none' : '1px solid rgba(148, 163, 184, 0.24)',
    background: primary
      ? 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)'
      : 'rgba(148, 163, 184, 0.06)',
    color: primary ? '#fff' : '#f4f4f5',
    fontSize: 12.5,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    width: '100%',
  };
}

function formatRows(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof Table2; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ flex: 1, gap: 2 }}>
      <Icon size={15} style={{ color: 'rgba(226,232,240,0.5)' }} aria-hidden="true" />
      <div style={{ fontSize: 15, fontWeight: 650, color: '#f5f5f7' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'rgba(226, 232, 240, 0.45)' }}>{label}</div>
    </div>
  );
}

export default function SandboxPanel({
  status,
  isInitializing,
  isRefreshing,
  isPreviewing,
  previewResults,
  onInitialize,
  onRefresh,
  onPreview,
}: {
  status: SandboxStatusResponse | null;
  isInitializing: boolean;
  isRefreshing: boolean;
  isPreviewing: boolean;
  previewResults: CleaningPreviewResult[] | null;
  onInitialize: () => void;
  onRefresh: () => void;
  onPreview: () => void;
}) {
  const initialized = status?.initialized ?? false;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div
        style={{
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: '18px 20px',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Boxes size={16} style={{ color: '#a78bfa' }} aria-hidden="true" />
            <span style={{ fontSize: 13.5, fontWeight: 650, color: '#f5f5f7' }}>Sandbox</span>
          </div>
          <span
            className="flex items-center"
            style={{
              gap: 5,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: initialized ? '#34d399' : 'rgba(226,232,240,0.55)',
              background: initialized ? 'rgba(52, 211, 153, 0.12)' : 'rgba(148, 163, 184, 0.1)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: initialized ? '#34d399' : 'rgba(226,232,240,0.4)',
              }}
            />
            {initialized ? 'Ready' : 'Not initialized'}
          </span>
        </div>

        {!initialized ? (
          <>
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', lineHeight: 1.5, marginBottom: 14 }}>
              Preview uses an isolated sandbox. No changes are made to your source data until you explicitly apply
              them.
            </p>
            <button type="button" onClick={onInitialize} disabled={isInitializing} style={actionButtonStyle(isInitializing, true)}>
              {isInitializing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Database size={14} aria-hidden="true" />}
              Initialize Sandbox
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.5)', marginBottom: 14 }}>
              Preview uses an isolated sandbox. No changes are made to your source data.
            </p>
            <div className="flex items-center" style={{ marginBottom: 16 }}>
              <MiniStat icon={Table2} value={status?.source_tables.length ?? 0} label="Tables loaded" />
              <MiniStat icon={Boxes} value={formatRows(status?.total_rows ?? null)} label="Total rows" />
              <MiniStat icon={Clock} value={formatRelativeTime(status?.last_synced_at ?? null)} label="Last synced" />
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <button type="button" onClick={onRefresh} disabled={isRefreshing} style={actionButtonStyle(isRefreshing)}>
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
                Refresh Sandbox Data
              </button>
              <button type="button" onClick={onPreview} disabled={isPreviewing} style={actionButtonStyle(isPreviewing, true)}>
                {isPreviewing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                Preview in Sandbox
              </button>
            </div>
          </>
        )}
      </div>

      {previewResults && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '18px 20px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 650, color: '#f5f5f7', marginBottom: 12 }}>
            Preview Results{' '}
            <span style={{ fontSize: 11.5, fontWeight: 500, color: '#34d399' }}>Based on approved recommendations</span>
          </div>

          {previewResults.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>No approved recommendations to preview.</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {previewResults.map((r) => {
                const improvement = r.before - r.after;
                return (
                  <div
                    key={r.recommendation_id}
                    className="flex items-center justify-between"
                    style={{
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      background: 'rgba(148, 163, 184, 0.03)',
                    }}
                  >
                    <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
                      {r.error ? (
                        <span style={{ color: '#f87171' }}>✕</span>
                      ) : (
                        <CheckCircle2 size={14} style={{ color: '#34d399', flexShrink: 0 }} aria-hidden="true" />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#f5f5f7' }}>
                          {r.table_name}
                          {r.column_name ? `.${r.column_name}` : ''}
                        </div>
                        {r.error && (
                          <div style={{ fontSize: 11, color: '#fca5a5' }}>{r.error}</div>
                        )}
                      </div>
                    </div>

                    {!r.error && (
                      <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.4)' }}>Before</div>
                          <div style={{ fontSize: 13, fontWeight: 650, color: '#e2e8f0' }}>{r.before}</div>
                        </div>
                        <span style={{ color: 'rgba(226,232,240,0.35)' }}>→</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.4)' }}>After</div>
                          <div style={{ fontSize: 13, fontWeight: 650, color: '#e2e8f0' }}>{r.after}</div>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: improvement > 0 ? '#34d399' : 'rgba(226,232,240,0.45)',
                          }}
                        >
                          {improvement > 0 ? `+${improvement}` : 'No data loss'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

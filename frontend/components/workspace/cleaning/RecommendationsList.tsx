'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Code2 } from 'lucide-react';
import type { CleaningRecommendation, CleaningConfidence } from '@/lib/api';
import { stageRoute } from '@/lib/workspaceNav';

const CONFIDENCE_META: Record<CleaningConfidence, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
  low: { label: 'Low', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
};

const OPERATION_LABELS: Record<string, { title: string; description: string }> = {
  impute_median: { title: 'Impute Nulls', description: 'Fill missing values with a default or calculated value' },
  drop_duplicates: { title: 'Remove Duplicates', description: 'Remove duplicate records based on selected key(s)' },
  cast_type: { title: 'Cast Type', description: 'Convert column values to the correct data type' },
  flag_nulls: { title: 'Flag Nulls', description: 'Flag rows with null values instead of removing them' },
};

function actionBtnStyle(active: boolean, tone: 'approve' | 'reject'): React.CSSProperties {
  const approveColor = '#34d399';
  const rejectColor = '#f87171';
  const color = tone === 'approve' ? approveColor : rejectColor;
  return {
    height: 30,
    padding: '0 12px',
    borderRadius: 7,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: 'pointer',
    border: active ? `1px solid ${color}` : '1px solid rgba(148, 163, 184, 0.24)',
    background: active ? `${color}1f` : 'rgba(148, 163, 184, 0.06)',
    color: active ? color : '#f4f4f5',
  };
}

function sqlLink(projectId: number, rec: CleaningRecommendation, isPostgres: boolean): string {
  const sql = isPostgres ? rec.sql_hint : rec.sandbox_sql || rec.sql_hint;
  const env = isPostgres ? 'source' : 'warehouse';
  const params = new URLSearchParams({ sql: sql || '', env });
  return `${stageRoute(projectId, 'sql')}?${params.toString()}`;
}

function RecommendationRow({
  rec,
  projectId,
  isPostgres,
  onDecide,
  busy,
}: {
  rec: CleaningRecommendation;
  projectId: number;
  isPostgres: boolean;
  onDecide: (id: number, status: 'approved' | 'rejected') => void;
  busy: boolean;
}) {
  const confidence = rec.confidence ? CONFIDENCE_META[rec.confidence] : CONFIDENCE_META.medium;

  return (
    <div
      style={{
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '14px 4px',
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
            <span
              style={{
                padding: '2px 9px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                color: confidence.color,
                background: confidence.bg,
              }}
            >
              {confidence.label}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f5f5f7' }}>
              {rec.table_name}
              {rec.column_name ? `.${rec.column_name}` : ''}
            </span>
            {rec.applied && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: '#60a5fa',
                  background: 'rgba(96, 165, 250, 0.12)',
                }}
              >
                Applied
              </span>
            )}
          </div>
          {rec.reason && (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.6)', marginBottom: 2 }}>{rec.reason}</p>
          )}
          {rec.expected_impact && (
            <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)' }}>{rec.expected_impact}</p>
          )}
          {rec.execution_error && (
            <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>Failed to apply: {rec.execution_error}</p>
          )}
          <Link
            href={sqlLink(projectId, rec, isPostgres)}
            className="flex items-center"
            style={{ gap: 5, fontSize: 12, color: '#a78bfa', marginTop: 8, width: 'fit-content', textDecoration: 'none' }}
          >
            <Code2 size={12} aria-hidden="true" />
            View Generated SQL
          </Link>
        </div>

        <div className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            disabled={busy || rec.applied}
            onClick={() => onDecide(rec.id, 'approved')}
            style={actionBtnStyle(rec.status === 'approved', 'approve')}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy || rec.applied}
            onClick={() => onDecide(rec.id, 'rejected')}
            style={actionBtnStyle(rec.status === 'rejected', 'reject')}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecommendationsList({
  recommendations,
  projectId,
  isPostgres,
  onDecide,
  busyIds,
}: {
  recommendations: CleaningRecommendation[];
  projectId: number;
  isPostgres: boolean;
  onDecide: (id: number, status: 'approved' | 'rejected') => void;
  busyIds: Set<number>;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, CleaningRecommendation[]>();
    for (const rec of recommendations) {
      const list = map.get(rec.operation) ?? [];
      list.push(rec);
      map.set(rec.operation, list);
    }
    return Array.from(map.entries());
  }, [recommendations]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {groups.map(([operation, recs]) => {
        const meta = OPERATION_LABELS[operation] ?? { title: operation, description: '' };
        const isCollapsed = collapsed[operation] ?? false;
        const counts = {
          approved: recs.filter((r) => r.status === 'approved').length,
          rejected: recs.filter((r) => r.status === 'rejected').length,
          pending: recs.filter((r) => r.status === 'pending').length,
        };

        return (
          <div
            key={operation}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.15)',
              background: '#05070a',
              padding: '16px 20px',
            }}
          >
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [operation]: !isCollapsed }))}
              className="flex items-center justify-between"
              style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="flex items-center" style={{ gap: 10 }}>
                {isCollapsed ? (
                  <ChevronRight size={16} style={{ color: 'rgba(226,232,240,0.5)' }} aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} style={{ color: 'rgba(226,232,240,0.5)' }} aria-hidden="true" />
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 650, color: '#f5f5f7' }}>
                    {meta.title} ({recs.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.5)' }}>{meta.description}</div>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 12, fontSize: 12, color: 'rgba(226,232,240,0.55)' }}>
                <span style={{ color: '#34d399' }}>● {counts.approved}</span>
                <span style={{ color: '#fbbf24' }}>● {counts.pending}</span>
                <span style={{ color: '#f87171' }}>● {counts.rejected}</span>
              </div>
            </button>

            {!isCollapsed && (
              <div className="flex flex-col">
                {recs.map((rec) => (
                  <RecommendationRow
                    key={rec.id}
                    rec={rec}
                    projectId={projectId}
                    isPostgres={isPostgres}
                    onDecide={onDecide}
                    busy={busyIds.has(rec.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

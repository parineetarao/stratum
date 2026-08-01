'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TableQualityScore } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  Healthy: '#34d399',
  Warning: '#fbbf24',
  'Needs Review': '#fb923c',
  Critical: '#f87171',
};

const PAGE_SIZE = 5;

export default function TableHealthPanel({ tables }: { tables: TableQualityScore[] }) {
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => [...tables].sort((a, b) => a.score - b.score), [tables]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '18px 22px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226, 232, 240, 0.7)', marginBottom: 14 }}>
        Table Health Ranking
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.5)', padding: '8px 0' }}>No tables profiled yet.</p>
      ) : (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'minmax(0,1.4fr) 1.4fr 1fr',
              gap: 8,
              fontSize: 11,
              color: 'rgba(226, 232, 240, 0.45)',
              padding: '0 4px 8px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            }}
          >
            <span>Table</span>
            <span>Quality Score</span>
            <span>Status</span>
          </div>

          {visible.map((t) => {
            const color = STATUS_COLOR[t.status] ?? '#94a3b8';
            return (
              <div
                key={t.table_name}
                className="grid items-center"
                style={{
                  gridTemplateColumns: 'minmax(0,1.4fr) 1.4fr 1fr',
                  gap: 8,
                  padding: '10px 4px',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#f5f5f7',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={t.table_name}
                >
                  {t.table_name}
                </span>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: '#e2e8f0', width: 46, flexShrink: 0 }}>{t.score} / 100</span>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 999,
                      background: 'rgba(148, 163, 184, 0.12)',
                      overflow: 'hidden',
                      maxWidth: 90,
                    }}
                  >
                    <div style={{ width: `${t.score}%`, height: '100%', borderRadius: 999, background: color }} />
                  </div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{t.status}</span>
              </div>
            );
          })}

          <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
            <span style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)' }}>
              Showing {start + 1} to {Math.min(start + PAGE_SIZE, sorted.length)} of {sorted.length} tables
            </span>
            <div className="flex items-center" style={{ gap: 4 }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center justify-center"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  background: 'transparent',
                  color: page === 0 ? 'rgba(226,232,240,0.25)' : '#e2e8f0',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={13} aria-hidden="true" />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i)
                .slice(Math.max(0, Math.min(page - 2, pageCount - 5)), Math.max(0, Math.min(page - 2, pageCount - 5)) + 5)
                .map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    style={{
                      minWidth: 26,
                      height: 26,
                      padding: '0 6px',
                      borderRadius: 6,
                      border: i === page ? '1px solid rgba(139, 125, 255, 0.5)' : '1px solid rgba(148, 163, 184, 0.18)',
                      background: i === page ? 'rgba(139, 125, 255, 0.12)' : 'transparent',
                      color: i === page ? '#c4b5fd' : '#e2e8f0',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="flex items-center justify-center"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  background: 'transparent',
                  color: page >= pageCount - 1 ? 'rgba(226,232,240,0.25)' : '#e2e8f0',
                  cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

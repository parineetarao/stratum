'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import type { QualityIssue } from '@/lib/api';

const SEVERITY_META: Record<QualityIssue['severity'], { label: string; color: string; bg: string }> = {
  critical: { label: 'High', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
  warning: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
};

const PREVIEW_COUNT = 5;

export default function CriticalIssuesPanel({ issues }: { issues: QualityIssue[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sorted = useMemo(
    () => [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1)),
    [issues]
  );

  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '18px 22px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226, 232, 240, 0.7)' }}>Critical Issues</div>
        {sorted.length > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a78bfa',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {expanded ? 'Show top 5' : 'View all issues'}
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.5)', padding: '8px 0' }}>
          No issues detected in the latest profiling run.
        </p>
      ) : (
        <>
          <div
            className="flex flex-col"
            style={{ gap: 4, maxHeight: expanded ? 420 : 'none', overflowY: expanded ? 'auto' : 'visible' }}
          >
            {visible.map((issue, idx) => {
              const meta = SEVERITY_META[issue.severity];
              const Icon = issue.severity === 'critical' ? AlertCircle : AlertTriangle;
              const key = `${issue.table}-${issue.column}-${issue.issue_type}-${idx}`;
              const isRowExpanded = expandedRows.has(key);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between"
                  style={{
                    gap: 12,
                    padding: '10px 4px',
                    borderTop: idx === 0 ? 'none' : '1px solid rgba(148, 163, 184, 0.08)',
                    cursor: 'pointer',
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleRow(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleRow(key);
                    }
                  }}
                  aria-expanded={isRowExpanded}
                >
                  <div className="flex items-start" style={{ gap: 10, minWidth: 0 }}>
                    <Icon size={15} style={{ color: meta.color, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7' }}>
                        {issue.table}
                        {issue.column ? `.${issue.column}` : ''}
                      </div>
                      <div
                        style={
                          isRowExpanded
                            ? {
                                fontSize: 12,
                                color: 'rgba(226, 232, 240, 0.5)',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                maxWidth: 480,
                              }
                            : {
                                fontSize: 12,
                                color: 'rgba(226, 232, 240, 0.5)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 380,
                              }
                        }
                        title={isRowExpanded ? undefined : issue.description}
                      >
                        {issue.description}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: meta.color,
                      background: meta.bg,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', marginTop: 12 }}>
            Showing {expanded ? sorted.length : Math.min(PREVIEW_COUNT, sorted.length)} of {sorted.length} issues
          </p>
        </>
      )}
    </div>
  );
}

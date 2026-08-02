'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Plus, X } from 'lucide-react';
import { extractErrorMessage, getQueryHistory, type DashboardChart, type SavedQuery } from '@/lib/api';
import { getCategoryBadgeStyle } from '@/components/workspace/kpis/KpiCard';

interface AddWidgetDrawerProps {
  projectId: number;
  hiddenCharts: DashboardChart[];
  onAdd: (widgetKey: string) => void;
  onClose: () => void;
}

export default function AddWidgetDrawer({ projectId, hiddenCharts, onAdd, onClose }: AddWidgetDrawerProps) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [queriesError, setQueriesError] = useState<string | null>(null);

  useEffect(() => {
    getQueryHistory(projectId)
      .then((res) => setSavedQueries(res.queries))
      .catch((err) => setQueriesError(extractErrorMessage(err, 'Could not load saved queries.')));
  }, [projectId]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 39 }} />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 380,
          maxWidth: '92vw',
          background: '#080d16',
          borderLeft: '1px solid rgba(148, 163, 184, 0.16)',
          zIndex: 40,
          overflowY: 'auto',
          padding: '22px 22px 32px',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 650, color: '#f5f5f7' }}>Add Widget</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(148, 163, 184, 0.08)', color: 'rgba(226, 232, 240, 0.7)', cursor: 'pointer' }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Removed Charts
          </div>

          {hiddenCharts.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.45)' }}>
              Every auto-generated chart is currently on the dashboard.
            </p>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {hiddenCharts.map((chart) => {
                const catStyle = getCategoryBadgeStyle(chart.category);
                return (
                  <div
                    key={chart.widget_key}
                    className="flex items-center justify-between"
                    style={{
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(148, 163, 184, 0.14)',
                      background: 'rgba(148, 163, 184, 0.03)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chart.custom_title || chart.title}
                      </div>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          padding: '1px 7px',
                          borderRadius: 10,
                          background: catStyle.bg,
                          color: catStyle.color,
                          border: `1px solid ${catStyle.border}`,
                        }}
                      >
                        {chart.category || 'General'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdd(chart.widget_key)}
                      className="flex items-center"
                      style={{
                        gap: 4,
                        flexShrink: 0,
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#fff',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={12} aria-hidden="true" />
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Saved Queries
          </div>
          <p style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', marginBottom: 10, lineHeight: 1.4 }}>
            The dashboard&apos;s charts are generated automatically from approved KPIs. Saved queries can be opened directly in the SQL Workspace.
          </p>

          {queriesError ? (
            <p style={{ fontSize: 12, color: '#fca5a5' }}>{queriesError}</p>
          ) : savedQueries.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.4)' }}>No saved queries yet.</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {savedQueries.map((q) => (
                <Link
                  key={q.id}
                  href={`/projects/${projectId}/sql?sql=${encodeURIComponent(q.sql)}&env=${encodeURIComponent(q.environment)}`}
                  className="flex items-center justify-between"
                  style={{
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(148, 163, 184, 0.14)',
                    background: 'rgba(148, 163, 184, 0.03)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.name}
                  </span>
                  <ExternalLink size={13} style={{ color: 'rgba(226, 232, 240, 0.4)', flexShrink: 0 }} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Plus, X, Loader2, BarChart3 } from 'lucide-react';
import {
  addQueryWidget,
  executeSql,
  extractErrorMessage,
  getQueryHistory,
  type DashboardChart,
  type SavedQuery,
  type SqlEnvironment,
} from '@/lib/api';
import { getCategoryBadgeStyle } from '@/components/workspace/kpis/KpiCard';

interface AddWidgetDrawerProps {
  projectId: number;
  hiddenCharts: DashboardChart[];
  onAdd: (widgetKey: string) => void;
  onAddQueryWidget: (chart: DashboardChart) => void;
  onClose: () => void;
}

const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Bar' },
  { value: 'horizontal_bar', label: 'Horizontal Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'donut', label: 'Donut' },
  { value: 'pie', label: 'Pie' },
  { value: 'table', label: 'Table' },
];

function isNumericValue(v: unknown): boolean {
  return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)));
}

export default function AddWidgetDrawer({ projectId, hiddenCharts, onAdd, onAddQueryWidget, onClose }: AddWidgetDrawerProps) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [queriesError, setQueriesError] = useState<string | null>(null);

  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewNumericColumns, setPreviewNumericColumns] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [widgetTitle, setWidgetTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    getQueryHistory(projectId)
      .then((res) => setSavedQueries(res.queries))
      .catch((err) => setQueriesError(extractErrorMessage(err, 'Could not load saved queries.')));
  }, [projectId]);

  async function handleSelectQuery(query: SavedQuery) {
    setSelectedQueryId(query.id);
    setCreateError(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewColumns([]);
    setPreviewNumericColumns([]);
    setWidgetTitle(query.name);
    try {
      const res = await executeSql(projectId, query.sql, query.environment as SqlEnvironment);
      if (!res.success) {
        setPreviewError(res.error || 'Query failed to execute.');
        return;
      }
      setPreviewColumns(res.columns);
      const numericCols = res.columns.filter((col, idx) =>
        res.rows.length > 0 && res.rows.every((row) => row[idx] === null || isNumericValue(row[idx]))
      );
      setPreviewNumericColumns(numericCols);
      setXColumn(res.columns.find((c) => !numericCols.includes(c)) || res.columns[0] || '');
      setYColumn(numericCols[0] || res.columns[1] || res.columns[0] || '');
    } catch (err) {
      setPreviewError(extractErrorMessage(err, 'Could not preview this query.'));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCreateWidget() {
    if (!selectedQueryId || !xColumn || !yColumn) return;
    setCreating(true);
    setCreateError(null);
    try {
      const chart = await addQueryWidget(projectId, {
        saved_query_id: selectedQueryId,
        chart_type: chartType,
        x_column: xColumn,
        y_column: yColumn,
        title: widgetTitle || undefined,
      });
      onAddQueryWidget(chart);
    } catch (err) {
      setCreateError(extractErrorMessage(err, 'Could not add this widget.'));
    } finally {
      setCreating(false);
    }
  }

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
            Pick a saved query to add it to the dashboard as a chart widget, or open it directly in the SQL Workspace.
          </p>

          {queriesError ? (
            <p style={{ fontSize: 12, color: '#fca5a5' }}>{queriesError}</p>
          ) : savedQueries.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.4)' }}>No saved queries yet.</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {savedQueries.map((q) => {
                const isSelected = selectedQueryId === q.id;
                return (
                  <div key={q.id}>
                    <div
                      className="flex items-center justify-between"
                      style={{
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: isSelected ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(148, 163, 184, 0.14)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(148, 163, 184, 0.03)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectQuery(q)}
                        className="flex items-center"
                        style={{ gap: 6, flex: 1, minWidth: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                      >
                        <BarChart3 size={13} style={{ color: 'rgba(226, 232, 240, 0.45)', flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ fontSize: 13, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.name}
                        </span>
                      </button>
                      <Link
                        href={`/projects/${projectId}/sql?sql=${encodeURIComponent(q.sql)}&env=${encodeURIComponent(q.environment)}`}
                        aria-label="Open in SQL Workspace"
                        style={{ flexShrink: 0, display: 'flex' }}
                      >
                        <ExternalLink size={13} style={{ color: 'rgba(226, 232, 240, 0.4)' }} aria-hidden="true" />
                      </Link>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(148, 163, 184, 0.14)',
                          background: 'rgba(148, 163, 184, 0.02)',
                        }}
                      >
                        {previewLoading ? (
                          <div className="flex items-center" style={{ gap: 6, fontSize: 12, color: 'rgba(226, 232, 240, 0.5)' }}>
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                            Previewing query...
                          </div>
                        ) : previewError ? (
                          <p style={{ fontSize: 12, color: '#fca5a5' }}>{previewError}</p>
                        ) : previewColumns.length === 0 ? (
                          <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.4)' }}>No columns to chart.</p>
                        ) : (
                          <div className="flex flex-col" style={{ gap: 8 }}>
                            <label style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.5)' }}>
                              Chart Type
                              <select
                                value={chartType}
                                onChange={(e) => setChartType(e.target.value)}
                                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.2)', background: '#0d1420', color: '#f4f4f5', fontSize: 12.5 }}
                              >
                                {CHART_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </label>
                            <label style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.5)' }}>
                              X-Axis / Category
                              <select
                                value={xColumn}
                                onChange={(e) => setXColumn(e.target.value)}
                                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.2)', background: '#0d1420', color: '#f4f4f5', fontSize: 12.5 }}
                              >
                                {previewColumns.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </label>
                            <label style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.5)' }}>
                              Y-Axis / Value
                              <select
                                value={yColumn}
                                onChange={(e) => setYColumn(e.target.value)}
                                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.2)', background: '#0d1420', color: '#f4f4f5', fontSize: 12.5 }}
                              >
                                {(previewNumericColumns.length > 0 ? previewNumericColumns : previewColumns).map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </label>
                            <label style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.5)' }}>
                              Widget Title
                              <input
                                value={widgetTitle}
                                onChange={(e) => setWidgetTitle(e.target.value)}
                                style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.2)', background: '#0d1420', color: '#f4f4f5', fontSize: 12.5 }}
                              />
                            </label>

                            {createError && <p style={{ fontSize: 12, color: '#fca5a5' }}>{createError}</p>}

                            <button
                              type="button"
                              onClick={handleCreateWidget}
                              disabled={creating || !xColumn || !yColumn}
                              className="flex items-center justify-center"
                              style={{
                                gap: 6,
                                height: 30,
                                borderRadius: 6,
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: creating ? 'not-allowed' : 'pointer',
                                opacity: creating ? 0.7 : 1,
                              }}
                            >
                              {creating ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                              Add to Dashboard
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

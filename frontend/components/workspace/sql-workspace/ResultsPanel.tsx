'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Filter, Terminal, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import type { SQLExecuteResponse, SqlEnvironment } from '@/lib/api';
import { inferColumnType, extractErrorLine, rowsToCsv, downloadCsv } from './uiHelpers';

type ResultsTab = 'results' | 'plan' | 'stats' | 'messages';

interface ResultsPanelProps {
  result: SQLExecuteResponse | null;
  error: string | null;
  isRunning: boolean;
  environment: SqlEnvironment;
}

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export default function ResultsPanel({ result, error, isRunning, environment }: ResultsPanelProps) {
  const [tab, setTab] = useState<ResultsTab>('results');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<number, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const columns = result?.columns ?? [];
  const rawRows = useMemo(() => result?.rows ?? [], [result]);

  const filteredRows = useMemo(() => {
    let rows = rawRows;
    for (const [colStr, query] of Object.entries(filters)) {
      const col = Number(colStr);
      if (!query) continue;
      const q = query.toLowerCase();
      rows = rows.filter((row) => String(row[col] ?? '').toLowerCase().includes(q));
    }
    return rows;
  }, [rawRows, filters]);

  const sortedRows = useMemo(() => {
    if (sortCol === null) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredRows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function toggleSort(col: number) {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortCol(null);
    }
  }

  function handleExport() {
    if (!result) return;
    downloadCsv(`query-results-${Date.now()}.csv`, rowsToCsv(result.columns, sortedRows));
  }

  const errorLine = error ? extractErrorLine(error) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 36,
          padding: '0 8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          flexShrink: 0,
        }}
      >
        <TabButton active={tab === 'results'} onClick={() => setTab('results')} label="Results" />
        <TabButton active={tab === 'plan'} onClick={() => setTab('plan')} label="Execution Plan" />
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')} label="Statistics" />
        <TabButton active={tab === 'messages'} onClick={() => setTab('messages')} label="Messages" />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {isRunning && (
          <div style={{ padding: 16, fontSize: 12.5, color: 'rgba(226,232,240,0.5)' }}>Running query...</div>
        )}

        {!isRunning && tab === 'results' && (
          <>
            {!result && !error && (
              <div style={{ padding: 16, fontSize: 12.5, color: 'rgba(226,232,240,0.4)' }}>
                Run a query to see results here.
              </div>
            )}
            {result && result.success && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(226,232,240,0.55)' }}>
                    <Terminal size={13} style={{ color: '#a78bfa' }} aria-hidden="true" />
                    {result.row_count} row{result.row_count === 1 ? '' : 's'} returned
                    {result.execution_time_ms !== null ? ` · ${result.execution_time_ms}ms` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={handleExport}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a78bfa', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Download size={12} aria-hidden="true" /> Download CSV
                  </button>
                </div>

                {columns.length === 0 ? (
                  <p style={{ padding: '0 14px 14px', fontSize: 12.5, color: 'rgba(226,232,240,0.5)' }}>
                    Query executed successfully with no rows returned.
                  </p>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto', padding: '0 14px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr>
                            {columns.map((col, colIdx) => (
                              <th key={col} style={thStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleSort(colIdx)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                                  >
                                    {col}
                                    {sortCol === colIdx && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveFilterCol(activeFilterCol === colIdx ? null : colIdx)}
                                    style={{ background: 'transparent', border: 'none', color: filters[colIdx] ? '#a78bfa' : 'rgba(226,232,240,0.35)', cursor: 'pointer', padding: 0 }}
                                    title="Filter"
                                  >
                                    <Filter size={11} />
                                  </button>
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(226,232,240,0.35)', textTransform: 'lowercase' }}>
                                  {inferColumnType(rawRows, colIdx)}
                                </div>
                                {activeFilterCol === colIdx && (
                                  <input
                                    autoFocus
                                    value={filters[colIdx] ?? ''}
                                    onChange={(e) => {
                                      setPage(1);
                                      setFilters((prev) => ({ ...prev, [colIdx]: e.target.value }));
                                    }}
                                    placeholder="Filter..."
                                    style={{
                                      marginTop: 4,
                                      width: '100%',
                                      height: 22,
                                      padding: '0 6px',
                                      fontSize: 11,
                                      fontWeight: 400,
                                      borderRadius: 4,
                                      border: '1px solid rgba(148,163,184,0.24)',
                                      background: '#05070a',
                                      color: '#e2e8f0',
                                    }}
                                  />
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, idx) => (
                            <tr key={idx}>
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} style={tdStyle}>
                                  {cell === null ? <span style={{ color: 'rgba(226,232,240,0.35)' }}>NULL</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', fontSize: 12, color: 'rgba(226,232,240,0.5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Rows per page:
                        <select
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(1);
                          }}
                          style={{ background: '#05070a', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.24)', borderRadius: 5, fontSize: 12, padding: '2px 6px' }}
                        >
                          {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)} style={pagerBtnStyle(currentPage <= 1)}>
                          Prev
                        </button>
                        <span>{currentPage} / {totalPages}</span>
                        <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)} style={pagerBtnStyle(currentPage >= totalPages)}>
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {!isRunning && tab === 'plan' && (
          <div style={{ padding: 16 }}>
            {result?.explain_plan ? (
              <pre style={preStyle}>{result.explain_plan}</pre>
            ) : (
              <p style={{ fontSize: 12.5, color: 'rgba(226,232,240,0.45)' }}>Execution plan not available.</p>
            )}
          </div>
        )}

        {!isRunning && tab === 'stats' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatRow label="Execution time" value={result?.execution_time_ms !== null && result?.execution_time_ms !== undefined ? `${result.execution_time_ms} ms` : '—'} />
            <StatRow label="Rows returned" value={result ? String(result.row_count) : '—'} />
            <StatRow label="Rows scanned" value={result?.rows_scanned != null ? String(result.rows_scanned) : 'Not available'} />
            <StatRow label="Execution environment" value={environment === 'warehouse' ? 'Warehouse Sandbox' : 'Source Database'} />
          </div>
        )}

        {!isRunning && tab === 'messages' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!result && !error && <p style={{ fontSize: 12.5, color: 'rgba(226,232,240,0.45)' }}>No messages yet.</p>}
            {result?.success && !error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#86efac' }}>
                <CheckCircle2 size={14} aria-hidden="true" /> Query executed successfully.
              </div>
            )}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#fca5a5' }}>
                <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                <span>
                  {errorLine !== null && <strong>Line {errorLine}: </strong>}
                  {error}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 30,
        padding: '0 12px',
        borderRadius: '6px 6px 0 0',
        border: 'none',
        borderBottom: active ? '2px solid #8b7dff' : '2px solid transparent',
        background: active ? 'rgba(148, 163, 184, 0.08)' : 'transparent',
        color: active ? '#f5f5f7' : 'rgba(226,232,240,0.5)',
        fontSize: 12.5,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360, fontSize: 12.5 }}>
      <span style={{ color: 'rgba(226,232,240,0.5)' }}>{label}</span>
      <span style={{ color: '#f5f5f7', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
  color: 'rgba(226, 232, 240, 0.6)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: '#05070a',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
  color: '#e2e8f0',
  whiteSpace: 'nowrap',
};

const preStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  color: '#e2e8f0',
  whiteSpace: 'pre-wrap',
};

function pagerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: 5,
    color: disabled ? 'rgba(226,232,240,0.3)' : '#e2e8f0',
    fontSize: 12,
    padding: '3px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

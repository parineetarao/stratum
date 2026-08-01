'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Play, Terminal } from 'lucide-react';
import { executeSql, extractErrorMessage, type SQLExecuteResponse, type SqlEnvironment } from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';

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

export default function SqlWorkspaceExplorer() {
  const { overview } = useWorkspace();
  const projectId = overview.project.id;
  const searchParams = useSearchParams();

  const [sql, setSql] = useState(searchParams.get('sql') ?? '');
  const [environment, setEnvironment] = useState<SqlEnvironment>(
    (searchParams.get('env') as SqlEnvironment) || 'source'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SQLExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!sql.trim() || isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      const data = await executeSql(projectId, sql, environment);
      setResult(data);
      if (!data.success && data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Query execution failed.'));
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>SQL Workspace</h1>
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
            Run queries against your source data or the analytical sandbox.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: 8 }}>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as SqlEnvironment)}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: '#05070a',
              color: '#f4f4f5',
              fontSize: 13,
            }}
          >
            <option value="source">Source</option>
            <option value="warehouse">Sandbox</option>
          </select>
          <button type="button" onClick={handleRun} disabled={isRunning || !sql.trim()} style={actionButtonStyle(isRunning || !sql.trim(), true)}>
            {isRunning ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            Run
          </button>
        </div>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: 4,
        }}
      >
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          spellCheck={false}
          placeholder="SELECT * FROM your_table LIMIT 100;"
          style={{
            width: '100%',
            minHeight: 160,
            resize: 'vertical',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e2e8f0',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.6,
            padding: 16,
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid rgba(248, 113, 113, 0.3)',
            background: 'rgba(248, 113, 113, 0.07)',
            fontSize: 13,
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {result && result.success && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '16px 18px',
            overflow: 'auto',
          }}
        >
          <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
            <Terminal size={14} style={{ color: '#a78bfa' }} aria-hidden="true" />
            <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)' }}>
              {result.row_count} row{result.row_count === 1 ? '' : 's'}
              {result.execution_time_ms !== null ? ` · ${result.execution_time_ms}ms` : ''}
            </span>
          </div>

          {result.columns.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                        color: 'rgba(226, 232, 240, 0.6)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, idx) => (
                  <tr key={idx}>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        style={{
                          padding: '6px 10px',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          color: '#e2e8f0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cell === null ? <span style={{ color: 'rgba(226,232,240,0.35)' }}>NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>Query executed successfully with no rows returned.</p>
          )}
        </div>
      )}
    </div>
  );
}

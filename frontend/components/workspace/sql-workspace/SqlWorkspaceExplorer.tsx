'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  executeSql,
  executeCuratedDemoQuery,
  saveQuery,
  getSandboxStatus,
  getProjectConnection,
  getDemoQueries,
  extractErrorMessage,
  type SqlEnvironment,
  type Connection,
  type SavedQuery,
  type DemoQuery,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useDemoGuard } from '@/components/workspace/demoGuard';
import TopBar from './TopBar';
import SchemaBrowserPanel from './SchemaBrowserPanel';
import DemoQueriesPanel from './DemoQueriesPanel';
import QueryTabsBar from './QueryTabsBar';
import EditorToolbar from './EditorToolbar';
import SqlEditor, { type SqlEditorHandle } from './SqlEditor';
import ResultsPanel from './ResultsPanel';
import AiAssistantPanel from './AiAssistantPanel';
import SaveQueryModal from './SaveQueryModal';
import { createTab, type QueryTab } from './types';
import { formatSql, rowsToCsv, downloadCsv } from './uiHelpers';

let tabCounter = 1;

export default function SqlWorkspaceExplorer() {
  const { overview } = useWorkspace();
  const projectId = overview.project.id;
  const isDemo = Boolean(overview.is_demo);
  const { guard, modal: signupModal } = useDemoGuard();
  const searchParams = useSearchParams();

  const initialSql = searchParams.get('sql') ?? '';
  const initialEnv = (searchParams.get('env') as SqlEnvironment) || 'source';

  const [environment, setEnvironment] = useState<SqlEnvironment>(initialEnv);
  const [tabs, setTabs] = useState<QueryTab[]>(() => [createTab('tab-1', 'Query 1', initialSql)]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const [connection, setConnection] = useState<Connection | null>(null);
  const [sandboxAvailable, setSandboxAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [autoExplainToken, setAutoExplainToken] = useState(0);

  const editorRef = useRef<SqlEditorHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isDemo || initialSql) return;
    let cancelled = false;
    getDemoQueries()
      .then((queries) => {
        if (!cancelled && queries.length > 0) {
          handleSelectDemoQuery(queries[0]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  useEffect(() => {
    let cancelled = false;
    async function loadConnectionInfo() {
      try {
        const [conn, sandbox] = await Promise.all([
          getProjectConnection(projectId),
          getSandboxStatus(projectId).catch(() => null),
        ]);
        if (!cancelled) {
          setConnection(conn);
          setSandboxAvailable(!!sandbox?.initialized);
        }
      } catch {
        // best-effort — leave defaults
      }
    }
    loadConnectionInfo();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshToken]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  function updateActiveTab(patch: Partial<QueryTab>) {
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, ...patch } : t)));
  }

  function handleAddTab() {
    tabCounter += 1;
    const id = `tab-${tabCounter}`;
    const newTab = createTab(id, `Query ${tabCounter}`);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  }

  function handleCloseTab(id: string) {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        tabCounter += 1;
        const freshId = `tab-${tabCounter}`;
        const fresh = createTab(freshId, `Query ${tabCounter}`);
        setActiveTabId(freshId);
        return [fresh];
      }
      if (id === activeTabId) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  }

  const handleRun = useCallback(async () => {
    if (!activeTab || !activeTab.sql.trim() || activeTab.isRunning) return;

    // In the public demo, only an unmodified curated query may execute.
    // Anything else (including edits to a curated query) opens the signup
    // modal instead of ever reaching the backend.
    if (isDemo && !activeTab.demoQueryId) {
      guard(() => {});
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    updateActiveTab({ isRunning: true, error: null });

    try {
      const data =
        isDemo && activeTab.demoQueryId
          ? await executeCuratedDemoQuery(projectId, activeTab.demoQueryId, environment, controller.signal)
          : await executeSql(projectId, activeTab.sql, environment, controller.signal);
      updateActiveTab({ result: data, error: data.success ? null : data.error, isRunning: false });
      if (data.success) {
        setAutoExplainToken((v) => v + 1);
      }
    } catch (err) {
      updateActiveTab({ error: extractErrorMessage(err, 'Query execution failed.'), result: null, isRunning: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, environment, projectId, isDemo]);

  function handleSelectDemoQuery(query: DemoQuery) {
    updateActiveTab({ sql: query.sql, demoQueryId: query.id, result: null, error: null });
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    updateActiveTab({ isRunning: false });
  }

  function handleFormat() {
    if (!activeTab) return;
    updateActiveTab({ sql: formatSql(activeTab.sql) });
  }

  function handleClear() {
    updateActiveTab({ sql: '', result: null, error: null });
  }

  function handleExport() {
    if (!activeTab.result?.success) return;
    downloadCsv(`query-results-${Date.now()}.csv`, rowsToCsv(activeTab.result.columns, activeTab.result.rows));
  }

  async function handleSaveQuery(name: string) {
    await saveQuery(projectId, name, activeTab.sql, environment);
    setSaveModalOpen(false);
  }

  function handleLoadHistoryQuery(query: SavedQuery) {
    tabCounter += 1;
    const id = `tab-${tabCounter}`;
    const tab = createTab(id, query.name, query.sql);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(id);
    if (query.environment === 'source' || query.environment === 'warehouse') {
      setEnvironment(query.environment);
    }
  }

  function handleInsertTable(tableName: string) {
    editorRef.current?.insertAtCursor(`SELECT *\nFROM ${tableName}\nLIMIT 100;`);
  }

  function handleInsertColumn(tableName: string, columnName: string) {
    editorRef.current?.insertAtCursor(`${tableName}.${columnName}`);
  }

  function handleInsertGenerated(sql: string) {
    updateActiveTab({ sql });
  }

  function handleRefreshSchema() {
    setIsRefreshing(true);
    setRefreshToken((v) => v + 1);
    setTimeout(() => setIsRefreshing(false), 400);
  }

  // --- resizable columns ---
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(360);
  const dragState = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragState.current) return;
      const { side, startX, startWidth } = dragState.current;
      const delta = e.clientX - startX;
      if (side === 'left') {
        setLeftWidth(Math.min(480, Math.max(180, startWidth + delta)));
      } else {
        setRightWidth(Math.min(560, Math.max(260, startWidth - delta)));
      }
    }
    function onMouseUp() {
      dragState.current = null;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (!activeTab) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <TopBar
        environment={environment}
        onEnvironmentChange={setEnvironment}
        sandboxAvailable={sandboxAvailable}
        connection={connection}
        onRefreshSchema={handleRefreshSchema}
        isRefreshing={isRefreshing}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ width: leftWidth, flexShrink: 0, borderRight: '1px solid rgba(148, 163, 184, 0.15)', background: '#0a0d12', minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {isDemo && <DemoQueriesPanel activeQueryId={activeTab.demoQueryId} onSelect={handleSelectDemoQuery} />}
          <SchemaBrowserPanel
            projectId={projectId}
            environment={environment}
            refreshToken={refreshToken}
            onInsertTable={handleInsertTable}
            onInsertColumn={handleInsertColumn}
          />
        </div>

        <div
          onMouseDown={(e) => {
            dragState.current = { side: 'left', startX: e.clientX, startWidth: leftWidth };
          }}
          style={{ width: 4, cursor: 'col-resize', flexShrink: 0, background: 'transparent' }}
        />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <QueryTabsBar tabs={tabs} activeTabId={activeTab.id} onSelect={setActiveTabId} onClose={handleCloseTab} onAdd={handleAddTab} />
          <EditorToolbar
            projectId={projectId}
            isRunning={activeTab.isRunning}
            canRun={!!activeTab.sql.trim()}
            onRun={handleRun}
            onStop={handleStop}
            onFormat={handleFormat}
            onClear={handleClear}
            onSave={() => guard(() => setSaveModalOpen(true))}
            onNewTab={handleAddTab}
            onExport={handleExport}
            canExport={!!activeTab.result?.success}
            onLoadHistoryQuery={handleLoadHistoryQuery}
          />

          <div style={{ flex: '1 1 55%', minHeight: 0, borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
            <SqlEditor
              ref={editorRef}
              value={activeTab.sql}
              onChange={(sql) => updateActiveTab({ sql, demoQueryId: sql === activeTab.sql ? activeTab.demoQueryId : undefined })}
              onRun={handleRun}
            />
          </div>

          <div style={{ flex: '1 1 45%', minHeight: 0 }}>
            <ResultsPanel result={activeTab.result} error={activeTab.error} isRunning={activeTab.isRunning} environment={environment} />
          </div>
        </div>

        <div
          onMouseDown={(e) => {
            dragState.current = { side: 'right', startX: e.clientX, startWidth: rightWidth };
          }}
          style={{ width: 4, cursor: 'col-resize', flexShrink: 0, background: 'transparent' }}
        />

        <div style={{ width: rightWidth, flexShrink: 0, borderLeft: '1px solid rgba(148, 163, 184, 0.15)', background: '#0a0d12', minHeight: 0 }}>
          <AiAssistantPanel
            projectId={projectId}
            sql={activeTab.sql}
            environment={environment}
            autoExplainToken={autoExplainToken}
            onInsertGenerated={handleInsertGenerated}
            isDemo={isDemo}
            demoQueryId={activeTab.demoQueryId}
          />
        </div>
      </div>

      {saveModalOpen && <SaveQueryModal onCancel={() => setSaveModalOpen(false)} onSave={handleSaveQuery} />}
      {signupModal}
    </div>
  );
}

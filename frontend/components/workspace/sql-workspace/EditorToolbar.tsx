'use client';

import { useState } from 'react';
import { Play, Square, Wand2, Eraser, Save, FilePlus2, History, Download, Loader2 } from 'lucide-react';
import { actionButtonStyle } from './uiHelpers';
import QueryHistoryDropdown from './QueryHistoryDropdown';
import type { SavedQuery } from '@/lib/api';

interface EditorToolbarProps {
  projectId: number;
  isRunning: boolean;
  canRun: boolean;
  onRun: () => void;
  onStop: () => void;
  onFormat: () => void;
  onClear: () => void;
  onSave: () => void;
  onNewTab: () => void;
  onExport: () => void;
  canExport: boolean;
  onLoadHistoryQuery: (query: SavedQuery) => void;
}

export default function EditorToolbar({
  isRunning,
  canRun,
  onRun,
  onStop,
  onFormat,
  onClear,
  onSave,
  onNewTab,
  onExport,
  canExport,
  onLoadHistoryQuery,
  projectId,
}: EditorToolbarProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 44,
        padding: '0 10px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#0a0d12',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        onClick={onRun}
        disabled={!canRun || isRunning}
        title="Run (Ctrl+Enter)"
        style={actionButtonStyle(!canRun || isRunning, true)}
      >
        {isRunning ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
        Run
      </button>
      <button type="button" onClick={onStop} disabled={!isRunning} title="Stop" style={actionButtonStyle(!isRunning)}>
        <Square size={13} aria-hidden="true" />
        Stop
      </button>

      <Divider />

      <button type="button" onClick={onFormat} title="Format" style={actionButtonStyle(false)}>
        <Wand2 size={13} aria-hidden="true" />
        Format
      </button>
      <button type="button" onClick={onClear} title="Clear" style={actionButtonStyle(false)}>
        <Eraser size={13} aria-hidden="true" />
        Clear
      </button>

      <Divider />

      <button type="button" onClick={onSave} title="Save Query" style={actionButtonStyle(false)}>
        <Save size={13} aria-hidden="true" />
        Save Query
      </button>
      <button type="button" onClick={onNewTab} title="New Query" style={actionButtonStyle(false)}>
        <FilePlus2 size={13} aria-hidden="true" />
        New Query
      </button>
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)} title="Query History" style={actionButtonStyle(false)}>
          <History size={13} aria-hidden="true" />
          Query History
        </button>
        {historyOpen && (
          <QueryHistoryDropdown
            projectId={projectId}
            onClose={() => setHistoryOpen(false)}
            onLoad={(q) => {
              onLoadHistoryQuery(q);
              setHistoryOpen(false);
            }}
          />
        )}
      </div>

      <Divider />

      <button type="button" onClick={onExport} disabled={!canExport} title="Export" style={actionButtonStyle(!canExport)}>
        <Download size={13} aria-hidden="true" />
        Export
      </button>
    </div>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 22, background: 'rgba(148, 163, 184, 0.15)', margin: '0 4px', flexShrink: 0 }} />;
}

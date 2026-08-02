'use client';

import { Database, RefreshCw, CircleDot, Loader2 } from 'lucide-react';
import type { SqlEnvironment, Connection } from '@/lib/api';
import { actionButtonStyle } from './uiHelpers';

interface TopBarProps {
  environment: SqlEnvironment;
  onEnvironmentChange: (env: SqlEnvironment) => void;
  sandboxAvailable: boolean;
  connection: Connection | null;
  onRefreshSchema: () => void;
  isRefreshing: boolean;
}

export default function TopBar({
  environment,
  onEnvironmentChange,
  sandboxAvailable,
  connection,
  onRefreshSchema,
  isRefreshing,
}: TopBarProps) {
  const connectionLabel = connection
    ? connection.connection_type === 'postgresql'
      ? connection.source_schema || 'public'
      : connection.original_filename || 'CSV dataset'
    : 'No connection';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        padding: '0 16px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#0a0d12',
        flexShrink: 0,
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Execution Environment
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <EnvButton
            active={environment === 'source'}
            disabled={false}
            onClick={() => onEnvironmentChange('source')}
            label="Source Database"
            sublabel={connectionLabel}
          />
          <EnvButton
            active={environment === 'warehouse'}
            disabled={!sandboxAvailable}
            onClick={() => onEnvironmentChange('warehouse')}
            label="Warehouse Sandbox"
            sublabel={sandboxAvailable ? 'Ready' : 'Not initialized'}
            title={sandboxAvailable ? undefined : 'Build the warehouse sandbox in the Warehouse module before querying it here.'}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'rgba(226,232,240,0.55)' }}>
          <CircleDot size={10} style={{ color: connection ? '#4ade80' : '#f87171' }} aria-hidden="true" />
          {connection ? 'Connected' : 'Disconnected'}
          <span style={{ color: 'rgba(226,232,240,0.35)' }}>·</span>
          {connectionLabel}
        </div>
        <button type="button" onClick={onRefreshSchema} disabled={isRefreshing} style={actionButtonStyle(isRefreshing)}>
          {isRefreshing ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          Refresh Schema
        </button>
      </div>
    </div>
  );
}

function EnvButton({
  active,
  disabled,
  onClick,
  label,
  sublabel,
  title,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        height: 34,
        padding: '0 12px',
        borderRadius: 7,
        border: active ? '1px solid rgba(139, 125, 255, 0.5)' : '1px solid rgba(148, 163, 184, 0.18)',
        background: active ? 'rgba(111, 53, 244, 0.16)' : 'rgba(148, 163, 184, 0.04)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Database size={13} style={{ color: active ? '#a78bfa' : 'rgba(226,232,240,0.5)' }} aria-hidden="true" />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
        <span style={{ fontSize: 12.5, color: active ? '#f5f5f7' : '#e2e8f0', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.4)' }}>{sublabel}</span>
      </span>
    </button>
  );
}

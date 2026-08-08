'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  Pencil,
  RefreshCw,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import {
  getDataSourceDetail,
  getDataSourceActivity,
  testStoredConnection,
  discoverSchema,
  refreshSchema,
  getProjectConnection,
  extractErrorMessage,
  type DataSourceDetail,
  type Connection,
  type TableMetadata,
  type ActivityLogEntry,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { formatBytes } from '@/lib/formatBytes';
import OverviewCard from '@/components/workspace/overview/OverviewCard';
import HealthCard from '@/components/workspace/data-source/HealthCard';
import InfoGrid, { type InfoField } from '@/components/workspace/data-source/InfoGrid';
import DataSourceStatsStrip from '@/components/workspace/data-source/DataSourceStatsStrip';
import ActivityList from '@/components/workspace/data-source/ActivityList';
import EditConnectionDialog from '@/components/workspace/data-source/EditConnectionDialog';
import ReplaceCsvDialog from '@/components/workspace/data-source/ReplaceCsvDialog';
import DataFilesPanel from '@/components/workspace/data-source/DataFilesPanel';
import DisabledInDemo from '@/components/workspace/demoGuard';

type LoadState = 'loading' | 'empty' | 'failed' | 'ready';
type Tab = 'overview' | 'activity';

interface ActivityEntryState {
  status: 'idle' | 'loading' | 'ready' | 'failed';
  entries: ActivityLogEntry[];
}

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

export default function DataSourcePage() {
  const { overview, refetch: refetchOverview } = useWorkspace();
  const projectId = overview.project.id;
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 650;
  const isTablet = viewportWidth < 1050;

  const [state, setState] = useState<LoadState>('loading');
  const [detail, setDetail] = useState<DataSourceDetail | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [fullActivity, setFullActivity] = useState<ActivityEntryState>({ status: 'idle', entries: [] });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getDataSourceDetail(projectId), getProjectConnection(projectId)])
      .then(([data, conn]) => {
        if (cancelled) return;
        setDetail(data);
        setConnection(conn);
        setState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setState('empty');
        } else {
          setState('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (tab !== 'activity' || fullActivity.status !== 'idle') return;
    setFullActivity({ status: 'loading', entries: [] });
    getDataSourceActivity(projectId, 100)
      .then((entries) => setFullActivity({ status: 'ready', entries }))
      .catch(() => setFullActivity({ status: 'failed', entries: [] }));
  }, [tab, projectId, fullActivity.status]);

  function refreshAll() {
    load();
    setFullActivity({ status: 'idle', entries: [] });
    refetchOverview();
  }

  async function handleRefreshSource() {
    if (!detail || isRefreshing) return;
    setIsRefreshing(true);
    setActionMessage(null);
    try {
      const isCsv = detail.connection_type === 'csv' || detail.connection_type === 'excel';
      if (isCsv) {
        const result = await discoverSchema(projectId);
        setActionMessage({ tone: 'success', text: `Reprocessed dataset — ${result.table_count} table(s) found.` });
      } else if (detail.stats.table_count === 0) {
        const result = await discoverSchema(projectId);
        setActionMessage({ tone: 'success', text: `Metadata discovered — ${result.table_count} table(s) found.` });
      } else {
        const result = await refreshSchema(projectId);
        setActionMessage({
          tone: 'success',
          text: result.has_changes
            ? `${result.recommendation} (${result.total_changes} change(s))`
            : 'Metadata refreshed. No changes detected.',
        });
      }
      refreshAll();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Refresh failed. Please try again.') });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleTestConnection() {
    if (isTesting) return;
    setIsTesting(true);
    setActionMessage(null);
    try {
      const result = await testStoredConnection(projectId);
      setActionMessage({
        tone: result.health.status === 'healthy' ? 'success' : 'error',
        text: result.health.message,
      });
      refreshAll();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not test this connection.') });
    } finally {
      setIsTesting(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 360 }}>
        <Loader2 size={26} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          minHeight: 320,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: '40px 24px',
        }}
      >
        <AlertCircle size={24} style={{ color: '#fca5a5', marginBottom: 14 }} aria-hidden="true" />
        <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginBottom: 16 }}>
          The data source could not be loaded.
        </p>
        <button type="button" onClick={load} style={actionButtonStyle(false)}>
          Try again
        </button>
      </div>
    );
  }

  if (state === 'empty' || !detail) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            minHeight: 380,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: '48px 24px',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#8b7dff',
              marginBottom: 20,
            }}
          >
            <Database size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
            No data source connected
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
            Connect a PostgreSQL database or upload a CSV file to start working with this project.
          </p>
          <div className="flex items-center" style={{ gap: 10 }}>
            <button type="button" onClick={() => setIsEditOpen(true)} style={actionButtonStyle(false, true)}>
              <Database size={14} aria-hidden="true" />
              Connect PostgreSQL
            </button>
            <button type="button" onClick={() => setIsReplaceOpen(true)} style={actionButtonStyle(false)}>
              <UploadCloud size={14} aria-hidden="true" />
              Upload CSV
            </button>
          </div>
        </div>

        {isEditOpen && (
          <EditConnectionDialog
            projectId={projectId}
            currentDetails={null}
            onClose={() => setIsEditOpen(false)}
            onUpdated={() => {
              setIsEditOpen(false);
              refreshAll();
            }}
          />
        )}
        {isReplaceOpen && (
          <ReplaceCsvDialog
            projectId={projectId}
            connection={null}
            onClose={() => setIsReplaceOpen(false)}
            onReplaced={() => {
              setIsReplaceOpen(false);
              refreshAll();
            }}
          />
        )}
      </>
    );
  }

  const isCsv = detail.connection_type === 'csv' || detail.connection_type === 'excel';
  const SourceIcon = isCsv ? FileSpreadsheet : Database;
  const statsColumns = isNarrow ? 2 : isTablet ? 3 : isCsv ? 4 : 5;
  const infoColumns = isNarrow ? 1 : isTablet ? 2 : 3;

  const overviewFields: InfoField[] = isCsv
    ? [
        { label: 'Data Source Type', value: detail.connection_type === 'excel' ? 'Excel Upload' : 'CSV Upload' },
        { label: 'File Name', value: detail.csv?.original_filename ?? '—' },
        { label: 'File Size', value: formatBytes(detail.csv?.file_size_bytes) },
        { label: 'Encoding', value: detail.csv?.encoding ?? 'Unknown' },
        { label: 'Delimiter', value: detail.csv?.delimiter ?? 'Unknown' },
        { label: 'Uploaded', value: new Date(detail.connected_at).toLocaleString() },
      ]
    : [
        { label: 'Data Source Type', value: 'PostgreSQL' },
        { label: 'Connection Method', value: detail.postgres?.connection_method ?? 'Direct Connection' },
        { label: 'Server Version', value: detail.postgres_info?.server_version ?? 'Unavailable' },
        { label: 'Encoding', value: detail.postgres_info?.encoding ?? 'Unavailable' },
        { label: 'Collation', value: detail.postgres_info?.collation ?? 'Unavailable' },
        { label: 'Connected', value: new Date(detail.connected_at).toLocaleString() },
      ];

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div
        className="flex items-start justify-between"
        style={{ gap: 16, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}
      >
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Data Source</h1>
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
            View and manage your connected data source.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {!isCsv && (
            <DisabledInDemo>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                style={actionButtonStyle(isTesting)}
              >
                {isTesting ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={14} aria-hidden="true" />
                )}
                Test Connection
              </button>
            </DisabledInDemo>
          )}
          <DisabledInDemo>
            <button
              type="button"
              onClick={handleRefreshSource}
              disabled={isRefreshing}
              style={actionButtonStyle(isRefreshing)}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
              {isCsv ? 'Reprocess Dataset' : 'Refresh Source'}
            </button>
          </DisabledInDemo>
          {isCsv ? (
            <button type="button" onClick={() => setIsReplaceOpen(true)} style={actionButtonStyle(false, true)}>
              <UploadCloud size={14} aria-hidden="true" />
              Replace CSV
            </button>
          ) : (
            <button type="button" onClick={() => setIsEditOpen(true)} style={actionButtonStyle(false, true)}>
              <Pencil size={14} aria-hidden="true" />
              Edit Connection
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="flex items-center"
          style={{
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            border: actionMessage.tone === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
            background: actionMessage.tone === 'success' ? 'rgba(52, 211, 153, 0.07)' : 'rgba(248, 113, 113, 0.07)',
            fontSize: 13,
            color: actionMessage.tone === 'success' ? '#6ee7b7' : '#fca5a5',
          }}
        >
          {actionMessage.tone === 'success' ? (
            <CheckCircle2 size={14} aria-hidden="true" />
          ) : (
            <XCircle size={14} aria-hidden="true" />
          )}
          {actionMessage.text}
        </div>
      )}

      <div
        style={{
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.15)',
          background: '#05070a',
          padding: 22,
          display: 'flex',
          flexDirection: isTablet ? 'column' : 'row',
          gap: 22,
        }}
      >
        <div className="flex items-center" style={{ gap: 14, flexShrink: 0, minWidth: isTablet ? 'auto' : 220 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 46,
              height: 46,
              borderRadius: 10,
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#a78bfa',
              flexShrink: 0,
            }}
          >
            <SourceIcon size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>
                {isCsv ? (detail.connection_type === 'excel' ? 'Excel' : 'CSV') : 'PostgreSQL'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(52, 211, 153, 0.12)',
                  color: '#6ee7b7',
                }}
              >
                Connected
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(226, 232, 240, 0.55)',
                marginTop: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 220,
              }}
              title={isCsv ? detail.csv?.original_filename ?? '' : detail.postgres?.database ?? ''}
            >
              {isCsv ? detail.csv?.original_filename ?? 'Untitled file' : detail.postgres?.database ?? 'Unknown database'}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', marginTop: 2 }}>
              Connected {formatRelativeTime(detail.connected_at)}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <InfoGrid
            columns={infoColumns}
            fields={
              isCsv
                ? [
                    { label: 'File Name', value: detail.csv?.original_filename ?? '—' },
                    { label: 'File Type', value: detail.csv?.file_extension?.toUpperCase() ?? '—' },
                    { label: 'File Size', value: formatBytes(detail.csv?.file_size_bytes) },
                    { label: 'Encoding', value: detail.csv?.encoding ?? 'Unknown' },
                    { label: 'Delimiter', value: detail.csv?.delimiter ?? 'Unknown' },
                  ]
                : [
                    { label: 'Host', value: detail.postgres?.host ?? '—' },
                    { label: 'Port', value: detail.postgres?.port ? String(detail.postgres.port) : '—' },
                    { label: 'Database', value: detail.postgres?.database ?? '—' },
                    { label: 'User', value: detail.postgres?.user ?? '—' },
                    { label: 'SSL Mode', value: detail.postgres?.sslmode ?? '—' },
                    { label: 'Schema', value: detail.postgres?.source_schema ?? '—' },
                  ]
            }
          />
        </div>

        <HealthCard health={detail.health} variant={isCsv ? 'dataset' : 'connection'} />
      </div>

      <DataSourceStatsStrip stats={detail.stats} isCsv={isCsv} columns={statsColumns} />

      {isCsv && <DataFilesPanel projectId={projectId} onFilesChanged={refreshAll} />}

      <div className="flex items-center" style={{ gap: 4, borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
        {(
          [
            { id: 'overview' as const, label: 'Overview' },
            { id: 'activity' as const, label: isCsv ? 'Processing Activity' : 'Connection Logs' },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              padding: '10px 4px',
              marginRight: 22,
              background: 'transparent',
              border: 'none',
              borderBottom: tab === item.id ? '2px solid #8b5cf6' : '2px solid transparent',
              color: tab === item.id ? '#f5f5f7' : 'rgba(226, 232, 240, 0.5)',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isTablet ? '1fr' : '1.3fr 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <OverviewCard
            title="Source Overview"
            subtitle={isCsv ? 'Summary of your uploaded dataset.' : 'Summary of your data source and its configuration.'}
          >
            <InfoGrid columns={isNarrow ? 1 : 2} fields={overviewFields} />
          </OverviewCard>

          <OverviewCard
            title="Recent Activity"
            subtitle={isCsv ? 'Recent processing operations.' : 'Recent sync and connection operations.'}
            action={
              <button
                type="button"
                onClick={() => setTab('activity')}
                style={{ border: 'none', background: 'transparent', color: '#8b7dff', fontSize: 12.5, cursor: 'pointer' }}
              >
                View all logs
              </button>
            }
          >
            <ActivityList activity={detail.recent_activity} />
          </OverviewCard>
        </div>
      ) : (
        <OverviewCard
          title={isCsv ? 'Processing Activity' : 'Connection Logs'}
          subtitle={isCsv ? 'Full history of upload and reprocessing events.' : 'Full history of connection and sync events.'}
        >
          {fullActivity.status === 'loading' ? (
            <div className="flex items-center justify-center" style={{ padding: '30px 0' }}>
              <Loader2 size={20} className="animate-spin" color="#8b7dff" aria-hidden="true" />
            </div>
          ) : fullActivity.status === 'failed' ? (
            <div className="flex flex-col items-center text-center" style={{ padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.6)', marginBottom: 12 }}>
                Could not load activity logs.
              </p>
              <button
                type="button"
                onClick={() => setFullActivity({ status: 'idle', entries: [] })}
                style={actionButtonStyle(false)}
              >
                Try again
              </button>
            </div>
          ) : (
            <ActivityList activity={fullActivity.entries} />
          )}
        </OverviewCard>
      )}

      {isEditOpen && !isCsv && (
        <EditConnectionDialog
          projectId={projectId}
          currentDetails={detail.postgres}
          onClose={() => setIsEditOpen(false)}
          onUpdated={() => {
            setIsEditOpen(false);
            setActionMessage({ tone: 'success', text: 'Connection updated successfully.' });
            refreshAll();
          }}
        />
      )}

      {isReplaceOpen && isCsv && (
        <ReplaceCsvDialog
          projectId={projectId}
          connection={connection}
          onClose={() => setIsReplaceOpen(false)}
          onReplaced={(_conn: Connection, _preview: TableMetadata | null) => {
            setIsReplaceOpen(false);
            setActionMessage({ tone: 'success', text: 'Dataset replaced successfully.' });
            refreshAll();
          }}
        />
      )}
    </div>
  );
}

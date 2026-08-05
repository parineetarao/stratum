'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Database, Download, Loader2, RefreshCw, XCircle } from 'lucide-react';
import {
  getMetadataCatalog,
  getCatalogTableDetail,
  getSchema,
  discoverSchema,
  refreshSchema,
  extractErrorMessage,
  type CatalogOverview,
  type CatalogTableSummary,
  type TableDetail,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import CatalogStatsStrip from './CatalogStatsStrip';
import SchemaPanel from './SchemaPanel';
import TableListPanel from './TableListPanel';
import TableDetailPanel from './TableDetailPanel';
import DisabledInDemo from '@/components/workspace/demoGuard';

type LoadState = 'loading' | 'empty' | 'failed' | 'ready';
type DetailLoadState = 'loading' | 'ready' | 'failed';

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

export default function MetadataExplorer() {
  const { overview, refetch: refetchOverview } = useWorkspace();
  const projectId = overview.project.id;
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 650;
  const isTablet = viewportWidth < 1050;

  const [state, setState] = useState<LoadState>('loading');
  const [catalog, setCatalog] = useState<CatalogOverview | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const [detailState, setDetailState] = useState<DetailLoadState>('loading');
  const [detail, setDetail] = useState<TableDetail | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const loadCatalog = useCallback(() => {
    let cancelled = false;
    setState('loading');

    getMetadataCatalog(projectId)
      .then((data) => {
        if (cancelled) return;
        setCatalog(data);
        setSelectedSchema((prev) => (prev && data.schemas.some((s) => s.name === prev) ? prev : data.source_schema));
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

  useEffect(() => loadCatalog(), [loadCatalog]);

  const isCsv = catalog?.source_type === 'csv' || catalog?.source_type === 'excel';

  const tablesInSchema = useMemo(() => {
    if (!catalog || !selectedSchema) return [];
    return catalog.tables.filter((t) => t.schema_name === selectedSchema);
  }, [catalog, selectedSchema]);

  const filteredTables = useMemo(() => {
    if (!search.trim()) return tablesInSchema;
    const q = search.trim().toLowerCase();
    return tablesInSchema.filter((t) => t.table_name.toLowerCase().includes(q));
  }, [tablesInSchema, search]);

  useEffect(() => {
    if (filteredTables.length === 0) {
      setSelectedTable(null);
      return;
    }
    if (!selectedTable || !filteredTables.some((t) => t.table_name === selectedTable)) {
      setSelectedTable(filteredTables[0].table_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTables]);

  useEffect(() => {
    if (!selectedTable) return;
    let cancelled = false;
    setDetailState('loading');
    getCatalogTableDetail(projectId, selectedTable)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setDetailState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setDetailState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedTable]);

  function retryDetail() {
    if (!selectedTable) return;
    setDetailState('loading');
    getCatalogTableDetail(projectId, selectedTable)
      .then((data) => {
        setDetail(data);
        setDetailState('ready');
      })
      .catch(() => setDetailState('failed'));
  }

  function refreshAll() {
    loadCatalog();
    refetchOverview();
  }

  async function handleRefreshMetadata() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setActionMessage(null);
    try {
      const hasRun = catalog !== null;
      if (!hasRun || isCsv) {
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
      if (selectedTable) retryDetail();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Refresh failed. Please try again.') });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleExportMetadata() {
    if (isExporting || !catalog) return;
    setIsExporting(true);
    setActionMessage(null);
    try {
      const schema = await getSchema(projectId);
      const payload = {
        project_id: catalog.project_id,
        source_type: catalog.source_type,
        exported_at: new Date().toISOString(),
        schemas: catalog.schemas,
        tables: schema.tables,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `metadata-${overview.project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionMessage({ tone: 'success', text: 'Metadata exported.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Export failed. Please try again.') });
    } finally {
      setIsExporting(false);
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
        <XCircle size={24} style={{ color: '#fca5a5', marginBottom: 14 }} aria-hidden="true" />
        <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginBottom: 16 }}>
          The metadata catalog could not be loaded.
        </p>
        <button type="button" onClick={loadCatalog} style={actionButtonStyle(false)}>
          Try again
        </button>
      </div>
    );
  }

  if (state === 'empty' || !catalog) {
    return (
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
          No metadata discovered yet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
          Connect a data source and run discovery to explore its schemas, tables, and columns here.
        </p>
        <DisabledInDemo>
          <button
            type="button"
            onClick={handleRefreshMetadata}
            disabled={isRefreshing}
            style={actionButtonStyle(isRefreshing, true)}
          >
            {isRefreshing ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            Run Discovery
          </button>
        </DisabledInDemo>
      </div>
    );
  }

  const statsColumns = isNarrow ? 2 : isTablet ? 3 : isCsv ? 3 : 5;
  const selectedSummary: CatalogTableSummary | null =
    catalog.tables.find((t) => t.table_name === selectedTable) ?? null;

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div
        className="flex items-start justify-between"
        style={{ gap: 16, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}
      >
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Metadata</h1>
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
            Explore schemas, tables, columns and data dictionary from your source.
            {catalog.last_refreshed_at && (
              <span> Last refreshed {formatRelativeTime(catalog.last_refreshed_at)}.</span>
            )}
          </p>
        </div>

        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          <DisabledInDemo>
            <button
              type="button"
              onClick={handleRefreshMetadata}
              disabled={isRefreshing}
              style={actionButtonStyle(isRefreshing)}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
              Refresh Metadata
            </button>
          </DisabledInDemo>
          <button
            type="button"
            onClick={handleExportMetadata}
            disabled={isExporting}
            style={actionButtonStyle(isExporting, true)}
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            Export Metadata
          </button>
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

      <CatalogStatsStrip catalog={catalog} columns={statsColumns} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : isCsv ? '280px minmax(0, 1fr)' : '220px 280px minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {!isCsv && (
          <SchemaPanel
            schemas={catalog.schemas}
            selectedSchema={selectedSchema ?? catalog.source_schema}
            onSelect={(schema) => {
              setSelectedSchema(schema);
              setSearch('');
            }}
          />
        )}

        <TableListPanel
          title={isCsv ? 'Datasets' : `Tables in ${selectedSchema ?? catalog.source_schema}`}
          tables={filteredTables}
          search={search}
          onSearchChange={setSearch}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
        />

        <TableDetailPanel
          summary={selectedSummary}
          state={detailState}
          detail={detail}
          isCsv={!!isCsv}
          onRetry={retryDetail}
        />
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  CheckCircle2,
  ChevronDown,
  Database,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Table2,
  XCircle,
} from 'lucide-react';
import {
  bulkAcceptRelationships,
  decideRelationship,
  getRelationships,
  getSchema,
  inferRelationships,
  extractErrorMessage,
  type RelationshipListResponse,
  type SchemaResponse,
  type TableMetadata,
} from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { stageRoute } from '@/lib/workspaceNav';
import RelationshipGraph from './RelationshipGraph';
import ReviewSidebar from './ReviewSidebar';
import { buildRelationshipItems, type GraphRelationship } from './graphModel';

type LoadState = 'loading' | 'no-source' | 'failed' | 'ready';

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

export default function RelationshipsExplorer() {
  const { overview, refetch: refetchOverview } = useWorkspace();
  const projectId = overview.project.id;
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 900;
  const reducedMotion = useReducedMotion();

  const [state, setState] = useState<LoadState>('loading');
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [relationshipData, setRelationshipData] = useState<RelationshipListResponse | null>(null);

  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'relationships' | 'table'>('relationships');

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [sidebarRevealed, setSidebarRevealed] = useState(false);
  const viewOptionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== 'ready') return;
    const timer = setTimeout(() => setSidebarRevealed(true), 60);
    return () => clearTimeout(timer);
  }, [state]);

  const load = useCallback(() => {
    let cancelled = false;
    setState('loading');

    Promise.all([getSchema(projectId), getRelationships(projectId).catch(() => null)])
      .then(([schemaRes, relRes]) => {
        if (cancelled) return;
        setSchema(schemaRes);
        setRelationshipData(relRes);
        setState(schemaRes.table_count === 0 ? 'no-source' : 'ready');
      })
      .catch((error) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
          setState('no-source');
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
    function onClickOutside(e: MouseEvent) {
      if (viewOptionsRef.current && !viewOptionsRef.current.contains(e.target as Node)) {
        setShowViewOptions(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const tables: TableMetadata[] = useMemo(() => schema?.tables ?? [], [schema]);

  const items: GraphRelationship[] = useMemo(
    () => buildRelationshipItems(tables, relationshipData?.relationships ?? []),
    [tables, relationshipData]
  );

  const selectedTable = useMemo(
    () => tables.find((t) => t.table_name === selectedTableName) ?? null,
    [tables, selectedTableName]
  );

  const visibleRelationshipCount = items.filter(
    (i) => i.kind === 'declared' || i.status === 'accepted' || i.status === 'auto_accepted' || i.status === 'pending'
  ).length;

  async function handleDiscover() {
    if (isDiscovering) return;
    setIsDiscovering(true);
    setActionMessage(null);
    try {
      const result = await inferRelationships(projectId);
      setRelationshipData(result);
      refetchOverview();
      setActionMessage({
        tone: 'success',
        text: `Discovered ${result.total_inferred} relationship(s) — ${result.auto_accepted} high-confidence, ${result.pending_review} pending review.`,
      });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Relationship discovery failed.') });
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleRefreshGraph() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setActionMessage(null);
    try {
      const [schemaRes, relRes] = await Promise.all([getSchema(projectId), getRelationships(projectId)]);
      setSchema(schemaRes);
      setRelationshipData(relRes);
      refetchOverview();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not refresh the graph.') });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDecision(item: GraphRelationship, status: 'accepted' | 'rejected') {
    if (item.kind !== 'inferred' || !item.inferredId) return;
    setBusyKeys((prev) => new Set(prev).add(item.key));
    setActionMessage(null);
    try {
      await decideRelationship(projectId, item.inferredId, status);
      const refreshed = await getRelationships(projectId);
      setRelationshipData(refreshed);
      refetchOverview();
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Could not update this relationship.') });
    } finally {
      setBusyKeys((prev) => {
        const next = new Set(prev);
        next.delete(item.key);
        return next;
      });
    }
  }

  async function handleBulkAccept() {
    setShowViewOptions(false);
    setActionMessage(null);
    try {
      const result = await bulkAcceptRelationships(projectId);
      setRelationshipData(result);
      refetchOverview();
      setActionMessage({ tone: 'success', text: 'High-confidence relationships accepted.' });
    } catch (err) {
      setActionMessage({ tone: 'error', text: extractErrorMessage(err, 'Bulk accept failed.') });
    }
  }

  function selectKeyAndSyncTab(key: string | null) {
    setSelectedKey(key);
    if (key) setActiveTab('relationships');
  }

  function selectTableAndSyncTab(tableName: string) {
    setSelectedTableName(tableName);
    setActiveTab('table');
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
          The relationship graph could not be loaded.
        </p>
        <button type="button" onClick={load} style={actionButtonStyle(false)}>
          Try again
        </button>
      </div>
    );
  }

  if (state === 'no-source') {
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
          <GitBranch size={22} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
          No tables discovered yet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 380, marginBottom: 24 }}>
          Run metadata discovery first so Stratum knows which tables exist before mapping how they connect.
        </p>
        <Link href={stageRoute(projectId, 'metadata')} style={actionButtonStyle(false, true)}>
          Go to Metadata
        </Link>
      </div>
    );
  }

  const isSingleTable = tables.length === 1;

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Relationships</h1>
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>
            Discover and manage relationships between your data objects.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {!isSingleTable && (
            <div className="flex items-center" style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{ position: 'absolute', left: 10, color: 'rgba(226, 232, 240, 0.4)' }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tables..."
                style={{
                  width: 180,
                  height: 36,
                  paddingLeft: 30,
                  paddingRight: 10,
                  borderRadius: 8,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(148, 163, 184, 0.05)',
                  color: '#f4f4f5',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div ref={viewOptionsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowViewOptions((v) => !v)}
              style={actionButtonStyle(false)}
            >
              View Options
              <ChevronDown size={13} aria-hidden="true" />
            </button>
            {showViewOptions && (
              <div
                style={{
                  position: 'absolute',
                  top: 42,
                  right: 0,
                  zIndex: 20,
                  minWidth: 240,
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  background: '#0b0d12',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  padding: 6,
                }}
              >
                <button
                  type="button"
                  disabled={!relationshipData || relationshipData.auto_accepted === 0}
                  onClick={handleBulkAccept}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 7,
                    background: 'transparent',
                    border: 'none',
                    color: !relationshipData || relationshipData.auto_accepted === 0 ? 'rgba(226,232,240,0.35)' : '#f4f4f5',
                    fontSize: 12.5,
                    cursor: !relationshipData || relationshipData.auto_accepted === 0 ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  Bulk accept high-confidence{relationshipData && relationshipData.auto_accepted > 0 ? ` (${relationshipData.auto_accepted})` : ''}
                </button>
              </div>
            )}
          </div>

          <button type="button" onClick={handleRefreshGraph} disabled={isRefreshing} style={actionButtonStyle(isRefreshing)}>
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh Graph
          </button>

          <button type="button" onClick={handleDiscover} disabled={isDiscovering} style={actionButtonStyle(isDiscovering, true)}>
            {isDiscovering ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            Discover Relationships
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
          {actionMessage.tone === 'success' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
          {actionMessage.text}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isSingleTable || isNarrow ? '1fr' : 'minmax(0, 1fr) 380px',
          gap: 16,
          alignItems: 'stretch',
          height: isSingleTable ? 420 : 620,
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            overflow: 'hidden',
          }}
        >
          {relationshipData && relationshipData.total_inferred === 0 && !isSingleTable && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                fontSize: 12,
                color: 'rgba(226, 232, 240, 0.55)',
                background: 'rgba(5, 7, 10, 0.85)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              No relationships inferred yet. Click <strong style={{ color: '#f4f4f5' }}>Discover Relationships</strong> to analyze your schema.
            </div>
          )}

          <RelationshipGraph
            tables={tables}
            items={items}
            selectedKey={selectedKey}
            onSelectKey={selectKeyAndSyncTab}
            onSelectTable={selectTableAndSyncTab}
            searchQuery={search}
            reducedMotion={reducedMotion}
          />

          {isSingleTable && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 12.5,
                color: 'rgba(226, 232, 240, 0.5)',
                textAlign: 'center',
                maxWidth: 360,
              }}
            >
              Only one table detected — there are no relationships to map yet. Connect additional tables or datasets to
              see how they relate.
            </div>
          )}
        </div>

        {!isSingleTable && (
          <ReviewSidebar
            items={items}
            selectedKey={selectedKey}
            onSelectKey={selectKeyAndSyncTab}
            selectedTable={selectedTable}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            busyKeys={busyKeys}
            onAccept={(item) => handleDecision(item, 'accepted')}
            onReject={(item) => handleDecision(item, 'rejected')}
            reveal={sidebarRevealed || reducedMotion}
          />
        )}
      </div>

      <div
        className="flex items-center"
        style={{
          gap: 20,
          padding: '10px 4px',
          fontSize: 12,
          color: 'rgba(226, 232, 240, 0.45)',
          flexWrap: 'wrap',
        }}
      >
        <span className="flex items-center" style={{ gap: 6 }}>
          <Database size={13} aria-hidden="true" />
          Database: {overview.source.connection_type === 'postgresql' ? 'PostgreSQL' : overview.source.connection_type === 'excel' ? 'Excel' : 'CSV'}
        </span>
        {overview.source.source_schema && (
          <span className="flex items-center" style={{ gap: 6 }}>
            <Layers size={13} aria-hidden="true" />
            Schema: {overview.source.source_schema}
          </span>
        )}
        <span className="flex items-center" style={{ gap: 6 }}>
          <Table2 size={13} aria-hidden="true" />
          {tables.length} table{tables.length === 1 ? '' : 's'}
        </span>
        <span className="flex items-center" style={{ gap: 6 }}>
          <GitBranch size={13} aria-hidden="true" />
          {visibleRelationshipCount} relationship{visibleRelationshipCount === 1 ? '' : 's'}
        </span>
        {overview.metadata_summary.last_discovered_at && (
          <span>Last discovery: {formatRelativeTime(overview.metadata_summary.last_discovered_at)}</span>
        )}
      </div>
    </div>
  );
}

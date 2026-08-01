'use client';

import { useMemo, useState } from 'react';
import { GitBranch, Table2 } from 'lucide-react';
import type { TableMetadata } from '@/lib/api';
import ColumnsTable from '@/components/workspace/metadata/ColumnsTable';
import RelationshipCard from './RelationshipCard';
import type { GraphRelationship } from './graphModel';

type Tab = 'relationships' | 'table';
type ShowFilter = 'pending' | 'all' | 'accepted' | 'rejected';
type SortBy = 'confidence' | 'name';

interface ReviewSidebarProps {
  items: GraphRelationship[];
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  selectedTable: TableMetadata | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  busyKeys: Set<string>;
  onAccept: (item: GraphRelationship) => void;
  onReject: (item: GraphRelationship) => void;
  reveal: boolean;
}

const selectStyle: React.CSSProperties = {
  height: 28,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'rgba(148, 163, 184, 0.05)',
  color: '#e2e8f0',
  fontSize: 11.5,
  outline: 'none',
};

export default function ReviewSidebar({
  items,
  selectedKey,
  onSelectKey,
  selectedTable,
  activeTab,
  onTabChange,
  busyKeys,
  onAccept,
  onReject,
  reveal,
}: ReviewSidebarProps) {
  const [showFilter, setShowFilter] = useState<ShowFilter>('pending');
  const [sortBy, setSortBy] = useState<SortBy>('confidence');

  const pendingCount = items.filter((i) => i.kind === 'inferred' && (i.status === 'pending' || i.status === 'auto_accepted')).length;
  const acceptedCount = items.filter((i) => i.kind === 'declared' || i.status === 'accepted' || i.status === 'auto_accepted').length;

  const filtered = useMemo(() => {
    let list = items;
    if (showFilter === 'pending') {
      list = list.filter((i) => i.kind === 'inferred' && (i.status === 'pending' || i.status === 'auto_accepted'));
    } else if (showFilter === 'accepted') {
      list = list.filter((i) => i.kind === 'declared' || i.status === 'accepted' || i.status === 'auto_accepted');
    } else if (showFilter === 'rejected') {
      list = list.filter((i) => i.status === 'rejected');
    } else {
      list = list.filter((i) => i.status !== 'rejected');
    }
    return [...list].sort((a, b) =>
      sortBy === 'confidence'
        ? b.confidence_score - a.confidence_score
        : a.from_table.localeCompare(b.from_table)
    );
  }, [items, showFilter, sortBy]);

  const acceptedForView = useMemo(
    () => items.filter((i) => i.kind === 'declared' || i.status === 'accepted' || i.status === 'auto_accepted'),
    [items]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        overflow: 'hidden',
        opacity: reveal ? 1 : 0,
        transform: reveal ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 380ms ease 520ms, transform 380ms ease 520ms',
      }}
    >
      <div className="flex items-center" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <button
          type="button"
          onClick={() => onTabChange('relationships')}
          className="flex items-center"
          style={{
            gap: 6,
            padding: '12px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'relationships' ? '2px solid #8b5cf6' : '2px solid transparent',
            color: activeTab === 'relationships' ? '#f5f5f7' : 'rgba(226, 232, 240, 0.5)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <GitBranch size={13} aria-hidden="true" />
          Inferred Relationships
          <span
            style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 999,
              background: 'rgba(139, 92, 246, 0.18)',
              color: '#a78bfa',
            }}
          >
            {items.filter((i) => i.kind === 'inferred').length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('table')}
          className="flex items-center"
          style={{
            gap: 6,
            padding: '12px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'table' ? '2px solid #8b5cf6' : '2px solid transparent',
            color: activeTab === 'table' ? '#f5f5f7' : 'rgba(226, 232, 240, 0.5)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Table2 size={13} aria-hidden="true" />
          Table Details
        </button>
      </div>

      {activeTab === 'relationships' ? (
        <>
          <div
            className="flex items-center justify-between"
            style={{ padding: '10px 14px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', gap: 8 }}
          >
            <div className="flex items-center" style={{ gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.5)' }}>Show</span>
              <select value={showFilter} onChange={(e) => setShowFilter(e.target.value as ShowFilter)} style={selectStyle}>
                <option value="pending">Pending</option>
                <option value="all">All</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center" style={{ gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.5)' }}>Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} style={selectStyle}>
                <option value="confidence">Confidence</option>
                <option value="name">Table Name</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <div
                className="flex flex-col items-center text-center"
                style={{ padding: '32px 12px', color: 'rgba(226, 232, 240, 0.45)' }}
              >
                <GitBranch size={18} style={{ marginBottom: 8, opacity: 0.6 }} aria-hidden="true" />
                <span style={{ fontSize: 12.5 }}>No relationships match this filter.</span>
              </div>
            ) : (
              filtered.map((item) => (
                <RelationshipCard
                  key={item.key}
                  item={item}
                  selected={selectedKey === item.key}
                  busy={busyKeys.has(item.key)}
                  onSelect={() => onSelectKey(selectedKey === item.key ? null : item.key)}
                  onAccept={() => onAccept(item)}
                  onReject={() => onReject(item)}
                />
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilter('accepted')}
            className="flex items-center justify-between"
            style={{
              padding: '11px 16px',
              borderTop: '1px solid rgba(148, 163, 184, 0.12)',
              background: 'transparent',
              border: 'none',
              borderTopStyle: 'solid',
              color: '#a78bfa',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            View Accepted ({acceptedForView.length || acceptedCount})
            <span aria-hidden="true">&rsaquo;</span>
          </button>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {selectedTable ? (
            <>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
                <Table2 size={15} style={{ color: '#a78bfa' }} aria-hidden="true" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>{selectedTable.table_name}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 14 }}>
                {selectedTable.row_count.toLocaleString()} rows &middot; {selectedTable.column_count} columns
              </div>
              <ColumnsTable columns={selectedTable.columns} />
            </>
          ) : (
            <div
              className="flex flex-col items-center text-center"
              style={{ padding: '32px 12px', color: 'rgba(226, 232, 240, 0.45)' }}
            >
              <Table2 size={18} style={{ marginBottom: 8, opacity: 0.6 }} aria-hidden="true" />
              <span style={{ fontSize: 12.5 }}>Select a table in the graph to view its columns.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

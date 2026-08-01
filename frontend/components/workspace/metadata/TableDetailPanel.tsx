'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Table2 } from 'lucide-react';
import type { CatalogTableSummary, TableDetail } from '@/lib/api';
import { formatBytes } from '@/lib/formatBytes';
import { formatCount } from '@/lib/formatCount';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import InfoGrid, { type InfoField } from '@/components/workspace/data-source/InfoGrid';
import ColumnsTable from './ColumnsTable';
import IndexesTable from './IndexesTable';
import ConstraintsTable from './ConstraintsTable';
import SampleDataTable from './SampleDataTable';
import DdlView from './DdlView';

type Tab = 'overview' | 'columns' | 'indexes' | 'constraints' | 'sample' | 'ddl';
type DetailState = 'loading' | 'ready' | 'failed';

interface TableDetailPanelProps {
  summary: CatalogTableSummary | null;
  state: DetailState;
  detail: TableDetail | null;
  isCsv: boolean;
  onRetry: () => void;
}

export default function TableDetailPanel({ summary, state, detail, isCsv, onRetry }: TableDetailPanelProps) {
  const [tab, setTab] = useState<Tab>('overview');

  if (!summary) {
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
        <Table2 size={22} style={{ color: 'rgba(226, 232, 240, 0.3)', marginBottom: 14 }} aria-hidden="true" />
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)' }}>
          Select a table to view its metadata.
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'columns', label: 'Columns', count: detail?.column_count },
    ...(isCsv ? [] : [{ id: 'indexes' as const, label: 'Indexes', count: detail?.index_count }]),
    ...(isCsv ? [] : [{ id: 'constraints' as const, label: 'Constraints', count: detail?.constraint_count }]),
    { id: 'sample', label: 'Sample Data' },
    { id: 'ddl', label: 'DDL' },
  ];

  const overviewFields: InfoField[] = detail
    ? [
        { label: 'Rows (Approx)', value: formatCount(detail.row_count) },
        { label: 'Columns', value: String(detail.column_count) },
        { label: 'Data Size', value: formatBytes(detail.data_size_bytes) },
        { label: 'Primary Key', value: detail.primary_key.length > 0 ? detail.primary_key.join(', ') : '—' },
        { label: 'Indexes', value: isCsv ? 'Not applicable' : String(detail.index_count) },
        { label: 'Last Analyzed', value: formatRelativeTime(detail.last_analyzed_at) },
      ]
    : [];

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="flex items-center" style={{ gap: 9 }}>
            <Table2 size={16} style={{ color: '#a78bfa' }} aria-hidden="true" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>{summary.table_name}</span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(139, 92, 246, 0.12)',
                color: '#a78bfa',
              }}
            >
              {isCsv ? 'Dataset' : 'Table'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)', marginTop: 6 }}>
          Schema {summary.schema_name} &middot; Last updated {formatRelativeTime(summary.last_updated)}
        </div>
      </div>

      <div
        className="flex items-center"
        style={{ gap: 2, padding: '0 16px', borderBottom: '1px solid rgba(148, 163, 184, 0.12)', overflowX: 'auto' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex items-center"
            style={{
              gap: 6,
              padding: '10px 12px',
              marginRight: 6,
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
              color: tab === t.id ? '#f5f5f7' : 'rgba(226, 232, 240, 0.5)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: tab === t.id ? 'rgba(139, 92, 246, 0.18)' : 'rgba(148, 163, 184, 0.12)',
                  color: tab === t.id ? '#a78bfa' : 'rgba(226, 232, 240, 0.5)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {state === 'loading' && (
          <div className="flex items-center justify-center" style={{ padding: '40px 0' }}>
            <Loader2 size={22} className="animate-spin" color="#8b7dff" aria-hidden="true" />
          </div>
        )}

        {state === 'failed' && (
          <div className="flex flex-col items-center text-center" style={{ padding: '32px 0' }}>
            <AlertCircle size={20} style={{ color: '#fca5a5', marginBottom: 10 }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.6)', marginBottom: 12 }}>
              Could not load table metadata.
            </p>
            <button
              type="button"
              onClick={onRetry}
              style={{
                height: 32,
                padding: '0 14px',
                borderRadius: 7,
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: 'rgba(148, 163, 184, 0.06)',
                color: '#f4f4f5',
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state === 'ready' && detail && (
          <>
            {tab === 'overview' && <InfoGrid columns={3} fields={overviewFields} />}
            {tab === 'columns' && <ColumnsTable columns={detail.columns} />}
            {tab === 'indexes' && !isCsv && <IndexesTable indexes={detail.indexes} />}
            {tab === 'constraints' && !isCsv && <ConstraintsTable constraints={detail.constraints} />}
            {tab === 'sample' && <SampleDataTable rows={detail.sample_data} />}
            {tab === 'ddl' && <DdlView ddl={detail.ddl} />}
          </>
        )}
      </div>
    </div>
  );
}

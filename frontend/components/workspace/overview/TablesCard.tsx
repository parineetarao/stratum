import Link from 'next/link';
import { ArrowRight, Table2 } from 'lucide-react';
import type { ProjectOverview } from '@/lib/api';
import { formatCount } from '@/lib/formatCount';
import OverviewCard from './OverviewCard';

export default function TablesCard({ overview, columns }: { overview: ProjectOverview; columns: number }) {
  const { tables_overview, source } = overview;
  const isCsv = source.connection_type === 'csv' || source.connection_type === 'excel';

  return (
    <OverviewCard
      title={isCsv ? 'Uploaded File' : 'Tables Overview'}
      subtitle={isCsv ? 'Detected columns and rows' : 'Discovered tables in your source schema'}
      action={
        <Link
          href={`/projects/${overview.project.id}/metadata`}
          className="flex items-center"
          style={{ gap: 6, fontSize: 13, color: '#8b7dff', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Explore All Tables
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      }
    >
      {!tables_overview.has_run ? (
        <div className="flex flex-col items-center text-center" style={{ padding: '24px 0' }}>
          <Table2 size={26} style={{ color: 'rgba(226, 232, 240, 0.3)', marginBottom: 12 }} aria-hidden="true" />
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.6)' }}>No metadata discovered yet.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {tables_overview.tables.map((table) => (
            <div
              key={table.table_name}
              style={{
                borderRadius: 9,
                border: '1px solid rgba(148, 163, 184, 0.14)',
                background: '#07090d',
                padding: '12px 14px',
              }}
            >
              <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                <Table2 size={14} style={{ color: 'rgba(226, 232, 240, 0.45)' }} aria-hidden="true" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={table.table_name}
                >
                  {table.table_name}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)' }}>
                {formatCount(table.row_count)} rows &middot; {table.column_count ?? '—'} columns
              </div>
            </div>
          ))}
        </div>
      )}
    </OverviewCard>
  );
}

import { Search, Table2 } from 'lucide-react';
import type { CatalogTableSummary } from '@/lib/api';
import { formatCount } from '@/lib/formatCount';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

interface TableListPanelProps {
  title: string;
  tables: CatalogTableSummary[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

export default function TableListPanel({
  title,
  tables,
  search,
  onSearchChange,
  selectedTable,
  onSelectTable,
}: TableListPanelProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e2e8f0', marginBottom: 10 }}>{title}</div>
        <div className="flex items-center" style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: 10, color: 'rgba(226, 232, 240, 0.4)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tables, columns..."
            style={{
              width: '100%',
              height: 32,
              paddingLeft: 30,
              paddingRight: 10,
              borderRadius: 7,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(148, 163, 184, 0.05)',
              color: '#f4f4f5',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {tables.length === 0 ? (
          <div
            className="flex flex-col items-center text-center"
            style={{ padding: '28px 14px', color: 'rgba(226, 232, 240, 0.45)' }}
          >
            <Table2 size={20} style={{ marginBottom: 8, opacity: 0.6 }} aria-hidden="true" />
            <span style={{ fontSize: 12.5 }}>No tables match your search.</span>
          </div>
        ) : (
          tables.map((table) => {
            const isActive = table.table_name === selectedTable;
            return (
              <button
                key={table.table_name}
                type="button"
                onClick={() => onSelectTable(table.table_name)}
                style={{
                  width: '100%',
                  display: 'block',
                  padding: '10px 14px',
                  background: isActive ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center" style={{ gap: 7 }}>
                  <Table2
                    size={13}
                    style={{ color: isActive ? '#a78bfa' : 'rgba(226, 232, 240, 0.4)', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#f5f5f7' : '#e2e8f0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={table.table_name}
                  >
                    {table.table_name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.4)', marginTop: 2, paddingLeft: 20 }}>
                  {formatCount(table.row_count)} rows &middot; {table.column_count} columns &middot;{' '}
                  {formatRelativeTime(table.last_updated)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

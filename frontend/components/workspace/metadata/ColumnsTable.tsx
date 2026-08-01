import { Key } from 'lucide-react';
import type { ColumnMetadata } from '@/lib/api';

export default function ColumnsTable({ columns }: { columns: ColumnMetadata[] }) {
  const hasForeignKeys = columns.some((c) => c.foreign_key);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
            {['Column Name', 'Data Type', 'Nullable', 'Primary Key', hasForeignKeys ? 'Foreign Key' : null]
              .filter((h): h is string => h !== null)
              .map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'rgba(226, 232, 240, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  {header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col.name} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
              <td style={{ padding: '9px 12px' }}>
                <span className="flex items-center" style={{ gap: 6 }}>
                  {col.is_primary_key && <Key size={12} style={{ color: '#facc15' }} aria-hidden="true" />}
                  <span style={{ color: '#f4f4f5', fontWeight: 500 }}>{col.name}</span>
                </span>
              </td>
              <td style={{ padding: '9px 12px' }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(94, 234, 212, 0.1)',
                    color: '#5eead4',
                    fontFamily: 'monospace',
                  }}
                >
                  {col.type}
                </span>
              </td>
              <td style={{ padding: '9px 12px', color: 'rgba(226, 232, 240, 0.65)' }}>
                {col.nullable ? 'Yes' : 'No'}
              </td>
              <td style={{ padding: '9px 12px' }}>
                {col.is_primary_key ? (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(52, 211, 153, 0.12)',
                      color: '#6ee7b7',
                    }}
                  >
                    PK
                  </span>
                ) : (
                  <span style={{ color: 'rgba(226, 232, 240, 0.3)' }}>—</span>
                )}
              </td>
              {hasForeignKeys && (
                <td style={{ padding: '9px 12px', color: 'rgba(226, 232, 240, 0.6)', fontSize: 12 }}>
                  {col.foreign_key
                    ? `→ ${col.foreign_key.referenced_table}.${col.foreign_key.referenced_column}`
                    : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

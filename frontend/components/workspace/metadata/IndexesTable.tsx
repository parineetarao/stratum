import { ListTree } from 'lucide-react';
import type { IndexInfo } from '@/lib/api';

export default function IndexesTable({ indexes }: { indexes: IndexInfo[] }) {
  if (indexes.length === 0) {
    return (
      <div
        className="flex flex-col items-center text-center"
        style={{ padding: '32px 0', color: 'rgba(226, 232, 240, 0.45)' }}
      >
        <ListTree size={22} style={{ marginBottom: 10, opacity: 0.6 }} aria-hidden="true" />
        <span style={{ fontSize: 13 }}>No indexes found for this table.</span>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
            {['Name', 'Columns', 'Unique', 'Type'].map((header) => (
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
          {indexes.map((idx) => (
            <tr key={idx.name} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
              <td style={{ padding: '9px 12px', color: '#f4f4f5', fontWeight: 500 }}>{idx.name}</td>
              <td style={{ padding: '9px 12px', color: 'rgba(226, 232, 240, 0.65)', fontFamily: 'monospace', fontSize: 12 }}>
                {idx.columns.join(', ')}
              </td>
              <td style={{ padding: '9px 12px', color: 'rgba(226, 232, 240, 0.65)' }}>{idx.is_unique ? 'Yes' : 'No'}</td>
              <td style={{ padding: '9px 12px' }}>
                {idx.is_primary ? (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(52, 211, 153, 0.12)',
                      color: '#6ee7b7',
                    }}
                  >
                    Primary
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(148, 163, 184, 0.1)',
                      color: 'rgba(226, 232, 240, 0.6)',
                    }}
                  >
                    Secondary
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

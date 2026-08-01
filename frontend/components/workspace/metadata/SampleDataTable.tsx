import { Rows3 } from 'lucide-react';

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function SampleDataTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return (
      <div
        className="flex flex-col items-center text-center"
        style={{ padding: '32px 0', color: 'rgba(226, 232, 240, 0.45)' }}
      >
        <Rows3 size={22} style={{ marginBottom: 10, opacity: 0.6 }} aria-hidden="true" />
        <span style={{ fontSize: 13 }}>No sample rows available.</span>
      </div>
    );
  }

  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(226, 232, 240, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
              {columns.map((col) => {
                const raw = row[col];
                const isNull = raw === null || raw === undefined;
                return (
                  <td
                    key={col}
                    style={{
                      padding: '8px 12px',
                      color: isNull ? 'rgba(226, 232, 240, 0.3)' : '#e2e8f0',
                      fontStyle: isNull ? 'italic' : 'normal',
                      whiteSpace: 'nowrap',
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatCellValue(raw)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

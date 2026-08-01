import { ShieldCheck } from 'lucide-react';
import type { ConstraintInfo } from '@/lib/api';

const TYPE_LABEL: Record<string, string> = {
  primary_key: 'Primary Key',
  foreign_key: 'Foreign Key',
  unique: 'Unique',
  check: 'Check',
};

export default function ConstraintsTable({ constraints }: { constraints: ConstraintInfo[] }) {
  if (constraints.length === 0) {
    return (
      <div
        className="flex flex-col items-center text-center"
        style={{ padding: '32px 0', color: 'rgba(226, 232, 240, 0.45)' }}
      >
        <ShieldCheck size={22} style={{ marginBottom: 10, opacity: 0.6 }} aria-hidden="true" />
        <span style={{ fontSize: 13 }}>No constraints found for this table.</span>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
            {['Name', 'Type', 'Definition'].map((header) => (
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
          {constraints.map((c, idx) => (
            <tr key={`${c.name}-${idx}`} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
              <td style={{ padding: '9px 12px', color: '#f4f4f5', fontWeight: 500 }}>{c.name}</td>
              <td style={{ padding: '9px 12px' }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(139, 92, 246, 0.12)',
                    color: '#a78bfa',
                  }}
                >
                  {TYPE_LABEL[c.type] ?? c.type}
                </span>
              </td>
              <td
                style={{
                  padding: '9px 12px',
                  color: 'rgba(226, 232, 240, 0.65)',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {c.definition}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

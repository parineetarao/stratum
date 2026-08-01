import { Columns3, Database, FileSpreadsheet, Layers, Table2 } from 'lucide-react';
import type { CatalogOverview } from '@/lib/api';
import { formatCount } from '@/lib/formatCount';

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: 'rgba(139, 92, 246, 0.1)',
          color: '#a78bfa',
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.5)', marginBottom: 2 }}>{label}</div>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: '#f5f5f7',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function CatalogStatsStrip({ catalog, columns }: { catalog: CatalogOverview; columns: number }) {
  const isCsv = catalog.source_type === 'csv' || catalog.source_type === 'excel';

  const items = [
    isCsv ? null : { icon: Layers, label: 'Schemas', value: String(catalog.schema_count) },
    { icon: Table2, label: isCsv ? 'Datasets' : 'Tables', value: String(catalog.table_count) },
    { icon: Columns3, label: 'Columns', value: formatCount(catalog.column_count) },
    { icon: Database, label: 'Total Rows (Approx)', value: formatCount(catalog.total_rows_approx) },
    {
      icon: isCsv ? FileSpreadsheet : Database,
      label: 'Source Type',
      value: isCsv ? (catalog.source_type === 'excel' ? 'Excel' : 'CSV') : 'PostgreSQL',
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '18px 22px',
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 20,
      }}
    >
      {items.map((item) => (
        <StatItem key={item.label} {...item} />
      ))}
    </div>
  );
}

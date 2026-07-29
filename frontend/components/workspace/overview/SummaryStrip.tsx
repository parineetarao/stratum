import { Calendar, Database, FileSpreadsheet, Table2, Rows3 } from 'lucide-react';
import type { ProjectOverview } from '@/lib/api';
import { formatCount } from '@/lib/formatCount';

interface SummaryStripProps {
  overview: ProjectOverview;
  columns: number;
}

function StatItem({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail?: string | null;
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
        {detail && (
          <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', marginTop: 1 }}>{detail}</div>
        )}
      </div>
    </div>
  );
}

export default function SummaryStrip({ overview, columns }: SummaryStripProps) {
  const { source, metadata_summary, project } = overview;
  const isCsv = source.connection_type === 'csv' || source.connection_type === 'excel';

  const items = [
    isCsv
      ? {
          icon: FileSpreadsheet,
          label: 'Data Source',
          value: source.original_filename ?? 'CSV Upload',
          detail: source.is_connected ? 'Connected' : 'Not connected',
        }
      : {
          icon: Database,
          label: 'Data Source',
          value: source.connection_type === 'postgresql' ? 'PostgreSQL' : 'Not connected',
          detail: source.database_name ?? (source.is_connected ? 'Connected' : 'Not connected'),
        },
    {
      icon: Table2,
      label: 'Tables Discovered',
      value: metadata_summary.has_run ? String(metadata_summary.table_count) : 'Pending',
      detail: metadata_summary.has_run ? (source.source_schema ? `schema: ${source.source_schema}` : null) : 'Not scanned yet',
    },
    {
      icon: Rows3,
      label: 'Rows Scanned',
      value: metadata_summary.has_run ? formatCount(metadata_summary.total_rows) : 'Pending',
      detail: metadata_summary.has_run ? 'Total rows' : 'Not scanned yet',
    },
    {
      icon: Calendar,
      label: 'Project Created',
      value: new Date(project.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      detail: null,
    },
  ];

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

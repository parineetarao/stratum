import { Calendar, Columns3, Database, HardDrive, Table2 } from 'lucide-react';
import type { DataSourceStats } from '@/lib/api';
import { formatCount } from '@/lib/formatCount';
import { formatBytes } from '@/lib/formatBytes';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

function StatItem({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail?: string;
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
        {detail && <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', marginTop: 1 }}>{detail}</div>}
      </div>
    </div>
  );
}

interface DataSourceStatsStripProps {
  stats: DataSourceStats;
  isCsv: boolean;
  columns: number;
}

export default function DataSourceStatsStrip({ stats, isCsv, columns }: DataSourceStatsStripProps) {
  const hasScanned = stats.table_count > 0;

  const items = [
    isCsv
      ? null
      : {
          icon: Table2,
          label: 'Tables',
          value: hasScanned ? String(stats.table_count) : 'Not scanned',
        },
    {
      icon: Database,
      label: 'Rows',
      value: hasScanned ? formatCount(stats.total_rows) : 'Not scanned',
      detail: hasScanned ? 'Total rows' : undefined,
    },
    {
      icon: Columns3,
      label: 'Columns',
      value: hasScanned ? formatCount(stats.total_columns) : 'Not scanned',
    },
    {
      icon: HardDrive,
      label: isCsv ? 'File Size' : 'Data Size',
      value: formatBytes(stats.size_bytes),
      detail: isCsv ? 'On disk' : 'On disk',
    },
    {
      icon: Calendar,
      label: 'Last Sync',
      value: formatRelativeTime(stats.last_sync_at),
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

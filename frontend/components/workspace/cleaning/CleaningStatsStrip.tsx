import { CheckCircle2, Layers, Clock, XCircle } from 'lucide-react';
import type { CleaningListResponse } from '@/lib/api';

function pct(part: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  sublabel,
}: {
  icon: typeof Layers;
  color: string;
  label: string;
  value: number;
  sublabel: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '16px 18px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)' }}>{label}</span>
        <div
          className="flex items-center justify-center"
          style={{ width: 26, height: 26, borderRadius: 8, background: `${color}1a`, color }}
        >
          <Icon size={14} aria-hidden="true" />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)', marginTop: 4 }}>{sublabel}</div>
    </div>
  );
}

export default function CleaningStatsStrip({ report }: { report: CleaningListResponse }) {
  return (
    <div className="flex" style={{ gap: 12, flexWrap: 'wrap' }}>
      <StatCard
        icon={Layers}
        color="#a78bfa"
        label="Total Issues Found"
        value={report.total}
        sublabel="Across recommendations"
      />
      <StatCard
        icon={CheckCircle2}
        color="#34d399"
        label="Approved"
        value={report.approved}
        sublabel={pct(report.approved, report.total)}
      />
      <StatCard
        icon={XCircle}
        color="#f87171"
        label="Rejected"
        value={report.rejected}
        sublabel={pct(report.rejected, report.total)}
      />
      <StatCard
        icon={Clock}
        color="#fbbf24"
        label="Pending"
        value={report.pending}
        sublabel={pct(report.pending, report.total)}
      />
    </div>
  );
}

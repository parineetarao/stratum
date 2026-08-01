import { CheckCircle2, Fingerprint, GitMerge } from 'lucide-react';
import type { QualityReportResponse } from '@/lib/api';

function Bar({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center" style={{ gap: 12 }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: `${color}1a`,
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div style={{ fontSize: 12.5, color: '#e2e8f0', width: 100, flexShrink: 0 }}>{label}</div>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 999,
          background: 'rgba(148, 163, 184, 0.12)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            borderRadius: 999,
            background: color,
          }}
        />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#f5f5f7', width: 42, textAlign: 'right', flexShrink: 0 }}>
        {Math.round(value)}%
      </div>
    </div>
  );
}

export default function QualityDimensionsPanel({ report }: { report: QualityReportResponse }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '18px 22px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226, 232, 240, 0.7)', marginBottom: 16 }}>
        Quality Dimensions
      </div>
      <div className="flex flex-col" style={{ gap: 14 }}>
        <Bar icon={CheckCircle2} label="Completeness" value={report.completeness_score} color="#60a5fa" />
        <Bar icon={GitMerge} label="Consistency" value={report.consistency_score} color="#a78bfa" />
        <Bar icon={Fingerprint} label="Uniqueness" value={report.uniqueness_score} color="#fb923c" />
      </div>
    </div>
  );
}

import { ShieldCheck } from 'lucide-react';
import type { QualityReportResponse } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

function scoreStatus(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: '#34d399' };
  if (score >= 70) return { label: 'Good', color: '#34d399' };
  if (score >= 50) return { label: 'Needs Review', color: '#fbbf24' };
  return { label: 'Critical', color: '#f87171' };
}

export default function QualityScoreCard({ report }: { report: QualityReportResponse }) {
  const status = scoreStatus(report.overall_score);
  const profiledDate = new Date(report.profiled_at);

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '20px 22px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226, 232, 240, 0.7)', marginBottom: 4 }}>
        Overall Data Quality Score
      </div>
      <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 18 }}>
        Assess the overall quality of your data and prioritize issues that need attention.
      </p>

      <div className="flex items-center" style={{ gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="flex items-end" style={{ gap: 6 }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: status.color, lineHeight: 1 }}>
              {report.overall_score}
            </span>
            <span style={{ fontSize: 17, color: 'rgba(226, 232, 240, 0.4)', paddingBottom: 4 }}>/ 100</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: status.color, marginTop: 6 }}>{status.label}</div>
        </div>

        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.08)',
            color: status.color,
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={26} strokeWidth={1.6} aria-hidden="true" />
        </div>

        <div style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)' }}>
          <div style={{ marginBottom: 2 }}>Last Profiled</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
            {formatRelativeTime(report.profiled_at)}
          </div>
          <div>
            {profiledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
            {profiledDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}

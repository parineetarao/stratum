import Link from 'next/link';
import { ArrowRight, Gauge } from 'lucide-react';
import type { ProjectOverview, QualitySummary } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import OverviewCard from './OverviewCard';

const STATUS_COLOR: Record<string, string> = {
  Good: '#34d399',
  'Needs Review': '#fbbf24',
  Critical: '#f87171',
};

function ScoreRing({ score }: { score: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <svg width={116} height={116} viewBox="0 0 116 116" aria-hidden="true">
      <circle cx={58} cy={58} r={radius} fill="none" stroke="rgba(148, 163, 184, 0.14)" strokeWidth={9} />
      <circle
        cx={58}
        cy={58}
        r={radius}
        fill="none"
        stroke="url(#quality-gradient)"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 58 58)"
      />
      <defs>
        <linearGradient id="quality-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#2ea7ff" />
        </linearGradient>
      </defs>
      <text x="58" y="54" textAnchor="middle" fontSize="26" fontWeight="650" fill="#f5f5f7">
        {score}
      </text>
      <text x="58" y="72" textAnchor="middle" fontSize="10.5" fill="rgba(226, 232, 240, 0.5)">
        /100
      </text>
    </svg>
  );
}

export default function QualityCard({ overview }: { overview: ProjectOverview }) {
  const quality: QualitySummary = overview.quality_summary;

  return (
    <OverviewCard title="Data Quality Score" subtitle="Overall quality of your data">
      {quality.has_run && quality.overall_score !== null ? (
        <div className="flex flex-col items-center text-center">
          <ScoreRing score={quality.overall_score} />
          <div className="flex items-center" style={{ gap: 6, marginTop: 6, marginBottom: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: STATUS_COLOR[quality.status_label ?? ''] ?? '#94a3b8',
              }}
            />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0' }}>{quality.status_label}</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 4 }}>
            {quality.critical_issues ?? 0} critical &middot; {quality.warning_issues ?? 0} warnings
          </p>
          {quality.run_at && (
            <p style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)' }}>
              Last run {formatRelativeTime(quality.run_at)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center" style={{ padding: '18px 0' }}>
          <Gauge size={26} style={{ color: 'rgba(226, 232, 240, 0.3)', marginBottom: 12 }} aria-hidden="true" />
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.6)', marginBottom: 4 }}>
            Data quality has not been evaluated yet.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)' }}>
            Run data-quality checks to generate a score.
          </p>
        </div>
      )}

      <Link
        href={`/projects/${overview.project.id}/data-quality`}
        className="flex items-center justify-center"
        style={{
          gap: 6,
          height: 38,
          marginTop: 16,
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'rgba(148, 163, 184, 0.05)',
          color: '#e2e8f0',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        View Data Quality
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </OverviewCard>
  );
}

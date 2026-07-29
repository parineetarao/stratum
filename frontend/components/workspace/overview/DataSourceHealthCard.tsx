import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import type { ProjectOverview } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { formatCount } from '@/lib/formatCount';
import OverviewCard from './OverviewCard';

function Row({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}
    >
      <span className="flex items-center" style={{ gap: 8, fontSize: 13, color: 'rgba(226, 232, 240, 0.65)' }}>
        {ok === null ? (
          <Circle size={13} style={{ color: 'rgba(226, 232, 240, 0.3)' }} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={13} style={{ color: ok ? '#34d399' : 'rgba(226, 232, 240, 0.3)' }} aria-hidden="true" />
        )}
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function DataSourceHealthCard({ overview }: { overview: ProjectOverview }) {
  const { source, metadata_summary } = overview;

  return (
    <OverviewCard title="Data Source Health" subtitle="Overview of your connected source">
      <div>
        <Row label="Connection" value={source.is_connected ? 'Connected' : 'Not connected'} ok={source.is_connected} />
        <Row
          label="Connected since"
          value={source.connected_at ? formatRelativeTime(source.connected_at) : 'Not available'}
          ok={source.is_connected}
        />
        <Row
          label="Accessibility"
          value={metadata_summary.has_run ? 'Verified' : 'Not scanned yet'}
          ok={metadata_summary.has_run ? true : null}
        />
        <Row
          label="Data volume"
          value={metadata_summary.has_run ? `${formatCount(metadata_summary.total_rows)} rows` : 'Not scanned yet'}
          ok={metadata_summary.has_run ? true : null}
        />
      </div>

      <Link
        href={`/projects/${overview.project.id}/data-source`}
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
        View Data Source
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </OverviewCard>
  );
}

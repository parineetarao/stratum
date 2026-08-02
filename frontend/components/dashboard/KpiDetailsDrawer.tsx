'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import type { DashboardChart, KPIItem } from '@/lib/api';
import { CHART_TYPE_LABELS } from './chartOptions';
import { parseSqlMeta } from './sqlMeta';

interface KpiDetailsDrawerProps {
  chart: DashboardChart;
  kpiItem: KPIItem | undefined;
  projectId: number;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
      <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: '#f4f4f5', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function KpiDetailsDrawer({ chart, kpiItem, projectId, onClose }: KpiDetailsDrawerProps) {
  const meta = parseSqlMeta(chart.sql || '');
  const sqlUrl = `/projects/${projectId}/sql?sql=${encodeURIComponent(chart.sql)}&env=${encodeURIComponent(chart.mode)}`;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 39 }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 380,
          maxWidth: '92vw',
          background: '#080d16',
          borderLeft: '1px solid rgba(148, 163, 184, 0.16)',
          zIndex: 40,
          overflowY: 'auto',
          padding: '22px 22px 32px',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 650, color: '#f5f5f7' }}>{chart.custom_title || chart.kpi_name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(148, 163, 184, 0.08)', color: 'rgba(226, 232, 240, 0.7)', cursor: 'pointer' }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div
          className="flex items-center"
          style={{
            gap: 6,
            marginBottom: 18,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            width: 'fit-content',
          }}
        >
          <CheckCircle2 size={13} style={{ color: '#22c55e' }} aria-hidden="true" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>Approved</span>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.5, marginBottom: 18 }}>
          {kpiItem?.description || 'Recommended business performance metric derived from the connected data source.'}
        </p>

        <div style={{ marginBottom: 18 }}>
          <Row label="Aggregation" value={meta.aggregation || '—'} />
          <Row label="Measure" value={meta.measure || '—'} />
          <Row label="Dimension" value={meta.dimension || '—'} />
          <Row label="Environment" value={<span style={{ textTransform: 'capitalize' }}>{chart.mode}</span>} />
          <Row label="Unit" value={chart.unit || '—'} />
          {kpiItem?.confidence_label && <Row label="Confidence" value={kpiItem.confidence_label} />}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Supported chart types
          </div>
          <div className="flex items-center" style={{ gap: 6, flexWrap: 'wrap' }}>
            {(chart.supported_chart_types.length ? chart.supported_chart_types : ['card']).map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  color: 'rgba(226, 232, 240, 0.75)',
                }}
              >
                {CHART_TYPE_LABELS[t] || t}
              </span>
            ))}
          </div>
        </div>

        <Link
          href={sqlUrl}
          className="flex items-center justify-center"
          style={{
            gap: 6,
            height: 38,
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.22)',
            background: 'rgba(148, 163, 184, 0.06)',
            color: '#a78bfa',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View SQL
          <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

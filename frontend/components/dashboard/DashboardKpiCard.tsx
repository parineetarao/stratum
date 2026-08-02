'use client';

import { useState } from 'react';
import type { DashboardChart } from '@/lib/api';
import { getCategoryBadgeStyle } from '@/components/workspace/kpis/KpiCard';

interface DashboardKpiCardProps {
  chart: DashboardChart;
  isSelected: boolean;
  onSelect: (kpiId: number) => void;
}

function Sparkline({ chart, color }: { chart: DashboardChart; color: string }) {
  const points = chart.chart_data || [];
  const values = points.map((p) => p.value ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 28;

  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardKpiCard({ chart, isSelected, onSelect }: DashboardKpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const catStyle = getCategoryBadgeStyle(chart.category);
  const hasSparkline = chart.chart_form === 'time_series' && Boolean(chart.chart_data && chart.chart_data.length >= 2);

  return (
    <div
      onClick={() => onSelect(chart.kpi_id)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 12,
        background: '#080d16',
        border: isSelected ? '1px solid #6f35f4' : '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: isSelected ? '0 0 0 3px rgba(111, 53, 244, 0.15)' : 'none',
        padding: '16px 18px',
        transition: 'border 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10, gap: 8 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'rgba(226, 232, 240, 0.7)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={chart.custom_title || chart.kpi_name}
        >
          {chart.custom_title || chart.kpi_name}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            padding: '2px 7px',
            borderRadius: 10,
            background: catStyle.bg,
            color: catStyle.color,
            border: `1px solid ${catStyle.border}`,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {chart.category || 'General'}
        </span>
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: 8,
        }}
      >
        {chart.formatted_value}
      </div>

      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.45)' }}>
          {chart.value_label || (chart.unit ? chart.unit.toUpperCase() : '')}
        </span>
        {hasSparkline && (
          <div style={{ width: 64, flexShrink: 0 }}>
            <Sparkline chart={chart} color={catStyle.color} />
          </div>
        )}
      </div>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 20,
            width: 240,
            padding: '12px 14px',
            borderRadius: 8,
            background: '#0d1420',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            fontSize: 12,
          }}
        >
          <div style={{ color: 'rgba(226, 232, 240, 0.5)', marginBottom: 8, lineHeight: 1.4 }}>
            Recommended metric derived from {chart.mode === 'warehouse' ? 'the warehouse layer' : 'the source data'}.
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: 'rgba(226, 232, 240, 0.45)' }}>Environment</span>
            <span style={{ color: '#f4f4f5', fontWeight: 500, textTransform: 'capitalize' }}>{chart.mode}</span>
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: 'rgba(226, 232, 240, 0.45)' }}>Measure</span>
            <span style={{ color: '#f4f4f5', fontWeight: 500 }}>{chart.value_label || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: 'rgba(226, 232, 240, 0.45)' }}>Unit</span>
            <span style={{ color: '#f4f4f5', fontWeight: 500 }}>{chart.unit || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

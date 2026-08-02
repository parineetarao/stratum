'use client';

import { useState } from 'react';
import type { KPISummaryCard } from '@/lib/api';
import { getCategoryBadgeStyle } from '@/components/workspace/kpis/KpiCard';
import { parseSqlMeta } from './sqlMeta';

interface DashboardKpiCardProps {
  kpi: KPISummaryCard;
  isSelected: boolean;
  onSelect: (kpiId: number) => void;
}

export default function DashboardKpiCard({ kpi, isSelected, onSelect }: DashboardKpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const catStyle = getCategoryBadgeStyle(kpi.category);
  const meta = parseSqlMeta(kpi.sql || '');

  return (
    <div
      onClick={() => onSelect(kpi.kpi_id)}
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
          title={kpi.kpi_name}
        >
          {kpi.kpi_name}
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
          {kpi.category || 'General'}
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
        {kpi.formatted_value}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.45)' }}>
        {meta.aggregation || (kpi.unit ? kpi.unit.toUpperCase() : '')}
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
            Recommended metric derived from {kpi.mode === 'warehouse' ? 'the warehouse layer' : 'the source data'}.
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: 'rgba(226, 232, 240, 0.45)' }}>Environment</span>
            <span style={{ color: '#f4f4f5', fontWeight: 500, textTransform: 'capitalize' }}>{kpi.mode}</span>
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: 'rgba(226, 232, 240, 0.45)' }}>Aggregation</span>
            <span style={{ color: '#f4f4f5', fontWeight: 500 }}>{meta.aggregation || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: 'rgba(226, 232, 240, 0.45)' }}>Unit</span>
            <span style={{ color: '#f4f4f5', fontWeight: 500 }}>{kpi.unit || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

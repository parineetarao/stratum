'use client';

import { Plus } from 'lucide-react';
import type { DashboardChart } from '@/lib/api';
import ChartTile, { type ChartSize } from './ChartTile';

interface ChartGridProps {
  charts: DashboardChart[];
  projectId: number;
  highlightedWidgetKey: string | null;
  onChangeType: (widgetKey: string, chartType: string) => void;
  onRename: (widgetKey: string, title: string) => void;
  onResize: (widgetKey: string, size: ChartSize) => void;
  onRemove: (widgetKey: string) => void;
  onAddWidget: () => void;
}

export default function ChartGrid({
  charts,
  projectId,
  highlightedWidgetKey,
  onChangeType,
  onRename,
  onResize,
  onRemove,
  onAddWidget,
}: ChartGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 20,
        marginBottom: 28,
      }}
    >
      {charts.map((chart) => (
        <ChartTile
          key={chart.widget_key}
          chart={chart}
          projectId={projectId}
          isHighlighted={highlightedWidgetKey === chart.widget_key}
          onChangeType={onChangeType}
          onRename={onRename}
          onResize={onResize}
          onRemove={onRemove}
        />
      ))}

      <button
        type="button"
        onClick={onAddWidget}
        className="flex flex-col items-center justify-center"
        style={{
          gridColumn: 'span 4',
          minHeight: 300,
          borderRadius: 12,
          border: '1px dashed rgba(148, 163, 184, 0.28)',
          background: 'rgba(148, 163, 184, 0.03)',
          color: 'rgba(226, 232, 240, 0.55)',
          cursor: 'pointer',
          gap: 10,
        }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '1px solid rgba(148, 163, 184, 0.24)',
          }}
        >
          <Plus size={18} aria-hidden="true" />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Add Widget</span>
        <span style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.35)' }}>Drag or click to add KPIs or charts</span>
      </button>
    </div>
  );
}

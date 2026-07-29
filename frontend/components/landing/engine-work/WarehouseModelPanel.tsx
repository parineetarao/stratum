'use client';

import { Box } from 'lucide-react';
import { WAREHOUSE_NODES, STAGE_COLORS } from './engine-work-data';

interface WarehouseModelPanelProps {
  revealed: boolean;
  emphasis: boolean;
  reducedMotion: boolean;
}

export default function WarehouseModelPanel({ revealed, emphasis, reducedMotion }: WarehouseModelPanelProps) {
  const fact = WAREHOUSE_NODES.find((n) => n.isFact)!;
  const dims = WAREHOUSE_NODES.filter((n) => !n.isFact);

  return (
    <div className="flex h-full flex-col" style={{ padding: '18px 20px' }}>
      <span
        className="uppercase font-semibold"
        style={{ fontSize: 11.5, letterSpacing: '0.08em', color: '#C4B5FD', marginBottom: 12, display: 'block' }}
      >
        Warehouse Model
      </span>

      <div className="relative" style={{ flex: 1, minHeight: 160 }}>
        <svg
          className="absolute inset-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', opacity: revealed ? 1 : 0, transition: reducedMotion ? 'none' : 'opacity 420ms ease' }}
        >
          {dims.map((dim) => (
            <line
              key={dim.id}
              x1={fact.x}
              y1={fact.y}
              x2={dim.x}
              y2={dim.y}
              stroke={STAGE_COLORS.warehouse}
              strokeOpacity={0.4}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {dims.map((dim, i) => (
          <div
            key={dim.id}
            className="absolute flex items-center"
            style={{
              left: `${dim.x}%`,
              top: `${dim.y}%`,
              transform: `translate(-50%, -50%) scale(${revealed ? 1 : 0.92})`,
              opacity: revealed ? 1 : 0,
              gap: 6,
              padding: '6px 10px',
              background: '#0A0C13',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 9,
              transition: reducedMotion ? 'none' : `opacity 380ms ease ${i * 70}ms, transform 380ms ease ${i * 70}ms`,
            }}
          >
            <Box size={12} color={STAGE_COLORS.warehouse} />
            <span style={{ fontSize: 10.5, color: 'rgba(245,245,247,0.82)' }}>{dim.label}</span>
          </div>
        ))}

        <div
          className="absolute flex items-center justify-center font-semibold"
          style={{
            left: `${fact.x}%`,
            top: `${fact.y}%`,
            transform: `translate(-50%, -50%) scale(${revealed ? 1 : 0.9})`,
            opacity: revealed ? 1 : 0,
            padding: '9px 16px',
            fontSize: 12,
            color: '#F5F5F7',
            background: emphasis ? 'rgba(37,131,235,0.16)' : '#0A0C13',
            border: `1px solid ${emphasis ? STAGE_COLORS.warehouse : 'rgba(255,255,255,0.14)'}`,
            borderRadius: 10,
            transition: reducedMotion ? 'none' : 'opacity 380ms ease, transform 380ms ease, background 280ms ease, border-color 280ms ease',
          }}
        >
          {fact.label}
        </div>
      </div>
    </div>
  );
}

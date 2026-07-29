'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, LayoutDashboard } from 'lucide-react';
import { KPI_CARDS, REVENUE_SERIES, REVENUE_MONTHS, TOP_PRODUCTS } from './engine-work-data';

interface AnalyticsPreviewPanelProps {
  revealed: boolean;
  reducedMotion: boolean;
}

function useCountUp(target: number, active: boolean, reducedMotion: boolean) {
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    if (reducedMotion) {
      setValue(target);
      return;
    }
    const duration = 700;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reducedMotion]);

  return value;
}

function LineChart({ active }: { active: boolean }) {
  const max = Math.max(...REVENUE_SERIES);
  const points = REVENUE_SERIES.map((v, i) => {
    const x = (i / (REVENUE_SERIES.length - 1)) * 100;
    const y = 100 - (v / max) * 90;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 64 }}>
      <polyline
        points={points}
        fill="none"
        stroke="url(#eng-revenue-grad)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: active ? 0 : 400,
          transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) 100ms',
        }}
      />
      <defs>
        <linearGradient id="eng-revenue-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#22C7D9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DonutChart({ active }: { active: boolean }) {
  let cumulative = 0;
  const stops = TOP_PRODUCTS.map((slice) => {
    const start = cumulative;
    cumulative += slice.value;
    return `${slice.color} ${start}% ${cumulative}%`;
  }).join(', ');

  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: 56,
        height: 56,
        background: `conic-gradient(${stops})`,
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 14px), #000 calc(100% - 13px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 14px), #000 calc(100% - 13px))',
        opacity: active ? 1 : 0,
        transform: active ? 'scale(1)' : 'scale(0.85)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}
    />
  );
}

export default function AnalyticsPreviewPanel({ revealed, reducedMotion }: AnalyticsPreviewPanelProps) {
  return (
    <div className="flex h-full flex-col" style={{ padding: '18px 20px' }}>
      <span
        className="uppercase font-semibold"
        style={{ fontSize: 11.5, letterSpacing: '0.08em', color: '#C4B5FD', marginBottom: 12, display: 'block' }}
      >
        Analytics Preview
      </span>

      <div className="grid grid-cols-4" style={{ gap: 8, marginBottom: 10 }}>
        {KPI_CARDS.map((kpi, i) => (
          <KpiCard key={kpi.label} kpi={kpi} index={i} revealed={revealed} reducedMotion={reducedMotion} />
        ))}
      </div>

      <div className="grid grid-cols-3" style={{ gap: 8, flex: 1, minHeight: 0 }}>
        <div
          style={{
            background: '#080B11',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '10px 12px',
            opacity: revealed ? 1 : 0,
            transition: reducedMotion ? 'none' : 'opacity 420ms ease 260ms',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 10.5, color: 'rgba(245,245,247,0.55)' }}>Revenue Over Time</span>
          </div>
          <LineChart active={revealed} />
          <div className="flex justify-between" style={{ marginTop: 2 }}>
            {REVENUE_MONTHS.map((m) => (
              <span key={m} style={{ fontSize: 9, color: 'rgba(245,245,247,0.35)' }}>
                {m}
              </span>
            ))}
          </div>
        </div>

        <div
          className="flex items-center"
          style={{
            gap: 10,
            background: '#080B11',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '10px 12px',
            opacity: revealed ? 1 : 0,
            transition: reducedMotion ? 'none' : 'opacity 420ms ease 320ms',
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, color: 'rgba(245,245,247,0.55)', marginBottom: 6 }}>Top Products</div>
            <DonutChart active={revealed} />
          </div>
          <div className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
            {TOP_PRODUCTS.map((slice) => (
              <div key={slice.label} className="flex items-center" style={{ gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: slice.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9.5, color: 'rgba(245,245,247,0.7)', whiteSpace: 'nowrap' }}>
                  {slice.label} <span style={{ color: 'rgba(245,245,247,0.4)' }}>{slice.value}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <div
            style={{
              flex: 1,
              background: '#080B11',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '10px 12px',
              opacity: revealed ? 1 : 0,
              transition: reducedMotion ? 'none' : 'opacity 420ms ease 380ms',
            }}
          >
            <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
              <Terminal size={12} color="rgba(245,245,247,0.6)" />
              <span style={{ fontSize: 10.5, color: 'rgba(245,245,247,0.55)' }}>SQL Workspace</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.82)', marginBottom: 8 }}>24 queries run</div>
            <button
              type="button"
              tabIndex={-1}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: 'white',
                background: '#2563eb',
                border: 'none',
                borderRadius: 6,
                padding: '4px 12px',
                cursor: 'default',
              }}
            >
              Open
            </button>
          </div>

          <div
            style={{
              flex: 1,
              background: '#080B11',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '10px 12px',
              opacity: revealed ? 1 : 0,
              transition: reducedMotion ? 'none' : 'opacity 420ms ease 440ms',
            }}
          >
            <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
              <LayoutDashboard size={12} color="rgba(245,245,247,0.6)" />
              <span style={{ fontSize: 10.5, color: 'rgba(245,245,247,0.55)' }}>Dashboard</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.82)' }}>6 widgets live</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  kpi,
  index,
  revealed,
  reducedMotion,
}: {
  kpi: { label: string; value: string; delta: string };
  index: number;
  revealed: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div
      style={{
        background: '#080B11',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '9px 12px',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(10px)',
        transition: reducedMotion ? 'none' : `opacity 380ms ease ${index * 60}ms, transform 380ms ease ${index * 60}ms`,
      }}
    >
      <div style={{ fontSize: 10, color: 'rgba(245,245,247,0.55)', marginBottom: 4 }}>{kpi.label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F7' }}>{kpi.value}</div>
      <div style={{ fontSize: 9.5, color: '#7DD3FC', marginTop: 2 }}>&uarr; {kpi.delta}</div>
    </div>
  );
}

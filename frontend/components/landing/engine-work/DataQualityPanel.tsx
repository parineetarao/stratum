'use client';

import { QUALITY_METRICS, QUALITY_SCORE } from './engine-work-data';

interface DataQualityPanelProps {
  revealed: boolean;
  reducedMotion: boolean;
}

const GRADIENT = 'linear-gradient(90deg, #A855F7, #4F6DF5, #22C7D9)';

export default function DataQualityPanel({ revealed, reducedMotion }: DataQualityPanelProps) {
  const circumference = 2 * Math.PI * 30;
  const dash = revealed ? circumference * (1 - QUALITY_SCORE / 100) : circumference;

  return (
    <div className="flex h-full flex-col" style={{ padding: '18px 20px' }}>
      <span
        className="uppercase font-semibold"
        style={{ fontSize: 11.5, letterSpacing: '0.08em', color: '#C4B5FD', marginBottom: 12, display: 'block' }}
      >
        Data Quality
      </span>

      <div className="grid grid-cols-2" style={{ gap: 8, flex: 1 }}>
        {QUALITY_METRICS.map((metric, i) => (
          <div
            key={metric.label}
            style={{
              background: '#080B11',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '9px 11px',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(6px)',
              transition: reducedMotion ? 'none' : `opacity 360ms ease ${i * 60}ms, transform 360ms ease ${i * 60}ms`,
            }}
          >
            <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.62)' }}>{metric.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F7' }}>{metric.value}%</span>
            </div>
            <div className="relative overflow-hidden" style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
              <div
                style={{
                  height: '100%',
                  width: revealed ? `${metric.value}%` : '0%',
                  borderRadius: 999,
                  background: GRADIENT,
                  transition: reducedMotion ? 'none' : `width 620ms cubic-bezier(0.22,1,0.36,1) ${i * 60 + 80}ms`,
                }}
              />
            </div>
          </div>
        ))}

        <div
          className="flex flex-col items-center justify-center"
          style={{
            background: '#080B11',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '9px 11px',
            opacity: revealed ? 1 : 0,
            transition: reducedMotion ? 'none' : 'opacity 360ms ease 360ms',
          }}
        >
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="34"
              cy="34"
              r="30"
              fill="none"
              stroke="url(#eng-quality-grad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dash}
              transform="rotate(-90 34 34)"
              style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) 200ms' }}
            />
            <defs>
              <linearGradient id="eng-quality-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#22C7D9" />
              </linearGradient>
            </defs>
            <text x="34" y="31" textAnchor="middle" fontSize="15" fontWeight="700" fill="#F5F5F7">
              {QUALITY_SCORE}
            </text>
            <text x="34" y="44" textAnchor="middle" fontSize="7" fill="rgba(245,245,247,0.5)">
              Excellent
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

'use client';

import { CURATED_DEMO_QUERIES, type CuratedDemoQuery } from './curatedDemoQueries';

interface DemoQueryPickerProps {
  activeQueryId: string | null;
  onSelect: (query: CuratedDemoQuery) => void;
}

/** Demo-mode replacement for free-text SQL entry: the reviewer picks one of
 * a small set of backend-approved queries and runs the real thing against
 * the real demo_retail data - no arbitrary SQL ever reaches the server. */
export default function DemoQueryPicker({ activeQueryId, onSelect }: DemoQueryPickerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#0a0d12',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Try a sample query
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CURATED_DEMO_QUERIES.map((q) => {
          const active = q.id === activeQueryId;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(q)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: active ? '1px solid rgba(139, 125, 255, 0.5)' : '1px solid rgba(148, 163, 184, 0.18)',
                background: active ? 'rgba(111, 53, 244, 0.16)' : 'rgba(148, 163, 184, 0.04)',
                color: active ? '#f5f5f7' : '#e2e8f0',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {q.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Play, ListChecks } from 'lucide-react';
import { getDemoQueries, type DemoQuery } from '@/lib/api';

interface DemoQueriesPanelProps {
  activeQueryId?: string;
  onSelect: (query: DemoQuery) => void;
}

export default function DemoQueriesPanel({ activeQueryId, onSelect }: DemoQueriesPanelProps) {
  const [queries, setQueries] = useState<DemoQuery[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDemoQueries()
      .then((data) => {
        if (!cancelled) setQueries(data);
      })
      .catch(() => {
        if (!cancelled) setQueries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
      <div
        className="flex items-center"
        style={{ gap: 7, padding: '12px 12px 8px' }}
      >
        <ListChecks size={13} style={{ color: '#a78bfa' }} aria-hidden="true" />
        <span style={{ fontSize: 11.5, fontWeight: 650, color: 'rgba(226,232,240,0.6)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Demo Queries
        </span>
      </div>
      <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {queries.map((q) => {
          const active = q.id === activeQueryId;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(q)}
              className="flex items-center justify-between"
              style={{
                textAlign: 'left',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 7,
                border: 'none',
                background: active ? 'rgba(111, 53, 244, 0.16)' : 'transparent',
                color: active ? '#a78bfa' : 'rgba(226,232,240,0.72)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <span>{q.title}</span>
              <Play size={11} style={{ flexShrink: 0, opacity: 0.7 }} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

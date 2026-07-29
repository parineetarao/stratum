'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { GENERATED_SQL } from './engine-work-data';

interface GeneratedSqlPanelProps {
  revealed: boolean;
  reducedMotion: boolean;
}

const CHUNK = 6;
const STEP_MS = 12;

export default function GeneratedSqlPanel({ revealed, reducedMotion }: GeneratedSqlPanelProps) {
  const [visibleChars, setVisibleChars] = useState(reducedMotion ? GENERATED_SQL.length : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!revealed || startedRef.current) return;
    startedRef.current = true;
    if (reducedMotion) {
      setVisibleChars(GENERATED_SQL.length);
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += CHUNK;
      setVisibleChars(Math.min(n, GENERATED_SQL.length));
      if (n >= GENERATED_SQL.length) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [revealed, reducedMotion]);

  const text = GENERATED_SQL.slice(0, visibleChars);

  return (
    <div className="flex h-full flex-col" style={{ padding: '18px 20px' }}>
      <span
        className="uppercase font-semibold"
        style={{ fontSize: 11.5, letterSpacing: '0.08em', color: '#C4B5FD', marginBottom: 12, display: 'block' }}
      >
        Generated SQL (DDL)
      </span>

      <pre
        className="overflow-hidden"
        style={{
          flex: 1,
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11.5,
          lineHeight: 1.65,
          color: 'rgba(245,245,247,0.82)',
          whiteSpace: 'pre-wrap',
          opacity: revealed ? 1 : 0,
          transition: reducedMotion ? 'none' : 'opacity 300ms ease',
        }}
      >
        {text}
      </pre>

      <div
        className="flex items-center"
        style={{
          gap: 6,
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          opacity: revealed && visibleChars >= GENERATED_SQL.length ? 1 : 0,
          transition: reducedMotion ? 'none' : 'opacity 320ms ease',
        }}
      >
        <CheckCircle2 size={13} color="#2583EB" />
        <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.62)' }}>Model ready for review</span>
      </div>
    </div>
  );
}

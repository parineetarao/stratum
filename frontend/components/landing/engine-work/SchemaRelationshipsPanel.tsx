'use client';

import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { SCHEMA_TABLES, SCHEMA_RELATIONSHIPS, STAGE_COLORS } from './engine-work-data';

interface SchemaRelationshipsPanelProps {
  nodesRevealed: boolean;
  linksRevealed: boolean;
  /** true while "discovery" is the focused stage: nodes pop, lines recede a touch. */
  nodesEmphasis: boolean;
  /** true while "relationships" is the focused stage: lines + badges become the focus. */
  linksEmphasis: boolean;
  reducedMotion: boolean;
}

interface LineGeom {
  from: string;
  to: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

function edgePoint(cx: number, cy: number, dx: number, dy: number, halfW: number, halfH: number) {
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = Math.min(dx !== 0 ? halfW / Math.abs(dx) : Infinity, dy !== 0 ? halfH / Math.abs(dy) : Infinity);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export default function SchemaRelationshipsPanel({
  nodesRevealed,
  linksRevealed,
  nodesEmphasis,
  linksEmphasis,
  reducedMotion,
}: SchemaRelationshipsPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<LineGeom[]>([]);
  const [countedUp, setCountedUp] = useState(false);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const rects: Record<string, DOMRect> = {};
    for (const table of SCHEMA_TABLES) {
      const el = nodeRefs.current[table.id];
      if (el) rects[table.id] = el.getBoundingClientRect();
    }

    const nextLines: LineGeom[] = [];
    for (const rel of SCHEMA_RELATIONSHIPS) {
      const a = rects[rel.from];
      const b = rects[rel.to];
      if (!a || !b) continue;
      const acx = a.left - containerRect.left + a.width / 2;
      const acy = a.top - containerRect.top + a.height / 2;
      const bcx = b.left - containerRect.left + b.width / 2;
      const bcy = b.top - containerRect.top + b.height / 2;
      const dx = bcx - acx;
      const dy = bcy - acy;
      const p1 = edgePoint(acx, acy, dx, dy, a.width / 2, a.height / 2);
      const p2 = edgePoint(bcx, bcy, -dx, -dy, b.width / 2, b.height / 2);
      nextLines.push({
        from: rel.from,
        to: rel.to,
        confidence: rel.confidence,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        midX: (p1.x + p2.x) / 2,
        midY: (p1.y + p2.y) / 2,
      });
    }
    setLines(nextLines);
  }, []);

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [recompute]);

  useLayoutEffect(() => {
    if (linksRevealed) recompute();
  }, [linksRevealed, recompute]);

  useLayoutEffect(() => {
    if (linksRevealed && !countedUp) {
      const t = setTimeout(() => setCountedUp(true), reducedMotion ? 0 : 120);
      return () => clearTimeout(t);
    }
  }, [linksRevealed, countedUp, reducedMotion]);

  return (
    <div className="flex h-full flex-col" style={{ padding: '18px 20px' }}>
      <span
        className="uppercase font-semibold"
        style={{ fontSize: 11.5, letterSpacing: '0.08em', color: '#C4B5FD', marginBottom: 12, display: 'block' }}
      >
        Schema &amp; Relationships
      </span>

      <div ref={containerRef} className="relative" style={{ flex: 1 }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', opacity: linksRevealed ? (linksEmphasis ? 1 : 0.85) : 0, transition: reducedMotion ? 'none' : 'opacity 420ms ease' }}
        >
          {lines.map((line) => (
            <line
              key={`${line.from}-${line.to}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={`url(#eng-line-grad)`}
              strokeWidth={linksEmphasis ? 1.5 : 1.2}
              strokeDasharray={4}
              style={{ transition: reducedMotion ? 'none' : 'stroke-width 280ms ease' }}
            />
          ))}
          <defs>
            <linearGradient id="eng-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={STAGE_COLORS.discovery} />
              <stop offset="100%" stopColor={STAGE_COLORS.relationships} />
            </linearGradient>
          </defs>
        </svg>

        {lines.map((line) => (
          <div
            key={`badge-${line.from}-${line.to}`}
            className="absolute flex items-center justify-center font-semibold"
            style={{
              left: line.midX,
              top: line.midY,
              transform: 'translate(-50%, -50%)',
              minWidth: 26,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              fontSize: 9,
              background: '#0A0C13',
              border: `1px solid ${STAGE_COLORS.relationships}55`,
              color: '#C7D2FE',
              opacity: linksRevealed ? 1 : 0,
              transition: reducedMotion ? 'none' : 'opacity 380ms ease',
            }}
          >
            {countedUp || reducedMotion ? `${line.confidence}%` : '0%'}
          </div>
        ))}

        {SCHEMA_TABLES.map((table) => (
          <div
            key={table.id}
            ref={(el) => {
              nodeRefs.current[table.id] = el;
            }}
            className="absolute"
            style={{
              left: `${table.x}%`,
              top: `${table.y}%`,
              width: 92,
              background: '#0A0C13',
              border: `1px solid ${nodesEmphasis ? STAGE_COLORS.discovery + '70' : 'rgba(255,255,255,0.10)'}`,
              borderRadius: 10,
              padding: '7px 10px',
              opacity: nodesRevealed ? 1 : 0,
              transform: nodesRevealed ? 'scale(1)' : 'scale(0.96)',
              transition: reducedMotion ? 'none' : 'opacity 380ms ease, transform 380ms ease, border-color 280ms ease',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#F5F5F7', marginBottom: 4 }}>{table.name}</div>
            {table.fields.map((f) => (
              <div key={f.name} style={{ fontSize: 9.5, lineHeight: 1.55, color: f.isKey ? '#C4B5FD' : 'rgba(245,245,247,0.5)' }}>
                {f.name}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

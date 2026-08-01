'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { GraphRelationship } from './graphModel';

interface RelationshipCardProps {
  item: GraphRelationship;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}

function pillStyle(bg: string, color: string): React.CSSProperties {
  return { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: bg, color, fontWeight: 500 };
}

export default function RelationshipCard({ item, selected, busy, onSelect, onAccept, onReject }: RelationshipCardProps) {
  const needsDecision = item.status === 'pending' || item.status === 'auto_accepted';
  const isResolvedAccepted = item.status === 'accepted' || item.kind === 'declared';
  const isRejected = item.status === 'rejected';

  const statusIcon = isRejected ? (
    <XCircle size={15} style={{ color: '#f87171' }} aria-hidden="true" />
  ) : needsDecision ? (
    <Circle size={15} style={{ color: 'rgba(226, 232, 240, 0.35)' }} aria-hidden="true" />
  ) : (
    <CheckCircle2 size={15} style={{ color: '#34d399' }} aria-hidden="true" />
  );

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        border: selected ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(148, 163, 184, 0.14)',
        background: selected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(148, 163, 184, 0.03)',
        cursor: 'pointer',
        transition: 'border-color 140ms ease, background 140ms ease',
      }}
    >
      <div className="flex items-start" style={{ gap: 8 }}>
        <div style={{ marginTop: 1, flexShrink: 0 }}>{statusIcon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', lineHeight: 1.4, wordBreak: 'break-word' }}>
            {item.from_table}.{item.from_column}
            <span style={{ color: 'rgba(226, 232, 240, 0.4)', margin: '0 4px' }}>&rarr;</span>
            {item.to_table}.{item.to_column}
          </div>

          <div className="flex items-center" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={pillStyle('rgba(148, 163, 184, 0.12)', 'rgba(226, 232, 240, 0.7)')}>FK</span>
            {item.kind === 'declared' ? (
              <span style={pillStyle('rgba(96, 165, 250, 0.14)', '#93c5fd')}>Declared</span>
            ) : (
              <span style={pillStyle('rgba(139, 92, 246, 0.14)', '#a78bfa')}>Inferred</span>
            )}
            {isRejected && <span style={pillStyle('rgba(248, 113, 113, 0.12)', '#fca5a5')}>Rejected</span>}
            <span style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.45)', marginLeft: 'auto' }}>
              Confidence: {(item.confidence_score / 100).toFixed(2)}
            </span>
          </div>

          {item.kind === 'inferred' && item.explanation?.reasons && item.explanation.reasons.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.55)', marginBottom: 4 }}>
                Why we think this relationship exists:
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {item.explanation.reasons.map((reason, idx) => (
                  <li key={idx} style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.6)', lineHeight: 1.5 }}>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {needsDecision && (
            <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept();
                }}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 7,
                  border: 'none',
                  background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : 'Accept'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 7,
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  background: 'rgba(148, 163, 184, 0.06)',
                  color: '#f4f4f5',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

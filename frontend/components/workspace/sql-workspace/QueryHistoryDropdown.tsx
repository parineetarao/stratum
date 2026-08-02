'use client';

import { useEffect, useState } from 'react';
import { Trash2, Clock } from 'lucide-react';
import { getQueryHistory, deleteSavedQuery, extractErrorMessage, type SavedQuery } from '@/lib/api';

interface QueryHistoryDropdownProps {
  projectId: number;
  onClose: () => void;
  onLoad: (query: SavedQuery) => void;
}

export default function QueryHistoryDropdown({ projectId, onClose, onLoad }: QueryHistoryDropdownProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getQueryHistory(projectId)
      .then((data) => {
        if (!cancelled) setQueries(data.queries);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Failed to load query history.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteSavedQuery(projectId, id);
      setQueries((prev) => prev.filter((q) => q.id !== id));
    } catch {
      // best-effort
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          width: 320,
          maxHeight: 360,
          overflowY: 'auto',
          borderRadius: 10,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#0a0d12',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 91,
          padding: 6,
        }}
      >
        <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 650, color: 'rgba(226,232,240,0.5)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Query History
        </div>
        {loading && <p style={{ padding: '10px 8px', fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>Loading...</p>}
        {error && <p style={{ padding: '10px 8px', fontSize: 12, color: '#fca5a5' }}>{error}</p>}
        {!loading && !error && queries.length === 0 && (
          <p style={{ padding: '10px 8px', fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>No saved queries yet.</p>
        )}
        {queries.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onLoad(q)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Clock size={13} style={{ color: 'rgba(226,232,240,0.35)', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, color: '#f5f5f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.name}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>{q.environment}</span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => handleDelete(q.id, e)}
              style={{ display: 'inline-flex', padding: 4, borderRadius: 5, color: 'rgba(248,113,113,0.7)' }}
              title="Delete"
            >
              <Trash2 size={13} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

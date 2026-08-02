'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { actionButtonStyle } from './uiHelpers';

interface SaveQueryModalProps {
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function SaveQueryModal({ onCancel, onSave }: SaveQueryModalProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save query.');
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save query"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 4, 8, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#0a0d12',
          padding: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h3 style={{ fontSize: 14.5, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>Save Query</h3>
        <p style={{ fontSize: 12.5, color: 'rgba(226,232,240,0.5)', marginBottom: 14 }}>
          Give this query a name so you can find it later in Query History.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder="e.g. Monthly revenue by region"
          style={{
            width: '100%',
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            background: '#05070a',
            color: '#f4f4f5',
            fontSize: 13,
            marginBottom: error ? 8 : 16,
          }}
        />
        {error && <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel} style={actionButtonStyle(false)}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!name.trim() || isSaving} style={actionButtonStyle(!name.trim() || isSaving, true)}>
            {isSaving && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            Save Query
          </button>
        </div>
      </div>
    </div>
  );
}

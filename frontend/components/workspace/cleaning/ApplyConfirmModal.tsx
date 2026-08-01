'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function ApplyConfirmModal({
  approvedCount,
  isApplying,
  onConfirm,
  onCancel,
}: {
  approvedCount: number;
  isApplying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="flex items-center justify-center"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 4, 8, 0.7)',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 14,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#0a0d12',
          padding: '22px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-start justify-between" style={{ marginBottom: 14 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <div
              className="flex items-center justify-center"
              style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}
            >
              <AlertTriangle size={16} aria-hidden="true" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 650, color: '#f5f5f7' }}>Apply to Source Database</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(226,232,240,0.5)', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(226, 232, 240, 0.65)', marginBottom: 20 }}>
          This will apply {approvedCount} approved change{approvedCount === 1 ? '' : 's'} directly to your source
          data. This action cannot be undone from within Stratum. Make sure you&apos;ve reviewed the sandbox preview
          before continuing.
        </p>

        <div className="flex items-center justify-end" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#f4f4f5',
              fontSize: 13,
              fontWeight: 500,
              cursor: isApplying ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApplying}
            className="flex items-center justify-center"
            style={{
              gap: 7,
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: isApplying ? 'not-allowed' : 'pointer',
              opacity: isApplying ? 0.7 : 1,
            }}
          >
            {isApplying && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Apply {approvedCount} Change{approvedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

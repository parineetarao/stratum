'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
}

export default function SignupModal({
  open,
  onClose,
  title = 'Create your own workspace to run custom SQL',
  body = 'The public demo includes a curated set of read-only queries. Sign up to connect your own database, write custom SQL, and explore your data freely.',
}: SignupModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#0a0a0f',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: 14,
          padding: 24,
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            border: 'none',
            background: 'transparent',
            color: 'rgba(226, 232, 240, 0.5)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', marginBottom: 10, paddingRight: 20 }}>{title}</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.65)', lineHeight: 1.55, marginBottom: 20 }}>{body}</p>
        <div className="flex items-center justify-end" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'transparent',
              color: 'rgba(226, 232, 240, 0.75)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Continue Exploring
          </button>
          <Link
            href="/register"
            className="no-underline flex items-center justify-center"
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              background: 'linear-gradient(90deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </div>
  );
}

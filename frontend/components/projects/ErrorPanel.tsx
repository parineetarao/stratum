import { AlertCircle } from 'lucide-react';

interface ErrorPanelProps {
  onRetry: () => void;
}

export default function ErrorPanel({ onRetry }: ErrorPanelProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        minHeight: 220,
        marginTop: 14,
        borderRadius: 12,
        background: '#05070a',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        padding: '36px 24px',
      }}
    >
      <AlertCircle size={22} style={{ color: '#fca5a5', marginBottom: 12 }} aria-hidden="true" />
      <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginBottom: 16 }}>
        Projects could not be loaded.
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          height: 38,
          padding: '0 18px',
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.24)',
          background: 'rgba(148, 163, 184, 0.06)',
          color: '#f4f4f5',
          fontSize: 13.5,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}

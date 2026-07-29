import Link from 'next/link';
import { Plus } from 'lucide-react';

function FolderIllustration() {
  return (
    <svg width={132} height={132} viewBox="0 0 132 132" aria-hidden="true">
      <defs>
        <linearGradient id="folder-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#2ea7ff" />
        </linearGradient>
      </defs>

      <circle cx="30" cy="34" r="16" fill="url(#folder-accent)" opacity="0.06" />
      <circle cx="104" cy="96" r="20" fill="url(#folder-accent)" opacity="0.05" />

      <path
        d="M22 46c0-3.3 2.7-6 6-6h22l8 10h44c3.3 0 6 2.7 6 6v46c0 3.3-2.7 6-6 6H28c-3.3 0-6-2.7-6-6V46z"
        fill="rgba(148, 163, 184, 0.05)"
        stroke="rgba(148, 163, 184, 0.55)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <circle cx="92" cy="88" r="15" fill="#0a0c11" stroke="url(#folder-accent)" strokeWidth="1.4" />
      <path
        d="M92 82v12M86 88h12"
        stroke="url(#folder-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface EmptyStateProps {
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        minHeight: 460,
        marginTop: 14,
        borderRadius: 12,
        background: '#05070a',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        padding: '48px 24px',
      }}
    >
      <div style={{ marginBottom: 22 }}>
        <FolderIllustration />
      </div>

      <h2 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
        No projects yet
      </h2>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: 'rgba(226, 232, 240, 0.62)',
          maxWidth: 360,
          marginBottom: 24,
        }}
      >
        Create your first project to start building with Stratum.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="flex items-center"
        style={{
          gap: 8,
          height: 44,
          padding: '0 20px',
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        <Plus size={16} aria-hidden="true" />
        Create New Project
      </button>

      <Link
        href="/"
        style={{ fontSize: 13, color: '#8b7dff', textDecoration: 'none' }}
      >
        Explore the Platform
      </Link>
    </div>
  );
}

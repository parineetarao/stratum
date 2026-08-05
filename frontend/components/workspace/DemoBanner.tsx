'use client';

import Link from 'next/link';

export default function DemoBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 16px',
        background: '#0a0a0f',
        borderBottom: '1px solid rgba(139, 125, 255, 0.28)',
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          color: 'rgba(226, 232, 240, 0.85)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        You are exploring a live demo using sample DVD rental data. Sign up to connect your own database and run the full workflow.
      </span>
      <Link
        href="/register"
        className="no-underline"
        style={{
          flexShrink: 0,
          padding: '6px 14px',
          borderRadius: 7,
          background: 'linear-gradient(90deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        Sign Up Free
      </Link>
    </div>
  );
}

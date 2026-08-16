'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useDemoToastStore } from '@/lib/demoToastStore';

const AUTO_HIDE_MS = 5000;

/** Mounted once at the app root. Renders nothing until a mutating action is
 * attempted in demo mode (see useDemoGuard), so it never appears from mere
 * navigation/hovering. */
export default function DemoToastHost() {
  const visible = useDemoToastStore((s) => s.visible);
  const message = useDemoToastStore((s) => s.message);
  const hide = useDemoToastStore((s) => s.hide);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible, hide]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 28,
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        maxWidth: 480,
        padding: '12px 14px 12px 18px',
        borderRadius: 10,
        background: '#12182a',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
      }}
    >
      <span style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.85)', lineHeight: 1.4 }}>{message}</span>
      <Link
        href="/login"
        style={{
          flexShrink: 0,
          fontSize: 12.5,
          fontWeight: 600,
          color: '#fff',
          background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
          padding: '7px 12px',
          borderRadius: 7,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Sign up / Login
      </Link>
      <button
        type="button"
        onClick={hide}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          border: 'none',
          background: 'transparent',
          color: 'rgba(226, 232, 240, 0.45)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

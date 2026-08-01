'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function DdlView({ ddl }: { ddl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(ddl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — no-op, button remains usable.
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          gap: 6,
          height: 28,
          padding: '0 10px',
          borderRadius: 6,
          border: '1px solid rgba(148, 163, 184, 0.24)',
          background: 'rgba(148, 163, 184, 0.08)',
          color: '#e2e8f0',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre
        style={{
          margin: 0,
          padding: '16px 18px',
          borderRadius: 9,
          border: '1px solid rgba(148, 163, 184, 0.14)',
          background: '#07090d',
          color: '#5eead4',
          fontFamily: 'monospace',
          fontSize: 12.5,
          lineHeight: 1.6,
          overflowX: 'auto',
        }}
      >
        {ddl}
      </pre>
    </div>
  );
}

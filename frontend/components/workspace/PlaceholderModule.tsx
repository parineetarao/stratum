'use client';

import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
import { useWorkspace } from './WorkspaceContext';

export default function PlaceholderModule({ moduleName }: { moduleName: string }) {
  const { overview } = useWorkspace();

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        minHeight: 420,
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: '48px 24px',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'rgba(148, 163, 184, 0.06)',
          color: '#8b7dff',
          marginBottom: 20,
        }}
      >
        <Construction size={22} strokeWidth={1.6} aria-hidden="true" />
      </div>

      <h1 style={{ fontSize: 19, fontWeight: 600, color: '#f5f5f7', marginBottom: 8 }}>
        {moduleName}
      </h1>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 360, marginBottom: 24 }}>
        This module will be implemented next.
      </p>

      <Link
        href={`/projects/${overview.project.id}`}
        className="inline-flex items-center"
        style={{
          gap: 8,
          height: 40,
          padding: '0 18px',
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.24)',
          background: 'rgba(148, 163, 184, 0.06)',
          color: '#f4f4f5',
          fontSize: 13.5,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to Overview
      </Link>
    </div>
  );
}

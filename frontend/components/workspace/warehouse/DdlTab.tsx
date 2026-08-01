'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Terminal } from 'lucide-react';
import type { WarehouseDesignResponse } from '@/lib/api';
import { stageRoute } from '@/lib/workspaceNav';

function CopyDownloadButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center"
      style={{
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
      <Icon size={12} aria-hidden="true" />
      {label}
    </button>
  );
}

function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — no-op.
    }
  }

  function handleDownload() {
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warehouse_setup.sql';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="flex items-center" style={{ position: 'absolute', top: 10, right: 10, gap: 6 }}>
        <CopyDownloadButton icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy'} onClick={handleCopy} />
        <CopyDownloadButton icon={Download} label="Download" onClick={handleDownload} />
      </div>
      <pre
        style={{
          margin: 0,
          padding: '16px 18px',
          borderRadius: 9,
          border: '1px solid rgba(148, 163, 184, 0.14)',
          background: '#07090d',
          color: '#5eead4',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.6,
          overflowX: 'auto',
          maxHeight: 460,
          overflowY: 'auto',
        }}
      >
        {sql}
      </pre>
    </div>
  );
}

export default function DdlTab({ design, projectId }: { design: WarehouseDesignResponse; projectId: number }) {
  const sql = design.full_ddl_postgres || design.full_ddl;
  const sandboxSql = design.full_ddl_duckdb || design.full_ddl;

  const openInSqlWorkspaceHref = `${stageRoute(projectId, 'sql')}?${new URLSearchParams({
    sql: sandboxSql,
    env: 'warehouse',
  }).toString()}`;

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', lineHeight: 1.5 }}>
        Execute this script in your analytical environment to create and populate warehouse tables.
      </p>

      <SqlBlock sql={sql} />

      <Link
        href={openInSqlWorkspaceHref}
        className="flex items-center justify-center"
        style={{
          gap: 7,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        <Terminal size={14} aria-hidden="true" />
        Open in SQL Workspace
      </Link>
    </div>
  );
}

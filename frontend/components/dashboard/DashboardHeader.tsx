'use client';

import { RefreshCw, Save, Share2, Loader2, Check } from 'lucide-react';
import DisabledInDemo from '@/components/workspace/demoGuard';

interface DashboardHeaderProps {
  projectName: string;
  domain: string;
  lastRefreshed: string | null;
  isRefreshing: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  onRefresh: () => void;
  onSave: () => void;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardHeader({
  projectName,
  domain,
  lastRefreshed,
  isRefreshing,
  isSaving,
  lastSavedAt,
  onRefresh,
  onSave,
}: DashboardHeaderProps) {
  return (
    <div
      className="flex items-start justify-between"
      style={{ marginBottom: 22, gap: 16, flexWrap: 'wrap' }}
    >
      <div>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f5f5f7', letterSpacing: '-0.01em' }}>
            {projectName} Dashboard
          </h1>
          {domain && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(139, 92, 246, 0.16)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                textTransform: 'capitalize',
              }}
            >
              {domain}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.55)' }}>
          Real-time overview of key business metrics and performance indicators.
        </p>
      </div>

      <div className="flex items-center" style={{ gap: 10, flexWrap: 'wrap' }}>
        <DisabledInDemo>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center"
            style={{
              gap: 7,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            {isSaving ? 'Saving...' : 'Save Dashboard'}
          </button>
        </DisabledInDemo>

        {!isSaving && lastSavedAt && (
          <span
            className="flex items-center"
            style={{ gap: 5, fontSize: 11.5, color: '#4ade80', whiteSpace: 'nowrap' }}
          >
            <Check size={13} aria-hidden="true" />
            Dashboard saved &middot; {timeAgo(lastSavedAt)}
          </span>
        )}

        <div className="flex items-center" style={{ gap: 0, position: 'relative' }} title="Coming soon">
          <button
            type="button"
            disabled
            className="flex items-center"
            style={{
              gap: 7,
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: 'rgba(226, 232, 240, 0.4)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'not-allowed',
            }}
          >
            <Share2 size={14} aria-hidden="true" />
            Share
          </button>
        </div>

        <DisabledInDemo>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center"
            style={{
              gap: 7,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#f4f4f5',
              fontSize: 13,
              fontWeight: 500,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
            }}
          >
            {isRefreshing ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            Refresh Data
          </button>
        </DisabledInDemo>

        <span
          style={{
            fontSize: 11.5,
            color: 'rgba(226, 232, 240, 0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          Last refreshed: {timeAgo(lastRefreshed)}
        </span>
      </div>
    </div>
  );
}

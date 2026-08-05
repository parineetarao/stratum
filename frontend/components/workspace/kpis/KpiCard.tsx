'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { KPIItem } from '@/lib/api';
import DisabledInDemo from '@/components/workspace/demoGuard';

interface KpiCardProps {
  kpi: KPIItem;
  projectId: number;
  onApprove: (kpiId: number) => Promise<void>;
  onSkip: (kpiId: number) => Promise<void>;
  onRestore: (kpiId: number) => Promise<void>;
  onUnapprove: (kpiId: number) => Promise<void>;
}

export function getCategoryBadgeStyle(category: string | null): {
  bg: string;
  color: string;
  border: string;
} {
  const cat = (category || '').toLowerCase();
  if (cat.includes('revenue') || cat.includes('financial')) {
    return {
      bg: 'rgba(59, 130, 246, 0.16)',
      color: '#60a5fa',
      border: 'rgba(59, 130, 246, 0.3)',
    };
  }
  if (cat.includes('customer') || cat.includes('user')) {
    return {
      bg: 'rgba(139, 92, 246, 0.16)',
      color: '#c084fc',
      border: 'rgba(139, 92, 246, 0.3)',
    };
  }
  if (cat.includes('volume') || cat.includes('activity')) {
    return {
      bg: 'rgba(20, 184, 166, 0.16)',
      color: '#2dd4bf',
      border: 'rgba(20, 184, 166, 0.3)',
    };
  }
  if (cat.includes('inventory') || cat.includes('product')) {
    return {
      bg: 'rgba(245, 158, 11, 0.16)',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.3)',
    };
  }
  if (cat.includes('quality')) {
    return {
      bg: 'rgba(6, 182, 212, 0.16)',
      color: '#22d3ee',
      border: 'rgba(6, 182, 212, 0.3)',
    };
  }
  return {
    bg: 'rgba(148, 163, 184, 0.16)',
    color: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.3)',
  };
}

export default function KpiCard({
  kpi,
  projectId,
  onApprove,
  onSkip,
  onRestore,
  onUnapprove,
}: KpiCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isApproved = kpi.is_approved || kpi.status === 'approved';
  const isSkipped = kpi.status === 'skipped';

  const catStyle = getCategoryBadgeStyle(kpi.category);

  const confidenceScore = kpi.confidence_score ?? 0;
  const confidenceTier =
    confidenceScore >= 80 ? 'High' : confidenceScore >= 50 ? 'Medium' : 'Low';
  const confidenceColor =
    confidenceTier === 'High'
      ? '#22c55e'
      : confidenceTier === 'Medium'
      ? '#f59e0b'
      : '#ef4444';

  async function handleApproveClick() {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onApprove(kpi.id);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSkipClick() {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onSkip(kpi.id);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRestoreClick() {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onRestore(kpi.id);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleUnapproveClick() {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUnapprove(kpi.id);
    } finally {
      setIsUpdating(false);
    }
  }

  const sqlUrl = `/projects/${projectId}/sql?sql=${encodeURIComponent(
    kpi.sql
  )}&env=${encodeURIComponent(kpi.mode || 'source')}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 12,
        background: isApproved ? '#080d16' : '#070a0f',
        border: isApproved
          ? '1px solid rgba(34, 197, 94, 0.45)'
          : isSkipped
          ? '1px solid rgba(148, 163, 184, 0.08)'
          : '1px solid rgba(148, 163, 184, 0.14)',
        padding: '18px 20px',
        opacity: isSkipped ? 0.65 : 1,
        transition: 'all 0.2s ease',
        boxShadow: isApproved
          ? '0 4px 20px -2px rgba(34, 197, 94, 0.08)'
          : 'none',
        position: 'relative',
      }}
    >
      {/* Top Header Row */}
      <div>
        <div
          className="flex items-start justify-between"
          style={{ gap: 10, marginBottom: 12 }}
        >
          <div className="flex items-center" style={{ gap: 6, flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 650,
                color: '#f5f5f7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={kpi.name}
            >
              {kpi.name}
            </h3>
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                color: showReasoning ? '#a78bfa' : 'rgba(226, 232, 240, 0.4)',
                cursor: 'pointer',
                display: 'inline-flex',
              }}
              title="Why this KPI?"
            >
              <Info size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center" style={{ gap: 6 }}>
            {isApproved && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22c55e',
                }}
                title="Approved"
              >
                <Check size={13} strokeWidth={3} aria-hidden="true" />
              </div>
            )}
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 12,
                background: catStyle.bg,
                color: catStyle.color,
                border: `1px solid ${catStyle.border}`,
                whiteSpace: 'nowrap',
              }}
            >
              {kpi.category || 'General'}
            </span>
          </div>
        </div>

        {/* Computed Value */}
        <div style={{ marginBottom: 14 }}>
          {kpi.formatted_value || kpi.computed_value !== null ? (
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {kpi.formatted_value || String(kpi.computed_value)}
            </div>
          ) : (
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'rgba(226, 232, 240, 0.4)',
                fontStyle: 'italic',
              }}
            >
              Not Available
            </div>
          )}
        </div>

        {/* Confidence Indicator */}
        <div style={{ marginBottom: 12 }}>
          <div
            className="flex items-center justify-between"
            style={{ fontSize: 11.5, marginBottom: 4 }}
          >
            <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>Confidence</span>
            <span style={{ color: confidenceColor, fontWeight: 600 }}>
              {confidenceTier} Confidence
            </span>
          </div>
          <div
            style={{
              height: 4,
              width: '100%',
              borderRadius: 2,
              background: 'rgba(148, 163, 184, 0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max(10, Math.min(100, confidenceScore))}%`,
                background: confidenceColor,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 12.5,
            color: 'rgba(226, 232, 240, 0.65)',
            lineHeight: 1.4,
            marginBottom: 12,
            minHeight: 36,
          }}
        >
          {kpi.description || 'Recommended business performance metric.'}
        </p>

        {/* Reasoning / Evidence Popover */}
        {showReasoning && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 14,
              padding: 10,
              borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              fontSize: 11.5,
              color: 'rgba(226, 232, 240, 0.8)',
            }}
          >
            <div
              className="flex items-center"
              style={{ gap: 5, color: '#c084fc', fontWeight: 600, marginBottom: 4 }}
            >
              <Sparkles size={12} aria-hidden="true" />
              <span>Why this KPI?</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.4 }}>
              {kpi.reasoning ||
                `Recommended because measure matches ${kpi.category || 'domain'} criteria.`}
            </p>
            {kpi.evidence && (
              <div
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: '1px dashed rgba(148, 163, 184, 0.15)',
                  fontSize: 11,
                  color: 'rgba(226, 232, 240, 0.5)',
                }}
              >
                Target table: <code style={{ color: '#93c5fd' }}>{String(kpi.evidence.table_name || '')}</code>
                {kpi.evidence.column_used ? (
                  <span>
                    {' '}· Column: <code style={{ color: '#93c5fd' }}>{String(kpi.evidence.column_used)}</code>
                  </span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Row */}
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          gap: 8,
        }}
      >
        <Link
          href={sqlUrl}
          className="flex items-center"
          style={{
            gap: 4,
            fontSize: 12,
            fontWeight: 500,
            color: '#a78bfa',
            textDecoration: 'none',
          }}
        >
          View SQL
          <ExternalLink size={12} aria-hidden="true" />
        </Link>

        {kpi.unit && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 6,
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              color: 'rgba(226, 232, 240, 0.7)',
              fontWeight: 500,
            }}
          >
            {kpi.unit}
          </span>
        )}

        <div className="flex items-center" style={{ gap: 6 }}>
          {isApproved ? (
            <>
              <button
                type="button"
                disabled
                style={{
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#4ade80',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'default',
                }}
              >
                <Check size={13} aria-hidden="true" />
                Approved
              </button>
              <DisabledInDemo>
                <button
                  type="button"
                  onClick={handleUnapproveClick}
                  disabled={isUpdating}
                  style={{
                    height: 30,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(148, 163, 184, 0.06)',
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Remove
                </button>
              </DisabledInDemo>
            </>
          ) : isSkipped ? (
            <DisabledInDemo>
              <button
                type="button"
                onClick={handleRestoreClick}
                disabled={isUpdating}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  background: 'rgba(148, 163, 184, 0.08)',
                  color: '#f4f4f5',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={12} aria-hidden="true" />
                Restore
              </button>
            </DisabledInDemo>
          ) : (
            <>
              <DisabledInDemo>
                <button
                  type="button"
                  onClick={handleApproveClick}
                  disabled={isUpdating}
                  style={{
                    height: 30,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Approve
                </button>
              </DisabledInDemo>
              <DisabledInDemo>
                <button
                  type="button"
                  onClick={handleSkipClick}
                  disabled={isUpdating}
                  style={{
                    height: 30,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(148, 163, 184, 0.06)',
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Skip
                </button>
              </DisabledInDemo>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Download, Loader2, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import type { InsightsResponse, InsightSentiment } from '@/lib/api';

interface AiInsightsPanelProps {
  insights: InsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  onExport: () => void;
  /** 'summary' (default) shows only the executive summary with a link to
   * the full report — used on the Dashboard, which otherwise duplicated
   * the standalone Insights page. 'full' renders findings and the
   * critical risk/opportunity too, for the Insights page itself. */
  variant?: 'summary' | 'full';
  projectId?: number;
}

const SENTIMENT_META: Record<InsightSentiment, { bg: string; color: string; border: string; label: string }> = {
  positive: { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', label: 'Positive' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: 'Warning' },
  risk: { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)', label: 'Risk' },
};

export default function AiInsightsPanel({ insights, isLoading, error, onGenerate, onExport, variant = 'summary', projectId }: AiInsightsPanelProps) {
  const critical = insights?.critical_risk_or_opportunity;
  const isRisk = critical?.type?.toLowerCase().includes('risk');
  return (
    <div
      style={{
        borderRadius: 12,
        background: '#080d16',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        padding: '20px 22px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Sparkles size={16} style={{ color: '#a78bfa' }} aria-hidden="true" />
          <h2 style={{ fontSize: 15, fontWeight: 650, color: '#f5f5f7' }}>AI Insights</h2>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className="flex items-center"
            style={{
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 7,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
            Generate New Insights
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!insights}
            className="flex items-center"
            style={{
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 7,
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: insights ? '#f4f4f5' : 'rgba(226, 232, 240, 0.35)',
              fontSize: 12,
              fontWeight: 500,
              cursor: insights ? 'pointer' : 'not-allowed',
            }}
          >
            <Download size={13} aria-hidden="true" />
            Export Insights
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center"
          style={{ gap: 8, marginBottom: 14, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.3)', background: 'rgba(248, 113, 113, 0.08)', color: '#fca5a5', fontSize: 12.5 }}
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !insights ? (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 160, gap: 10 }}>
          <Loader2 size={24} className="animate-spin" color="#8b7dff" aria-hidden="true" />
          <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>Analyzing approved KPIs...</span>
        </div>
      ) : !insights ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.45)' }}>
            Click &ldquo;Generate New Insights&rdquo; to get an AI-written summary of your dashboard.
          </p>
        </div>
      ) : variant === 'summary' ? (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Executive Summary
          </div>
          {insights.executive_summary.split(/\n+/).filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.75)', lineHeight: 1.55, marginBottom: 10 }}>
              {para}
            </p>
          ))}

          {projectId != null && (
            <Link
              href={`/projects/${projectId}/insights`}
              className="flex items-center"
              style={{ gap: 6, marginTop: 6, fontSize: 12.5, fontWeight: 600, color: '#a78bfa', textDecoration: 'none' }}
            >
              View full report
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : (
        <div className="flex" style={{ gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Executive Summary
            </div>
            {insights.executive_summary.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i} style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.75)', lineHeight: 1.55, marginBottom: 10 }}>
                {para}
              </p>
            ))}
          </div>

          <div style={{ flex: '1 1 360px', minWidth: 300 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Key Findings
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginBottom: 14 }}>
              {insights.findings.map((f, i) => {
                const meta = SENTIMENT_META[f.sentiment] || SENTIMENT_META.warning;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: 'rgba(148, 163, 184, 0.04)',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#f5f5f7' }}>{f.title}</span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.6)', lineHeight: 1.4, marginBottom: 4 }}>
                      {f.observation}
                    </p>
                    <p style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.5)', lineHeight: 1.4, fontStyle: 'italic' }}>
                      → {f.action}
                    </p>
                  </div>
                );
              })}
            </div>

            {critical && (critical.title || critical.description) && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${isRisk ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 197, 94, 0.35)'}`,
                  background: isRisk ? 'rgba(239, 68, 68, 0.06)' : 'rgba(34, 197, 94, 0.06)',
                }}
              >
                <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
                  {isRisk ? (
                    <TrendingDown size={14} style={{ color: '#f87171' }} aria-hidden="true" />
                  ) : (
                    <TrendingUp size={14} style={{ color: '#4ade80' }} aria-hidden="true" />
                  )}
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: isRisk ? '#f87171' : '#4ade80' }}>
                    {isRisk ? 'Critical Risk' : 'Opportunity'}: {critical.title}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.45, marginBottom: 6 }}>
                  {critical.description}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.55)', lineHeight: 1.45, fontStyle: 'italic' }}>
                  → {critical.recommended_action}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface KpiApprovalBarProps {
  projectId: number;
  approvedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  onReviewSelections: () => void;
  isReviewingApprovedOnly: boolean;
}

export default function KpiApprovalBar({
  projectId,
  approvedCount,
  highCount,
  mediumCount,
  lowCount,
  onReviewSelections,
  isReviewingApprovedOnly,
}: KpiApprovalBarProps) {
  const router = RouterHook();
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  function RouterHook() {
    return useRouter();
  }

  function handleGoToDashboard() {
    if (approvedCount < 3) {
      setWarningMessage(
        'Fewer than 3 KPIs approved. Dashboard will be created but may look sparse.'
      );
      setTimeout(() => {
        router.push(`/projects/${projectId}/dashboard`);
      }, 800);
    } else {
      router.push(`/projects/${projectId}/dashboard`);
    }
  }

  if (approvedCount <= 0) return null;

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 24,
        zIndex: 40,
        marginTop: 32,
      }}
    >
      {warningMessage && (
        <div
          style={{
            position: 'absolute',
            top: -46,
            left: 0,
            right: 0,
            margin: '0 auto',
            maxWidth: 500,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'rgba(245, 158, 11, 0.16)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            fontSize: 12.5,
            fontWeight: 500,
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          {warningMessage}
        </div>
      )}

      <div
        className="flex flex-col sm:flex-row items-center justify-between"
        style={{
          gap: 16,
          padding: '14px 24px',
          borderRadius: 12,
          background: '#090d14',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 197, 94, 0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Left Side Info */}
        <div className="flex items-center" style={{ gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.16)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
            }}
          >
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>

          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#f5f5f7' }}>
              {approvedCount} {approvedCount === 1 ? 'KPI' : 'KPIs'} Approved
            </div>
            <div
              className="flex items-center"
              style={{ gap: 8, fontSize: 12, marginTop: 2 }}
            >
              <span style={{ color: '#4ade80' }}>{highCount} high</span>
              <span style={{ color: 'rgba(226, 232, 240, 0.3)' }}>·</span>
              <span style={{ color: '#fbbf24' }}>{mediumCount} medium</span>
              <span style={{ color: 'rgba(226, 232, 240, 0.3)' }}>·</span>
              <span style={{ color: '#f87171' }}>{lowCount} low</span>
            </div>
          </div>
        </div>

        {/* Right Side Buttons */}
        <div className="flex items-center" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={onReviewSelections}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: isReviewingApprovedOnly
                ? '1px solid rgba(139, 92, 246, 0.5)'
                : '1px solid rgba(148, 163, 184, 0.25)',
              background: isReviewingApprovedOnly
                ? 'rgba(139, 92, 246, 0.15)'
                : 'rgba(148, 163, 184, 0.08)',
              color: isReviewingApprovedOnly ? '#c084fc' : '#f4f4f5',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {isReviewingApprovedOnly ? 'Show All KPIs' : 'Review Selections'}
          </button>

          <button
            type="button"
            onClick={handleGoToDashboard}
            style={{
              height: 38,
              padding: '0 20px',
              borderRadius: 8,
              border: 'none',
              background:
                'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 650,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 15px rgba(111, 53, 244, 0.35)',
            }}
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

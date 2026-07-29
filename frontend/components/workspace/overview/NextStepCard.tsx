import Link from 'next/link';
import { ArrowRight, PartyPopper, ShieldCheck } from 'lucide-react';
import type { NextStep } from '@/lib/api';

interface NextStepCardProps {
  projectId: number;
  nextStep: NextStep | null;
}

export default function NextStepCard({ projectId, nextStep }: NextStepCardProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: 22,
        height: '100%',
      }}
    >
      <div className="flex items-center" style={{ gap: 8, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>Next Step</h2>
        {nextStep && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(46, 167, 255, 0.12)',
              color: '#7dd3fc',
              letterSpacing: '0.03em',
            }}
          >
            RECOMMENDED
          </span>
        )}
      </div>

      {nextStep ? (
        <>
          <div
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(46, 167, 255, 0.1))',
              color: '#c4b5fd',
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={20} strokeWidth={1.6} aria-hidden="true" />
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7', marginBottom: 6 }}>
            {nextStep.title}
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.58)', marginBottom: 20 }}>
            {nextStep.description}
          </p>

          <Link
            href={`/projects/${projectId}${nextStep.route}`}
            className="flex items-center justify-center"
            style={{
              gap: 8,
              height: 42,
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {nextStep.cta_label}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </>
      ) : (
        <div className="flex flex-col items-center text-center" style={{ paddingTop: 8 }}>
          <PartyPopper size={26} style={{ color: '#34d399', marginBottom: 12 }} aria-hidden="true" />
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: '#f5f5f7', marginBottom: 6 }}>
            Workflow complete
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.58)' }}>
            Every module in this project has been completed.
          </p>
        </div>
      )}
    </div>
  );
}

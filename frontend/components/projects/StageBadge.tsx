import type { Stage } from '@/lib/projectView';

export const STAGE_META: Record<Stage, { label: string; dot: string; text: string; fill: number }> = {
  connected: { label: 'Connected', dot: '#8b5cf6', text: '#c4b5fd', fill: 100 },
  awaiting_connection: {
    label: 'Awaiting Connection',
    dot: 'rgba(226, 232, 240, 0.4)',
    text: 'rgba(226, 232, 240, 0.6)',
    fill: 0,
  },
};

function ShimmerPill({ width = 96 }: { width?: number }) {
  return (
    <div
      style={{
        width,
        height: 20,
        borderRadius: 999,
        background: 'rgba(148, 163, 184, 0.08)',
      }}
    />
  );
}

export function StageLabel({ stage, isUnresolved }: { stage: Stage; isUnresolved?: boolean }) {
  if (isUnresolved) return <ShimmerPill />;
  const meta = STAGE_META[stage];

  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 6,
        padding: '3px 9px',
        borderRadius: 999,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'rgba(148, 163, 184, 0.06)',
        fontSize: 12,
        color: meta.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }}
      />
      {meta.label}
    </span>
  );
}

export function ProgressBar({
  stage,
  isUnresolved,
  width = 100,
}: {
  stage: Stage;
  isUnresolved?: boolean;
  width?: number;
}) {
  if (isUnresolved) return <ShimmerPill width={width} />;
  const meta = STAGE_META[stage];

  return (
    <div
      style={{
        height: 4,
        borderRadius: 999,
        background: 'rgba(148, 163, 184, 0.14)',
        width,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${meta.fill}%`,
          borderRadius: 999,
          background: 'linear-gradient(90deg, #8b5cf6, #2ea7ff)',
        }}
      />
    </div>
  );
}

interface StageWithProgressProps {
  stage: Stage;
  isUnresolved?: boolean;
}

export default function StageWithProgress({ stage, isUnresolved }: StageWithProgressProps) {
  return (
    <div>
      <StageLabel stage={stage} isUnresolved={isUnresolved} />
      <div style={{ marginTop: 8 }}>
        <ProgressBar stage={stage} isUnresolved={isUnresolved} />
      </div>
    </div>
  );
}

import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { ConnectionHealth } from '@/lib/api';

const STATUS_META = {
  connection: {
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    unknown: 'Unknown',
  },
  dataset: {
    healthy: 'Valid',
    unhealthy: 'Invalid',
    unknown: 'Not yet validated',
  },
} as const;

const COLOR_META = {
  healthy: { icon: CheckCircle2, color: '#34d399', ring: 'rgba(52, 211, 153, 0.35)', bg: 'rgba(52, 211, 153, 0.08)' },
  unhealthy: { icon: XCircle, color: '#f87171', ring: 'rgba(248, 113, 113, 0.35)', bg: 'rgba(248, 113, 113, 0.08)' },
  unknown: {
    icon: HelpCircle,
    color: 'rgba(226, 232, 240, 0.55)',
    ring: 'rgba(148, 163, 184, 0.3)',
    bg: 'rgba(148, 163, 184, 0.05)',
  },
} as const;

interface HealthCardProps {
  health: ConnectionHealth;
  variant?: 'connection' | 'dataset';
}

export default function HealthCard({ health, variant = 'connection' }: HealthCardProps) {
  const colors = COLOR_META[health.status];
  const label = STATUS_META[variant][health.status];
  const Icon = colors.icon;

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${colors.ring}`,
        background: colors.bg,
        padding: '14px 16px',
        minWidth: 220,
      }}
    >
      <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.5)', marginBottom: 8 }}>
        {variant === 'dataset' ? 'Dataset Validation' : 'Connection Health'}
      </div>
      <div className="flex items-center" style={{ gap: 10 }}>
        <Icon size={22} strokeWidth={1.7} color={colors.color} aria-hidden="true" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.color }}>{label}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.55)', lineHeight: 1.4 }}>
            {health.message}
          </div>
        </div>
      </div>
    </div>
  );
}

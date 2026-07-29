import type { LucideIcon } from 'lucide-react';
import { BarChart3, Box, CheckCircle2, FolderKanban } from 'lucide-react';

interface SummaryCardsProps {
  totalProjects: number;
  connectedCount: number;
  isConnectionsLoading: boolean;
  columns: number;
}

interface CardSpec {
  key: string;
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  tint: string;
}

function IconTile({ icon: Icon, tint }: { icon: LucideIcon; tint: string }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        background: `${tint}1a`,
        color: tint,
        marginBottom: 12,
      }}
    >
      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
    </div>
  );
}

export default function SummaryCards({
  totalProjects,
  connectedCount,
  isConnectionsLoading,
  columns,
}: SummaryCardsProps) {
  const progressCaption = isConnectionsLoading
    ? 'Checking data sources...'
    : totalProjects === 0
    ? 'No active projects yet'
    : `${Math.round((connectedCount / totalProjects) * 100)}% of total`;

  const cards: CardSpec[] = [
    {
      key: 'total',
      label: 'Total Projects',
      value: String(totalProjects),
      caption:
        totalProjects === 0 ? 'Get started by creating your first project' : 'Across your account',
      icon: FolderKanban,
      tint: '#8b5cf6',
    },
    {
      key: 'in-progress',
      label: 'Projects in Progress',
      value: isConnectionsLoading ? '—' : String(connectedCount),
      caption: progressCaption,
      icon: CheckCircle2,
      tint: '#2ea7ff',
    },
    {
      key: 'models',
      label: 'Models Deployed',
      value: '—',
      caption: 'Not tracked yet',
      icon: Box,
      tint: '#5b6472',
    },
    {
      key: 'datasets',
      label: 'Datasets Processed',
      value: '—',
      caption: 'Not tracked yet',
      icon: BarChart3,
      tint: '#5b6472',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 14,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.key}
          style={{
            background: '#07090d',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: 10,
            minHeight: 98,
            padding: '16px 18px',
          }}
        >
          <IconTile icon={card.icon} tint={card.tint} />
          <div style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.62)', marginBottom: 6 }}>
            {card.label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>
            {card.value}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)' }}>{card.caption}</div>
        </div>
      ))}
    </div>
  );
}

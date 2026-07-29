interface OverviewCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function OverviewCard({ title, subtitle, action, children, style }: OverviewCardProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: 22,
        ...style,
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7', marginBottom: subtitle ? 4 : 0 }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ShimmerBlock({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'rgba(148, 163, 184, 0.08)',
        borderRadius: 6,
        ...style,
      }}
    />
  );
}

export function SummaryCardsSkeleton({ columns }: { columns: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 14,
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          style={{
            background: '#07090d',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: 10,
            minHeight: 98,
            padding: '16px 18px',
          }}
        >
          <ShimmerBlock style={{ width: 36, height: 36, borderRadius: 9, marginBottom: 12 }} />
          <ShimmerBlock style={{ width: '60%', height: 11, marginBottom: 8 }} />
          <ShimmerBlock style={{ width: '35%', height: 20 }} />
        </div>
      ))}
    </div>
  );
}

export function ProjectsListSkeleton() {
  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 12,
        background: '#05070a',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        padding: 20,
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center"
          style={{
            gap: 20,
            padding: '14px 4px',
            borderBottom:
              index === 4 ? 'none' : '1px solid rgba(148, 163, 184, 0.08)',
          }}
        >
          <ShimmerBlock style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
          <ShimmerBlock style={{ width: '22%', height: 12 }} />
          <ShimmerBlock style={{ width: '16%', height: 12 }} />
          <ShimmerBlock style={{ width: '14%', height: 12 }} />
          <ShimmerBlock style={{ width: '18%', height: 12 }} />
          <ShimmerBlock style={{ width: '10%', height: 12, marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

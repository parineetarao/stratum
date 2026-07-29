import Link from 'next/link';

interface HeroActionsProps {
  getStartedHref?: string;
  exploreHref?: string;
}

export default function HeroActions({ getStartedHref = '/login', exploreHref = '#' }: HeroActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center" style={{ marginTop: 34, gap: 14 }}>
      <Link
        href={getStartedHref}
        className="no-underline transition-transform duration-150"
        style={{
          padding: '14px 20px',
          borderRadius: 12,
          background: 'linear-gradient(90deg,#6D3DE8 0%,#4F6EF7 55%,#22D3EE 100%)',
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Get Started Free
      </Link>
      <Link
        href={exploreHref}
        className="no-underline transition-colors duration-150"
        style={{
          padding: '14px 20px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.22)',
          color: '#F4F4F5',
          fontSize: 14,
          fontWeight: 500,
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        Explore the Platform
      </Link>
    </div>
  );
}

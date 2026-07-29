import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface HeroNavbarProps {
  platformHref?: string;
  workflowHref?: string;
  capabilitiesHref?: string;
  architectureHref?: string;
  docsHref?: string;
  loginHref?: string;
  getStartedHref?: string;
}

const NAV_LINK_STYLE = { color: '#D8DAE0', fontSize: 14, textDecoration: 'none' };

export default function HeroNavbar({
  platformHref = '#',
  workflowHref = '#',
  capabilitiesHref = '#',
  architectureHref = '#',
  docsHref = '#',
  loginHref = '/login',
  getStartedHref = '/login',
}: HeroNavbarProps) {
  const navLinks = [
    { label: 'Platform', href: platformHref },
    { label: 'Workflow', href: workflowHref },
    { label: 'Capabilities', href: capabilitiesHref },
    { label: 'Architecture', href: architectureHref },
    { label: 'Docs', href: docsHref },
  ];

  return (
    <header
      className="relative z-[2] flex-shrink-0"
      style={{ height: 94, background: '#040406', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-full items-center justify-between gap-5 px-6"
        style={{ maxWidth: 1360 }}
      >
        <Link href="/" className="flex min-w-0 flex-shrink items-center no-underline" style={{ gap: 12 }}>
          <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" className="flex-shrink-0">
            <g fill="none" stroke="#D7DAE0" strokeWidth="1.1" opacity="0.9">
              <polygon points="19,2 34,19 19,36 4,19" />
              <polygon points="19,6 30,19 19,32 8,19" opacity="0.85" />
              <polygon points="19,10 26,19 19,28 12,19" opacity="0.75" />
            </g>
          </svg>
          <div className="min-w-0" style={{ lineHeight: 1 }}>
            <div className="text-white whitespace-nowrap" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.06em' }}>
              STRATUM
            </div>
            <div className="hidden whitespace-nowrap sm:block" style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.62, color: '#F4F4F5' }}>
              ANALYTICS ENGINEERING PLATFORM
            </div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center" style={{ gap: 28 }}>
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} style={NAV_LINK_STYLE} className="whitespace-nowrap">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-shrink-0 items-center" style={{ gap: 10 }}>
          <Link
            href={loginHref}
            className="hidden lg:inline-block whitespace-nowrap"
            style={{ color: '#CFD2DA', fontSize: 14, textDecoration: 'none' }}
          >
            Log in
          </Link>
          <Link
            href={getStartedHref}
            className="inline-flex items-center whitespace-nowrap no-underline"
            style={{
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'linear-gradient(90deg,#6D3DE8 0%,#4F6EF7 55%,#22D3EE 100%)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span className="hidden sm:inline">Get Started Free</span>
            <span className="sm:hidden">Get Started</span>
            <ArrowRight size={14} className="flex-shrink-0" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

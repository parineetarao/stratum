import Link from 'next/link';

interface LogoProps {
  iconSize?: number;
  fontSize?: number;
  gap?: number;
  letterSpacing?: string;
  fontWeight?: number;
}

export default function Logo({
  iconSize = 32,
  fontSize = 15,
  gap = 12,
  letterSpacing = '0.06em',
  fontWeight = 600,
}: LogoProps) {
  return (
    <Link href="/" className="inline-flex items-center no-underline" style={{ gap }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 38 38" aria-hidden="true" className="flex-shrink-0">
        <g fill="none" stroke="#D7DAE0" strokeWidth="1.1" opacity="0.9">
          <polygon points="19,2 34,19 19,36 4,19" />
          <polygon points="19,6 30,19 19,32 8,19" opacity="0.85" />
          <polygon points="19,10 26,19 19,28 12,19" opacity="0.75" />
        </g>
      </svg>
      <span className="text-white whitespace-nowrap" style={{ fontSize, fontWeight, letterSpacing }}>
        STRATUM
      </span>
    </Link>
  );
}

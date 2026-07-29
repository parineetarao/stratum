import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface CTAButtonProps {
  href: string;
  children: ReactNode;
  variant: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export default function CTAButton({ href, children, variant, fullWidth = false }: CTAButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center no-underline font-semibold ${
        isPrimary ? 'cta-btn-primary' : 'cta-btn-secondary'
      }`}
      style={{
        minWidth: fullWidth ? 0 : isPrimary ? 300 : 258,
        width: fullWidth ? '100%' : undefined,
        height: fullWidth ? 60 : 72,
        padding: '0 34px',
        gap: 20,
        borderRadius: 12,
        fontSize: 18,
        fontWeight: 600,
        color: '#ffffff',
        border: isPrimary ? 'none' : '1px solid rgba(226,232,240,0.34)',
        background: isPrimary
          ? 'linear-gradient(100deg, #6f35f4 0%, #5268ff 55%, #2ea7ff 100%)'
          : 'rgba(5,7,11,0.55)',
      }}
    >
      {children}
      <ArrowRight size={18} className="cta-btn-arrow flex-shrink-0" aria-hidden="true" />
    </Link>
  );
}

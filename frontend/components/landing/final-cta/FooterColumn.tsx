import Link from 'next/link';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumnProps {
  header: string;
  links: FooterLink[];
}

export default function FooterColumn({ header, links }: FooterColumnProps) {
  return (
    <div>
      <h4
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#f4f4f5',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: 18,
        }}
      >
        {header}
      </h4>
      <ul className="list-none p-0 m-0">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="footer-link block"
              style={{ fontSize: 15, color: 'rgba(226,232,240,0.62)', lineHeight: 2 }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

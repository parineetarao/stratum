import { GeistSans } from 'geist/font/sans';
import Logo from '../Logo';
import FooterColumn from './FooterColumn';
import SocialLinks from './SocialLinks';

const FOOTER_COLUMNS = [
  {
    header: 'Product',
    links: [
      { label: 'Overview', href: '#' },
      { label: 'How it works', href: '#' },
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#' },
    ],
  },
  {
    header: 'Platform',
    links: [
      { label: 'Data sources', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Integrations', href: '#' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    header: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Guides', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Help center', href: '#' },
    ],
  },
  {
    header: 'Company',
    links: [
      { label: 'About us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact us', href: '#' },
      { label: 'Privacy policy', href: '#' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer
      className={GeistSans.className}
      style={{
        background: '#020305',
        borderTop: '1px solid rgba(148,163,184,0.16)',
        padding: '56px 5vw 48px',
      }}
    >
      <div className="site-footer-grid mx-auto" style={{ maxWidth: 1500 }}>
        <div className="site-footer-brand">
          <Logo />
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(226,232,240,0.62)', marginTop: 16, maxWidth: 280 }}>
            Engineering analytical systems
            <br />
            with clarity, control, and confidence.
          </p>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <FooterColumn key={col.header} header={col.header} links={col.links} />
        ))}

        <div className="site-footer-social">
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(226,232,240,0.62)', marginBottom: 20 }}>
            Built for analytics engineers
            <br />
            who ship with confidence.
          </p>
          <SocialLinks />
        </div>
      </div>
    </footer>
  );
}

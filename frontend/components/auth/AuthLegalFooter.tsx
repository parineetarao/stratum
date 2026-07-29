interface AuthLegalFooterProps {
  isMobile: boolean;
}

export default function AuthLegalFooter({ isMobile }: AuthLegalFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`flex items-center justify-center ${isMobile ? 'flex-col' : ''}`}
      style={{
        gap: isMobile ? 10 : 36,
        marginTop: 38,
        fontSize: 14,
        color: 'rgba(226, 232, 240, 0.58)',
        flexWrap: 'wrap',
      }}
    >
      <span>&copy; {year} Stratum. All rights reserved.</span>
      <a href="#" className="auth-legal-link" style={{ color: 'inherit', textDecoration: 'none' }}>
        Privacy policy
      </a>
      <a href="#" className="auth-legal-link" style={{ color: 'inherit', textDecoration: 'none' }}>
        Terms of service
      </a>
    </footer>
  );
}

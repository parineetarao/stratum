import { Github, Linkedin, Mail } from 'lucide-react';

export default function SocialLinks() {
  return (
    <div className="flex items-center" style={{ gap: 16 }}>
      <a href="#" aria-label="GitHub" className="footer-social inline-flex">
        <Github size={18} />
      </a>
      <a href="#" aria-label="LinkedIn" className="footer-social inline-flex">
        <Linkedin size={18} />
      </a>
      <a href="#" aria-label="Email" className="footer-social inline-flex">
        <Mail size={18} />
      </a>
    </div>
  );
}

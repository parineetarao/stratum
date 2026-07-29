'use client';

import { GeistPixelSquare } from 'geist/font/pixel';
import { useTypewriter } from '@/hooks/useTypewriter';

interface TypewriterWordProps {
  words: string[];
  enabled: boolean;
}

const GRADIENT_TEXT_STYLE = {
  backgroundImage: 'linear-gradient(90deg,#7C3AED 0%,#4F6EF7 56%,#22D3EE 100%)',
  WebkitBackgroundClip: 'text' as const,
  backgroundClip: 'text' as const,
  color: 'transparent',
};

export default function TypewriterWord({ words, enabled }: TypewriterWordProps) {
  const { text, caretVisible } = useTypewriter(words, enabled);

  return (
    <span
      className={GeistPixelSquare.className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '10ch',
        height: '1.1em',
        overflow: 'hidden',
        verticalAlign: 'top',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', lineHeight: '1.1em' }}>
        <span style={{ lineHeight: '1.1em', ...GRADIENT_TEXT_STYLE }}>{text}</span>
        {enabled && (
          <span
            aria-hidden="true"
            style={{
              width: 1,
              height: '0.92em',
              marginLeft: 2,
              background: 'rgba(79,110,247,0.9)',
              opacity: caretVisible ? 1 : 0,
              transition: 'opacity 120ms linear',
            }}
          />
        )}
      </span>
    </span>
  );
}

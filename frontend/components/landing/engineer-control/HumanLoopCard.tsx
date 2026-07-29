'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { useHasHover } from '@/hooks/useHasHover';

interface HumanLoopCardProps {
  index: number;
  figureLabel: string;
  figureColor: string;
  title: string;
  description: string;
  bottomSentence: string;
  dotColor: string;
  reducedMotion: boolean;
  isDimmed: boolean;
  onHoverChange: (index: number, hovered: boolean) => void;
  renderIllustration: (state: { emphasize: boolean; playToken: number; reducedMotion: boolean }) => ReactNode;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function HumanLoopCard({
  index,
  figureLabel,
  figureColor,
  title,
  description,
  bottomSentence,
  dotColor,
  reducedMotion,
  isDimmed,
  onHoverChange,
  renderIllustration,
}: HumanLoopCardProps) {
  const hasHover = useHasHover();
  const [hovered, setHovered] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(cardRef, { once: true, amount: 0.4 });

  useEffect(() => {
    if (!hasHover && inView) setPlayToken((t) => t + 1);
  }, [hasHover, inView]);

  const handleEnter = () => {
    if (!hasHover) return;
    setHovered(true);
    setPlayToken((t) => t + 1);
    onHoverChange(index, true);
  };
  const handleLeave = () => {
    if (!hasHover) return;
    setHovered(false);
    onHoverChange(index, false);
  };

  const emphasize = reducedMotion ? true : hasHover ? hovered : inView;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: easeOut }}
      className="w-full lg:max-w-none max-w-[720px] mx-auto"
    >
      <motion.div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden min-h-0 sm:min-h-[520px] lg:min-h-[595px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(255,255,255,0) 100%), #07090c',
          borderStyle: 'solid',
          borderWidth: 1,
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        initial={false}
        animate={{
          y: hovered && !reducedMotion ? -5 : 0,
          opacity: isDimmed && !reducedMotion ? 0.76 : 1,
          borderColor: hovered ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.17)',
          boxShadow: hovered && !reducedMotion ? '0 18px 45px rgba(0,0,0,0.35)' : '0 0px 0px rgba(0,0,0,0)',
        }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: easeOut }}
      >
        <div className="p-[24px_20px] sm:p-[30px_30px_28px]">
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: figureColor,
              marginBottom: 18,
            }}
          >
            {figureLabel}
          </div>

          <h3
            style={{
              fontSize: 23,
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: '#f3f4f6',
              marginBottom: 12,
            }}
          >
            {title}
          </h3>

          <p style={{ fontSize: 16, lineHeight: 1.55, color: 'rgba(226,232,240,0.65)', maxWidth: 350 }}>
            {description}
          </p>

          {renderIllustration({ emphasize, playToken, reducedMotion })}

          <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
            <span
              style={{ width: 10, height: 10, borderRadius: 999, background: dotColor, flexShrink: 0 }}
            />
            <div style={{ height: 1, background: 'rgba(148,163,184,0.2)', flex: 1 }} />
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(226,232,240,0.62)' }}>{bottomSentence}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

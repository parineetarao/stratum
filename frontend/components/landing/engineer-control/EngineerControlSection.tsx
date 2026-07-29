'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { GeistSans } from 'geist/font/sans';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import HumanLoopCard from './HumanLoopCard';
import RecommendationIllustration from './RecommendationIllustration';
import ReviewIllustration from './ReviewIllustration';
import AppliedIllustration from './AppliedIllustration';
import { CARDS } from './engineer-control-data';

const easeOut = [0.22, 1, 0.36, 1] as const;

const ILLUSTRATIONS = [RecommendationIllustration, ReviewIllustration, AppliedIllustration];

export default function EngineerControlSection() {
  const reducedMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleHoverChange = useCallback((index: number, hovered: boolean) => {
    setHoveredIndex((prev) => {
      if (hovered) return index;
      return prev === index ? null : prev;
    });
  }, []);

  return (
    <section
      className={`relative pt-[68px] pb-[68px] md:pt-[88px] md:pb-[88px] lg:pt-[110px] lg:pb-[110px] ${GeistSans.className}`}
      style={{
        background: '#030405',
        minHeight: 950,
        paddingLeft: '5vw',
        paddingRight: '5vw',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1540 }}>
        <div className="text-center">
          <motion.div
            className="uppercase font-semibold"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: easeOut }}
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.34em',
              marginBottom: 16,
              backgroundImage: 'linear-gradient(90deg, #8b5cf6 0%, #7588ff 52%, #45c8df 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Engineer Control
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, delay: 0.08, ease: easeOut }}
            className="mx-auto"
            style={{
              fontSize: 'clamp(34px, 4.2vw, 60px)',
              lineHeight: 1.02,
              fontWeight: 650,
              letterSpacing: '-0.045em',
              color: '#f5f5f7',
              maxWidth: 1240,
              marginBottom: 18,
            }}
          >
            Engineer Control at Every Decision
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, delay: 0.18, ease: easeOut }}
            className="mx-auto"
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              fontWeight: 400,
              color: 'rgba(226,232,240,0.72)',
              maxWidth: 720,
              marginBottom: 40,
            }}
          >
            AI moves fast. You stay in control.
            <br />
            Review, refine, and approve every step before it goes live.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16 }} onMouseLeave={() => setHoveredIndex(null)}>
          {CARDS.map((card, i) => {
            const Illustration = ILLUSTRATIONS[i];
            return (
              <HumanLoopCard
                key={card.figureLabel}
                index={i}
                figureLabel={card.figureLabel}
                figureColor={card.figureColor}
                title={card.title}
                description={card.description}
                bottomSentence={card.bottomSentence}
                dotColor={card.dotColor}
                reducedMotion={reducedMotion}
                isDimmed={hoveredIndex !== null && hoveredIndex !== i}
                onHoverChange={handleHoverChange}
                renderIllustration={(state) => <Illustration {...state} />}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

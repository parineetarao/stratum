'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GeistSans } from 'geist/font/sans';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import CTAButton from './CTAButton';

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function FinalCTASection() {
  const reducedMotion = useReducedMotion();
  const [viewport, setViewport] = useState(1400);

  useEffect(() => {
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = viewport < 700;
  const isTablet = viewport >= 700 && viewport < 1100;

  const cardWidth = isMobile ? '100%' : isTablet ? 'min(92vw, 900px)' : 'min(1150px, 88vw)';
  const cardPadding = isMobile ? '54px 22px' : isTablet ? '64px 32px' : '72px 48px';

  return (
    <section
      className={`relative w-full ${GeistSans.className}`}
      style={{
        background: '#020305',
        padding: isMobile ? '80px 18px 56px' : '112px 24px 80px',
        minHeight: isMobile ? undefined : 640,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="mx-auto w-full" style={{ maxWidth: 1400 }}>
        <motion.div
          className="final-cta-card relative mx-auto flex flex-col items-center text-center"
          initial={reducedMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          whileHover={
            reducedMotion
              ? undefined
              : {
                  y: -6,
                  borderColor: 'rgba(180,168,255,0.6)',
                  boxShadow:
                    '0 42px 100px rgba(0,0,0,0.5), 0 0 110px rgba(124,58,237,0.22), 0 0 80px rgba(34,211,238,0.16), inset 0 1px 0 rgba(255,255,255,0.08)',
                  transition: { duration: 0.42, ease: easeOut },
                }
          }
          transition={{ duration: 0.65, ease: easeOut }}
          style={{
            width: cardWidth,
            minHeight: isMobile ? 'auto' : 420,
            padding: cardPadding,
            borderRadius: isMobile ? 24 : 34,
            background: 'linear-gradient(180deg, rgba(12,16,24,0.82) 0%, rgba(7,10,16,0.88) 100%)',
            border: '1px solid rgba(185,196,255,0.38)',
            boxShadow:
              '0 30px 80px rgba(0,0,0,0.42), 0 0 60px rgba(124,58,237,0.06), 0 0 40px rgba(34,211,238,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          }}
        >
          <motion.div
            className="final-cta-eyebrow uppercase font-semibold"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.1, ease: easeOut }}
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.32em',
              marginBottom: 22,
              backgroundImage: 'linear-gradient(90deg, #8b5cf6 0%, #7189ff 52%, #35c7df 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Ready to get started
          </motion.div>

          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.2, ease: easeOut }}
            style={{
              fontSize: isMobile ? 34 : 'clamp(40px, 4vw, 58px)',
              lineHeight: isMobile ? 1.06 : 1.04,
              fontWeight: 650,
              letterSpacing: '-0.045em',
              color: '#f5f5f7',
              maxWidth: 1000,
              marginBottom: 22,
            }}
          >
            Ready to build with Stratum?
          </motion.h2>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.3, ease: easeOut }}
            style={{
              fontSize: isMobile ? 17 : 'clamp(18px, 1.5vw, 22px)',
              lineHeight: 1.55,
              fontWeight: 400,
              color: 'rgba(226,232,240,0.72)',
              maxWidth: 700,
              marginBottom: 36,
            }}
          >
            Start building analytical systems with a platform
            {!isMobile && <br />} designed for clarity, control, and confidence.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.42, ease: easeOut }}
            className={isMobile ? 'flex flex-col w-full' : 'flex items-center justify-center flex-wrap'}
            style={{ gap: isMobile ? 14 : 30 }}
          >
            <CTAButton href="/register" variant="primary" fullWidth={isMobile}>
              Sign up free
            </CTAButton>
            <CTAButton href="/login" variant="secondary" fullWidth={isMobile}>
              Log in
            </CTAButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import AuthBrand from './AuthBrand';
import AuthLegalFooter from './AuthLegalFooter';

const easeOut = [0.22, 1, 0.36, 1] as const;

export interface AuthViewport {
  isMobile: boolean;
  isTablet: boolean;
  isStacked: boolean;
}

interface AuthShellProps {
  renderLeft: (viewport: AuthViewport) => ReactNode;
  renderRight: (viewport: AuthViewport) => ReactNode;
}

export default function AuthShell({ renderLeft, renderRight }: AuthShellProps) {
  const reducedMotion = useReducedMotion();
  const viewportWidth = useViewportWidth();

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1000;
  const isStacked = viewportWidth < 1000;
  const viewport: AuthViewport = { isMobile, isTablet, isStacked };

  const fadeUp = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      };

  const fadeDown = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div
      className="flex flex-col items-center overflow-x-hidden"
      style={{
        minHeight: '100vh',
        background: '#020305',
        justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '26px 14px 24px' : '38px 24px 30px',
      }}
    >
      <motion.div
        {...fadeDown}
        transition={{ duration: 0.6, ease: easeOut }}
        style={{ marginTop: isMobile ? 10 : 0, marginBottom: isMobile ? 24 : 30 }}
      >
        <AuthBrand />
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.6, ease: easeOut }}
        className="relative"
        style={{
          width: isMobile ? '100%' : 'min(1130px, 92vw)',
          minHeight: isStacked ? undefined : 720,
          display: 'grid',
          gridTemplateColumns: isStacked ? '1fr' : '1fr 1.13fr',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(8, 11, 17, 0.95), rgba(4, 6, 10, 0.98))',
          border: '1px solid rgba(190, 200, 220, 0.32)',
          borderRadius: isMobile ? 20 : 28,
          boxShadow: '0 32px 90px rgba(0, 0, 0, 0.48), 0 0 70px rgba(75, 70, 160, 0.035)',
        }}
      >
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08, ease: easeOut }}
        >
          {renderLeft(viewport)}
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16, ease: easeOut }}
          style={{
            padding: isMobile ? '38px 24px 34px' : isTablet ? '52px 44px' : '78px 70px 60px',
            borderLeft: isStacked ? 'none' : '1px solid rgba(148, 163, 184, 0.13)',
            borderTop: isStacked ? '1px solid rgba(148, 163, 184, 0.13)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          {renderRight(viewport)}
        </motion.div>
      </motion.div>

      <AuthLegalFooter isMobile={isMobile} />
    </div>
  );
}

'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useViewportWidth } from '@/hooks/useViewportWidth';

interface ScrollRevealSectionProps {
  children: ReactNode;
  zIndex: number;
}

// Wraps a section (which keeps all of its own internal animation/hover
// logic untouched) in a layer that gently rises into place as it scrolls
// into view, then recedes very slightly as the next section covers it.
// Deliberately applied to an outer wrapper — never to the section's own
// root element — so it never fights a transform a section already owns
// (e.g. EngineWorkSection's internal sticky scroll-scrub).
export default function ScrollRevealSection({ children, zIndex }: ScrollRevealSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const width = useViewportWidth();

  const isMobile = width < 700;
  const isTablet = width >= 700 && width < 1100;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const yFrom = isMobile ? 32 : isTablet ? 50 : 80;
  const opacityFrom = isMobile ? 0.8 : isTablet ? 0.72 : 0.65;
  // Scale is disabled on mobile per spec — done here by collapsing its
  // range to a constant 1 rather than skipping the hook call, since hooks
  // must run unconditionally every render (viewport width can cross the
  // mobile breakpoint at runtime, e.g. on window resize).
  const scaleFrom = isMobile ? 1 : isTablet ? 0.99 : 0.985;
  const recedeScale = isMobile ? 1 : 0.985;
  // Mobile skips the recede dip entirely (spec only calls for entrance
  // there), achieved by holding the final keyframe at full opacity.
  const recedeOpacity = isMobile ? 1 : 0.82;

  // Entrance settles by 25% through the section's viewport transit, holds
  // steady through the middle, then eases into a slight recede over the
  // final quarter as the next section rises over it.
  const y = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [yFrom, 0, 0, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [opacityFrom, 1, 1, recedeOpacity]);
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [scaleFrom, 1, 1, recedeScale]);

  // Deliberately never switch the element type (motion.div vs a plain div)
  // based on reducedMotion. useReducedMotion() starts false and flips to
  // true a moment after mount (it can only read the media query inside an
  // effect), so branching the JSX root on it would unmount and remount
  // this entire subtree — including every section nested inside — right
  // as the flag settles. That remount races each section's own whileInView
  // entrance animations and can freeze them at their pre-entrance (opacity
  // 0) state forever, since nothing is left to re-trigger them. Keeping
  // the same motion.div always mounted and only swapping the *style value*
  // (a MotionValue vs a plain static object) is a safe, non-remounting
  // update instead.
  return (
    // Outer layer stays static and fully opaque — it's the backdrop that
    // keeps the page's own background from showing through the seam while
    // the inner layer fades in/out. Only the inner layer is animated, so
    // an in-transit section is always composited against near-black
    // (matching every section's own tone), never against the page body.
    <div ref={ref} style={{ position: 'relative', zIndex, background: '#020204' }}>
      <motion.div style={reducedMotion ? { opacity: 1 } : { y, opacity, scale }}>{children}</motion.div>
    </div>
  );
}

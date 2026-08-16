'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GeistSans } from 'geist/font/sans';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import HeroActions from './HeroActions';
import HeroNavbar from './HeroNavbar';
import TypewriterWord from './TypewriterWord';
import WarehouseBlueprint from './WarehouseBlueprint';

interface StratumHeroProps {
  platformHref?: string;
  workflowHref?: string;
  capabilitiesHref?: string;
  architectureHref?: string;
  docsHref?: string;
  loginHref?: string;
}

const ROTATING_WORDS = ['Deliver.', 'Validate.', 'Govern.', 'Scale.', 'Optimize.'];
const NAV_HEIGHT = 94; // must match HeroNavbar's header height

export default function StratumHero(props: StratumHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 50, y: 50 });
  const smoothRef = useRef({ x: 50, y: 50 });
  const spotlightRef = useRef<SVGRadialGradientElement | null>(null);

  const reducedMotion = useReducedMotion();
  const [pointerActive, setPointerActive] = useState(false);
  const [viewport, setViewport] = useState(1400);

  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1200;

  useEffect(() => {
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Smooth the spotlight toward the latest pointer position via requestAnimationFrame,
  // writing straight to the SVG attribute instead of React state so movement never
  // triggers a re-render.
  useEffect(() => {
    if (isMobile || reducedMotion) return;
    const tick = () => {
      smoothRef.current.x += (targetRef.current.x - smoothRef.current.x) * 0.18;
      smoothRef.current.y += (targetRef.current.y - smoothRef.current.y) * 0.18;
      spotlightRef.current?.setAttribute('cx', `${smoothRef.current.x}%`);
      spotlightRef.current?.setAttribute('cy', `${smoothRef.current.y}%`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, reducedMotion]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (isMobile) return;
      const rect = event.currentTarget.getBoundingClientRect();
      targetRef.current = {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      };
    },
    [isMobile]
  );

  const onPointerEnter = useCallback(() => {
    if (isMobile || reducedMotion) return;
    setPointerActive(true);
  }, [isMobile, reducedMotion]);

  const onPointerLeave = useCallback(() => setPointerActive(false), []);

  // Precisely center the H1 (not just the whole text block) within `main`.
  // The block above the heading (eyebrow) and below it (paragraph/actions/
  // trust line) are different heights, so plain flex/grid centering of the
  // whole block would leave the heading itself off-center. Instead we
  // absolutely position the content block and translate it by exactly the
  // distance from its top to the heading's own vertical center — measured
  // from the real rendered DOM (font metrics make a fontSize-based estimate
  // unreliable), not guessed from fontSize * lineHeight.
  const headingFontSize = isMobile ? 42 : isTablet ? 54 : 70;
  const gapEyebrowToHeading = 22; // matches the heading's margin-top below

  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [eyebrowHeight, setEyebrowHeight] = useState(12);
  const [headingHeight, setHeadingHeight] = useState(headingFontSize * 1.02 * 2);

  useLayoutEffect(() => {
    const eyebrowEl = eyebrowRef.current;
    const headingEl = headingRef.current;
    if (!eyebrowEl || !headingEl) return;

    const measure = () => {
      setEyebrowHeight(eyebrowEl.getBoundingClientRect().height);
      setHeadingHeight(headingEl.getBoundingClientRect().height);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(eyebrowEl);
    ro.observe(headingEl);
    return () => ro.disconnect();
  }, [headingFontSize]);

  // `main` sits below the nav, so centering within `main` alone lands the
  // heading NAV_HEIGHT/2 below the full section's true center — pull it back up.
  const headingCenterOffset = eyebrowHeight + gapEyebrowToHeading + headingHeight / 2 + NAV_HEIGHT / 2;

  return (
    <section
      ref={heroRef}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`relative flex w-full flex-col overflow-hidden ${GeistSans.className}`}
      style={{
        height: '100vh',
        background: '#020204',
        color: '#F4F4F5',
      }}
    >
      <WarehouseBlueprint viewport={viewport} pointerActive={pointerActive} spotlightRef={spotlightRef} />

      <HeroNavbar
        platformHref={props.platformHref}
        workflowHref={props.workflowHref}
        capabilitiesHref={props.capabilitiesHref}
        architectureHref={props.architectureHref}
        docsHref={props.docsHref}
        loginHref={props.loginHref}
      />

      <main className="relative z-[2]" style={{ flex: 1 }}>
        <div
          className="absolute left-0 right-0 px-6"
          style={{ top: '50%', transform: `translateY(-${headingCenterOffset}px)` }}
        >
          <div className="mx-auto text-center" style={{ maxWidth: 890 }}>
            <p ref={eyebrowRef} style={{ margin: 0, fontSize: 12, lineHeight: 1, letterSpacing: '0.16em', opacity: 0.72 }}>
              ANALYTICS ENGINEERING PLATFORM
            </p>

            <h1
              ref={headingRef}
              style={{
                margin: `${gapEyebrowToHeading}px 0 18px`,
                fontSize: headingFontSize,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
              }}
            >
              <span className="block" style={{ color: '#F4F4F5' }}>
                Design. Orchestrate.
              </span>
              <span
                className="block"
                style={{
                  backgroundImage: 'linear-gradient(90deg,#7C3AED 0%,#4F6EF7 56%,#22D3EE 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                <TypewriterWord words={ROTATING_WORDS} enabled={!reducedMotion} />
              </span>
            </h1>

            <p
              className="mx-auto"
              style={{ maxWidth: 820, fontSize: isMobile ? 16 : 18, lineHeight: 1.55, color: 'rgba(244,244,245,0.84)' }}
            >
              Connect operational data, discover its structure, design production-ready warehouses, and generate
              trusted analytics through one engineering workflow.
            </p>

            <HeroActions loginHref={props.loginHref} />

            <p style={{ marginTop: 24, fontSize: 14, color: 'rgba(244,244,245,0.7)' }}>
              Built for analytics engineers, data teams, and technical analysts.
            </p>
          </div>
        </div>
      </main>
    </section>
  );
}

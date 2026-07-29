'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GeistSans } from 'geist/font/sans';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SECTION_SPACING } from '@/lib/sectionSpacing';
import LayerStack from './LayerStack';
import LayerTimeline from './LayerTimeline';
import LayerDetailsCard, { CARD_HEADER_OFFSET } from './LayerDetailsCard';
import { STRATUM_LAYERS } from './layer-data';
import { PLATFORM_SIZE } from './LayerPlatform';

const RESET_DELAY = 260;

export default function StratumEngineSection() {
  const reducedMotion = useReducedMotion();
  const [viewport, setViewport] = useState(1400);
  const [activeLayer, setActiveLayer] = useState<number | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1024;
  const isLaptop = viewport >= 1024 && viewport < 1280;
  const isLargeDesktop = viewport >= 1280;

  const clearResetTimeout = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  const activate = useCallback(
    (id: number) => {
      clearResetTimeout();
      setActiveLayer(id);
      setIsInteractive(true);
    },
    [clearResetTimeout]
  );

  const scheduleReset = useCallback(() => {
    clearResetTimeout();
    resetTimeoutRef.current = setTimeout(() => {
      setIsInteractive(false);
      setActiveLayer(null);
    }, RESET_DELAY);
  }, [clearResetTimeout]);

  const handleAreaEnter = useCallback(() => {
    clearResetTimeout();
  }, [clearResetTimeout]);

  const handleAreaLeave = useCallback(() => {
    if (isMobile || isTablet) return;
    scheduleReset();
  }, [isMobile, isTablet, scheduleReset]);

  // Tablet/mobile: tapping outside the interaction wrapper collapses the open layer.
  useEffect(() => {
    if (!(isMobile || isTablet) || !isInteractive) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsInteractive(false);
        setActiveLayer(null);
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [isMobile, isTablet, isInteractive]);

  const handleTapActivate = useCallback(
    (id: number) => {
      if (activeLayer === id && isInteractive) {
        setIsInteractive(false);
        setActiveLayer(null);
      } else {
        setActiveLayer(id);
        setIsInteractive(true);
      }
    },
    [activeLayer, isInteractive]
  );

  useEffect(() => () => clearResetTimeout(), [clearResetTimeout]);

  // Governs each platform's height and the vertical spacing between
  // layers only — restored to its original (pre-widening) value so the
  // stack's height is unaffected by the horizontal widening below.
  const scale = isMobile ? 0.52 : isTablet ? 0.7 : isLaptop ? 0.48 : 0.65;
  // Horizontal-only multiplier (see LayerPlatform's `widthStretch`) — widens
  // each diamond in screen space without touching its rendered height.
  const widthStretch = isLaptop || isLargeDesktop ? 1.6 : 1;
  // Pre-scale center-to-center spacing — tighter than the platform's own
  // rendered diamond height (~210px) so consecutive tiles interlock with
  // more overlap into one dense, continuous stack.
  const spacing = 148 * scale;
  const containerHeight = 5 * spacing + PLATFORM_SIZE * 1.1 * scale;
  const shiftX = isLargeDesktop ? 175 : isLaptop ? 130 : 0;

  const activeLayerData = STRATUM_LAYERS.find((l) => l.id === activeLayer) ?? null;
  const activeIndex = activeLayerData ? activeLayerData.id - 1 : 0;
  // The stack and the card share the same top-of-wrapper origin, and a
  // platform's rendered center is always `top + PLATFORM_SIZE / 2` (scale
  // and rotation both pivot around the box's own center, so scale never
  // moves it) — that doubles as the connector's target offset in the card.
  const connectorTop = activeIndex * spacing + PLATFORM_SIZE / 2;
  // How far the card slides down to sit level with the active layer.
  // Clamped so a lower layer's card can never be pushed past the point
  // where its content would spill under the fold — the tallest card
  // (Data Sources, ~520px) only ever appears for the topmost layer, whose
  // shift is naturally small, so this mainly bounds the shorter cards.
  const cardShift = Math.min(
    Math.max(0, connectorTop - CARD_HEADER_OFFSET),
    Math.max(0, containerHeight - 380)
  );
  // The connector's position *inside* the card. When the card's own shift
  // isn't clamped, this is just CARD_HEADER_OFFSET (the layer sits exactly
  // level with the header). When clamping kicks in for a lower layer, the
  // card stops short of the layer's true height — so the connector must
  // travel further down inside the card to still land on the right spot.
  const connectorOffset = Math.max(CARD_HEADER_OFFSET, connectorTop - cardShift);

  // Generous top padding so the section doesn't butt up against the hero —
  // paired with the fade overlay below for a seamless scroll transition.
  // Bottom is held to at least the shared "large" section-spacing floor
  // (see lib/sectionSpacing.ts) so the gap into the next section reads
  // consistently with the rest of the page.
  const sectionPaddingTop = isMobile ? 88 : isTablet ? 108 : 128;
  const sectionPaddingBottom = isMobile
    ? Math.max(76, SECTION_SPACING.large.mobile.bottom)
    : isTablet
      ? Math.max(90, SECTION_SPACING.large.tablet.bottom)
      : SECTION_SPACING.large.desktop.bottom;

  // Deliberately smaller than the hero's heading — only the hero should
  // read as the page's largest title.
  const titleSize = isMobile ? 32 : isTablet ? 42 : 54;

  const showDesktopLayout = isLaptop || isLargeDesktop;

  return (
    <section
      className={`relative w-full overflow-hidden ${GeistSans.className}`}
      style={{
        background: '#020204',
        color: '#F4F4F5',
        paddingTop: sectionPaddingTop,
        paddingBottom: sectionPaddingBottom,
        minHeight: isMobile || isTablet ? undefined : 800,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          opacity: 0.5,
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 75%)',
        }}
      />

      {/* Blends the hard hero/section boundary into one continuous scroll —
          same background color on both sides, so a top-down fade of that
          same color is enough to dissolve the seam instead of cutting. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: 260,
          background: 'linear-gradient(to bottom, #020204 0%, rgba(2,2,4,0.6) 45%, transparent 100%)',
        }}
      />

      <div className="relative z-10 mx-auto px-6" style={{ maxWidth: 1480 }}>
        <motion.div
          className="text-center"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="mx-auto font-bold"
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              color: '#F4F4F5',
            }}
          >
            The Stratum Engine
          </h2>
        </motion.div>

        <motion.p
          className="mx-auto text-center"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: 14,
            maxWidth: 820,
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.55,
            color: 'rgba(244,244,245,0.84)',
          }}
        >
          Every dataset moves through six coordinated layers before becoming production-ready analytics.
        </motion.p>

        {showDesktopLayout ? (
          <div
            ref={wrapperRef}
            onMouseEnter={handleAreaEnter}
            onMouseLeave={handleAreaLeave}
            className="relative mx-auto"
            style={{ marginTop: 12, height: containerHeight }}
          >
            <div
              className="absolute left-0 hidden lg:block"
              style={{ top: 24 * scale }}
            >
              <LayerTimeline activeLayer={activeLayer} visible={isInteractive} reducedMotion={reducedMotion} />
            </div>

            <div className="mx-auto" style={{ width: 'fit-content' }}>
              <LayerStack
                activeLayer={activeLayer}
                onActivate={activate}
                reducedMotion={reducedMotion}
                shifted={isInteractive}
                scale={scale}
                widthStretch={widthStretch}
                shiftX={shiftX}
                spacing={spacing}
                containerHeight={containerHeight}
                activationMode="hover"
              />
            </div>

            <div
              className="absolute right-0 hidden lg:block"
              style={{
                top: 0,
                // Slides the whole card up/down to sit level with whichever
                // layer is active (matching the connector's origin height)
                // instead of always anchoring to the container's top.
                transform: `translateY(${cardShift}px)`,
                transition: reducedMotion ? 'none' : 'transform 420ms cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <LayerDetailsCard
                layer={activeLayerData}
                visible={isInteractive}
                reducedMotion={reducedMotion}
                connectorOffset={connectorOffset}
              />
            </div>
          </div>
        ) : (
          <div ref={wrapperRef} className="relative mx-auto" style={{ marginTop: 20 }}>
            <div className="mx-auto" style={{ width: 'fit-content', height: containerHeight }}>
              <LayerStack
                activeLayer={activeLayer}
                onActivate={handleTapActivate}
                reducedMotion={reducedMotion}
                shifted={false}
                scale={scale}
                widthStretch={widthStretch}
                shiftX={0}
                spacing={spacing}
                containerHeight={containerHeight}
                activationMode="tap"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center" style={{ gap: 10 }}>
              {STRATUM_LAYERS.map((layer) => {
                const isActive = activeLayer === layer.id;
                return (
                  <button
                    key={layer.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleTapActivate(layer.id)}
                    className="cursor-pointer rounded-full font-semibold"
                    style={{
                      padding: '8px 14px',
                      fontSize: 12.5,
                      letterSpacing: '0.04em',
                      color: isActive ? '#0B0B10' : 'rgba(244,244,245,0.75)',
                      background: isActive ? layer.colors.accent : 'rgba(255,255,255,0.05)',
                      border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                      transition: 'background 220ms ease, color 220ms ease',
                    }}
                  >
                    {String(layer.id).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {activeLayerData && (
              <motion.div
                key={activeLayerData.id}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="mx-auto"
                style={{ marginTop: 28, maxWidth: 560 }}
              >
                <div
                  style={{
                    background: 'linear-gradient(180deg, rgba(12,14,22,0.98), rgba(7,9,15,0.98))',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 22,
                    padding: 26,
                    boxShadow: '0 28px 70px rgba(0,0,0,0.38)',
                  }}
                >
                  <div className="flex items-start" style={{ gap: 14 }}>
                    <div
                      className="flex flex-shrink-0 items-center justify-center font-semibold"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 9,
                        background: activeLayerData.colors.accent,
                        color: '#0B0B10',
                        fontSize: 14,
                      }}
                    >
                      {String(activeLayerData.id).padStart(2, '0')}
                    </div>
                    <h3 className="font-semibold" style={{ fontSize: 22, color: '#F4F4F5' }}>
                      {activeLayerData.name}
                    </h3>
                  </div>
                  <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.55, color: 'rgba(244,244,245,0.72)' }}>
                    {activeLayerData.description}
                  </p>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', margin: '18px 0' }} />
                  <div
                    className="uppercase font-semibold"
                    style={{ fontSize: 11.5, letterSpacing: '0.08em', color: activeLayerData.colors.accent, marginBottom: 12 }}
                  >
                    {activeLayerData.sectionLabel}
                  </div>
                  <div className="flex flex-col" style={{ gap: 10 }}>
                    {activeLayerData.capabilities.map((cap) => (
                      <div key={cap} className="flex items-center" style={{ gap: 9 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: activeLayerData.colors.accent,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 14, color: 'rgba(244,244,245,0.85)' }}>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

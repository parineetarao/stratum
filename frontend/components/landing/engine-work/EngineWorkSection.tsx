'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { GeistSans } from 'geist/font/sans';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import DatasetPill from './DatasetPill';
import TransformationPath from './TransformationPath';
import StageControls from './StageControls';
import DataWorkspace, { type RevealFlags } from './DataWorkspace';
import RawDataPanel from './RawDataPanel';
import SchemaRelationshipsPanel from './SchemaRelationshipsPanel';
import DataQualityPanel from './DataQualityPanel';
import WarehouseModelPanel from './WarehouseModelPanel';
import GeneratedSqlPanel from './GeneratedSqlPanel';
import AnalyticsPreviewPanel from './AnalyticsPreviewPanel';
import type { ExplorationStage } from './engine-work-data';

const REVEAL_THRESHOLDS: { key: keyof RevealFlags; at: number }[] = [
  { key: 'raw', at: 0.15 },
  { key: 'discovery', at: 0.32 },
  { key: 'relationships', at: 0.5 },
  { key: 'warehouse', at: 0.68 },
  { key: 'analytics', at: 0.88 },
];

const STAGE_ORDER: Exclude<ExplorationStage, 'all'>[] = ['raw', 'discovery', 'relationships', 'warehouse', 'analytics'];

const ALL_REVEALED: RevealFlags = { raw: true, discovery: true, relationships: true, warehouse: true, analytics: true };
const NONE_REVEALED: RevealFlags = { raw: false, discovery: false, relationships: false, warehouse: false, analytics: false };

export default function EngineWorkSection() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [viewport, setViewport] = useState(1400);

  useEffect(() => {
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1024;
  const isLaptop = viewport >= 1024 && viewport < 1280;
  const isDesktop = viewport >= 1024;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 110, damping: 24, mass: 0.35 });

  const [reveal, setReveal] = useState<RevealFlags>(NONE_REVEALED);
  const [isRevealComplete, setIsRevealComplete] = useState(false);

  useMotionValueEvent(smoothProgress, 'change', (v) => {
    if (!isDesktop) return;
    setReveal((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of REVEAL_THRESHOLDS) {
        if (!next[t.key] && v >= t.at) {
          next[t.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (v >= 0.9) setIsRevealComplete(true);
  });

  // Reduced motion, tablet, and mobile skip the scroll-scrubbed assembly
  // entirely and present the fully-built workspace right away.
  useEffect(() => {
    if (reducedMotion || !isDesktop) {
      setReveal(ALL_REVEALED);
      setIsRevealComplete(true);
    }
  }, [reducedMotion, isDesktop]);

  const workspaceOpacity = useTransform(smoothProgress, [0, 0.15], [0, 1]);
  const workspaceY = useTransform(smoothProgress, [0, 0.15], [50, 0]);
  const workspaceScale = useTransform(smoothProgress, [0, 0.15], [0.975, 1]);

  const reachedCount = STAGE_ORDER.reduce((acc, key) => acc + (reveal[key] ? 1 : 0), 0);

  const [hoveredStage, setHoveredStage] = useState<ExplorationStage | null>(null);
  const [pinnedStage, setPinnedStage] = useState<ExplorationStage>('all');
  const activeStage = hoveredStage ?? pinnedStage;
  const effectiveStage: ExplorationStage = isDesktop ? activeStage : activeStage === 'all' ? 'raw' : activeStage;

  const hoverEnabled = isDesktop && isRevealComplete;

  const handleHover = useCallback((stage: ExplorationStage | null) => setHoveredStage(stage), []);
  const handlePin = useCallback(
    (stage: Exclude<ExplorationStage, 'all'>) => {
      setPinnedStage((prev) => (isDesktop && prev === stage ? 'all' : stage));
    },
    [isDesktop]
  );

  const workspaceHeight = isLaptop ? 580 : 640;

  return (
    <section ref={sectionRef} className={`relative bg-black ${GeistSans.className}`}>
      <div style={{ height: isDesktop ? 1150 : undefined }}>
        <div
          className={isDesktop ? 'sticky top-0 flex min-h-screen flex-col justify-center' : ''}
          style={{ padding: isDesktop ? '48px 0' : '96px 0' }}
        >
          <div className="relative z-10 mx-auto w-full px-6 sm:px-8 lg:px-16" style={{ maxWidth: 1480 }}>
            <div className="text-center">
              <div
                className="uppercase font-semibold"
                style={{
                  fontSize: 14,
                  letterSpacing: '0.3em',
                  marginBottom: 14,
                  backgroundImage: 'linear-gradient(90deg, #8B5CF6 0%, #4F6DF5 55%, #22D3EE 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                SEE THE ENGINE AT WORK
              </div>

              <h2
                className="mx-auto font-bold"
                style={{
                  fontSize: isMobile ? 30 : isTablet ? 40 : 50,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: '#F5F5F7',
                  maxWidth: 1000,
                }}
              >
                One dataset. Transformed end to end.
              </h2>

              <p
                className="mx-auto"
                style={{
                  marginTop: 14,
                  maxWidth: 760,
                  fontSize: isMobile ? 16 : 19,
                  lineHeight: 1.55,
                  color: 'rgba(245,245,247,0.62)',
                }}
              >
                Watch Retail_Transactions.csv move through Stratum—from raw operational data to trusted analytics.
              </p>

              <div style={{ marginTop: 24 }}>
                <DatasetPill active={reachedCount > 0 && reachedCount < 5} />
              </div>

              <div style={{ marginTop: 30, marginBottom: isMobile ? 24 : 32 }}>
                <TransformationPath activeStage={effectiveStage} reachedCount={isDesktop ? reachedCount : 5} isMobile={isMobile} />
              </div>
            </div>

            {isDesktop ? (
              <motion.div
                data-testid="engine-workspace"
                data-progress={reachedCount}
                style={{
                  opacity: workspaceOpacity,
                  y: workspaceY,
                  scale: workspaceScale,
                  height: workspaceHeight,
                  background: '#05070B',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 22,
                  boxShadow: '0 28px 80px rgba(0,0,0,0.44)',
                  overflow: 'hidden',
                }}
              >
                <DataWorkspace activeStage={activeStage} reveal={reveal} reducedMotion={reducedMotion} />
              </motion.div>
            ) : (
              <div
                style={{
                  minHeight: isMobile ? 360 : 460,
                  background: '#05070B',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 22,
                  boxShadow: '0 28px 80px rgba(0,0,0,0.44)',
                  overflow: 'hidden',
                }}
              >
                <FocusedPanel stage={effectiveStage} reducedMotion={reducedMotion} />
              </div>
            )}

            <div style={{ marginTop: 28 }}>
              <StageControls
                pinnedStage={pinnedStage}
                activeStage={effectiveStage}
                hoverEnabled={hoverEnabled}
                onHover={handleHover}
                onPin={handlePin}
                isMobile={isMobile || isTablet}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FocusedPanel({ stage, reducedMotion }: { stage: ExplorationStage; reducedMotion: boolean }) {
  if (stage === 'discovery' || stage === 'relationships') {
    return (
      <SchemaRelationshipsPanel
        nodesRevealed
        linksRevealed
        nodesEmphasis={stage === 'discovery'}
        linksEmphasis={stage === 'relationships'}
        reducedMotion={reducedMotion}
      />
    );
  }
  if (stage === 'warehouse') {
    return (
      <div className="flex h-full flex-col">
        <div style={{ flex: 1, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <WarehouseModelPanel revealed emphasis reducedMotion={reducedMotion} />
        </div>
        <div style={{ flex: 1 }}>
          <GeneratedSqlPanel revealed reducedMotion={reducedMotion} />
        </div>
      </div>
    );
  }
  if (stage === 'analytics') {
    return <AnalyticsPreviewPanel revealed reducedMotion={reducedMotion} />;
  }
  return (
    <div className="flex h-full flex-col">
      <div style={{ flex: 1 }}>
        <RawDataPanel revealed reducedMotion={reducedMotion} />
      </div>
      <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <DataQualityPanel revealed reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Table2, Database } from 'lucide-react';
import type { IllustrationProps } from './engineer-control-data';

const SIGNAL_PATHS = [
  'M7,15 Q21,11 33,37',
  'M7,20 Q21,26 33,48',
  'M7,25 Q21,36 33,55',
  'M7,60 Q21,54 33,44',
  'M7,65 Q21,64 33,50',
  'M7,70 Q21,74 33,56',
];

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function RecommendationIllustration({ emphasize, playToken, reducedMotion }: IllustrationProps) {
  const dur = reducedMotion ? 0 : undefined;

  return (
    <div className="relative h-[245px] sm:h-[285px] mt-6 mb-3">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {SIGNAL_PATHS.map((d, i) => (
          <path key={i} d={d} stroke="rgba(139,92,246,0.55)" strokeWidth={0.4} fill="none" vectorEffect="non-scaling-stroke" />
        ))}
        <path d="M48,50 L66,50" stroke="rgba(139,92,246,0.85)" strokeWidth={0.5} strokeDasharray="1.5 2.5" vectorEffect="non-scaling-stroke" />

        {!reducedMotion && (
          <>
            <motion.circle
              key={`dot-a-${playToken}`}
              r={0.9}
              fill="#a78bfa"
              initial={{ cx: 7, cy: 20, opacity: 0 }}
              animate={
                playToken > 0
                  ? { cx: [7, 21, 33], cy: [20, 26, 48], opacity: [0, 1, 1, 0] }
                  : { cx: 7, cy: 20, opacity: 0 }
              }
              transition={{ duration: 0.65, ease: 'easeInOut' }}
            />
            <motion.circle
              key={`dot-b-${playToken}`}
              r={0.9}
              fill="#a78bfa"
              initial={{ cx: 7, cy: 65, opacity: 0 }}
              animate={
                playToken > 0
                  ? { cx: [7, 21, 33], cy: [65, 64, 50], opacity: [0, 1, 1, 0] }
                  : { cx: 7, cy: 65, opacity: 0 }
              }
              transition={{ duration: 0.65, delay: 0.08, ease: 'easeInOut' }}
            />
          </>
        )}
      </svg>

      {/* Source tile: table */}
      <div
        className="absolute left-0 flex items-center justify-center w-[46px] h-[46px] sm:w-[62px] sm:h-[62px] rounded-[10px]"
        style={{ top: '22%', transform: 'translateY(-50%)', background: '#0b0e13', border: '1px solid rgba(148,163,184,0.18)' }}
      >
        <Table2 size={20} strokeWidth={1.3} color="rgba(226,232,240,0.55)" />
      </div>

      {/* Source tile: database */}
      <div
        className="absolute left-0 flex items-center justify-center w-[46px] h-[46px] sm:w-[62px] sm:h-[62px] rounded-[10px]"
        style={{ top: '58%', transform: 'translateY(-50%)', background: '#0b0e13', border: '1px solid rgba(148,163,184,0.18)' }}
      >
        <Database size={20} strokeWidth={1.3} color="rgba(226,232,240,0.55)" />
      </div>

      {/* AI tile */}
      <motion.div
        className="absolute flex items-center justify-center w-[46px] h-[46px] sm:w-[62px] sm:h-[62px] rounded-[10px]"
        style={{ left: '40%', top: '50%', transform: 'translate(-50%,-50%)', borderStyle: 'solid', borderWidth: 1 }}
        initial={false}
        animate={{
          borderColor: emphasize ? 'rgba(139,92,246,1)' : 'rgba(139,92,246,0.5)',
          background: emphasize ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0)',
          boxShadow: emphasize ? 'inset 0 0 10px rgba(139,92,246,0.28)' : 'inset 0 0 0px rgba(139,92,246,0)',
        }}
        transition={{ duration: 0.3, delay: emphasize ? 0.25 : 0, ease: easeOut }}
      >
        <motion.span
          style={{ fontFamily: 'monospace', fontSize: 18 }}
          initial={false}
          animate={{ opacity: emphasize ? 1 : 0.75, color: emphasize ? '#b794ff' : '#9b72ff' }}
          transition={{ duration: 0.3, delay: emphasize ? 0.25 : 0 }}
        >
          AI
        </motion.span>
      </motion.div>

      {/* Recommendation panel */}
      <div
        className="absolute right-0 w-[140px] sm:w-[155px] h-[165px] sm:h-[185px] rounded-[11px] p-3 sm:p-4 overflow-hidden"
        style={{ top: '50%', transform: 'translateY(-50%)', background: '#0a0c10', border: '1px solid rgba(148,163,184,0.2)' }}
      >
        <motion.div
          key={`panel-${playToken}`}
          initial={playToken === 0 ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur === 0 ? 0 : 0.35 }}
        >
          <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#8b5cf6' }}>SUGGESTION</div>

          <motion.div
            initial={playToken === 0 ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur === 0 ? 0 : 0.3, delay: dur === 0 ? 0 : 0.08 }}
            style={{ marginTop: 12 }}
          >
            <div style={{ fontSize: 9, color: 'rgba(226,232,240,0.5)', marginBottom: 4 }}>Relationship</div>
            <div className="text-[8.5px] sm:text-[10px]" style={{ fontFamily: 'monospace', color: 'rgba(226,232,240,0.85)', lineHeight: 1.5, whiteSpace: 'nowrap' }}>
              orders.customer_id<br />→ customers.id
            </div>
          </motion.div>

          <motion.div
            initial={playToken === 0 ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur === 0 ? 0 : 0.3, delay: dur === 0 ? 0 : 0.16 }}
            style={{ marginTop: 14 }}
          >
            <div className="flex items-center justify-between" style={{ fontSize: 10, color: 'rgba(226,232,240,0.6)', marginBottom: 5 }}>
              <span>Confidence</span>
              <span>92%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div
                key={`bar-${playToken}`}
                initial={playToken === 0 ? { width: '92%' } : { width: '0%' }}
                animate={{ width: '92%' }}
                transition={{ duration: dur === 0 ? 0 : 0.7, delay: dur === 0 ? 0 : 0.2, ease: easeOut }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #697cff)' }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

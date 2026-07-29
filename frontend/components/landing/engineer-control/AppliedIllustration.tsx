'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { IllustrationProps } from './engineer-control-data';

const PLATE_OPACITIES = [1, 0.65, 0.45, 0.3, 0.18];

export default function AppliedIllustration({ emphasize, playToken, reducedMotion }: IllustrationProps) {
  const dur = reducedMotion ? 0 : undefined;

  return (
    <div className="relative h-[245px] sm:h-[285px] mt-6 mb-3 flex items-center justify-center gap-6 sm:gap-9">
      {/* Approval box */}
      <div
        className="relative flex items-center justify-center rounded-[12px] shrink-0"
        style={{ width: 60, height: 60, background: '#0a1013', border: '1px solid rgba(91,212,212,0.42)' }}
      >
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
          <motion.path
            key={`check-${playToken}`}
            d="M5 13l4 4L19 7"
            stroke="#75d6da"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={playToken === 0 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: dur === 0 ? 0 : 0.45, ease: 'easeOut' }}
          />
        </svg>
      </div>

      {/* Connector */}
      <svg className="shrink-0" width={44} height={2} viewBox="0 0 44 2" style={{ overflow: 'visible' }}>
        <motion.line
          key={`connector-${playToken}`}
          x1={0}
          y1={1}
          x2={44}
          y2={1}
          strokeWidth={1}
          strokeDasharray="4 5"
          initial={
            playToken === 0
              ? { pathLength: 1, opacity: 1, stroke: 'rgba(91,212,212,0.42)' }
              : { pathLength: 0, opacity: 0, stroke: 'rgba(91,212,212,0.42)' }
          }
          animate={{ pathLength: 1, opacity: 1, stroke: emphasize ? '#8ee8ec' : 'rgba(91,212,212,0.42)' }}
          transition={{
            default: { duration: dur === 0 ? 0 : 0.4, delay: dur === 0 ? 0 : 0.3, ease: 'easeOut' },
            stroke: { duration: dur === 0 ? 0 : 0.3, ease: 'easeOut' },
          }}
        />
      </svg>

      {/* Version stack */}
      <motion.div
        key={`stack-${playToken}`}
        className="relative shrink-0"
        style={{ width: 105 + 14 * 4, height: 135 + 12 * 4 }}
        initial={playToken === 0 ? { x: 0 } : { x: -4 }}
        animate={{ x: 0 }}
        transition={{ duration: dur === 0 ? 0 : 0.5, delay: dur === 0 ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {[4, 3, 2, 1, 0].map((i) => {
          const isFront = i === 0;
          return (
            <div
              key={i}
              className="absolute rounded-[9px]"
              style={{
                width: 105,
                height: 135,
                left: 14 * i,
                top: 48 - 12 * i,
                background: 'rgba(8,16,20,0.95)',
                borderStyle: 'solid',
                borderWidth: 1,
                borderColor: isFront && emphasize ? 'rgba(91,212,212,0.78)' : 'rgba(91,212,212,0.55)',
                opacity: PLATE_OPACITIES[i],
                transition: 'border-color 300ms ease',
              }}
            >
              {isFront && (
                <div className="p-2.5 h-full flex flex-col justify-between">
                  <div>
                    <div className="grid grid-cols-2 gap-[3px]" style={{ width: 20, height: 20, marginBottom: 8 }}>
                      {[0, 1, 2, 3].map((c) => (
                        <div key={c} style={{ background: 'rgba(91,212,212,0.35)', borderRadius: 2 }} />
                      ))}
                    </div>
                    <div style={{ height: 3, width: '75%', background: 'rgba(148,163,184,0.3)', borderRadius: 2, marginBottom: 5 }} />
                    <div style={{ height: 3, width: '55%', background: 'rgba(148,163,184,0.22)', borderRadius: 2, marginBottom: 5 }} />
                    <div style={{ height: 3, width: '65%', background: 'rgba(148,163,184,0.22)', borderRadius: 2 }} />
                  </div>
                  <motion.div
                    className="self-end flex items-center justify-center rounded-full"
                    style={{ width: 16, height: 16, background: 'rgba(91,212,212,0.16)', border: '1px solid rgba(91,212,212,0.5)' }}
                    initial={playToken === 0 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: dur === 0 ? 0 : 0.3, delay: dur === 0 ? 0 : 0.75 }}
                  >
                    <Check size={10} strokeWidth={2.5} color="#75d6da" />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

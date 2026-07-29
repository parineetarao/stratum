'use client';

import { motion } from 'framer-motion';
import type { IllustrationProps } from './engineer-control-data';

const EVIDENCE_ROWS = [
  { label: 'Column-name similarity', value: '98%' },
  { label: 'Data-type compatibility', value: 'Exact' },
  { label: 'Value overlap', value: '94%' },
];

const easeOut = [0.22, 1, 0.36, 1] as const;

function Field({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-2.5 py-1.5 rounded-[7px] flex-1 min-w-0 truncate"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.04)',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'rgba(226,232,240,0.85)',
      }}
    >
      {children}
    </div>
  );
}

export default function ReviewIllustration({ emphasize, playToken, reducedMotion }: IllustrationProps) {
  const dur = reducedMotion ? 0 : undefined;

  return (
    <div className="relative h-[245px] sm:h-[285px] mt-6 mb-3 flex items-center justify-center">
      <motion.div
        className="w-full rounded-[11px] p-[18px]"
        style={{ maxWidth: 430, minHeight: 245, background: '#090b0f', borderStyle: 'solid', borderWidth: 1 }}
        initial={false}
        animate={{ borderColor: emphasize ? 'rgba(111,151,255,0.48)' : 'rgba(148,163,184,0.22)' }}
        transition={{ duration: dur === 0 ? 0 : 0.3 }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em', color: 'rgba(226,232,240,0.7)' }}>
          RELATIONSHIP SUGGESTION
        </div>

        <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
          <Field>orders.customer_id</Field>
          <span style={{ color: 'rgba(226,232,240,0.4)', fontSize: 12, flexShrink: 0 }}>→</span>
          <Field>customers.id</Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="flex items-center justify-between" style={{ fontSize: 12, color: 'rgba(226,232,240,0.7)', marginBottom: 6 }}>
            <span>Confidence</span>
            <span>92%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              key={`review-bar-${playToken}`}
              initial={playToken === 0 ? { width: '92%' } : { width: '40%' }}
              animate={{ width: '92%' }}
              transition={{ duration: dur === 0 ? 0 : 0.7, ease: easeOut }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #6f97ff, #8b5cf6)' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.45)', marginBottom: 8 }}>
            Supporting evidence
          </div>
          {EVIDENCE_ROWS.map((row, i) => (
            <motion.div
              key={`${playToken}-${row.label}`}
              className="flex items-center justify-between"
              style={{ fontSize: 11, color: 'rgba(226,232,240,0.65)', paddingTop: 4, paddingBottom: 4 }}
              initial={playToken === 0 ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur === 0 ? 0 : 0.35, delay: dur === 0 ? 0 : i * 0.07 }}
            >
              <span>{row.label}</span>
              <span style={{ color: 'rgba(226,232,240,0.85)' }}>{row.value}</span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-[10px]" style={{ marginTop: 16 }}>
          <button
            type="button"
            tabIndex={-1}
            className="rounded-[8px] cursor-default"
            style={{ background: 'transparent', border: '1px solid rgba(148,163,184,0.18)', color: 'rgba(226,232,240,0.75)', fontSize: 12, fontWeight: 500, padding: '8px 0' }}
          >
            Reject
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="rounded-[8px] cursor-default"
            style={{ background: 'transparent', border: '1px solid rgba(148,163,184,0.18)', color: 'rgba(226,232,240,0.75)', fontSize: 12, fontWeight: 500, padding: '8px 0' }}
          >
            Edit
          </button>
          <motion.button
            type="button"
            tabIndex={-1}
            className="rounded-[8px] cursor-default flex items-center justify-center gap-1"
            style={{ background: 'linear-gradient(90deg, #6d3ce7, #728cff)', border: 'none', color: 'white', fontSize: 12, fontWeight: 500, padding: '8px 0' }}
            initial={false}
            animate={{ scale: emphasize ? 1.015 : 1, filter: emphasize ? 'brightness(1.08)' : 'brightness(1)' }}
            transition={{ duration: dur === 0 ? 0 : 0.3, delay: dur === 0 ? 0 : 0.55 }}
          >
            <motion.span
              initial={false}
              animate={{ y: emphasize ? -2 : 0 }}
              transition={{ duration: dur === 0 ? 0 : 0.25, delay: dur === 0 ? 0 : 0.55 }}
            >
              ✓
            </motion.span>
            Approve
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

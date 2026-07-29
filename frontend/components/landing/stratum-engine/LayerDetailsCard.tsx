'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Database, FileText } from 'lucide-react';
import type { StratumLayer } from './layer-data';

// Vertical distance from the card's own top to its header row's center
// (26px padding + half the 38px number badge) — the card's page position is
// shifted (by the parent) to sit level with the active layer, so in the
// common case the connector lands here. When the parent's shift is clamped
// (a lower layer whose card stopped short of the layer's true height), it
// passes a larger `connectorOffset` so the connector still lands correctly.
export const CARD_HEADER_OFFSET = 45;

interface LayerDetailsCardProps {
  layer: StratumLayer | null;
  visible: boolean;
  reducedMotion: boolean;
  /** Where the connector line/dot land inside the card. Defaults to the
   * header level; the parent overrides this when its own shift was clamped. */
  connectorOffset?: number;
}

export default function LayerDetailsCard({
  layer,
  visible,
  reducedMotion,
  connectorOffset = CARD_HEADER_OFFSET,
}: LayerDetailsCardProps) {
  return (
    <div
      className="relative hidden w-full flex-shrink-0 lg:block"
      style={{
        maxWidth: 440,
        opacity: visible && layer ? 1 : 0,
        transform: `translateX(${visible ? 0 : 24}px)`,
        transition: reducedMotion
          ? 'none'
          : 'opacity 420ms ease 90ms, transform 420ms cubic-bezier(0.16,1,0.3,1) 90ms',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -46,
          top: connectorOffset,
          width: 46,
          height: 1,
          backgroundImage: layer
            ? `linear-gradient(to right, ${layer.colors.accent} 50%, transparent 50%)`
            : undefined,
          backgroundSize: '7px 1px',
          opacity: visible ? 0.65 : 0,
          transform: `scaleX(${visible ? 1 : 0})`,
          transformOrigin: 'right',
          transition: reducedMotion
            ? 'none'
            : 'transform 320ms ease, opacity 320ms ease, top 380ms cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -50,
          top: connectorOffset - 4,
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: layer?.colors.accent,
          opacity: visible ? 1 : 0,
          transition: reducedMotion
            ? 'none'
            : 'opacity 320ms ease 200ms, top 380ms cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      <motion.div
        layout={!reducedMotion}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(12,14,22,0.98), rgba(7,9,15,0.98))',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 22,
          padding: 26,
          boxShadow: '0 28px 70px rgba(0,0,0,0.38)',
        }}
      >
        <AnimatePresence mode="wait">
          {layer && (
            <motion.div
              key={layer.id}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="flex items-center" style={{ gap: 14 }}>
                <div
                  className="flex flex-shrink-0 items-center justify-center font-semibold"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: layer.colors.accent,
                    color: '#0B0B10',
                    fontSize: 14,
                  }}
                >
                  {String(layer.id).padStart(2, '0')}
                </div>
                <h3 className="font-semibold" style={{ fontSize: 24, color: '#F4F4F5', lineHeight: 1.15 }}>
                  {layer.name}
                </h3>
              </div>

              <p style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.5, color: 'rgba(244,244,245,0.72)', maxWidth: '97%' }}>
                {layer.description}
              </p>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', marginTop: 16, marginBottom: 14 }} />

              {layer.sources && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    className="uppercase font-semibold"
                    style={{ fontSize: 11, letterSpacing: '0.08em', color: layer.colors.accent, marginBottom: 9 }}
                  >
                    Supported Sources
                  </div>
                  <div className="flex flex-col" style={{ gap: 7 }}>
                    {layer.sources.map((s) => {
                      const SourceIcon = s.title.includes('CSV') ? FileText : Database;
                      return (
                        <div
                          key={s.title}
                          className="flex items-center"
                          style={{
                            minHeight: 54,
                            background: 'rgba(255,255,255,0.018)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                          }}
                        >
                          <div
                            className="flex flex-shrink-0 items-center justify-center"
                            style={{ width: 48, height: 54, borderRight: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <SourceIcon size={16} color={layer.colors.accent} />
                          </div>
                          <div style={{ padding: '6px 14px', flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#F4F4F5' }}>{s.title}</div>
                            <div style={{ fontSize: 11.5, color: 'rgba(244,244,245,0.55)', marginTop: 1 }}>
                              {s.description}
                            </div>
                          </div>
                          {s.status && (
                            <span style={{ fontSize: 10.5, color: 'rgba(244,244,245,0.4)', marginRight: 14, flexShrink: 0 }}>
                              {s.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                className="uppercase font-semibold"
                style={{ fontSize: 11, letterSpacing: '0.08em', color: layer.colors.accent, marginBottom: 9 }}
              >
                {layer.sectionLabel}
              </div>
              <div className="flex flex-col" style={{ gap: 7 }}>
                {layer.capabilities.map((cap) => (
                  <div key={cap} className="flex items-center" style={{ gap: 8 }}>
                    <CheckCircle2 size={14.5} color={layer.colors.accent} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, color: 'rgba(244,244,245,0.85)' }}>{cap}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

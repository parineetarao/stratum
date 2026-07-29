'use client';

import { STRATUM_LAYERS } from './layer-data';

interface LayerTimelineProps {
  activeLayer: number | null;
  visible: boolean;
  reducedMotion: boolean;
}

export default function LayerTimeline({ activeLayer, visible, reducedMotion }: LayerTimelineProps) {
  return (
    <div
      className="relative hidden lg:block flex-shrink-0"
      style={{
        width: 176,
        opacity: visible ? 1 : 0.4,
        transform: `translateX(${visible ? 0 : -16}px)`,
        transition: reducedMotion ? 'none' : 'opacity 480ms ease, transform 480ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 11,
          top: 12,
          bottom: 12,
          width: 1,
          background: 'rgba(255,255,255,0.18)',
        }}
      />
      <div className="flex flex-col" style={{ gap: 34 }}>
        {STRATUM_LAYERS.map((layer) => {
          const isActive = activeLayer === layer.id;
          return (
            <div key={layer.key} className="flex items-center" style={{ gap: 14 }}>
              <span
                aria-hidden="true"
                className="relative flex-shrink-0 rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  border: isActive ? 'none' : '2px solid rgba(255,255,255,0.28)',
                  background: isActive ? layer.colors.accent : 'transparent',
                  transition: reducedMotion ? 'none' : 'background 300ms ease, border-color 300ms ease',
                }}
              />
              <span
                className="flex-shrink-0"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  minWidth: 34,
                  color: isActive ? layer.colors.accent : '#64748B',
                  opacity: isActive ? 1 : 0.42,
                  fontVariantNumeric: 'tabular-nums',
                  transition: reducedMotion ? 'none' : 'color 300ms ease, opacity 300ms ease',
                }}
              >
                {String(layer.id).padStart(2, '0')}
              </span>
              <span
                className="uppercase"
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.06em',
                  color: isActive ? '#F4F4F5' : 'rgba(244,244,245,0.42)',
                  transition: reducedMotion ? 'none' : 'color 300ms ease',
                }}
              >
                {layer.shortName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

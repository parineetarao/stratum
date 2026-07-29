'use client';

import { useId, useMemo, type RefObject } from 'react';
import { ibmPlexMono } from '@/lib/fonts';
import {
  ANNOTATION_BOXES,
  CONNECTORS,
  DRAFTING_LABELS,
  JOINT_POINTS,
  MOBILE_VIEWBOX_HEIGHT,
  MOBILE_VIEWBOX_WIDTH,
  TICK_X,
  TICK_Y,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  getTableDefs,
} from './warehouseBlueprintData';

interface WarehouseBlueprintProps {
  viewport: number;
  pointerActive: boolean;
  spotlightRef: RefObject<SVGRadialGradientElement>;
}

export default function WarehouseBlueprint({ viewport, pointerActive, spotlightRef }: WarehouseBlueprintProps) {
  const idBase = useId().replace(/[:]/g, '');
  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1200;
  const spotlightRadius = isTablet ? 240 : 290;

  const tableDefs = useMemo(() => getTableDefs(isMobile, isTablet), [isMobile, isTablet]);
  const mono = ibmPlexMono.style.fontFamily;

  const vbWidth = isMobile ? MOBILE_VIEWBOX_WIDTH : VIEWBOX_WIDTH;
  const vbHeight = isMobile ? MOBILE_VIEWBOX_HEIGHT : VIEWBOX_HEIGHT;
  const spotlightRadiusPct = (spotlightRadius / vbWidth) * 100;

  return (
    <svg
      viewBox={`0 0 ${vbWidth} ${vbHeight}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      <defs>
        <pattern id={`${idBase}-gridLarge`} width="96" height="96" patternUnits="userSpaceOnUse">
          <path d="M96 0H0V96" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
        </pattern>
        <pattern id={`${idBase}-gridSmall`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
        <linearGradient id={`${idBase}-activeLine`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="55%" stopColor="#4F6EF7" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={`${idBase}-headerLit`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(124,58,237,0.22)" />
          <stop offset="52%" stopColor="rgba(79,110,247,0.22)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0.2)" />
        </linearGradient>
        {!isMobile && (
          <radialGradient ref={spotlightRef} id={`${idBase}-spotlight`} cx="50%" cy="50%" r={`${spotlightRadiusPct}%`}>
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="42%" stopColor="white" stopOpacity="0.74" />
            <stop offset="78%" stopColor="white" stopOpacity="0.32" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        )}
        <radialGradient id={`${idBase}-centerAttenuation`} cx="50%" cy="52%" r="52%">
          <stop offset="0%" stopColor="black" stopOpacity="0.55" />
          <stop offset="55%" stopColor="black" stopOpacity="0.35" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${idBase}-readabilityVeil`} cx="50%" cy="52%" r="62%">
          <stop offset="0%" stopColor="black" stopOpacity="0.32" />
          <stop offset="58%" stopColor="black" stopOpacity="0.2" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        {!isMobile && (
          <mask id={`${idBase}-spotMask`}>
            <rect width={vbWidth} height={vbHeight} fill="black" />
            <rect width={vbWidth} height={vbHeight} fill={`url(#${idBase}-spotlight)`} />
          </mask>
        )}
        <filter id={`${idBase}-lineGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={vbWidth} height={vbHeight} fill="#020204" />
      <rect width={vbWidth} height={vbHeight} fill="#050508" opacity="0.35" />
      <rect width={vbWidth} height={vbHeight} fill={`url(#${idBase}-gridLarge)`} />
      <rect width={vbWidth} height={vbHeight} fill={`url(#${idBase}-gridSmall)`} />

      {!isMobile && (
        <>
          <g opacity={0.08} fill="none" stroke="white" strokeWidth="1">
            {TICK_X.map((x) => (
              <path key={`tick-x-${x}`} d={`M${x} 16V34 M${x} 866V884`} />
            ))}
            {TICK_Y.map((y) => (
              <path key={`tick-y-${y}`} d={`M16 ${y}H34 M1332 ${y}H1350`} />
            ))}
          </g>

          <g fill="rgba(255,255,255,0.07)" fontSize="10" fontFamily={mono} letterSpacing="0.12em">
            {DRAFTING_LABELS.map((label) => (
              <text key={label.text} x={label.x} y={label.y}>
                {label.text}
              </text>
            ))}
          </g>

          <g>
            {CONNECTORS.filter((c) => !c.secondary).map((c) => (
              <path key={c.id} d={c.d} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
            ))}
            {CONNECTORS.filter((c) => c.secondary).map((c) => (
              <path key={c.id} d={c.d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="5 5" />
            ))}
          </g>

          <g opacity={0.14} fill="none" stroke="white" strokeWidth="1">
            {JOINT_POINTS.map((p, i) => (
              <rect key={i} x={p.x - 2.4} y={p.y - 2.4} width="4.8" height="4.8" transform={`rotate(45 ${p.x} ${p.y})`} />
            ))}
          </g>
        </>
      )}

      <g>
        {tableDefs.map((t) => (
          <g key={t.id} transform={`translate(${t.x},${t.y})`}>
            <rect width={t.w} height={t.h} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <rect width={t.w} height="24" fill="rgba(255,255,255,0.028)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text x="8" y="16" fill="rgba(255,255,255,0.12)" fontFamily={mono} fontSize="11">
              {t.title}
            </text>
            {t.rows.map((row, i) => {
              const yy = 36 + i * 14;
              if (yy > t.h - 8) return null;
              const isPkFk = row.includes('PK') || row.includes('FK');
              return (
                <g key={row + i}>
                  <line x1="0" y1={yy - 8} x2={t.w} y2={yy - 8} stroke="rgba(255,255,255,0.08)" />
                  <text
                    x="8"
                    y={yy}
                    fill={isPkFk ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)'}
                    fontFamily={mono}
                    fontSize="9.6"
                  >
                    {row}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </g>

      {!isMobile && (
        <g mask={`url(#${idBase}-spotMask)`} style={{ opacity: pointerActive ? 1 : 0, transition: 'opacity 700ms ease' }}>
          <g>
            {tableDefs.map((t) => (
              <g key={`hl-${t.id}`} transform={`translate(${t.x},${t.y})`}>
                <rect width={t.w} height={t.h} fill="rgba(255,255,255,0.031)" stroke="rgba(255,255,255,0.44)" strokeWidth="1.1" />
                <rect width={t.w} height="24" fill={`url(#${idBase}-headerLit)`} opacity={0.78} />
                <line x1="0" y1="24" x2={t.w} y2="24" stroke="rgba(255,255,255,0.25)" />
                <text x="8" y="16" fill="rgba(255,255,255,0.47)" fontFamily={mono} fontSize="11">
                  {t.title}
                </text>
                {t.rows.map((row, i) => {
                  const yy = 36 + i * 14;
                  if (yy > t.h - 8) return null;
                  const isPkFk = row.includes('PK') || row.includes('FK');
                  return (
                    <g key={`hl-${t.id}-${i}`}>
                      <line x1="0" y1={yy - 8} x2={t.w} y2={yy - 8} stroke="rgba(255,255,255,0.28)" />
                      <text
                        x="8"
                        y={yy}
                        fill={isPkFk ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.39)'}
                        fontFamily={mono}
                        fontSize="9.8"
                      >
                        {row}
                      </text>
                    </g>
                  );
                })}
                {(t.hiddenRows || []).map((row, i) => {
                  const yy = t.h - 18 - i * 12;
                  return (
                    <text key={`hdr-${t.id}-${i}`} x="8" y={yy} fill="rgba(255,255,255,0.34)" fontFamily={mono} fontSize="8.6">
                      {row}
                    </text>
                  );
                })}
              </g>
            ))}
          </g>

          <g filter={`url(#${idBase}-lineGlow)`} opacity={0.48}>
            {CONNECTORS.map((c) => (
              <path
                key={`active-${c.id}`}
                d={c.d}
                fill="none"
                stroke={`url(#${idBase}-activeLine)`}
                strokeWidth={c.secondary ? 1 : 1.25}
                strokeDasharray={c.secondary ? '5 5' : undefined}
              />
            ))}
          </g>

          <g opacity={0.31}>
            {ANNOTATION_BOXES.map((box, i) => (
              <g key={i}>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="rgba(255,255,255,0.35)" />
                {box.lines.map((line, li) => (
                  <text
                    key={li}
                    x={box.x + 8}
                    y={box.y + 16 + li * 14}
                    fill={li === 0 ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.37)'}
                    fontSize={li === 0 ? '9' : '8.4'}
                    fontFamily={mono}
                  >
                    {line}
                  </text>
                ))}
              </g>
            ))}
          </g>

          <rect x="0" y="0" width={vbWidth} height={vbHeight} fill={`url(#${idBase}-centerAttenuation)`} />
        </g>
      )}

      {!isMobile && (
        <g mask={`url(#${idBase}-spotMask)`} style={{ opacity: pointerActive ? 1 : 0, transition: 'opacity 700ms ease' }}>
          {CONNECTORS.map((c) => (
            <path
              key={`spot-${c.id}`}
              d={c.d}
              fill="none"
              stroke="rgba(255,255,255,0.11)"
              strokeWidth={1.1}
              strokeDasharray={c.secondary ? '4 5' : undefined}
            />
          ))}
        </g>
      )}

      <rect x="0" y="0" width={vbWidth} height={vbHeight} fill={`url(#${idBase}-readabilityVeil)`} />
    </svg>
  );
}

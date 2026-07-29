'use client';

import type { CSSProperties } from 'react';
import type { StratumLayer } from './layer-data';

interface LayerPlatformProps {
  layer: StratumLayer;
  index: number;
  top: number;
  isActive: boolean;
  isDimmed: boolean;
  scale: number;
  /** Extra horizontal-only multiplier on top of `scale`. Applied on the
   * wrapper (an ancestor of the rotated faces), so it stretches the already
   *-formed diamond in screen space — widening it without touching its
   * rendered height or the vertical spacing between layers. */
  widthStretch: number;
  reducedMotion: boolean;
  onActivate: () => void;
  /** 'hover' (desktop): mouse/focus activates immediately, always non-toggling.
   * 'tap' (tablet/mobile): only click/Enter activates, since the parent
   * toggles active state — wiring hover there would activate-then-instantly
   * deactivate on the same click when a mouse/trackpad is also present. */
  activationMode: 'hover' | 'tap';
}

// Square footprint — the diamond silhouette comes entirely from the 3D
// transform below, not from an already-wide rectangle. Squashing a
// rectangle (the previous approach) is what produced long parallelogram
// "cards" instead of compact isometric tiles.
export const SQUARE_SIZE = 280;
const ROTATE_X = 58;
const ROTATE_Z = -45;
const THICKNESS_OFFSET = 20; // screen-space px the darker duplicate is nudged down by
const RADIUS = 24;

// Exported so the parent section can position the stack container, compute
// spacing, and aim the details-card connector at whichever layer is active —
// the tile's rendered center is always `top + SQUARE_SIZE / 2` regardless of
// `scale`, since CSS scale/rotate pivot around the box's own center by
// default and never move that center point.
export { SQUARE_SIZE as PLATFORM_SIZE };

export default function LayerPlatform({
  layer,
  index,
  top,
  isActive,
  isDimmed,
  scale,
  widthStretch,
  reducedMotion,
  onActivate,
  activationMode,
}: LayerPlatformProps) {
  const Icon = layer.icon;
  const activeLift = isActive ? -9 * scale : 0;
  const rotation = `rotateX(${ROTATE_X}deg) rotateZ(${ROTATE_Z}deg)`;

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    top,
    left: '50%',
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    // The box is the pre-rotation square's full bounding rect, which is
    // taller than the visible diamond and overlaps neighboring layers'
    // wrappers in raw layout terms (that's expected — spacing is tighter
    // than SQUARE_SIZE). Without this, the wrapper's own transparent
    // background — not just its children — would intercept clicks meant
    // for whatever's visually showing through underneath it.
    pointerEvents: 'none',
    transform: `translateX(-50%) scale(${scale * widthStretch}, ${scale}) translateY(${activeLift}px)`,
    transition: reducedMotion
      ? 'opacity 200ms linear'
      : 'transform 420ms cubic-bezier(0.16,1,0.3,1), opacity 380ms ease, filter 380ms ease',
    opacity: isDimmed ? 0.76 : 1,
    filter: isDimmed ? 'saturate(0.88)' : 'none',
    willChange: isActive ? 'transform' : undefined,
    zIndex: isActive ? 20 : 10 - index,
  };

  const sharedFaceStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: RADIUS,
    border: '1px solid rgba(255,255,255,0.16)',
    pointerEvents: 'none',
  };

  // The darker "thickness" duplicate sits directly behind the top face,
  // sharing the exact same rotation, nudged down in screen space (after the
  // rotation, not before it) so a slab of its color peeks out below —
  // reading as one thick platform rather than a flat sheet.
  const thicknessStyle: CSSProperties = {
    ...sharedFaceStyle,
    transform: `translateY(${THICKNESS_OFFSET}px) ${rotation}`,
    background: layer.colors.side,
  };

  const topFaceShadow = isActive
    ? '0 36px 54px rgba(0,0,0,0.52), 0 16px 26px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.15)'
    : '0 26px 34px rgba(0,0,0,0.42), 0 12px 18px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)';

  const topFaceStyle: CSSProperties = {
    ...sharedFaceStyle,
    // pointer-events is inherited, and the wrapper sets 'none' — re-enable
    // it here since this is the one element that must stay interactive.
    pointerEvents: 'auto',
    transform: rotation,
    background: `linear-gradient(135deg, ${layer.colors.top}, ${layer.colors.bottom})`,
    borderColor: isActive ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)',
    boxShadow: topFaceShadow,
    transition: reducedMotion ? 'none' : 'box-shadow 380ms ease, border-color 380ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={wrapperStyle}>
      <div style={thicknessStyle} aria-hidden="true" />
      <button
        type="button"
        aria-pressed={isActive}
        aria-label={`${layer.shortName} — layer ${String(index + 1).padStart(2, '0')}`}
        onMouseEnter={activationMode === 'hover' ? onActivate : undefined}
        onFocus={activationMode === 'hover' ? onActivate : undefined}
        onClick={onActivate}
        className="cursor-pointer border-none bg-transparent p-0"
        style={topFaceStyle}
      >
        <Icon
          size={56}
          strokeWidth={1.7}
          style={{
            color: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.84)',
            opacity: isActive ? 1 : 0.78,
            transition: reducedMotion ? 'none' : 'opacity 300ms ease, color 300ms ease',
          }}
        />
      </button>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import LayerPlatform from './LayerPlatform';
import { STRATUM_LAYERS } from './layer-data';

interface LayerStackProps {
  activeLayer: number | null;
  onActivate: (id: number) => void;
  reducedMotion: boolean;
  shifted: boolean;
  scale: number;
  widthStretch: number;
  shiftX: number;
  spacing: number;
  containerHeight: number;
  activationMode: 'hover' | 'tap';
}

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function LayerStack({
  activeLayer,
  onActivate,
  reducedMotion,
  shifted,
  scale,
  widthStretch,
  shiftX,
  spacing,
  containerHeight,
  activationMode,
}: LayerStackProps) {
  return (
    <div
      className="relative mx-auto w-full"
      style={{
        maxWidth: 300 * widthStretch,
        height: containerHeight,
        transform: `translateX(${shifted ? -shiftX : 0}px)`,
        transition: reducedMotion ? 'none' : 'transform 560ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {STRATUM_LAYERS.map((layer, i) => (
        <motion.div
          key={layer.key}
          // whileInView must stay wired to a fixed target unconditionally —
          // useReducedMotion starts false and flips true a moment after
          // mount, and if whileInView were ever pulled out (e.g. set to
          // undefined) once that flip happens before this layer has
          // scrolled into view, it would freeze at the hidden state
          // forever with nothing left to trigger it. Reduced motion is
          // handled purely by initial already matching the target (no
          // animation needed) and a zero-duration transition, matching the
          // same safe pattern used by every other entrance animation on
          // this page.
          initial={reducedMotion ? false : { opacity: 0, y: 70, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : i * 0.065, ease: easeOut }}
        >
          <LayerPlatform
            layer={layer}
            index={i}
            top={i * spacing}
            isActive={activeLayer === layer.id}
            isDimmed={activeLayer !== null && activeLayer !== layer.id}
            scale={scale}
            widthStretch={widthStretch}
            reducedMotion={reducedMotion}
            onActivate={() => onActivate(layer.id)}
            activationMode={activationMode}
          />
        </motion.div>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { EdgeVisualKind, GraphRelationship } from './graphModel';

const KIND_STYLE: Record<EdgeVisualKind, { stroke: string; dashed: boolean }> = {
  declared: { stroke: '#60a5fa', dashed: false },
  accepted: { stroke: '#a78bfa', dashed: false },
  pending: { stroke: '#a78bfa', dashed: true },
};

interface RelationshipEdgeData extends Record<string, unknown> {
  kind: EdgeVisualKind;
  item: GraphRelationship;
  dimmed?: boolean;
  highlighted?: boolean;
  revealDelayMs?: number;
  reducedMotion?: boolean;
}

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as RelationshipEdgeData;
  const { kind, dimmed, highlighted, revealDelayMs, reducedMotion } = edgeData;
  const style = KIND_STYLE[kind];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), revealDelayMs ?? 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const revealed = reducedMotion || mounted;

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const isEmphasized = selected || highlighted;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: style.stroke,
          strokeWidth: isEmphasized ? 2.25 : 1.5,
          strokeDasharray: style.dashed ? '5 4' : undefined,
          opacity: !revealed ? 0 : dimmed ? 0.15 : isEmphasized ? 1 : 0.75,
          transition: 'opacity 280ms ease, stroke-width 160ms ease',
        }}
      />
      {isEmphasized && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 5,
              background: '#0b0d12',
              border: `1px solid ${style.stroke}`,
              color: style.stroke,
              whiteSpace: 'nowrap',
            }}
          >
            {edgeData.item.from_column} &rarr; {edgeData.item.to_column}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

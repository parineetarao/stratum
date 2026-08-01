'use client';

import { BaseEdge, EdgeLabelRenderer, useInternalNode, type EdgeProps, type InternalNode, type Node } from '@xyflow/react';
import { EDGE_COLOR, type WarehouseEdgeData } from './graphModel';

/**
 * Computes the point where the straight line between two node centers
 * crosses the border of `intersectionNode`'s rectangle. Used so edges
 * connect to the visible edge of a card rather than floating from a
 * fixed handle position, keeping the layered layout's lines looking like
 * they emanate from the correct side of each box regardless of rank.
 */
function getNodeIntersection(intersectionNode: InternalNode<Node>, targetNode: InternalNode<Node>) {
  const w = (intersectionNode.measured.width ?? 0) / 2;
  const h = (intersectionNode.measured.height ?? 0) / 2;
  const x2 = intersectionNode.internals.positionAbsolute.x + w;
  const y2 = intersectionNode.internals.positionAbsolute.y + h;
  const x1 = targetNode.internals.positionAbsolute.x + (targetNode.measured.width ?? 0) / 2;
  const y1 = targetNode.internals.positionAbsolute.y + (targetNode.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const denom = Math.abs(xx1) + Math.abs(yy1) || 1;
  const a = 1 / denom;
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return {
    x: w * (xx3 + yy3) + x2,
    y: h * (-xx3 + yy3) + y2,
  };
}

export default function WarehouseEdge({ id, source, target, data, markerEnd }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const edgeData = data as unknown as WarehouseEdgeData | undefined;

  if (!sourceNode || !targetNode || !edgeData) return null;

  const sourceIntersection = getNodeIntersection(sourceNode, targetNode);
  const targetIntersection = getNodeIntersection(targetNode, sourceNode);

  const color = EDGE_COLOR[edgeData.kind];
  const path = `M ${sourceIntersection.x},${sourceIntersection.y} L ${targetIntersection.x},${targetIntersection.y}`;
  const labelX = (sourceIntersection.x + targetIntersection.x) / 2;
  const labelY = (sourceIntersection.y + targetIntersection.y) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: 1.5,
          opacity: 0.7,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            fontSize: 9.5,
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: 5,
            background: '#0b0d12',
            border: `1px solid ${color}55`,
            color,
            whiteSpace: 'nowrap',
          }}
        >
          {edgeData.fromColumn}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

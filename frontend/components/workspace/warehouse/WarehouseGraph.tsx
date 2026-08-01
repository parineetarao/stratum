'use client';

import { useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../relationships/reactFlowTheme.css';
import type { WarehouseDesignResponse } from '@/lib/api';
import WarehouseTableNode from './WarehouseTableNode';
import WarehouseEdge from './WarehouseEdge';
import { buildWarehouseLayout } from './graphModel';

const nodeTypes = { warehouseTable: WarehouseTableNode };
const edgeTypes = { warehouseEdge: WarehouseEdge };

interface WarehouseGraphProps {
  design: WarehouseDesignResponse;
}

function GraphInner({ design }: WarehouseGraphProps) {
  const { nodes, edges } = useMemo(() => buildWarehouseLayout(design), [design]);

  return (
    <ReactFlow
      className="stratum-flow"
      colorMode="dark"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.08, maxZoom: 1.1 }}
      minZoom={0.1}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(148, 163, 184, 0.1)" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  );
}

export default function WarehouseGraph(props: WarehouseGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}

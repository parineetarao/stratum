'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './reactFlowTheme.css';
import type { TableMetadata } from '@/lib/api';
import TableNode from './TableNode';
import RelationshipEdge from './RelationshipEdge';
import { buildGraphLayout, largestClusterNodeIds, type GraphRelationship, type TableNodeData } from './graphModel';

const nodeTypes = { table: TableNode };
const edgeTypes = { relationship: RelationshipEdge };

interface RelationshipGraphProps {
  tables: TableMetadata[];
  items: GraphRelationship[];
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onSelectTable: (tableName: string) => void;
  searchQuery: string;
  reducedMotion: boolean;
}

function GraphInner({
  tables,
  items,
  selectedKey,
  onSelectKey,
  onSelectTable,
  searchQuery,
  reducedMotion,
}: RelationshipGraphProps) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => buildGraphLayout(tables, items), [tables, items]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  const hasAutoFocused = useRef<string | null>(null);

  // Restricts the one-time initial `fitView` (see the `fitView` prop below) to the
  // largest connected cluster of tables, so the viewport opens centered and readable
  // instead of shrinking to fit the entire — often sparse — schema.
  const initialFitNodes = useMemo(
    () => largestClusterNodeIds(baseNodes, baseEdges).map((id) => ({ id })),
    [baseNodes, baseEdges]
  );
  const fitViewOptions = useMemo(
    () => ({ nodes: initialFitNodes, padding: 0.25, maxZoom: 1 }),
    [initialFitNodes]
  );

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const table of tables) map.set(table.table_name, new Set());
    for (const edge of baseEdges) {
      map.get(edge.source)?.add(edge.target);
      map.get(edge.target)?.add(edge.source);
    }
    return map;
  }, [tables, baseEdges]);

  const query = searchQuery.trim().toLowerCase();

  const nodes: Node[] = useMemo(
    () =>
      baseNodes.map((node, idx) => {
        const isSearchMatch = query.length > 0 && node.id.toLowerCase().includes(query);
        const highlighted = hoveredNodeId === node.id;
        const dimmed = hoveredNodeId
          ? !(node.id === hoveredNodeId || adjacency.get(hoveredNodeId)?.has(node.id))
          : query.length > 0
          ? !isSearchMatch
          : false;
        const data: TableNodeData = {
          ...(node.data as TableNodeData),
          dimmed,
          highlighted,
          isSearchMatch,
          revealDelayMs: Math.min(idx * 35, 420),
          reducedMotion,
        } as TableNodeData;
        return { ...node, data };
      }),
    [baseNodes, hoveredNodeId, adjacency, query, reducedMotion]
  );

  const nodeRevealCount = baseNodes.length;

  const edges: Edge[] = useMemo(
    () =>
      baseEdges.map((edge, idx) => {
        const isSelected = edge.id === selectedKey;
        const isHoverRelated =
          !!hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);
        const dimmed = hoveredNodeId ? !isHoverRelated : false;
        return {
          ...edge,
          selected: isSelected,
          data: {
            ...(edge.data as Record<string, unknown>),
            dimmed,
            highlighted: isSelected || isHoverRelated,
            revealDelayMs: Math.min(nodeRevealCount * 35, 420) + idx * 22,
            reducedMotion,
          },
        };
      }),
    [baseEdges, hoveredNodeId, selectedKey, nodeRevealCount, reducedMotion]
  );

  useEffect(() => {
    if (!query) return;
    const matches = tables.filter((t) => t.table_name.toLowerCase().includes(query));
    if (matches.length === 1 && hasAutoFocused.current !== matches[0].table_name) {
      hasAutoFocused.current = matches[0].table_name;
      fitView({ nodes: [{ id: matches[0].table_name }], duration: 450, padding: 0.7, maxZoom: 1.1 });
    }
  }, [query, tables, fitView]);

  const onNodeMouseEnter: NodeMouseHandler = (_, node) => setHoveredNodeId(node.id);
  const onNodeMouseLeave: NodeMouseHandler = () => setHoveredNodeId(null);
  const onEdgeClick: EdgeMouseHandler = (_, edge) => onSelectKey(edge.id === selectedKey ? null : edge.id);
  const onNodeClick: NodeMouseHandler = (_, node) => onSelectTable(node.id);
  const onPaneClick = () => onSelectKey(null);

  return (
    <ReactFlow
      className="stratum-flow"
      colorMode="dark"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={fitViewOptions}
      minZoom={0.15}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      defaultEdgeOptions={{ type: 'relationship' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(148, 163, 184, 0.14)" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  );
}

export default function RelationshipGraph(props: RelationshipGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}

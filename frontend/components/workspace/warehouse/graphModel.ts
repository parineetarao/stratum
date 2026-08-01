import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import { MarkerType, Position } from '@xyflow/react';
import type { WarehouseDesignResponse, FactTableDesign, DimensionTableDesign } from '@/lib/api';

// Dimension nodes are ~17% larger than the original baseline (260 -> 305);
// fact nodes are scaled up ~17% from their own baseline (300 -> 350) *and*
// end up ~15% larger than dimension nodes so they immediately stand out.
export const DIM_NODE_WIDTH = 305;
export const FACT_NODE_WIDTH = 350;

const DIM_HEIGHT_SCALE = 1.17;
const FACT_HEIGHT_SCALE = DIM_HEIGHT_SCALE * 1.13; // fact cards ~13% taller than dimension cards on top of the shared size bump

export type WarehouseTableKind = 'fact' | 'dimension';

export interface WarehouseNodeData extends Record<string, unknown> {
  kind: WarehouseTableKind;
  table: FactTableDesign | DimensionTableDesign;
}

export interface WarehouseEdgeData extends Record<string, unknown> {
  kind: WarehouseTableKind; // color/style follows the *source* table's kind
  fromColumn: string;
  toColumn: string | null;
}

export interface WarehouseLayout {
  nodes: Node<WarehouseNodeData>[];
  edges: Edge<WarehouseEdgeData>[];
  isFlatModel: boolean;
}

export const EDGE_COLOR: Record<WarehouseTableKind, string> = {
  fact: '#60a5fa',
  dimension: '#a78bfa',
};

function estimateNodeHeight(kind: WarehouseTableKind, table: FactTableDesign | DimensionTableDesign): number {
  const fieldCount = kind === 'fact' ? (table as FactTableDesign).measures.length : (table as DimensionTableDesign).attributes.length;
  const fkCount = table.foreign_keys.length;
  // header + optional PK row + optional FK row + field-chips row, each
  // capped so cards stay a predictable height regardless of column count.
  const base = 66 + (table.primary_key.length > 0 ? 26 : 0) + (fkCount > 0 ? 26 : 0) + (fieldCount > 0 ? 46 : 34);
  const scale = kind === 'fact' ? FACT_HEIGHT_SCALE : DIM_HEIGHT_SCALE;
  return Math.round(base * scale);
}

/**
 * Builds a deterministic, dependency-layered layout (dagre, top-to-bottom)
 * over *all* warehouse tables and *all* their foreign keys — fact->dimension,
 * dimension->dimension (snowflake), and fact->fact (large "bridge"/junction
 * tables that the classifier also scores as facts, e.g. an inventory table
 * referenced by a rental fact). Earlier code only resolved fact->dimension
 * edges via a dimension-only lookup, silently dropping any edge whose target
 * had been classified as a fact — this version resolves every edge against
 * the full set of warehouse tables so nothing is dropped.
 */
export function buildWarehouseLayout(design: WarehouseDesignResponse): WarehouseLayout {
  const facts = design.fact_tables;
  const dims = design.dimension_tables;

  const nodes: Node<WarehouseNodeData>[] = [];
  const edges: Edge<WarehouseEdgeData>[] = [];

  if (facts.length + dims.length <= 1) {
    const only = facts[0] ?? dims[0];
    if (only) {
      nodes.push({
        id: only.warehouse_table,
        type: 'warehouseTable',
        position: { x: 0, y: 0 },
        data: { kind: facts[0] ? 'fact' : 'dimension', table: only },
        draggable: false,
        selectable: false,
      });
    }
    return { nodes, edges, isFlatModel: true };
  }

  type Entry = { kind: WarehouseTableKind; table: FactTableDesign | DimensionTableDesign };
  const allByName = new Map<string, Entry>();
  for (const f of facts) allByName.set(f.warehouse_table, { kind: 'fact', table: f });
  for (const d of dims) allByName.set(d.warehouse_table, { kind: 'dimension', table: d });

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    // Scaled up alongside the larger node dimensions so bigger cards keep
    // the same visual breathing room and never overlap.
    nodesep: 66,
    ranksep: 106,
    edgesep: 19,
    marginx: 28,
    marginy: 28,
    ranker: 'longest-path',
  });

  for (const [name, entry] of Array.from(allByName)) {
    const width = entry.kind === 'fact' ? FACT_NODE_WIDTH : DIM_NODE_WIDTH;
    g.setNode(name, { width, height: estimateNodeHeight(entry.kind, entry.table) });
  }

  const seenEdgeIds = new Set<string>();
  for (const [name, entry] of Array.from(allByName)) {
    for (const fk of entry.table.foreign_keys) {
      const target = allByName.get(fk.references_warehouse_table);
      if (!target || fk.references_warehouse_table === name) continue;
      const id = `${name}__${fk.references_warehouse_table}__${fk.column_name}`;
      if (seenEdgeIds.has(id)) continue;
      seenEdgeIds.add(id);
      g.setEdge(name, fk.references_warehouse_table);
      edges.push({
        id,
        source: name,
        target: fk.references_warehouse_table,
        sourceHandle: 'a',
        targetHandle: 'b',
        type: 'warehouseEdge',
        selectable: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR[entry.kind], width: 16, height: 16 },
        data: { kind: entry.kind, fromColumn: fk.column_name, toColumn: fk.references_column },
      });
    }
  }

  dagre.layout(g);

  for (const [name, entry] of Array.from(allByName)) {
    const pos = g.node(name);
    const width = entry.kind === 'fact' ? FACT_NODE_WIDTH : DIM_NODE_WIDTH;
    const height = estimateNodeHeight(entry.kind, entry.table);
    nodes.push({
      id: name,
      type: 'warehouseTable',
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
      data: { kind: entry.kind, table: entry.table },
      draggable: false,
      selectable: false,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  }

  return { nodes, edges, isFlatModel: false };
}

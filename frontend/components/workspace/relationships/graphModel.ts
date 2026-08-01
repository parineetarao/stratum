import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type { RelationshipResponse, RelationshipStatus, ConfidenceTier, TableMetadata } from '@/lib/api';

export const NODE_WIDTH = 260;
export const MAX_VISIBLE_COLUMNS = 6;
export const ROW_HEIGHT = 26;
export const HEADER_HEIGHT = 74;
export const FOOTER_HEIGHT = 24;

export type RelationshipKind = 'declared' | 'inferred';
export type EdgeVisualKind = 'declared' | 'accepted' | 'pending';

export interface GraphRelationship {
  key: string;
  kind: RelationshipKind;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  status: RelationshipStatus | 'declared';
  confidence_score: number;
  confidence_tier: ConfidenceTier | 'declared';
  explanation: RelationshipResponse['explanation'] | null;
  inferredId?: number;
}

export function relationshipKey(fromTable: string, fromColumn: string, toTable: string, toColumn: string): string {
  return `${fromTable}.${fromColumn}->${toTable}.${toColumn}`;
}

export function edgeVisualKind(item: GraphRelationship): EdgeVisualKind | null {
  if (item.kind === 'declared') return 'declared';
  if (item.status === 'accepted' || item.status === 'auto_accepted') return 'accepted';
  if (item.status === 'pending') return 'pending';
  return null;
}

/** Merges declared FKs (from the source schema) with backend-inferred relationships into one list. */
export function buildRelationshipItems(
  tables: TableMetadata[],
  relationships: RelationshipResponse[]
): GraphRelationship[] {
  const items: GraphRelationship[] = [];
  const declaredKeys = new Set<string>();

  for (const table of tables) {
    for (const column of table.columns) {
      if (!column.foreign_key) continue;
      const key = relationshipKey(
        table.table_name,
        column.name,
        column.foreign_key.referenced_table,
        column.foreign_key.referenced_column
      );
      if (declaredKeys.has(key)) continue;
      declaredKeys.add(key);
      items.push({
        key,
        kind: 'declared',
        from_table: table.table_name,
        from_column: column.name,
        to_table: column.foreign_key.referenced_table,
        to_column: column.foreign_key.referenced_column,
        status: 'declared',
        confidence_score: 100,
        confidence_tier: 'declared',
        explanation: null,
      });
    }
  }

  for (const rel of relationships) {
    const key = relationshipKey(rel.from_table, rel.from_column, rel.to_table, rel.to_column);
    if (declaredKeys.has(key)) continue;
    items.push({
      key,
      kind: 'inferred',
      from_table: rel.from_table,
      from_column: rel.from_column,
      to_table: rel.to_table,
      to_column: rel.to_column,
      status: rel.status,
      confidence_score: rel.confidence_score,
      confidence_tier: rel.confidence_tier,
      explanation: rel.explanation,
      inferredId: rel.id,
    });
  }

  return items;
}

export interface TableNodeData extends Record<string, unknown> {
  table: TableMetadata;
  connectedColumns: Set<string>;
  dimmed?: boolean;
  highlighted?: boolean;
  isSearchMatch?: boolean;
  revealDelayMs?: number;
  reducedMotion?: boolean;
}

export function nodeHeight(table: TableMetadata): number {
  const visible = Math.min(table.columns.length, MAX_VISIBLE_COLUMNS);
  const hasMore = table.columns.length > MAX_VISIBLE_COLUMNS;
  return HEADER_HEIGHT + visible * ROW_HEIGHT + (hasMore ? FOOTER_HEIGHT : 0) + 12;
}

/** Orders columns so primary/foreign keys — and anything referenced by a relationship edge — land in the visible (non-collapsed) slice. */
export function orderedColumns(table: TableMetadata, connectedColumns?: Set<string>) {
  return [...table.columns].sort((a, b) => {
    const weight = (c: typeof a) => {
      if (c.is_primary_key) return 0;
      if (c.foreign_key) return 1;
      if (connectedColumns?.has(c.name)) return 1;
      return 2;
    };
    return weight(a) - weight(b);
  });
}

export function buildGraphLayout(
  tables: TableMetadata[],
  items: GraphRelationship[]
): { nodes: Node<TableNodeData>[]; edges: Edge[] } {
  const connectedColumnsByTable = new Map<string, Set<string>>();
  for (const table of tables) connectedColumnsByTable.set(table.table_name, new Set());
  for (const item of items) {
    connectedColumnsByTable.get(item.from_table)?.add(item.from_column);
    connectedColumnsByTable.get(item.to_table)?.add(item.to_column);
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 36,
    ranksep: 56,
    edgesep: 10,
    marginx: 20,
    marginy: 20,
    ranker: 'tight-tree',
  });

  for (const table of tables) {
    g.setNode(table.table_name, { width: NODE_WIDTH, height: nodeHeight(table) });
  }
  for (const item of items) {
    if (item.from_table === item.to_table) continue;
    g.setEdge(item.from_table, item.to_table);
  }

  dagre.layout(g);

  const nodes: Node<TableNodeData>[] = tables.map((table) => {
    const pos = g.node(table.table_name);
    const h = nodeHeight(table);
    return {
      id: table.table_name,
      type: 'table',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - h / 2 },
      data: { table, connectedColumns: connectedColumnsByTable.get(table.table_name) ?? new Set() },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const edges: Edge[] = items
    .map((item) => {
      const kind = edgeVisualKind(item);
      if (!kind) return null;
      const edge: Edge = {
        id: item.key,
        source: item.from_table,
        target: item.to_table,
        sourceHandle: `${item.from_column}__source`,
        targetHandle: `${item.to_column}__target`,
        type: 'relationship',
        data: { kind, item },
      };
      return edge;
    })
    .filter((e): e is Edge => e !== null);

  return { nodes, edges };
}

/**
 * Finds the largest connected component of tables (by declared/inferred relationship
 * edges) and returns its node ids. Falls back to every node id when there are no edges
 * at all (e.g. an all-isolated CSV schema). The result is meant to be handed to
 * ReactFlow's own `fitView({ nodes })` so the library computes the correct pan/zoom
 * transform itself, rather than us re-deriving viewport math by hand.
 */
export function largestClusterNodeIds(nodes: Node<TableNodeData>[], edges: Edge[]): string[] {
  if (nodes.length === 0) return [];

  const parent = new Map<string, string>();
  for (const node of nodes) parent.set(node.id, node.id);

  function find(id: string): string {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    let cur = id;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur) as string;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const edge of edges) {
    if (parent.has(edge.source) && parent.has(edge.target)) union(edge.source, edge.target);
  }

  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    const root = find(node.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(node.id);
  }

  let largest: string[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length > largest.length) largest = group;
  }

  return largest.length > 1 ? largest : nodes.map((n) => n.id);
}

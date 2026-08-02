'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Table2, Search, Layers, Boxes, Loader2 } from 'lucide-react';
import {
  getMetadataCatalog,
  getCatalogTableDetail,
  getWarehouseDesign,
  extractErrorMessage,
  type CatalogOverview,
  type TableDetail,
  type WarehouseDesignResponse,
} from '@/lib/api';
import type { SqlEnvironment } from '@/lib/api';

interface SchemaBrowserPanelProps {
  projectId: number;
  environment: SqlEnvironment;
  refreshToken: number;
  onInsertTable: (tableName: string) => void;
  onInsertColumn: (tableName: string, columnName: string) => void;
}

interface WarehouseTableNode {
  warehouseTable: string;
  columns: { name: string; type: string }[];
  rowCount: number;
}

export default function SchemaBrowserPanel({
  projectId,
  environment,
  refreshToken,
  onInsertTable,
  onInsertColumn,
}: SchemaBrowserPanelProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogOverview | null>(null);
  const [warehouse, setWarehouse] = useState<WarehouseDesignResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tableDetails, setTableDetails] = useState<Record<string, TableDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        if (environment === 'warehouse') {
          const data = await getWarehouseDesign(projectId);
          if (!cancelled) setWarehouse(data);
        } else {
          const data = await getMetadataCatalog(projectId);
          if (!cancelled) setCatalog(data);
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err, 'Failed to load schema.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, environment, refreshToken]);

  async function toggleTable(tableName: string) {
    const key = tableName;
    const willExpand = !expanded[key];
    setExpanded((prev) => ({ ...prev, [key]: willExpand }));

    if (environment === 'source' && willExpand && !tableDetails[key]) {
      setDetailLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const detail = await getCatalogTableDetail(projectId, tableName);
        setTableDetails((prev) => ({ ...prev, [key]: detail }));
      } catch {
        // best-effort — leave collapsed content empty on failure
      } finally {
        setDetailLoading((prev) => ({ ...prev, [key]: false }));
      }
    }
  }

  const filteredSourceTables = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    if (!q) return catalog.tables;
    return catalog.tables.filter((t) => {
      if (t.table_name.toLowerCase().includes(q)) return true;
      const detail = tableDetails[t.table_name];
      return detail?.columns.some((c) => c.name.toLowerCase().includes(q)) ?? false;
    });
  }, [catalog, search, tableDetails]);

  const warehouseNodes = useMemo(() => {
    if (!warehouse) return { facts: [], dimensions: [] as WarehouseTableNode[] };
    const toNode = (t: { warehouse_table: string; row_count: number; measures?: { column_name: string; data_type: string }[]; dimensions?: { column_name: string; data_type: string }[]; attributes?: { column_name: string; data_type: string }[] }): WarehouseTableNode => ({
      warehouseTable: t.warehouse_table,
      rowCount: t.row_count,
      columns: [
        ...(t.measures ?? []).map((m) => ({ name: m.column_name, type: m.data_type })),
        ...(t.dimensions ?? []).map((d) => ({ name: d.column_name, type: d.data_type })),
        ...(t.attributes ?? []).map((a) => ({ name: a.column_name, type: a.data_type })),
      ],
    });
    const q = search.trim().toLowerCase();
    const matches = (node: WarehouseTableNode) =>
      !q || node.warehouseTable.toLowerCase().includes(q) || node.columns.some((c) => c.name.toLowerCase().includes(q));

    return {
      facts: warehouse.fact_tables.map(toNode).filter(matches),
      dimensions: warehouse.dimension_tables.map(toNode).filter(matches),
    };
  }, [warehouse, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '12px 12px 8px' }}>
        <h2 style={{ fontSize: 12.5, fontWeight: 650, color: '#f5f5f7', marginBottom: 10 }}>Schema Browser</h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: '0 8px',
            borderRadius: 7,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: '#05070a',
          }}
        >
          <Search size={13} style={{ color: 'rgba(226,232,240,0.4)', flexShrink: 0 }} aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables and columns..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: 12.5,
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 6px 12px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px', color: 'rgba(226,232,240,0.5)', fontSize: 12.5 }}>
            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Loading schema...
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '10px 8px', fontSize: 12, color: '#fca5a5' }}>{error}</div>
        )}

        {!loading && !error && environment === 'source' && (
          <>
            {filteredSourceTables.length === 0 && (
              <p style={{ padding: '10px 8px', fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>
                No tables found. Run schema discovery first.
              </p>
            )}
            {filteredSourceTables.map((table) => {
              const isOpen = !!expanded[table.table_name];
              const detail = tableDetails[table.table_name];
              return (
                <div key={table.table_name}>
                  <button
                    type="button"
                    onClick={() => toggleTable(table.table_name)}
                    style={treeRowStyle}
                    title={`${table.table_name} — ${table.row_count.toLocaleString()} rows`}
                  >
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <Table2 size={13} style={{ color: '#8b7dff', flexShrink: 0 }} aria-hidden="true" />
                    <span style={treeLabelStyle}>{table.table_name}</span>
                    <span style={treeMetaStyle}>{table.row_count.toLocaleString()}</span>
                  </button>
                  {isOpen && (
                    <div style={{ paddingLeft: 26 }}>
                      {detailLoading[table.table_name] && (
                        <div style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.4)', padding: '3px 6px' }}>Loading columns...</div>
                      )}
                      {detail?.columns.map((col) => (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => onInsertColumn(table.table_name, col.name)}
                          style={columnRowStyle}
                          title={`Insert ${table.table_name}.${col.name}`}
                        >
                          <span style={{ color: '#f5f5f7' }}>{col.name}</span>
                          <span style={treeMetaStyle}>{col.type}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onInsertTable(table.table_name)}
                        style={{ ...columnRowStyle, color: '#a78bfa' }}
                      >
                        Insert SELECT * FROM {table.table_name}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {!loading && !error && environment === 'warehouse' && (
          <>
            <SchemaGroup
              icon={<Layers size={12.5} style={{ color: '#5c9dff' }} aria-hidden="true" />}
              label="Fact Tables"
              nodes={warehouseNodes.facts}
              expanded={expanded}
              onToggle={toggleTable}
              onInsertTable={onInsertTable}
              onInsertColumn={onInsertColumn}
            />
            <SchemaGroup
              icon={<Boxes size={12.5} style={{ color: '#f4b26b' }} aria-hidden="true" />}
              label="Dimension Tables"
              nodes={warehouseNodes.dimensions}
              expanded={expanded}
              onToggle={toggleTable}
              onInsertTable={onInsertTable}
              onInsertColumn={onInsertColumn}
            />
            {warehouseNodes.facts.length === 0 && warehouseNodes.dimensions.length === 0 && (
              <p style={{ padding: '10px 8px', fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>
                No warehouse design found. Generate one in the Warehouse module first.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SchemaGroup({
  icon,
  label,
  nodes,
  expanded,
  onToggle,
  onInsertTable,
  onInsertColumn,
}: {
  icon: React.ReactNode;
  label: string;
  nodes: WarehouseTableNode[];
  expanded: Record<string, boolean>;
  onToggle: (name: string) => void;
  onInsertTable: (name: string) => void;
  onInsertColumn: (table: string, col: string) => void;
}) {
  if (nodes.length === 0) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          fontSize: 11,
          fontWeight: 650,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: 'rgba(226,232,240,0.5)',
        }}
      >
        {icon}
        {label}
      </div>
      {nodes.map((node) => {
        const isOpen = !!expanded[node.warehouseTable];
        return (
          <div key={node.warehouseTable}>
            <button type="button" onClick={() => onToggle(node.warehouseTable)} style={treeRowStyle}>
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Table2 size={13} style={{ color: '#8b7dff', flexShrink: 0 }} aria-hidden="true" />
              <span style={treeLabelStyle}>{node.warehouseTable}</span>
              <span style={treeMetaStyle}>{node.rowCount.toLocaleString()}</span>
            </button>
            {isOpen && (
              <div style={{ paddingLeft: 26 }}>
                {node.columns.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => onInsertColumn(node.warehouseTable, col.name)}
                    style={columnRowStyle}
                  >
                    <span style={{ color: '#f5f5f7' }}>{col.name}</span>
                    <span style={treeMetaStyle}>{col.type}</span>
                  </button>
                ))}
                <button type="button" onClick={() => onInsertTable(node.warehouseTable)} style={{ ...columnRowStyle, color: '#a78bfa' }}>
                  Insert SELECT * FROM {node.warehouseTable}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const treeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  padding: '5px 8px',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  color: 'rgba(226,232,240,0.4)',
  textAlign: 'left',
};

const treeLabelStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 12.5,
  color: '#e2e8f0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const treeMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(226,232,240,0.35)',
  flexShrink: 0,
};

const columnRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '4px 8px',
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  textAlign: 'left',
};

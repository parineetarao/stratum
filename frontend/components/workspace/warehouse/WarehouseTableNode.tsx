'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hash, Key, Link2, Table2 } from 'lucide-react';
import { formatCount } from '@/lib/formatCount';
import { DIM_NODE_WIDTH, FACT_NODE_WIDTH, type WarehouseNodeData } from './graphModel';
import type { FactTableDesign, DimensionTableDesign } from '@/lib/api';

const invisibleHandleStyle: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  border: 'none',
  background: 'transparent',
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        color,
        background: `${color}1a`,
        border: `1px solid ${color}33`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function WarehouseTableNodeImpl({ data }: NodeProps) {
  const { kind, table } = data as unknown as WarehouseNodeData;
  const isFact = kind === 'fact';
  const accent = isFact ? '#60a5fa' : '#a78bfa';
  const width = isFact ? FACT_NODE_WIDTH : DIM_NODE_WIDTH;

  const fact = isFact ? (table as FactTableDesign) : null;
  const dim = !isFact ? (table as DimensionTableDesign) : null;
  const fields = fact ? fact.measures.map((m) => m.column_name) : dim ? dim.attributes.map((a) => a.column_name) : [];

  return (
    <div
      style={{
        width,
        borderRadius: 13,
        border: `1.5px solid ${accent}`,
        background: isFact ? 'linear-gradient(180deg, rgba(96,165,250,0.1) 0%, #05070a 40%)' : 'linear-gradient(180deg, rgba(167,139,250,0.1) 0%, #05070a 40%)',
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22`,
      }}
    >
      <Handle type="source" id="a" position={Position.Bottom} style={invisibleHandleStyle} isConnectable={false} />
      <Handle type="target" id="b" position={Position.Top} style={invisibleHandleStyle} isConnectable={false} />

      <div style={{ padding: '12px 15px', borderBottom: `1px solid ${accent}2a` }}>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
            <Table2 size={isFact ? 17 : 16} style={{ color: accent, flexShrink: 0 }} aria-hidden="true" />
            <span
              style={{
                fontSize: isFact ? 16.5 : 15.5,
                fontWeight: 700,
                color: '#f5f5f7',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={table.warehouse_table}
            >
              {table.warehouse_table}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: isFact ? '#0b1220' : '#170f2b',
              background: accent,
              borderRadius: 6,
              padding: '2.5px 7px',
              flexShrink: 0,
            }}
          >
            {isFact ? 'FACT' : 'DIM'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)', marginTop: 5 }}>
          {formatCount(table.row_count)} rows
          {fact ? ` · Score ${Math.round(fact.fact_score)}/100` : ''}
        </div>
      </div>

      {table.primary_key.length > 0 && (
        <div className="flex items-center" style={{ gap: 7, padding: '7px 15px', flexWrap: 'wrap' }}>
          <Key size={13} style={{ color: '#facc15', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 500 }}>
            {table.primary_key.length > 1 ? `${table.primary_key.join(', ')} (composite)` : table.primary_key[0]}
          </span>
        </div>
      )}

      {table.foreign_keys.length > 0 && (
        <div className="flex items-center" style={{ gap: 7, padding: '5px 15px 7px', flexWrap: 'wrap' }}>
          <Link2 size={13} style={{ color: '#60a5fa', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.55)' }}>
            {table.foreign_keys.length} FK{table.foreign_keys.length === 1 ? '' : 's'}: {table.foreign_keys.map((fk) => fk.column_name).join(', ')}
          </span>
        </div>
      )}

      {fields.length > 0 ? (
        <div className="flex flex-wrap" style={{ gap: 6, padding: '7px 15px 14px' }}>
          {fields.slice(0, 4).map((f) => (
            <Chip key={f} label={f} color={accent} />
          ))}
          {fields.length > 4 && (
            <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', alignSelf: 'center' }}>+{fields.length - 4}</span>
          )}
        </div>
      ) : (
        <div style={{ padding: '2px 15px 12px' }}>
          <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.35)' }} className="flex items-center">
            <Hash size={11} style={{ marginRight: 6 }} aria-hidden="true" />
            No {isFact ? 'measures' : 'attributes'} detected
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(WarehouseTableNodeImpl);

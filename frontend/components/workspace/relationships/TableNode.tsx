'use client';

import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, Key, Link2, Table2 } from 'lucide-react';
import { formatCount } from '@/lib/formatCount';
import {
  MAX_VISIBLE_COLUMNS,
  NODE_WIDTH,
  orderedColumns,
  type TableNodeData,
} from './graphModel';

const handleStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  background: 'rgba(148, 163, 184, 0.4)',
  border: 'none',
  borderRadius: '50%',
};

function TableNodeImpl({ data, selected }: NodeProps) {
  const { table, connectedColumns, dimmed, highlighted, isSearchMatch, revealDelayMs, reducedMotion } =
    data as unknown as TableNodeData;
  const columns = orderedColumns(table, connectedColumns);
  const visibleColumns = columns.slice(0, MAX_VISIBLE_COLUMNS);
  const hiddenCount = columns.length - visibleColumns.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const revealed = reducedMotion || mounted;
  const baseOpacity = dimmed ? 0.32 : 1;

  return (
    <div
      style={{
        width: NODE_WIDTH,
        borderRadius: 10,
        border: `1px solid ${
          isSearchMatch || highlighted || selected ? 'rgba(139, 92, 246, 0.55)' : 'rgba(148, 163, 184, 0.18)'
        }`,
        background: '#05070a',
        boxShadow: highlighted || selected || isSearchMatch ? '0 0 0 1px rgba(139, 92, 246, 0.3), 0 8px 24px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.25)',
        opacity: revealed ? baseOpacity : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(6px)',
        transitionProperty: 'opacity, transform, border-color, box-shadow',
        transitionDuration: '320ms, 320ms, 160ms, 160ms',
        transitionTimingFunction: 'ease',
        transitionDelay: mounted ? '0ms' : `${revealDelayMs ?? 0}ms`,
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 7, minWidth: 0 }}>
            <Table2 size={14} style={{ color: '#a78bfa', flexShrink: 0 }} aria-hidden="true" />
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: '#f5f5f7',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={table.table_name}
            >
              {table.table_name}
            </span>
          </div>
          <CheckCircle2 size={14} style={{ color: '#34d399', flexShrink: 0 }} aria-hidden="true" />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.45)', marginTop: 4 }}>
          {formatCount(table.row_count)} rows &middot; {table.column_count} columns
        </div>
      </div>

      <div>
        {visibleColumns.map((col) => {
          const isConnected = connectedColumns.has(col.name);
          return (
            <div
              key={col.name}
              className="flex items-center justify-between"
              style={{
                position: 'relative',
                padding: '5px 12px',
                fontSize: 12,
                borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
              }}
            >
              {isConnected && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${col.name}__target`}
                  style={{ ...handleStyle, left: -4 }}
                />
              )}
              <div className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
                {col.is_primary_key ? (
                  <Key size={11} style={{ color: '#facc15', flexShrink: 0 }} aria-hidden="true" />
                ) : col.foreign_key ? (
                  <Link2 size={11} style={{ color: '#60a5fa', flexShrink: 0 }} aria-hidden="true" />
                ) : (
                  <span style={{ width: 11, flexShrink: 0 }} />
                )}
                <span
                  style={{
                    color: '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={col.name}
                >
                  {col.name}
                </span>
              </div>
              <span style={{ color: 'rgba(226, 232, 240, 0.35)', fontSize: 10.5, flexShrink: 0, marginLeft: 8 }}>
                {col.type}
              </span>
              {isConnected && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${col.name}__source`}
                  style={{ ...handleStyle, right: -4 }}
                />
              )}
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div style={{ padding: '6px 12px', fontSize: 11, color: 'rgba(226, 232, 240, 0.4)' }}>
            + {hiddenCount} more column{hiddenCount === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TableNodeImpl);

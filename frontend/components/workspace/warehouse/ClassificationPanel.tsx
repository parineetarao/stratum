'use client';

import { useRef, useState } from 'react';
import { Layers, RefreshCw, Star, Table2 } from 'lucide-react';
import type { WarehouseDesignResponse, WarehouseClassification } from '@/lib/api';
import { formatCount } from '@/lib/formatCount';
import DisabledInDemo from '@/components/workspace/demoGuard';

function actionButtonStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 34,
    padding: '0 12px',
    borderRadius: 8,
    border: primary ? 'none' : '1px solid rgba(148, 163, 184, 0.24)',
    background: primary
      ? 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)'
      : 'rgba(148, 163, 184, 0.06)',
    color: primary ? '#fff' : '#f4f4f5',
    fontSize: 12.5,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    width: '100%',
  };
}

function OverrideMenu({
  tableName,
  currentKind,
  onOverride,
  disabled,
}: {
  tableName: string;
  currentKind: 'fact' | 'dimension';
  onOverride: (tableName: string, classification: WarehouseClassification) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: '#a78bfa',
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.24)',
          borderRadius: 6,
          padding: '4px 9px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        Override
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 0,
            zIndex: 20,
            minWidth: 168,
            borderRadius: 9,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: '#0b0d12',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            padding: 5,
          }}
        >
          {(['fact', 'dimension'] as const).map((option) => (
            <DisabledInDemo key={option}>
              <button
                type="button"
                disabled={option === currentKind}
                onClick={() => {
                  setOpen(false);
                  onOverride(tableName, option);
                }}
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 12.5,
                  color: option === currentKind ? 'rgba(226,232,240,0.35)' : '#f4f4f5',
                  cursor: option === currentKind ? 'not-allowed' : 'pointer',
                }}
              >
                Reclassify as {option === 'fact' ? 'Fact Table' : 'Dimension Table'}
              </button>
            </DisabledInDemo>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10.5,
        color: '#e2e8f0',
        background: 'rgba(148, 163, 184, 0.1)',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export default function ClassificationPanel({
  design,
  onOverride,
  onReclassify,
  isReclassifying,
  isOverriding,
}: {
  design: WarehouseDesignResponse;
  onOverride: (tableName: string, classification: WarehouseClassification) => void;
  onReclassify: () => void;
  isReclassifying: boolean;
  isOverriding: boolean;
}) {
  const isFlat = design.fact_count + design.dimension_count === 1;
  const badgeLabel = isFlat ? 'Flat Analytical Model' : design.schema_type === 'snowflake' ? 'Snowflake Schema' : 'Star Schema';

  return (
    <div className="flex flex-col" style={{ gap: 16, height: '100%', overflowY: 'auto' }}>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 650,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: 'rgba(226, 232, 240, 0.45)',
            marginBottom: 10,
          }}
        >
          Schema Classification
        </div>
        <div
          className="flex items-center"
          style={{
            gap: 7,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(139, 92, 246, 0.3)',
            background: 'rgba(139, 92, 246, 0.1)',
            width: 'fit-content',
          }}
        >
          {isFlat ? (
            <Layers size={13} style={{ color: '#a78bfa' }} aria-hidden="true" />
          ) : (
            <Star size={13} style={{ color: '#a78bfa' }} aria-hidden="true" />
          )}
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e0d4ff' }}>{badgeLabel}</span>
        </div>
      </div>

      <div>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 10 }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 650, color: '#60a5fa' }}>
            FACT TABLES ({design.fact_count})
          </span>
        </div>
        <div className="flex flex-col" style={{ gap: 10 }}>
          {design.fact_tables.map((ft) => (
            <div
              key={ft.warehouse_table}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(96, 165, 250, 0.22)',
                background: '#05070a',
                padding: '12px 13px',
              }}
            >
              <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 6 }}>
                <div className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
                  <Table2 size={13} style={{ color: '#60a5fa', flexShrink: 0 }} aria-hidden="true" />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#f5f5f7',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={ft.warehouse_table}
                  >
                    {ft.warehouse_table}
                  </span>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>
                  Rows: <strong style={{ color: '#e2e8f0' }}>{formatCount(ft.row_count)}</strong>
                </span>
                <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>
                  Fact Score:{' '}
                  <strong style={{ color: ft.fact_score >= 70 ? '#34d399' : '#facc15' }}>
                    {Math.round(ft.fact_score)}/100
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap" style={{ gap: 5, marginBottom: 10 }}>
                {ft.measures.slice(0, 4).map((m) => (
                  <Chip key={m.column_name} label={m.column_name} />
                ))}
                {ft.measures.length > 4 && <Chip label={`+${ft.measures.length - 4}`} />}
              </div>
              <OverrideMenu
                tableName={ft.source_table}
                currentKind="fact"
                onOverride={onOverride}
                disabled={isOverriding}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 10 }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 650, color: '#a78bfa' }}>
            DIMENSION TABLES ({design.dimension_count})
          </span>
        </div>
        <div className="flex flex-col" style={{ gap: 10 }}>
          {design.dimension_tables.map((dt) => (
            <div
              key={dt.warehouse_table}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(139, 92, 246, 0.22)',
                background: '#05070a',
                padding: '12px 13px',
              }}
            >
              <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 6 }}>
                <div className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
                  <Table2 size={13} style={{ color: '#a78bfa', flexShrink: 0 }} aria-hidden="true" />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#f5f5f7',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={dt.warehouse_table}
                  >
                    {dt.warehouse_table}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>
                  Rows: <strong style={{ color: '#e2e8f0' }}>{formatCount(dt.row_count)}</strong>
                </span>
              </div>
              <div className="flex flex-wrap" style={{ gap: 5, marginBottom: 10 }}>
                {dt.attributes.slice(0, 4).map((a) => (
                  <Chip key={a.column_name} label={a.column_name} />
                ))}
                {dt.attributes.length > 4 && <Chip label={`+${dt.attributes.length - 4}`} />}
              </div>
              <OverrideMenu
                tableName={dt.source_table}
                currentKind="dimension"
                onOverride={onOverride}
                disabled={isOverriding}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 6 }}>
        <DisabledInDemo>
          <button type="button" onClick={onReclassify} disabled={isReclassifying} style={actionButtonStyle(isReclassifying)}>
            <RefreshCw size={13} className={isReclassifying ? 'animate-spin' : ''} aria-hidden="true" />
            Reclassify Schema
          </button>
        </DisabledInDemo>
      </div>
    </div>
  );
}

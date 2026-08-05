'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  DollarSign,
  Info,
  LayoutGrid,
  Loader2,
  LucideIcon,
  Package,
  RotateCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import DisabledInDemo from '@/components/workspace/demoGuard';

export type KpiCategoryFilter =
  | 'All'
  | 'Revenue'
  | 'Customers'
  | 'Volume'
  | 'Inventory'
  | 'Quality';

interface KpiHeaderControlsProps {
  analysisMode: 'source' | 'warehouse';
  onModeChange: (mode: 'source' | 'warehouse') => void;
  isWarehouseAvailable: boolean;
  activeCategory: KpiCategoryFilter;
  onCategoryChange: (cat: KpiCategoryFilter) => void;
  onRegenerate: () => Promise<void>;
  onBulkApproveHighConfidence: () => Promise<void>;
  isRegenerating: boolean;
  isBulkApproving: boolean;
  highConfidenceCount: number;
}

export default function KpiHeaderControls({
  analysisMode,
  onModeChange,
  isWarehouseAvailable,
  activeCategory,
  onCategoryChange,
  onRegenerate,
  onBulkApproveHighConfidence,
  isRegenerating,
  isBulkApproving,
  highConfidenceCount,
}: KpiHeaderControlsProps) {
  const [showModeTooltip, setShowModeTooltip] = useState(false);

  const categories: { id: KpiCategoryFilter; label: string; icon: LucideIcon }[] = [
    { id: 'All', label: 'All', icon: LayoutGrid },
    { id: 'Revenue', label: 'Revenue', icon: DollarSign },
    { id: 'Customers', label: 'Customers', icon: Users },
    { id: 'Volume', label: 'Volume', icon: Activity },
    { id: 'Inventory', label: 'Inventory', icon: Package },
    { id: 'Quality', label: 'Quality', icon: ShieldCheck },
  ];

  return (
    <div
      className="flex flex-col md:flex-row items-stretch md:items-center justify-between"
      style={{
        gap: 16,
        marginBottom: 24,
        background: '#05080f',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        borderRadius: 12,
        padding: '12px 16px',
      }}
    >
      {/* Left: Analysis Mode */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>
            Analysis Mode
          </span>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onMouseEnter={() => setShowModeTooltip(true)}
              onMouseLeave={() => setShowModeTooltip(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'rgba(226, 232, 240, 0.4)',
                cursor: 'pointer',
                display: 'inline-flex',
              }}
              title="Execution environment context"
            >
              <Info size={14} aria-hidden="true" />
            </button>
            {showModeTooltip && (
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  left: 0,
                  width: 260,
                  zIndex: 50,
                  padding: 10,
                  borderRadius: 8,
                  background: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  fontSize: 12,
                  color: 'rgba(226, 232, 240, 0.85)',
                  lineHeight: 1.4,
                }}
              >
                Choose whether KPIs run directly against the connected source database or the DuckDB analytical sandbox.
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            padding: 3,
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.14)',
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange('source')}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 6,
              border: 'none',
              background:
                analysisMode === 'source'
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : 'transparent',
              color: analysisMode === 'source' ? '#ffffff' : 'rgba(226, 232, 240, 0.65)',
              fontSize: 12.5,
              fontWeight: analysisMode === 'source' ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Source Database
          </button>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              disabled={!isWarehouseAvailable}
              onClick={() => isWarehouseAvailable && onModeChange('warehouse')}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 6,
                border: 'none',
                background:
                  analysisMode === 'warehouse'
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'transparent',
                color:
                  analysisMode === 'warehouse'
                    ? '#ffffff'
                    : !isWarehouseAvailable
                    ? 'rgba(226, 232, 240, 0.3)'
                    : 'rgba(226, 232, 240, 0.65)',
                fontSize: 12.5,
                fontWeight: analysisMode === 'warehouse' ? 600 : 500,
                cursor: !isWarehouseAvailable ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title={
                !isWarehouseAvailable
                  ? 'Create and validate the warehouse in the Warehouse section before using this mode.'
                  : ''
              }
            >
              Warehouse Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* Center: Category filters */}
      <div
        className="flex items-center"
        style={{
          gap: 4,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 12px',
                borderRadius: 7,
                border: isActive
                  ? '1px solid rgba(99, 102, 241, 0.5)'
                  : '1px solid rgba(148, 163, 184, 0.1)',
                background: isActive ? '#6366f1' : 'rgba(15, 23, 42, 0.6)',
                color: isActive ? '#ffffff' : 'rgba(226, 232, 240, 0.7)',
                fontSize: 12.5,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={13} aria-hidden="true" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <DisabledInDemo>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
              padding: '0 13px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#f4f4f5',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: isRegenerating ? 'not-allowed' : 'pointer',
              opacity: isRegenerating ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isRegenerating ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCw size={14} aria-hidden="true" />
            )}
            Regenerate KPIs
          </button>
        </DisabledInDemo>

        <DisabledInDemo>
          <button
            type="button"
            onClick={onBulkApproveHighConfidence}
            disabled={isBulkApproving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isBulkApproving ? 'not-allowed' : 'pointer',
              opacity: isBulkApproving ? 0.6 : 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(111, 53, 244, 0.25)',
            }}
          >
            {isBulkApproving ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={14} aria-hidden="true" />
            )}
            Approve All High Confidence
          </button>
        </DisabledInDemo>
      </div>
    </div>
  );
}

'use client';

import { Plus, X } from 'lucide-react';
import type { QueryTab } from './types';

interface QueryTabsBarProps {
  tabs: QueryTab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}

export default function QueryTabsBar({ tabs, activeTabId, onSelect, onClose, onAdd }: QueryTabsBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 38,
        padding: '0 6px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#0a0d12',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 30,
              padding: '0 10px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              borderBottom: active ? '2px solid #8b7dff' : '2px solid transparent',
              background: active ? 'rgba(148, 163, 184, 0.08)' : 'transparent',
              color: active ? '#f5f5f7' : 'rgba(226,232,240,0.5)',
              fontSize: 12.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.isRunning && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b7dff' }} />}
            {tab.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              style={{ display: 'inline-flex', padding: 2, borderRadius: 4, color: 'inherit' }}
            >
              <X size={12} aria-hidden="true" />
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        title="New query tab"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: 'rgba(226,232,240,0.5)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

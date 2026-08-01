import { Layers } from 'lucide-react';
import type { SchemaSummary } from '@/lib/api';

interface SchemaPanelProps {
  schemas: SchemaSummary[];
  selectedSchema: string;
  onSelect: (schema: string) => void;
}

export default function SchemaPanel({ schemas, selectedSchema, onSelect }: SchemaPanelProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px 14px', borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e2e8f0' }}>Schemas</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {schemas.map((schema) => {
          const isActive = schema.name === selectedSchema;
          return (
            <button
              key={schema.name}
              type="button"
              onClick={() => onSelect(schema.name)}
              className="flex items-center justify-between"
              style={{
                width: '100%',
                gap: 8,
                padding: '9px 14px',
                background: isActive ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                color: isActive ? '#f5f5f7' : 'rgba(226, 232, 240, 0.7)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              title={schema.is_source_schema ? 'Connected schema' : 'Not connected — table counts only'}
            >
              <span className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
                <Layers size={13} style={{ flexShrink: 0, opacity: 0.7 }} aria-hidden="true" />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {schema.name}
                </span>
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(226, 232, 240, 0.4)',
                  flexShrink: 0,
                }}
              >
                {schema.table_count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

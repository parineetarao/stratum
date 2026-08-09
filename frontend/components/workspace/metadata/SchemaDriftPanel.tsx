import { AlertTriangle, Info, PlusCircle, MinusCircle, PencilLine, X, ShieldAlert } from 'lucide-react';
import type { SchemaDriftResponse, DriftChange, AffectedObject } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

function severityColor(severity: string): { fg: string; bg: string; border: string } {
  if (severity === 'critical') {
    return { fg: '#fca5a5', bg: 'rgba(248, 113, 113, 0.08)', border: 'rgba(248, 113, 113, 0.25)' };
  }
  if (severity === 'warning') {
    return { fg: '#fcd34d', bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.25)' };
  }
  return { fg: '#93c5fd', bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.25)' };
}

function SeverityBadge({ severity }: { severity: string }) {
  const c = severityColor(severity);
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 5,
        padding: '2px 6px',
        flexShrink: 0,
      }}
    >
      {severity}
    </span>
  );
}

function ChangeRow({ change, icon: Icon }: { change: DriftChange; icon: typeof PlusCircle }) {
  return (
    <div
      className="flex items-start"
      style={{
        gap: 10,
        padding: '9px 10px',
        borderRadius: 7,
        background: 'rgba(148, 163, 184, 0.04)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
      }}
    >
      <Icon size={14} style={{ marginTop: 1, flexShrink: 0, color: 'rgba(226, 232, 240, 0.5)' }} aria-hidden="true" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>
            {change.table_name}
            {change.column_name && (
              <span style={{ color: 'rgba(226, 232, 240, 0.55)', fontWeight: 500 }}>.{change.column_name}</span>
            )}
          </span>
          <SeverityBadge severity={change.severity} />
        </div>
        <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.6)', marginTop: 3 }}>{change.message}</p>
        {change.old_type && change.new_type && (
          <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)', marginTop: 3, fontFamily: 'monospace' }}>
            {change.old_type} → {change.new_type}
          </p>
        )}
        {change.changes && change.changes.length > 0 && (
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            {change.changes.map((c, i) => (
              <li key={i} style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)' }}>
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AffectedRow({ item }: { item: AffectedObject }) {
  const label = item.warehouse_table ?? item.kpi_name ?? item.source_table ?? 'Unknown object';
  return (
    <div
      className="flex items-start"
      style={{
        gap: 10,
        padding: '9px 10px',
        borderRadius: 7,
        background: 'rgba(248, 113, 113, 0.04)',
        border: '1px solid rgba(248, 113, 113, 0.14)',
      }}
    >
      <ShieldAlert size={14} style={{ marginTop: 1, flexShrink: 0, color: '#fca5a5' }} aria-hidden="true" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>{label}</span>
          <SeverityBadge severity={item.severity} />
        </div>
        <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.6)', marginTop: 3 }}>{item.reason}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  items,
  renderItem,
}: {
  title: string;
  icon: typeof PlusCircle;
  items: DriftChange[] | AffectedObject[];
  renderItem: (item: any, i: number) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
        <Icon size={13} style={{ color: 'rgba(226, 232, 240, 0.5)' }} aria-hidden="true" />
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(226, 232, 240, 0.7)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {title} ({items.length})
        </h3>
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    </div>
  );
}

export default function SchemaDriftPanel({ drift, onDismiss }: { drift: SchemaDriftResponse; onDismiss: () => void }) {
  if (!drift.has_changes) {
    return (
      <div
        className="flex items-center"
        style={{
          gap: 8,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid rgba(52, 211, 153, 0.25)',
          background: 'rgba(52, 211, 153, 0.06)',
          fontSize: 13,
          color: '#6ee7b7',
        }}
      >
        <Info size={14} aria-hidden="true" />
        No schema drift detected — the source structure matches the last snapshot.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid rgba(251, 191, 36, 0.25)',
        background: '#0a0a0d',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-start justify-between"
        style={{ gap: 12, padding: '12px 14px', borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}
      >
        <div className="flex items-start" style={{ gap: 10 }}>
          <AlertTriangle size={16} style={{ color: '#fcd34d', marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 650, color: '#f5f5f7' }}>
              Schema drift detected — {drift.total_changes} change{drift.total_changes === 1 ? '' : 's'}
            </h2>
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', marginTop: 2 }}>
              {drift.recommendation}
              {drift.snapshot_compared_at && (
                <span> Compared against the snapshot from {formatRelativeTime(drift.snapshot_compared_at)}.</span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss drift report"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: 'rgba(226, 232, 240, 0.45)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col" style={{ gap: 16, padding: '14px' }}>
        <Section
          title="Added tables"
          icon={PlusCircle}
          items={drift.added_tables}
          renderItem={(c: DriftChange, i: number) => <ChangeRow key={i} change={c} icon={PlusCircle} />}
        />
        <Section
          title="Deleted tables"
          icon={MinusCircle}
          items={drift.deleted_tables}
          renderItem={(c: DriftChange, i: number) => <ChangeRow key={i} change={c} icon={MinusCircle} />}
        />
        <Section
          title="Added columns"
          icon={PlusCircle}
          items={drift.added_columns}
          renderItem={(c: DriftChange, i: number) => <ChangeRow key={i} change={c} icon={PlusCircle} />}
        />
        <Section
          title="Deleted columns"
          icon={MinusCircle}
          items={drift.deleted_columns}
          renderItem={(c: DriftChange, i: number) => <ChangeRow key={i} change={c} icon={MinusCircle} />}
        />
        <Section
          title="Modified columns"
          icon={PencilLine}
          items={drift.modified_columns}
          renderItem={(c: DriftChange, i: number) => <ChangeRow key={i} change={c} icon={PencilLine} />}
        />
        <Section
          title="Affected warehouse tables"
          icon={ShieldAlert}
          items={drift.affected_warehouse_tables}
          renderItem={(a: AffectedObject, i: number) => <AffectedRow key={i} item={a} />}
        />
        <Section
          title="Affected KPIs"
          icon={ShieldAlert}
          items={drift.affected_kpis}
          renderItem={(a: AffectedObject, i: number) => <AffectedRow key={i} item={a} />}
        />
      </div>
    </div>
  );
}

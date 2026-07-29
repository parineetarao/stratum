import { AlertCircle, CheckCircle2, History, Info } from 'lucide-react';
import type { ActivityLogEntry } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

const STATUS_ICON = {
  success: { Icon: CheckCircle2, color: '#34d399' },
  error: { Icon: AlertCircle, color: '#f87171' },
  info: { Icon: Info, color: '#60a5fa' },
} as const;

const EVENT_LABEL: Record<string, string> = {
  connection_created: 'Data source connected',
  connection_updated: 'Connection updated',
  file_uploaded: 'File uploaded',
  file_replaced: 'File replaced',
  test_succeeded: 'Connection test succeeded',
  test_failed: 'Connection test failed',
  metadata_discovered: 'Metadata discovery completed',
  metadata_refreshed: 'Metadata refreshed',
  schema_drift_detected: 'Schema changes detected',
};

export default function ActivityList({
  activity,
  emptyLabel = 'No activity recorded yet.',
}: {
  activity: ActivityLogEntry[];
  emptyLabel?: string;
}) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center text-center" style={{ padding: '24px 0' }}>
        <History size={24} style={{ color: 'rgba(226, 232, 240, 0.3)', marginBottom: 10 }} aria-hidden="true" />
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {activity.map((event, index) => {
        const { Icon, color } = STATUS_ICON[event.status];
        return (
          <li
            key={event.id}
            className="flex items-start justify-between"
            style={{
              gap: 12,
              padding: '11px 0',
              borderBottom: index === activity.length - 1 ? 'none' : '1px solid rgba(148, 163, 184, 0.1)',
            }}
          >
            <div className="flex items-start" style={{ gap: 10, minWidth: 0 }}>
              <Icon size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                  {EVENT_LABEL[event.event_type] ?? event.event_type}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(226, 232, 240, 0.5)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {event.message}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatRelativeTime(event.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

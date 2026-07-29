import { History } from 'lucide-react';
import type { ActivityEvent } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import OverviewCard from './OverviewCard';

export default function ActivityCard({ activity }: { activity: ActivityEvent[] }) {
  return (
    <OverviewCard title="Recent Activity" subtitle="Recent activity in your project">
      {activity.length === 0 ? (
        <div className="flex flex-col items-center text-center" style={{ padding: '18px 0' }}>
          <History size={24} style={{ color: 'rgba(226, 232, 240, 0.3)', marginBottom: 10 }} aria-hidden="true" />
          <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' }}>No activity recorded yet.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {activity.map((event, index) => (
            <li
              key={`${event.label}-${event.timestamp}`}
              className="flex items-center justify-between"
              style={{
                gap: 12,
                padding: '10px 0',
                borderBottom: index === activity.length - 1 ? 'none' : '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(226, 232, 240, 0.75)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {event.label}
              </span>
              <span style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.4)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {formatRelativeTime(event.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}

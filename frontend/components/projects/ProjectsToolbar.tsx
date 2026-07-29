import { Search } from 'lucide-react';

export type FilterTab = 'all' | 'connected' | 'not_connected';
export type SortOption = 'updated' | 'name' | 'created';

interface ProjectsToolbarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  filterTab: FilterTab;
  onFilterChange: (value: FilterTab) => void;
  counts: { all: number; connected: number; notConnected: number };
  isNarrow: boolean;
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All Projects' },
  { key: 'connected', label: 'Connected' },
  { key: 'not_connected', label: 'Not Connected' },
];

export default function ProjectsToolbar({
  title,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterTab,
  onFilterChange,
  counts,
  isNarrow,
}: ProjectsToolbarProps) {
  const countFor = (key: FilterTab) =>
    key === 'all' ? counts.all : key === 'connected' ? counts.connected : counts.notConnected;

  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{ gap: 14, marginBottom: 16 }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7' }}>{title}</h2>

      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
        <div className="flex items-center" style={{ gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterChange(tab.key)}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 7,
                border: 'none',
                background: filterTab === tab.key ? 'rgba(148, 163, 184, 0.14)' : 'transparent',
                color: filterTab === tab.key ? '#f5f5f7' : 'rgba(226, 232, 240, 0.55)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label} ({countFor(tab.key)})
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(226, 232, 240, 0.4)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects..."
            style={{
              width: isNarrow ? 160 : 200,
              height: 32,
              padding: '0 10px 0 30px',
              borderRadius: 7,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(4, 6, 10, 0.6)',
              color: '#f4f4f5',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
        </div>

        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          style={{
            height: 32,
            padding: '0 10px',
            borderRadius: 7,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(4, 6, 10, 0.6)',
            color: 'rgba(226, 232, 240, 0.8)',
            fontSize: 12.5,
            outline: 'none',
          }}
        >
          <option value="updated">Last Updated</option>
          <option value="name">Name</option>
          <option value="created">Date Created</option>
        </select>
      </div>
    </div>
  );
}

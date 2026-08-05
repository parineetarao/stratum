'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, FileSpreadsheet, Loader2, Menu, PlugZap } from 'lucide-react';
import { listProjects, getProjectConnection, type Project, type Connection } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { buildProjectWithConnection, type ProjectWithConnection } from '@/lib/projectView';
import Sidebar from '@/components/projects/Sidebar';
import ErrorPanel from '@/components/projects/ErrorPanel';

export default function DataSourcesPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth < 1050;

  const [projects, setProjects] = useState<Project[]>([]);
  const [connectionsById, setConnectionsById] = useState<Record<number, Connection | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    listProjects()
      .then(async (data) => {
        if (cancelled) return;
        setProjects(data);
        const results = await Promise.allSettled(
          data.map((project) => getProjectConnection(project.id).then((connection) => ({ id: project.id, connection })))
        );
        if (cancelled) return;
        const next: Record<number, Connection | null> = {};
        results.forEach((result) => {
          if (result.status === 'fulfilled') next[result.value.id] = result.value.connection;
        });
        setConnectionsById(next);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Data sources could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, retryCount]);

  const items: ProjectWithConnection[] = useMemo(
    () => projects.map((project) => buildProjectWithConnection(project, connectionsById[project.id], false)),
    [projects, connectionsById]
  );

  if (!ready) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: '#020305' }}>
        <Loader2 size={28} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020305', color: '#f4f4f5' }}>
      <Sidebar
        email={user?.email ?? ''}
        isOverlay={isCompact}
        isOpen={isCompact ? isMobileSidebarOpen : true}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <main
        style={{
          marginLeft: isCompact ? 0 : 214,
          padding: isCompact ? '24px 28px 40px' : '28px 52px 48px',
          minHeight: '100vh',
          maxWidth: 1200,
        }}
      >
        {isCompact && (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#f4f4f5',
              marginBottom: 20,
              cursor: 'pointer',
            }}
          >
            <Menu size={17} aria-hidden="true" />
          </button>
        )}

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 650, letterSpacing: '-0.025em', color: '#f5f5f7', marginBottom: 8 }}>
            Data Sources
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 560 }}>
            Every connection across your projects, in one place.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
            <Loader2 size={24} className="animate-spin" color="#8b7dff" aria-hidden="true" />
          </div>
        )}

        {!isLoading && loadError && <ErrorPanel onRetry={() => setRetryCount((c) => c + 1)} />}

        {!isLoading && !loadError && items.length === 0 && (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              minHeight: 220,
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.15)',
              background: '#05070a',
              padding: '48px 24px',
            }}
          >
            <PlugZap size={22} style={{ color: '#8b7dff', marginBottom: 12 }} aria-hidden="true" />
            <p style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.7)' }}>
              You don&rsquo;t have any projects yet, so there are no data sources to show.
            </p>
          </div>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.15)',
              background: '#05070a',
              overflow: 'hidden',
            }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: isCompact ? '1fr 100px' : '2fr 1fr 1.4fr 120px',
                padding: '12px 20px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(226, 232, 240, 0.4)',
              }}
            >
              <span>Project</span>
              {!isCompact && <span>Type</span>}
              {!isCompact && <span>Detail</span>}
              <span>Status</span>
            </div>

            {items.map(({ project, dataSource }) => {
              const Icon = connectionsById[project.id]?.connection_type === 'postgresql' ? Database : FileSpreadsheet;

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/projects/${project.id}/data-source`)}
                  className="grid w-full text-left transition-colors duration-150 hover:bg-white/[0.02]"
                  style={{
                    gridTemplateColumns: isCompact ? '1fr 100px' : '2fr 1fr 1.4fr 120px',
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                    background: 'transparent',
                    border: 'none',
                    borderBottomWidth: 1,
                    cursor: 'pointer',
                    alignItems: 'center',
                  }}
                >
                  <span className="flex items-center" style={{ gap: 10, fontSize: 14, fontWeight: 500, color: '#f5f5f7', minWidth: 0 }}>
                    <Icon size={15} strokeWidth={1.6} style={{ flexShrink: 0, color: 'rgba(226, 232, 240, 0.5)' }} aria-hidden="true" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                  </span>
                  {!isCompact && (
                    <span style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.65)' }}>{dataSource.label}</span>
                  )}
                  {!isCompact && (
                    <span
                      style={{
                        fontSize: 13,
                        color: 'rgba(226, 232, 240, 0.5)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dataSource.detail ?? '—'}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center"
                    style={{
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: dataSource.isConnected ? '#4ade80' : 'rgba(226, 232, 240, 0.45)',
                      width: 'fit-content',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: dataSource.isConnected ? '#4ade80' : 'rgba(226, 232, 240, 0.3)',
                      }}
                    />
                    {dataSource.isConnected ? 'Connected' : 'Not connected'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

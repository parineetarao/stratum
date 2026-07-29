'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Menu, Plus } from 'lucide-react';
import {
  listProjects,
  getProjectConnection,
  extractErrorMessage,
  type Project,
  type Connection,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { buildProjectWithConnection, deriveDisplayLabel } from '@/lib/projectView';
import Sidebar from '@/components/projects/Sidebar';
import SummaryCards from '@/components/projects/SummaryCards';
import { SummaryCardsSkeleton, ProjectsListSkeleton } from '@/components/projects/Skeletons';
import EmptyState from '@/components/projects/EmptyState';
import ProjectsToolbar, { type FilterTab, type SortOption } from '@/components/projects/ProjectsToolbar';
import ProjectsList from '@/components/projects/ProjectsList';
import RenameProjectDialog from '@/components/projects/RenameProjectDialog';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import ErrorPanel from '@/components/projects/ErrorPanel';

export default function ProjectsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const viewportWidth = useViewportWidth();

  const isCompact = viewportWidth < 1050;
  const isNarrow = viewportWidth < 650;

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [connectionsById, setConnectionsById] = useState<Record<number, Connection | null>>({});
  const [isConnectionsLoading, setIsConnectionsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    listProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((error) => {
        if (cancelled) return;
        if (!useAuthStore.getState().isAuthenticated) return;
        setLoadError(extractErrorMessage(error, 'Projects could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, retryCount]);

  useEffect(() => {
    const unresolved = projects.filter((project) => !(project.id in connectionsById));
    if (unresolved.length === 0) return;

    let cancelled = false;
    setIsConnectionsLoading(true);

    Promise.allSettled(
      unresolved.map((project) =>
        getProjectConnection(project.id).then((connection) => ({ id: project.id, connection }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        setConnectionsById((prev) => {
          const next = { ...prev };
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              next[result.value.id] = result.value.connection;
            }
          });
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setIsConnectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projects, connectionsById]);

  const itemsAll = useMemo(
    () =>
      projects.map((project) =>
        buildProjectWithConnection(
          project,
          connectionsById[project.id],
          !(project.id in connectionsById)
        )
      ),
    [projects, connectionsById]
  );

  const connectedCount = useMemo(
    () => itemsAll.filter((item) => !item.connectionUnresolved && item.dataSource.isConnected).length,
    [itemsAll]
  );
  const notConnectedCount = useMemo(
    () => itemsAll.filter((item) => !item.connectionUnresolved && !item.dataSource.isConnected).length,
    [itemsAll]
  );

  const visibleItems = useMemo(() => {
    const byTab = itemsAll.filter((item) => {
      if (filterTab === 'all') return true;
      if (item.connectionUnresolved) return false;
      return filterTab === 'connected' ? item.dataSource.isConnected : !item.dataSource.isConnected;
    });

    const query = searchQuery.trim().toLowerCase();
    const bySearch = query
      ? byTab.filter(
          (item) =>
            item.project.name.toLowerCase().includes(query) ||
            (item.dataSource.detail?.toLowerCase().includes(query) ?? false)
        )
      : byTab;

    return [...bySearch].sort((a, b) => {
      if (sortBy === 'name') return a.project.name.localeCompare(b.project.name);
      if (sortBy === 'created') {
        return new Date(b.project.created_at).getTime() - new Date(a.project.created_at).getTime();
      }
      const aTime = new Date(a.project.updated_at ?? a.project.created_at).getTime();
      const bTime = new Date(b.project.updated_at ?? b.project.created_at).getTime();
      return bTime - aTime;
    });
  }, [itemsAll, filterTab, searchQuery, sortBy]);

  const hasProjects = projects.length > 0;
  const displayLabel = user?.email ? deriveDisplayLabel(user.email) : '';
  const summaryColumns = viewportWidth < 480 ? 1 : isCompact ? 2 : 4;

  function handleOpenProject(project: Project) {
    router.push(`/projects/${project.id}`);
  }

  function handleRenamed(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setRenameTarget(null);
  }

  function handleDeleted(id: number) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConnectionsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeleteTarget(null);
  }

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: '100vh', background: '#020305' }}
      >
        <Loader2 size={28} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </div>
    );
  }

  const viewState: 'loading' | 'error' | 'empty' | 'populated' = isLoading
    ? 'loading'
    : loadError
    ? 'error'
    : hasProjects
    ? 'populated'
    : 'empty';

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
          padding: isNarrow ? '20px 20px 40px' : isCompact ? '24px 28px 40px' : '28px 52px 48px',
          minHeight: '100vh',
          maxWidth: 1500,
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

        <div
          className="flex items-start justify-between flex-wrap"
          style={{ gap: 16, marginBottom: 24 }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 650,
                letterSpacing: '-0.025em',
                color: '#f5f5f7',
                marginBottom: 8,
              }}
            >
              {hasProjects ? `Welcome back, ${displayLabel}` : 'Welcome to Stratum'}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', maxWidth: 560 }}>
              {hasProjects
                ? "Here's what's happening with your data projects."
                : 'Create your first project to connect data, explore its structure, and build production-ready analytical systems.'}
            </p>
          </div>

          {!isNarrow && (
            <button
              type="button"
              onClick={() => router.push('/projects/new')}
              className="flex items-center"
              style={{
                gap: 8,
                height: 44,
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Create New Project
            </button>
          )}
        </div>

        {isNarrow && (
          <button
            type="button"
            onClick={() => router.push('/projects/new')}
            className="flex items-center justify-center"
            style={{
              gap: 8,
              width: '100%',
              height: 44,
              padding: '0 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 24,
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Create New Project
          </button>
        )}

        {viewState === 'loading' && (
          <>
            <SummaryCardsSkeleton columns={summaryColumns} />
            <ProjectsListSkeleton />
          </>
        )}

        {viewState === 'error' && <ErrorPanel onRetry={() => setRetryCount((c) => c + 1)} />}

        {viewState === 'empty' && (
          <>
            <SummaryCards
              totalProjects={0}
              connectedCount={0}
              isConnectionsLoading={false}
              columns={summaryColumns}
            />
            <EmptyState onCreate={() => router.push('/projects/new')} />
          </>
        )}

        {viewState === 'populated' && (
          <>
            <SummaryCards
              totalProjects={projects.length}
              connectedCount={connectedCount}
              isConnectionsLoading={isConnectionsLoading}
              columns={summaryColumns}
            />

            <div style={{ marginTop: 28 }}>
              <ProjectsToolbar
                title="Your Projects"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterTab={filterTab}
                onFilterChange={setFilterTab}
                counts={{ all: itemsAll.length, connected: connectedCount, notConnected: notConnectedCount }}
                isNarrow={isNarrow}
              />

              <ProjectsList
                items={visibleItems}
                isNarrow={isNarrow}
                isCompact={isCompact}
                onOpen={handleOpenProject}
                onRenameRequest={setRenameTarget}
                onDeleteRequest={setDeleteTarget}
              />
            </div>
          </>
        )}
      </main>

      {renameTarget && (
        <RenameProjectDialog
          project={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRenamed={handleRenamed}
        />
      )}

      {deleteTarget && (
        <DeleteProjectDialog
          project={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

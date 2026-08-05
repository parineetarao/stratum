'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { AlertCircle, FolderX, Loader2 } from 'lucide-react';
import axios from 'axios';
import { getProjectOverview, type ProjectOverview } from '@/lib/api';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useAuthStore, useAuthHydrated } from '@/lib/auth';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceContext';

type LoadState = 'loading' | 'not_found' | 'failed' | 'ready';

function CenteredScreen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '100vh', background: '#020305', color: '#f4f4f5', padding: 24 }}
    >
      {children}
    </div>
  );
}

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  // Does not gate on auth up front: we always attempt the overview fetch
  // and only redirect to /login if it turns out we needed auth and didn't
  // have it.
  const authHydrated = useAuthHydrated();
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth < 1050;
  const isSqlWorkspace = pathname?.endsWith('/sql') ?? false;

  const projectId = Number(params.projectId);
  const isValidId = Number.isInteger(projectId) && projectId > 0;

  const [state, setState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(() => {
    if (!authHydrated || !isValidId) return;
    let cancelled = false;
    setState('loading');

    getProjectOverview(projectId)
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        if (!useAuthStore.getState().isAuthenticated) {
          router.replace(`/login?next=${encodeURIComponent(pathname ?? '/projects')}`);
          return;
        }
        if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 422)) {
          setState('not_found');
        } else {
          setState('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authHydrated, isValidId, projectId, pathname, router]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load, retryCount]);

  if (!authHydrated) {
    return (
      <CenteredScreen>
        <Loader2 size={28} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </CenteredScreen>
    );
  }

  if (!isValidId || state === 'not_found') {
    return (
      <CenteredScreen>
        <FolderX size={26} style={{ color: 'rgba(226, 232, 240, 0.4)', marginBottom: 14 }} aria-hidden="true" />
        <h1 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Project not found</h1>
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.6)', marginBottom: 20 }}>
          This project doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Return to Projects
        </button>
      </CenteredScreen>
    );
  }

  if (state === 'failed') {
    return (
      <CenteredScreen>
        <AlertCircle size={26} style={{ color: '#fca5a5', marginBottom: 14 }} aria-hidden="true" />
        <h1 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
          The project overview could not be loaded.
        </h1>
        <div className="flex items-center" style={{ gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'rgba(148, 163, 184, 0.06)',
              color: '#f4f4f5',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push('/projects')}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'rgba(226, 232, 240, 0.6)',
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Back to Projects
          </button>
        </div>
      </CenteredScreen>
    );
  }

  if (state === 'loading' || !overview) {
    return (
      <CenteredScreen>
        <Loader2 size={28} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </CenteredScreen>
    );
  }

  return (
    <WorkspaceProvider overview={overview} refetch={() => setRetryCount((c) => c + 1)}>
      <div style={{ minHeight: '100vh', background: '#020305', color: '#f4f4f5' }}>
        <WorkspaceSidebar
          projectId={projectId}
          overview={overview}
          isOverlay={isCompact}
          isOpen={isCompact ? isMobileSidebarOpen : true}
          onClose={() => setIsMobileSidebarOpen(false)}
          topOffset={0}
        />

        <div
          style={
            isSqlWorkspace
              ? { marginLeft: isCompact ? 0 : 232, marginTop: 0, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
              : { marginLeft: isCompact ? 0 : 232, marginTop: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }
          }
        >
          <WorkspaceHeader
            overview={overview}
            onRenamed={() => setRetryCount((c) => c + 1)}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            isCompact={isCompact}
          />

          <main
            style={
              isSqlWorkspace
                ? { flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }
                : {
                    flex: 1,
                    padding: isCompact ? '20px 20px 40px' : '24px 32px 48px',
                    maxWidth: 1500,
                    width: '100%',
                    overflowY: 'auto',
                  }
            }
          >
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

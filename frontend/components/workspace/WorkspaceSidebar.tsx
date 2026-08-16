'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, Database, FileSpreadsheet, LogOut, X } from 'lucide-react';
import type { ProjectOverview, StageStatus } from '@/lib/api';
import { logoutUser } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { OVERVIEW_NAV_ITEM, WORKFLOW_NAV_ITEMS, MANAGEMENT_NAV_ITEMS, stageRoute } from '@/lib/workspaceNav';

const STAGE_DOT_COLOR: Record<StageStatus, string> = {
  completed: '#8b5cf6',
  requires_review: '#f59e0b',
  in_progress: '#2ea7ff',
  pending: 'rgba(226, 232, 240, 0.25)',
};

interface WorkspaceSidebarProps {
  projectId: number;
  overview: ProjectOverview;
  isOverlay: boolean;
  isOpen: boolean;
  onClose: () => void;
  topOffset?: number;
}

function WorkspaceLogo() {
  return (
    <Link href="/projects" className="inline-flex items-center no-underline" style={{ gap: 9 }}>
      <svg width={26} height={26} viewBox="0 0 38 38" aria-hidden="true" className="flex-shrink-0">
        <g fill="none" stroke="#D7DAE0" strokeWidth="1.1" opacity="0.9">
          <polygon points="19,2 34,19 19,36 4,19" />
          <polygon points="19,6 30,19 19,32 8,19" opacity="0.85" />
          <polygon points="19,10 26,19 19,28 12,19" opacity="0.75" />
        </g>
      </svg>
      <span className="text-white whitespace-nowrap" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.18em' }}>
        STRATUM
      </span>
    </Link>
  );
}

function StageDot({ status }: { status: StageStatus }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: STAGE_DOT_COLOR[status],
        flexShrink: 0,
      }}
    />
  );
}

export default function WorkspaceSidebar({
  projectId,
  overview,
  isOverlay,
  isOpen,
  onClose,
  topOffset = 0,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const userEmail = useAuthStore((state) => state.user?.email);
  const { project, source } = overview;

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore API errors on logout
    } finally {
      useAuthStore.getState().logout();
      router.push('/login');
    }
  };

  const SourceIcon = source.connection_type === 'postgresql' ? Database : FileSpreadsheet;
  const sourceLabel = !source.is_connected
    ? 'Not connected'
    : source.connection_type === 'postgresql'
    ? 'PostgreSQL'
    : source.connection_type === 'csv'
    ? 'CSV Upload'
    : 'Excel Upload';

  const statusByStageId = new Map(overview.workflow.map((s) => [s.id, s.status]));

  function isActive(path: string): boolean {
    const target = stageRoute(projectId, path);
    return path === '' ? pathname === target : pathname.startsWith(target);
  }

  function renderItem(item: { id: string; label: string; path: string; icon: typeof Database }) {
    const Icon = item.icon;
    const active = isActive(item.path);
    const status = statusByStageId.get(item.id);

    return (
      <Link
        key={item.id}
        href={stageRoute(projectId, item.path)}
        onClick={onClose}
        className="flex items-center justify-between"
        style={{
          gap: 8,
          padding: '9px 12px',
          borderRadius: 7,
          fontSize: 13.5,
          fontWeight: 500,
          color: active ? '#f5f5f7' : 'rgba(226, 232, 240, 0.62)',
          background: active
            ? 'linear-gradient(90deg, rgba(111, 53, 244, 0.16), rgba(46, 167, 255, 0.06))'
            : 'transparent',
          borderLeft: active ? '2px solid #8b5cf6' : '2px solid transparent',
          textDecoration: 'none',
          marginBottom: 2,
        }}
      >
        <span className="flex items-center" style={{ gap: 11, minWidth: 0 }}>
          <Icon size={16} strokeWidth={1.6} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
        </span>
        {status && <StageDot status={status} />}
      </Link>
    );
  }

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: 232,
        background: '#030407',
        borderRight: '1px solid rgba(148, 163, 184, 0.14)',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '20px 18px 16px' }}>
        <WorkspaceLogo />
        {isOverlay && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'rgba(226, 232, 240, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <Link
        href="/projects"
        onClick={onClose}
        className="flex items-center justify-between"
        style={{
          margin: '0 12px 16px',
          padding: '10px 12px',
          borderRadius: 9,
          border: '1px solid rgba(148, 163, 184, 0.16)',
          background: 'rgba(148, 163, 184, 0.04)',
          textDecoration: 'none',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#f5f5f7',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={project.name}
          >
            {project.name}
          </div>
          <div className="flex items-center" style={{ gap: 5, marginTop: 3 }}>
            <SourceIcon size={11} style={{ color: 'rgba(226, 232, 240, 0.45)' }} aria-hidden="true" />
            <span style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)' }}>{sourceLabel}</span>
          </div>
        </span>
        <ChevronRight size={14} style={{ color: 'rgba(226, 232, 240, 0.35)', flexShrink: 0 }} aria-hidden="true" />
      </Link>

      <nav style={{ padding: '0 10px', flex: 1, overflowY: 'auto' }}>
        {renderItem(OVERVIEW_NAV_ITEM)}

        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'rgba(226, 232, 240, 0.35)',
            padding: '14px 12px 6px',
          }}
        >
          WORKFLOW
        </div>
        {WORKFLOW_NAV_ITEMS.map(renderItem)}

        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'rgba(226, 232, 240, 0.35)',
            padding: '14px 12px 6px',
          }}
        >
          MANAGEMENT
        </div>
        {MANAGEMENT_NAV_ITEMS.map(renderItem)}
      </nav>

      {overview.is_demo ? (
        <div style={{ padding: '14px 16px 20px', borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <div className="flex items-center" style={{ gap: 10, padding: '4px 4px 8px' }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(148, 163, 184, 0.16)',
                color: 'rgba(226, 232, 240, 0.75)',
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              D
            </div>
            <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.75)', flex: 1 }}>Demo Workspace</span>
          </div>
          <Link
            href="/login"
            className="flex items-center justify-center no-underline transition-all duration-150"
            style={{
              width: '100%',
              gap: 8,
              marginTop: 6,
              padding: '7px 12px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 500,
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
            }}
          >
            Sign up / Login
          </Link>
        </div>
      ) : userEmail ? (
        <div style={{ padding: '14px 16px 20px', borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <div
            className="flex items-center"
            style={{
              gap: 10,
              padding: '4px 4px 8px',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6f35f4, #2ea7ff)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: 12.5,
                color: 'rgba(226, 232, 240, 0.75)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
              title={userEmail}
            >
              {userEmail}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center transition-all duration-150 hover:bg-red-500/20"
            style={{
              width: '100%',
              gap: 8,
              marginTop: 6,
              padding: '7px 12px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 500,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.22)',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} />
            <span>Log Out</span>
          </button>
        </div>
      ) : null}
    </div>
  );

  if (!isOverlay) {
    return (
      <div style={{ position: 'fixed', top: topOffset, left: 0, height: `calc(100vh - ${topOffset}px)`, zIndex: 20 }}>
        {content}
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.55)', zIndex: 29 }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: topOffset,
          left: 0,
          height: `calc(100vh - ${topOffset}px)`,
          zIndex: 30,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
        }}
      >
        {content}
      </div>
    </>
  );
}

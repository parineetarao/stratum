'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Pencil } from 'lucide-react';
import { logoutUser, type ProjectOverview, type ProjectStatus } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import RenameProjectDialog from '@/components/projects/RenameProjectDialog';
import DisabledInDemo from '@/components/workspace/demoGuard';

const STATUS_META: Record<ProjectStatus, { color: string; dot: string }> = {
  setup_incomplete: { color: 'rgba(226, 232, 240, 0.65)', dot: 'rgba(226, 232, 240, 0.4)' },
  active: { color: '#c4b5fd', dot: '#8b5cf6' },
  needs_review: { color: '#fbbf24', dot: '#f59e0b' },
  completed: { color: '#6ee7b7', dot: '#34d399' },
};

interface WorkspaceHeaderProps {
  overview: ProjectOverview;
  onRenamed: () => void;
  onOpenMobileMenu: () => void;
  isCompact: boolean;
}

export default function WorkspaceHeader({
  overview,
  onRenamed,
  onOpenMobileMenu,
  isCompact,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  async function handleSignOut() {
    setIsMenuOpen(false);
    try {
      await logoutUser();
    } catch {
      // Best-effort — clear local session regardless of server response.
    }
    useAuthStore.getState().logout();
    router.push('/login');
  }

  const statusMeta = STATUS_META[overview.status];
  const email = user?.email ?? '';

  return (
    <>
      <header
        className="flex items-center justify-between"
        style={{
          height: 64,
          padding: isCompact ? '0 20px' : '0 28px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          background: '#020305',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center" style={{ gap: 14, minWidth: 0 }}>
          {isCompact && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open menu"
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(148, 163, 184, 0.06)',
                color: '#f4f4f5',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Menu size={16} aria-hidden="true" />
            </button>
          )}

          <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 650,
                color: '#f5f5f7',
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: isCompact ? 160 : 320,
              }}
              title={overview.project.name}
            >
              {overview.project.name}
            </h1>
            <DisabledInDemo tooltip="Sign up to rename your own project">
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                aria-label="Edit project name"
                className="flex items-center justify-center"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(226, 232, 240, 0.4)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Pencil size={13} aria-hidden="true" />
              </button>
            </DisabledInDemo>
            {!isCompact && (
              <span
                className="inline-flex items-center"
                style={{
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  background: 'rgba(148, 163, 184, 0.06)',
                  fontSize: 12,
                  color: statusMeta.color,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusMeta.dot }} />
                {overview.status_label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
          {!isCompact && (
            <span
              className="inline-flex items-center"
              style={{
                gap: 6,
                fontSize: 12.5,
                color: 'rgba(226, 232, 240, 0.5)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: overview.source.is_connected ? '#34d399' : 'rgba(226, 232, 240, 0.35)',
                }}
              />
              {overview.source.is_connected ? 'Source connected' : 'Source not connected'}
            </span>
          )}

          <button
            type="button"
            aria-label="Notifications"
            className="flex items-center justify-center"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'rgba(148, 163, 184, 0.05)',
              color: 'rgba(226, 232, 240, 0.65)',
              cursor: 'pointer',
            }}
          >
            <Bell size={15} aria-hidden="true" />
          </button>

          {!user ? (
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: 'rgba(148, 163, 184, 0.06)',
                color: '#f4f4f5',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log In
            </button>
          ) : (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              className="flex items-center"
              style={{
                gap: 6,
                height: 34,
                padding: '0 8px 0 4px',
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.16)',
                background: isMenuOpen ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.05)',
                cursor: 'pointer',
              }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6f35f4, #2ea7ff)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {email.charAt(0).toUpperCase() || 'U'}
              </span>
              <ChevronDown size={13} style={{ color: 'rgba(226, 232, 240, 0.5)' }} aria-hidden="true" />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 40,
                  minWidth: 200,
                  borderRadius: 8,
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  background: '#0a0c11',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  padding: 6,
                  zIndex: 15,
                }}
              >
                <div
                  style={{
                    padding: '6px 10px 8px',
                    fontSize: 12.5,
                    color: 'rgba(226, 232, 240, 0.5)',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={email}
                >
                  {email}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex items-center"
                  style={{
                    gap: 9,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#f87171',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </header>

      {isRenaming && (
        <RenameProjectDialog
          project={overview.project}
          onClose={() => setIsRenaming(false)}
          onRenamed={() => {
            setIsRenaming(false);
            onRenamed();
          }}
        />
      )}
    </>
  );
}

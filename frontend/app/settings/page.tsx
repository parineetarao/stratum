'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Menu, User } from 'lucide-react';
import { logoutUser } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { deriveDisplayLabel } from '@/lib/projectView';
import Sidebar from '@/components/projects/Sidebar';

export default function SettingsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth < 1050;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
          maxWidth: 720,
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
            Settings
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)' }}>
            Manage your account.
          </p>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: '#05070a',
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'rgba(226, 232, 240, 0.4)',
              marginBottom: 16,
            }}
          >
            Account
          </div>

          <div className="flex items-center" style={{ gap: 14 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6f35f4, #2ea7ff)',
                color: '#fff',
                fontSize: 17,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {user?.email ? user.email.charAt(0).toUpperCase() : <User size={18} aria-hidden="true" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>
                {user?.email ? deriveDisplayLabel(user.email) : 'Account'}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: 'rgba(226, 232, 240, 0.55)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={user?.email}
              >
                {user?.email ?? '—'}
              </div>
            </div>
          </div>

          {user?.created_at && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                fontSize: 13,
                color: 'rgba(226, 232, 240, 0.5)',
              }}
            >
              Member since{' '}
              {new Date(user.created_at).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center transition-all duration-150 hover:bg-red-500/20"
            style={{
              gap: 8,
              marginTop: 20,
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.22)',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Database, FolderKanban, Link2, LogOut, Settings, Users, X } from 'lucide-react';
import Logo from '@/components/landing/Logo';
import { useAuthStore } from '@/lib/auth';
import { logoutUser } from '@/lib/api';

interface NavItem {
  label: string;
  icon: typeof FolderKanban;
  href: string;
  active?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Projects', icon: FolderKanban, href: '/projects', active: true },
  { label: 'Data Sources', icon: Database, href: '#' },
  { label: 'Integrations', icon: Link2, href: '#' },
  { label: 'Team', icon: Users, href: '#' },
  { label: 'Notifications', icon: Bell, href: '#' },
  { label: 'Settings', icon: Settings, href: '#' },
];

interface SidebarProps {
  email: string;
  isOverlay: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ email, isOverlay, isOpen, onClose }: SidebarProps) {
  const router = useRouter();

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

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: 214,
        background: '#030407',
        borderRight: '1px solid rgba(148, 163, 184, 0.14)',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '22px 20px 18px' }}
      >
        <Logo iconSize={26} fontSize={13} gap={9} letterSpacing="0.18em" fontWeight={600} />
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

      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const inner = (
            <span
              className="flex items-center"
              style={{
                gap: 11,
                padding: '9px 12px',
                borderRadius: 7,
                fontSize: 13.5,
                fontWeight: 500,
                color: item.active ? '#f5f5f7' : 'rgba(226, 232, 240, 0.62)',
                background: item.active
                  ? 'linear-gradient(90deg, rgba(111, 53, 244, 0.16), rgba(46, 167, 255, 0.06))'
                  : 'transparent',
                borderLeft: item.active ? '2px solid #8b5cf6' : '2px solid transparent',
                cursor: item.active ? 'pointer' : 'default',
              }}
            >
              <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
              {item.label}
            </span>
          );

          return item.active ? (
            <Link key={item.label} href={item.href} style={{ display: 'block', marginBottom: 2 }}>
              {inner}
            </Link>
          ) : (
            <div key={item.label} style={{ display: 'block', marginBottom: 2 }}>
              {inner}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '14px 16px 20px', borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <div
          className="flex items-center"
          style={{
            gap: 10,
            padding: '8px 4px',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6f35f4, #2ea7ff)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {email.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: 13,
              color: 'rgba(226, 232, 240, 0.75)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={email}
          >
            {email}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center transition-all duration-150 hover:bg-red-500/20"
          style={{
            width: '100%',
            gap: 8,
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 7,
            fontSize: 12.5,
            fontWeight: 500,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.22)',
            color: '#f87171',
            cursor: 'pointer',
          }}
        >
          <LogOut size={14} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  if (!isOverlay) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 20 }}>
        {content}
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 29,
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
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

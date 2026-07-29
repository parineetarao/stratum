'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/lib/auth';

/**
 * Client-side route guard for pages that require a session. Tokens live in
 * localStorage (not cookies), so there's no server-side middleware that can
 * see them - this is the equivalent gate for the bearer-token architecture.
 * Returns true once it's safe to render protected content.
 */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  return hydrated && isAuthenticated;
}

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

export const AUTH_DEFAULT_DESTINATION = '/projects';

function resolveRedirect(next: string | null): string {
  if (!next) return AUTH_DEFAULT_DESTINATION;
  if (!next.startsWith('/') || next.startsWith('//')) return AUTH_DEFAULT_DESTINATION;
  return next;
}

/**
 * Redirects away from an auth page (login/register) if the user already has
 * a session, and resolves the `?next=` param (falling back to the default
 * authenticated destination) for use once auth succeeds.
 */
export function useAuthRedirect(): string {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const redirectTo = resolveRedirect(searchParams.get('next'));

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return redirectTo;
}

export function crossAuthLink(basePath: '/login' | '/register', redirectTo: string): string {
  if (redirectTo === AUTH_DEFAULT_DESTINATION) return basePath;
  return `${basePath}?next=${encodeURIComponent(redirectTo)}`;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, TokenResponse } from './api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setTokens: (tokens: TokenResponse) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'stratum-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Persisted state rehydrates from localStorage after the initial render (and
 * never rehydrates during SSR, where localStorage doesn't exist), so
 * consumers that gate a redirect on `isAuthenticated` (e.g. protected pages)
 * need to wait for this to flip true before trusting a `false` value.
 */
export function useAuthHydrated(): boolean {
  return useAuthStore((state) => state.hasHydrated);
}

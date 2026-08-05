'use client';

import type { ReactNode } from 'react';

/**
 * Public demo mode has been removed. These remain as inert passthroughs so
 * the many call sites across the workspace UI don't need to change: actions
 * are never gated and no signup modal is ever shown.
 */
export function useDemoGuard() {
  return {
    isDemo: false,
    guard: (action: () => void) => action(),
    modalOpen: false,
    setModalOpen: () => {},
    modal: null,
  };
}

interface DisabledInDemoProps {
  children: ReactNode;
  tooltip?: string;
  title?: string;
  body?: string;
  disabled?: boolean;
}

export default function DisabledInDemo({ children }: DisabledInDemoProps) {
  return <>{children}</>;
}

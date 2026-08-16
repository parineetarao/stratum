'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useDemoToastStore, DEFAULT_DEMO_MESSAGE } from '@/lib/demoToastStore';

/**
 * Centralizes the frontend half of demo read-only enforcement. The actual
 * security boundary is server-side (ensure_project_is_mutable on every
 * mutating endpoint) - this only keeps the UI honest and gives a single
 * place to change the behavior instead of scattering `if (isDemo)` through
 * every button handler across the workspace.
 */
export function useDemoGuard() {
  const { overview } = useWorkspace();
  const isDemo = Boolean(overview.is_demo);
  const show = useDemoToastStore((s) => s.show);

  const guard = useCallback(
    <T extends (...args: never[]) => unknown>(action: T, message?: string): T => {
      if (!isDemo) return action;
      return ((..._args: never[]) => {
        show(message);
        return undefined;
      }) as T;
    },
    [isDemo, show]
  );

  return { isDemo, guard };
}

interface DisabledInDemoProps {
  children: ReactNode;
  tooltip?: string;
  title?: string;
  body?: string;
  /** Opt this particular instance out of demo gating even inside a demo
   * project (e.g. a control that's always safe, like "View SQL"). */
  disabled?: boolean;
}

/**
 * Wraps a single mutating control (usually one button). In demo mode,
 * intercepts the click before it reaches the child's own handler and shows
 * the shared toast instead - the child needs no changes itself, and mere
 * hover/navigation never triggers anything since only click is intercepted.
 */
export default function DisabledInDemo({ children, tooltip, title, body, disabled }: DisabledInDemoProps) {
  const { isDemo } = useDemoGuard();
  const show = useDemoToastStore((s) => s.show);

  if (disabled || !isDemo) {
    return <>{children}</>;
  }

  const message = body || tooltip || title || DEFAULT_DEMO_MESSAGE;

  return (
    <span
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        show(message);
      }}
      title={tooltip || 'Unavailable in the public demo'}
      style={{ display: 'contents' }}
    >
      {children}
    </span>
  );
}

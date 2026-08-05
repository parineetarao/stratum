'use client';

import { useState, type ReactNode, type MouseEvent } from 'react';
import { useWorkspace } from './WorkspaceContext';
import SignupModal from './SignupModal';

const DEFAULT_TOOLTIP = 'Sign up to unlock this action';

/**
 * Central place for "is this the read-only public demo project" plus a
 * signup-modal opener, so every module guards its mutation buttons the
 * same way instead of re-deriving isDemo / re-implementing a modal.
 */
export function useDemoGuard() {
  const { overview } = useWorkspace();
  const isDemo = Boolean(overview.is_demo);
  const [modalOpen, setModalOpen] = useState(false);

  function guard(action: () => void) {
    if (isDemo) {
      setModalOpen(true);
      return;
    }
    action();
  }

  const modal = (
    <SignupModal open={modalOpen} onClose={() => setModalOpen(false)} />
  );

  return { isDemo, guard, modalOpen, setModalOpen, modal };
}

interface DisabledInDemoProps {
  children: ReactNode;
  tooltip?: string;
  title?: string;
  body?: string;
  disabled?: boolean;
}

/**
 * Wraps a single action trigger (button, menu item, etc.) so that in the
 * public demo it looks intentionally disabled, shows a consistent
 * tooltip, and opens the shared signup modal on click instead of running
 * whatever onClick the child element carries. Outside the demo it's a
 * transparent passthrough.
 */
export default function DisabledInDemo({
  children,
  tooltip = DEFAULT_TOOLTIP,
  title,
  body,
  disabled = true,
}: DisabledInDemoProps) {
  const { overview } = useWorkspace();
  const isDemo = Boolean(overview.is_demo);
  const [modalOpen, setModalOpen] = useState(false);

  if (!isDemo || !disabled) {
    return <>{children}</>;
  }

  function handleClickCapture(e: MouseEvent<HTMLSpanElement>) {
    e.preventDefault();
    e.stopPropagation();
    setModalOpen(true);
  }

  return (
    <span style={{ display: 'inline-flex' }}>
      <span
        onClickCapture={handleClickCapture}
        title={tooltip}
        style={{ display: 'inline-flex', cursor: 'not-allowed', opacity: 0.55, filter: 'grayscale(0.3)' }}
      >
        {children}
      </span>
      <SignupModal open={modalOpen} onClose={() => setModalOpen(false)} title={title} body={body} />
    </span>
  );
}

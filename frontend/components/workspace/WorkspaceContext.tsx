'use client';

import { createContext, useContext } from 'react';
import type { ProjectOverview } from '@/lib/api';

interface WorkspaceContextValue {
  overview: ProjectOverview;
  refetch: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  overview,
  refetch,
  children,
}: WorkspaceContextValue & { children: React.ReactNode }) {
  return (
    <WorkspaceContext.Provider value={{ overview, refetch }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a project workspace layout.');
  }
  return ctx;
}

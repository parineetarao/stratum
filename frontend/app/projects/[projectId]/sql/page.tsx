import { Suspense } from 'react';
import SqlWorkspaceExplorer from '@/components/workspace/sql-workspace/SqlWorkspaceExplorer';

export default function SqlWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <SqlWorkspaceExplorer />
    </Suspense>
  );
}

import {
  LayoutDashboard,
  Database,
  Table2,
  GitBranch,
  ShieldCheck,
  Wand2,
  Warehouse,
  BarChart3,
  Terminal,
  LayoutGrid,
  Lightbulb,
  Settings,
  Users,
} from 'lucide-react';

export interface WorkspaceNavItem {
  id: string;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const OVERVIEW_NAV_ITEM: WorkspaceNavItem = {
  id: 'overview',
  label: 'Overview',
  path: '',
  icon: LayoutDashboard,
};

export const WORKFLOW_NAV_ITEMS: WorkspaceNavItem[] = [
  { id: 'data_source', label: 'Data Source', path: 'data-source', icon: Database },
  { id: 'metadata', label: 'Metadata', path: 'metadata', icon: Table2 },
  { id: 'relationships', label: 'Relationships', path: 'relationships', icon: GitBranch },
  { id: 'data_quality', label: 'Data Quality', path: 'data-quality', icon: ShieldCheck },
  { id: 'cleaning', label: 'Cleaning', path: 'cleaning', icon: Wand2 },
  { id: 'warehouse', label: 'Warehouse', path: 'warehouse', icon: Warehouse },
  { id: 'kpis', label: 'KPIs', path: 'kpis', icon: BarChart3 },
  { id: 'sql_workspace', label: 'SQL Workspace', path: 'sql', icon: Terminal },
  { id: 'dashboard', label: 'Dashboard', path: 'dashboard', icon: LayoutGrid },
  { id: 'insights', label: 'Insights', path: 'insights', icon: Lightbulb },
];

export const MANAGEMENT_NAV_ITEMS: WorkspaceNavItem[] = [
  { id: 'settings', label: 'Project Settings', path: 'settings', icon: Settings },
  { id: 'access', label: 'Team & Access', path: 'access', icon: Users },
];

export function stageRoute(projectId: number | string, path: string): string {
  return path ? `/projects/${projectId}/${path}` : `/projects/${projectId}`;
}

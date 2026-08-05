import type { SQLExecuteResponse } from '@/lib/api';

export interface QueryTab {
  id: string;
  name: string;
  sql: string;
  result: SQLExecuteResponse | null;
  error: string | null;
  isRunning: boolean;
  /** Set when this tab's sql came from a curated demo query and still matches it verbatim. */
  demoQueryId?: string;
}

export function createTab(id: string, name: string, sql = '', demoQueryId?: string): QueryTab {
  return { id, name, sql, result: null, error: null, isRunning: false, demoQueryId };
}

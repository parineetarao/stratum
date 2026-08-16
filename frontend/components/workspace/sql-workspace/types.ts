import type { SQLExecuteResponse } from '@/lib/api';

export interface QueryTab {
  id: string;
  name: string;
  sql: string;
  result: SQLExecuteResponse | null;
  error: string | null;
  isRunning: boolean;
  /** Set when this tab's sql was populated from a demo curated query — the
   * backend trusts only this id for is_demo projects, never the sql text. */
  queryId?: string | null;
}

export function createTab(id: string, name: string, sql = ''): QueryTab {
  return { id, name, sql, result: null, error: null, isRunning: false, queryId: null };
}

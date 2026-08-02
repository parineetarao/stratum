import type { SQLExecuteResponse } from '@/lib/api';

export interface QueryTab {
  id: string;
  name: string;
  sql: string;
  result: SQLExecuteResponse | null;
  error: string | null;
  isRunning: boolean;
}

export function createTab(id: string, name: string, sql = ''): QueryTab {
  return { id, name, sql, result: null, error: null, isRunning: false };
}

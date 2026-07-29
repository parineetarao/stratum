import type { Connection, Project } from './api';

export type Stage = 'connected' | 'awaiting_connection';

export interface DataSourceInfo {
  label: string;
  detail: string | null;
  isConnected: boolean;
}

export interface ProjectWithConnection {
  project: Project;
  connection: Connection | null;
  connectionUnresolved: boolean;
  dataSource: DataSourceInfo;
  stage: Stage;
}

const CONNECTION_TYPE_LABEL: Record<Connection['connection_type'], string> = {
  postgresql: 'PostgreSQL',
  csv: 'CSV Upload',
  excel: 'Excel Upload',
};

export function buildDataSourceInfo(connection: Connection | null): DataSourceInfo {
  if (!connection) {
    return { label: 'Not connected', detail: null, isConnected: false };
  }

  const label = CONNECTION_TYPE_LABEL[connection.connection_type];
  const detail =
    connection.connection_type === 'postgresql'
      ? connection.source_schema
      : connection.original_filename;

  return { label, detail, isConnected: true };
}

export function deriveStage(connection: Connection | null): Stage {
  return connection ? 'connected' : 'awaiting_connection';
}

export function deriveDisplayLabel(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  if (!localPart) return email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export function buildProjectWithConnection(
  project: Project,
  connection: Connection | null | undefined,
  connectionUnresolved: boolean
): ProjectWithConnection {
  const resolvedConnection = connection ?? null;
  return {
    project,
    connection: resolvedConnection,
    connectionUnresolved,
    dataSource: buildDataSourceInfo(resolvedConnection),
    stage: deriveStage(resolvedConnection),
  };
}

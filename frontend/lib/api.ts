import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<TokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    useAuthStore.getState().setTokens(data);
    return data.access_token;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const url = originalRequest?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
      }

      const newToken = await refreshInFlight;
      if (newToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id: number;
  email: string;
  created_at: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
  return data;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/auth/register', payload);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  domain: string | null;
  analysis_mode: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  domain?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  domain?: string;
  analysis_mode?: string;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects');
  return data;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', payload);
  return data;
}

export async function updateProject(id: number, payload: UpdateProjectPayload): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export type ConnectionType = 'postgresql' | 'csv' | 'excel';

// Deliberately omits `connection_string`, which the backend also returns on
// this endpoint but may contain embedded credentials — no UI should render it.
export interface Connection {
  id: number;
  project_id: number;
  connection_type: ConnectionType;
  source_schema: string | null;
  original_filename: string | null;
}

export async function getProjectConnection(projectId: number): Promise<Connection | null> {
  try {
    const { data } = await apiClient.get<Connection>(`/projects/${projectId}/connection`);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

// Mirrors app.models.project.DomainEnum. The backend has no endpoint that
// lists domains, so this is kept in sync with the enum by hand.
export const PROJECT_DOMAINS = [
  'banking',
  'finance',
  'retail',
  'healthcare',
  'manufacturing',
  'logistics',
] as const;

export type ProjectDomain = (typeof PROJECT_DOMAINS)[number];

export interface PostgresConnectionRequest {
  connection_string: string;
  source_schema?: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  tables_found?: number | null;
  schemas_available?: string[] | null;
}

export async function testPostgresConnection(
  projectId: number,
  payload: PostgresConnectionRequest
): Promise<ConnectionTestResponse> {
  const { data } = await apiClient.post<ConnectionTestResponse>(
    `/projects/${projectId}/test-connection`,
    payload
  );
  return data;
}

export async function connectPostgres(
  projectId: number,
  payload: PostgresConnectionRequest
): Promise<Connection> {
  const { data } = await apiClient.post<Connection>(`/projects/${projectId}/connect/postgres`, payload);
  return data;
}

export async function connectFile(projectId: number, file: File): Promise<Connection> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<Connection>(`/projects/${projectId}/connect/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export interface ForeignKeyInfo {
  column: string;
  referenced_table: string;
  referenced_column: string;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  is_primary_key: boolean;
  foreign_key: ForeignKeyInfo | null;
}

export interface TableMetadata {
  table_name: string;
  row_count: number;
  column_count: number;
  columns: ColumnMetadata[];
  primary_keys: string[];
  foreign_keys: Record<string, unknown>[];
}

export interface SchemaResponse {
  project_id: number;
  table_count: number;
  tables: TableMetadata[];
}

export async function discoverSchema(projectId: number): Promise<SchemaResponse> {
  const { data } = await apiClient.post<SchemaResponse>(`/projects/${projectId}/discover`);
  return data;
}

export interface SchemaDriftResponse {
  project_id: number;
  has_changes: boolean;
  total_changes: number;
  recommendation: string;
}

export async function refreshSchema(projectId: number): Promise<SchemaDriftResponse> {
  const { data } = await apiClient.post<SchemaDriftResponse>(`/projects/${projectId}/refresh-schema`);
  return data;
}

export type StageStatus = 'completed' | 'requires_review' | 'in_progress' | 'pending';
export type ProjectStatus = 'setup_incomplete' | 'active' | 'needs_review' | 'completed';

export interface WorkflowStage {
  id: string;
  label: string;
  route: string;
  status: StageStatus;
  is_current: boolean;
}

export interface NextStep {
  stage_id: string;
  title: string;
  description: string;
  cta_label: string;
  route: string;
}

export interface SourceSummary {
  is_connected: boolean;
  connection_type: ConnectionType | null;
  connected_at: string | null;
  source_schema: string | null;
  database_name: string | null;
  original_filename: string | null;
}

export interface MetadataSummary {
  has_run: boolean;
  table_count: number;
  total_rows: number | null;
  last_discovered_at: string | null;
}

export interface QualitySummary {
  has_run: boolean;
  overall_score: number | null;
  status_label: string | null;
  critical_issues: number | null;
  warning_issues: number | null;
  run_at: string | null;
}

export interface ActivityEvent {
  label: string;
  timestamp: string;
}

export interface TableSummary {
  table_name: string;
  row_count: number | null;
  column_count: number | null;
}

export interface TablesOverview {
  has_run: boolean;
  schema_name: string | null;
  table_count: number;
  tables: TableSummary[];
}

export interface ProjectOverview {
  project: Project;
  status: ProjectStatus;
  status_label: string;
  source: SourceSummary;
  workflow: WorkflowStage[];
  overall_progress_pct: number;
  current_stage_id: string | null;
  next_step: NextStep | null;
  metadata_summary: MetadataSummary;
  quality_summary: QualitySummary;
  tables_overview: TablesOverview;
  activity: ActivityEvent[];
}

export async function getProjectOverview(projectId: number): Promise<ProjectOverview> {
  const { data } = await apiClient.get<ProjectOverview>(`/projects/${projectId}/overview`);
  return data;
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface ConnectionHealth {
  status: HealthStatus;
  message: string;
  checked_at: string;
}

export interface PostgresConnectionDetails {
  host: string | null;
  port: number | null;
  database: string | null;
  user: string | null;
  sslmode: string | null;
  source_schema: string | null;
  connection_method: string;
}

export interface PostgresServerInfo {
  server_version: string | null;
  encoding: string | null;
  collation: string | null;
}

export interface CsvFileDetails {
  original_filename: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  encoding: string | null;
  delimiter: string | null;
}

export interface DataSourceStats {
  table_count: number;
  total_columns: number | null;
  total_rows: number | null;
  size_bytes: number | null;
  last_sync_at: string | null;
}

export type ActivityEventType =
  | 'connection_created'
  | 'connection_updated'
  | 'file_uploaded'
  | 'file_replaced'
  | 'test_succeeded'
  | 'test_failed'
  | 'metadata_discovered'
  | 'metadata_refreshed'
  | 'schema_drift_detected';

export interface ActivityLogEntry {
  id: number;
  event_type: ActivityEventType;
  status: 'success' | 'error' | 'info';
  message: string;
  created_at: string;
}

export interface DataSourceDetail {
  project_id: number;
  connection_type: ConnectionType;
  connected_at: string;
  health: ConnectionHealth;
  stats: DataSourceStats;
  postgres: PostgresConnectionDetails | null;
  postgres_info: PostgresServerInfo | null;
  csv: CsvFileDetails | null;
  recent_activity: ActivityLogEntry[];
}

export async function getDataSourceDetail(projectId: number): Promise<DataSourceDetail> {
  const { data } = await apiClient.get<DataSourceDetail>(`/projects/${projectId}/data-source`);
  return data;
}

export interface DataSourceTestResponse {
  health: ConnectionHealth;
}

export async function testStoredConnection(projectId: number): Promise<DataSourceTestResponse> {
  const { data } = await apiClient.post<DataSourceTestResponse>(
    `/projects/${projectId}/data-source/test-connection`
  );
  return data;
}

export async function getDataSourceActivity(projectId: number, limit = 50): Promise<ActivityLogEntry[]> {
  const { data } = await apiClient.get<ActivityLogEntry[]>(`/projects/${projectId}/data-source/activity`, {
    params: { limit },
  });
  return data;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

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

export async function getSchema(projectId: number): Promise<SchemaResponse> {
  const { data } = await apiClient.get<SchemaResponse>(`/projects/${projectId}/schema`);
  return data;
}

export interface SchemaSummary {
  name: string;
  table_count: number;
  is_source_schema: boolean;
}

export interface CatalogTableSummary {
  table_name: string;
  schema_name: string;
  row_count: number;
  column_count: number;
  last_updated: string | null;
}

export interface CatalogOverview {
  project_id: number;
  source_type: ConnectionType;
  source_schema: string;
  schema_count: number;
  table_count: number;
  column_count: number;
  total_rows_approx: number;
  schemas: SchemaSummary[];
  tables: CatalogTableSummary[];
  last_refreshed_at: string | null;
}

export async function getMetadataCatalog(projectId: number): Promise<CatalogOverview> {
  const { data } = await apiClient.get<CatalogOverview>(`/projects/${projectId}/catalog`);
  return data;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
}

export interface ConstraintInfo {
  name: string;
  type: string;
  definition: string;
}

export interface TableDetail {
  table_name: string;
  schema_name: string;
  row_count: number;
  column_count: number;
  columns: ColumnMetadata[];
  data_size_bytes: number | null;
  primary_key: string[];
  indexes: IndexInfo[];
  index_count: number;
  constraints: ConstraintInfo[];
  constraint_count: number;
  last_analyzed_at: string | null;
  sample_data: Record<string, unknown>[];
  ddl: string;
}

export async function getCatalogTableDetail(projectId: number, tableName: string): Promise<TableDetail> {
  const { data } = await apiClient.get<TableDetail>(
    `/projects/${projectId}/catalog/tables/${encodeURIComponent(tableName)}`
  );
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

export type ConfidenceTier = 'high' | 'medium' | 'low';
export type RelationshipStatus = 'auto_accepted' | 'pending' | 'accepted' | 'rejected';

export interface RelationshipExplanation {
  reasons?: string[];
  signals?: Record<string, boolean>;
  raw_scores?: Record<string, number>;
}

export interface RelationshipResponse {
  id: number;
  project_id: number;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  name_similarity_score: number;
  value_overlap_score: number;
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  explanation: RelationshipExplanation | null;
  status: RelationshipStatus;
}

export interface RelationshipListResponse {
  project_id: number;
  total_inferred: number;
  auto_accepted: number;
  pending_review: number;
  relationships: RelationshipResponse[];
}

export async function inferRelationships(projectId: number): Promise<RelationshipListResponse> {
  const { data } = await apiClient.post<RelationshipListResponse>(`/projects/${projectId}/infer-relationships`);
  return data;
}

export async function getRelationships(projectId: number): Promise<RelationshipListResponse> {
  const { data } = await apiClient.get<RelationshipListResponse>(`/projects/${projectId}/relationships`);
  return data;
}

export async function decideRelationship(
  projectId: number,
  relationshipId: number,
  status: RelationshipStatus
): Promise<RelationshipResponse> {
  const { data } = await apiClient.patch<RelationshipResponse>(
    `/projects/${projectId}/relationships/${relationshipId}/decide`,
    { status }
  );
  return data;
}

export async function bulkAcceptRelationships(projectId: number): Promise<RelationshipListResponse> {
  const { data } = await apiClient.post<RelationshipListResponse>(
    `/projects/${projectId}/relationships/bulk-accept`
  );
  return data;
}

export type IssueSeverity = 'critical' | 'warning';

export interface QualityIssue {
  severity: IssueSeverity;
  table: string;
  column: string | null;
  issue_type: string;
  description: string;
  metric: number | null;
}

export interface TableQualityScore {
  table_name: string;
  score: number;
  status: string;
  issue_count: number;
}

export interface IssueImpactSummary {
  duplicate_records: number;
  duplicate_tables: number;
  missing_values: number;
  missing_value_tables: number;
  invalid_formats: number;
  invalid_format_tables: number;
}

export interface QualityReportResponse {
  project_id: number;
  run_id: number;
  profiled_at: string;
  overall_score: number;
  completeness_score: number;
  uniqueness_score: number;
  consistency_score: number;
  potential_score: number;
  total_issues: number;
  critical_issues: number;
  warning_issues: number;
  issues: QualityIssue[];
  table_scores: TableQualityScore[];
  issue_impact: IssueImpactSummary;
}

export async function generateQualityReport(projectId: number): Promise<QualityReportResponse> {
  const { data } = await apiClient.post<QualityReportResponse>(`/projects/${projectId}/quality-report`);
  return data;
}

export async function getQualityReport(projectId: number): Promise<QualityReportResponse> {
  const { data } = await apiClient.get<QualityReportResponse>(`/projects/${projectId}/quality-report`);
  return data;
}

export async function exportQualityReport(projectId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/projects/${projectId}/quality-report/export`, {
    responseType: 'blob',
  });
  return data;
}

export interface ProfilingResponse {
  project_id: number;
  run_id: number;
  table_count: number;
  total_columns_profiled: number;
}

export async function runProfiling(projectId: number): Promise<ProfilingResponse> {
  const { data } = await apiClient.post<ProfilingResponse>(`/projects/${projectId}/profile`);
  return data;
}

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------

export interface SandboxExecuteResponse {
  project_id: number;
  success: boolean;
  message: string;
  tables_loaded: string[];
}

export interface SandboxRefreshResponse {
  project_id: number;
  refreshed_tables: string[];
  timestamp: string;
}

export interface SandboxStatusResponse {
  project_id: number;
  initialized: boolean;
  source_tables: string[];
  warehouse_tables: string[];
  has_warehouse: boolean;
  total_rows: number | null;
  last_synced_at: string | null;
}

export async function initializeSandbox(projectId: number): Promise<SandboxExecuteResponse> {
  const { data } = await apiClient.post<SandboxExecuteResponse>(`/projects/${projectId}/sandbox/initialize`);
  return data;
}

export async function refreshSandbox(projectId: number): Promise<SandboxRefreshResponse> {
  const { data } = await apiClient.post<SandboxRefreshResponse>(`/projects/${projectId}/sandbox/refresh`);
  return data;
}

export async function getSandboxStatus(projectId: number): Promise<SandboxStatusResponse> {
  const { data } = await apiClient.get<SandboxStatusResponse>(`/projects/${projectId}/sandbox/status`);
  return data;
}

// ---------------------------------------------------------------------------
// Cleaning
// ---------------------------------------------------------------------------

export type CleaningConfidence = 'high' | 'medium' | 'low';
export type CleaningStatus = 'pending' | 'approved' | 'rejected';

export interface CleaningRecommendation {
  id: number;
  project_id: number;
  operation: string;
  table_name: string;
  column_name: string | null;
  reason: string | null;
  expected_impact: string | null;
  confidence: CleaningConfidence | null;
  sql_hint: string | null;
  sandbox_sql: string | null;
  status: CleaningStatus;
  applied: boolean;
  applied_at: string | null;
  execution_error: string | null;
}

export interface CleaningListResponse {
  project_id: number;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  recommendations: CleaningRecommendation[];
}

export type CleaningBulkAction = 'approve_high_confidence' | 'reject_low_confidence' | 'reset_all';

export interface CleaningPreviewResult {
  recommendation_id: number;
  operation: string;
  table_name: string;
  column_name: string | null;
  before: number;
  after: number;
  error: string | null;
}

export interface CleaningPreviewResponse {
  project_id: number;
  results: CleaningPreviewResult[];
}

export interface CleaningApplyResult {
  recommendation_id: number;
  success: boolean;
  error: string | null;
}

export interface CleaningApplyResponse {
  project_id: number;
  results: CleaningApplyResult[];
  applied_count: number;
  failed_count: number;
}

export async function getCleaningRecommendations(projectId: number): Promise<CleaningListResponse> {
  const { data } = await apiClient.get<CleaningListResponse>(`/projects/${projectId}/cleaning-recommendations`);
  return data;
}

export async function decideCleaningRecommendation(
  projectId: number,
  recId: number,
  status: CleaningStatus
): Promise<CleaningRecommendation> {
  const { data } = await apiClient.patch<CleaningRecommendation>(
    `/projects/${projectId}/cleaning-recommendations/${recId}/decide`,
    { status }
  );
  return data;
}

export async function bulkDecideCleaningRecommendations(
  projectId: number,
  action: CleaningBulkAction
): Promise<CleaningListResponse> {
  const { data } = await apiClient.post<CleaningListResponse>(
    `/projects/${projectId}/cleaning-recommendations/bulk-decide`,
    { action }
  );
  return data;
}

export async function previewCleaning(projectId: number): Promise<CleaningPreviewResponse> {
  const { data } = await apiClient.post<CleaningPreviewResponse>(`/projects/${projectId}/cleaning/preview`);
  return data;
}

export async function applyCleaningRecommendations(
  projectId: number,
  recommendationIds?: number[]
): Promise<CleaningApplyResponse> {
  const { data } = await apiClient.post<CleaningApplyResponse>(`/projects/${projectId}/cleaning/apply`, {
    recommendation_ids: recommendationIds ?? null,
  });
  return data;
}

// ---------------------------------------------------------------------------
// SQL Workspace
// ---------------------------------------------------------------------------

export type SqlEnvironment = 'source' | 'warehouse';

export interface SQLExecuteResponse {
  success: boolean;
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number | null;
  error: string | null;
}

export async function executeSql(
  projectId: number,
  sql: string,
  environment: SqlEnvironment = 'source'
): Promise<SQLExecuteResponse> {
  const { data } = await apiClient.post<SQLExecuteResponse>(`/projects/${projectId}/sql/execute`, {
    sql,
    environment,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------------

export interface MeasureColumn {
  column_name: string;
  data_type: string;
  suggested_aggregations: string[];
}

export interface WarehouseDimensionColumn {
  column_name: string;
  data_type: string;
  is_date: boolean;
  is_descriptive: boolean;
}

export interface WarehouseForeignKey {
  column_name: string;
  references_table: string;
  references_warehouse_table: string;
  references_column: string | null;
}

export interface FactTableDesign {
  source_table: string;
  warehouse_table: string;
  fact_score: number;
  measures: MeasureColumn[];
  dimensions: WarehouseDimensionColumn[];
  foreign_keys: WarehouseForeignKey[];
  primary_key: string[];
  row_count: number;
  ddl: string;
  classification_reasons: string[];
}

export interface DimensionTableDesign {
  source_table: string;
  warehouse_table: string;
  attributes: WarehouseDimensionColumn[];
  foreign_keys: WarehouseForeignKey[];
  primary_key: string[];
  row_count: number;
  ddl: string;
  classification_reasons: string[];
}

export type WarehouseSchemaType = 'star' | 'snowflake';

export interface WarehouseDesignResponse {
  project_id: number;
  design_id: number;
  schema_type: WarehouseSchemaType;
  fact_count: number;
  dimension_count: number;
  fact_tables: FactTableDesign[];
  dimension_tables: DimensionTableDesign[];
  full_ddl: string;
  full_ddl_postgres: string | null;
  full_ddl_duckdb: string | null;
  is_approved: boolean;
}

export async function generateWarehouseDesign(projectId: number): Promise<WarehouseDesignResponse> {
  const { data } = await apiClient.post<WarehouseDesignResponse>(`/projects/${projectId}/warehouse-design`);
  return data;
}

export async function getWarehouseDesign(projectId: number): Promise<WarehouseDesignResponse> {
  const { data } = await apiClient.get<WarehouseDesignResponse>(`/projects/${projectId}/warehouse-design`);
  return data;
}

export async function approveWarehouseDesign(
  projectId: number,
  isApproved: boolean
): Promise<WarehouseDesignResponse> {
  const { data } = await apiClient.patch<WarehouseDesignResponse>(
    `/projects/${projectId}/warehouse-design/approve`,
    { is_approved: isApproved }
  );
  return data;
}

export type WarehouseClassification = 'fact' | 'dimension';

export async function overrideWarehouseClassification(
  projectId: number,
  tableName: string,
  classification: WarehouseClassification
): Promise<WarehouseDesignResponse> {
  const { data } = await apiClient.patch<WarehouseDesignResponse>(
    `/projects/${projectId}/warehouse-design/classify`,
    { table_name: tableName, classification }
  );
  return data;
}

export interface WarehouseTableResult {
  table_name: string;
  row_count: number | null;
}

export type ValidationStatus = 'passed' | 'warning' | 'error';

export interface JoinValidation {
  fact_table: string;
  dimension_table: string;
  foreign_key_column: string;
  orphan_count: number | null;
  status: ValidationStatus;
  error: string | null;
}

export interface AggregationValidation {
  table: string;
  column: string;
  aggregation: string;
  result: number | null;
  status: 'passed' | 'error';
  error: string | null;
}

export interface WarehousePreviewResponse {
  project_id: number;
  status: 'success' | 'warning' | 'failed';
  sandbox_initialized: boolean;
  tables_created: WarehouseTableResult[];
  join_validations: JoinValidation[];
  aggregation_validations: AggregationValidation[];
  execution_time_ms: number;
}

export async function previewWarehouse(projectId: number): Promise<WarehousePreviewResponse> {
  const { data } = await apiClient.post<WarehousePreviewResponse>(
    `/projects/${projectId}/warehouse-design/preview`
  );
  return data;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export type KPIStatus = 'pending' | 'approved' | 'skipped';
export type KPIConfidenceTier = 'High' | 'Medium' | 'Low';

export interface KPIItem {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  sql: string;
  mode: string;
  confidence_score: number;
  confidence_label?: KPIConfidenceTier;
  computed_value: number | null;
  formatted_value: string | null;
  reasoning?: string | null;
  evidence?: Record<string, unknown> | null;
  status: KPIStatus;
  is_approved: boolean;
  error_message?: string | null;
  created_at?: string;
}

export interface KPIListResponse {
  project_id: number;
  mode: string;
  total: number;
  approved: number;
  pending: number;
  skipped: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  low_confidence_count: number;
  kpis: KPIItem[];
}

export async function getProjectKpis(projectId: number, mode?: string): Promise<KPIListResponse> {
  const { data } = await apiClient.get<KPIListResponse>(`/projects/${projectId}/kpis`, {
    params: mode ? { mode } : undefined,
  });
  return data;
}

export async function generateProjectKpis(projectId: number, mode?: string): Promise<KPIListResponse> {
  const { data } = await apiClient.post<KPIListResponse>(`/projects/${projectId}/kpis/generate`, {
    mode: mode ?? 'source',
  });
  return data;
}

export async function approveKpi(projectId: number, kpiId: number): Promise<KPIItem> {
  const { data } = await apiClient.post<KPIItem>(`/projects/${projectId}/kpis/${kpiId}/approve`);
  return data;
}

export async function skipKpi(projectId: number, kpiId: number): Promise<KPIItem> {
  const { data } = await apiClient.post<KPIItem>(`/projects/${projectId}/kpis/${kpiId}/skip`);
  return data;
}

export async function restoreKpi(projectId: number, kpiId: number): Promise<KPIItem> {
  const { data } = await apiClient.post<KPIItem>(`/projects/${projectId}/kpis/${kpiId}/restore`);
  return data;
}

export async function unapproveKpi(projectId: number, kpiId: number): Promise<KPIItem> {
  const { data } = await apiClient.post<KPIItem>(`/projects/${projectId}/kpis/${kpiId}/unapprove`);
  return data;
}

export async function bulkApproveHighConfidenceKpis(projectId: number, mode?: string): Promise<KPIListResponse> {
  const { data } = await apiClient.post<KPIListResponse>(`/projects/${projectId}/kpis/bulk-approve`, {
    mode: mode ?? 'source',
  });
  return data;
}

export async function setProjectAnalysisMode(
  projectId: number,
  mode: 'source' | 'warehouse'
): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${projectId}`, {
    analysis_mode: mode,
  });
  return data;
}


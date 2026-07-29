import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  testPostgresConnection,
  extractErrorMessage,
  type PostgresConnectionRequest,
  type ConnectionTestResponse,
} from '@/lib/api';

const SSL_MODES = ['disable', 'prefer', 'require', 'verify-ca', 'verify-full'] as const;

const fieldLabelStyle = {
  display: 'block',
  fontSize: 12.5,
  color: 'rgba(226, 232, 240, 0.65)',
  marginBottom: 6,
} as const;

const inputStyle = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(2, 3, 5, 0.6)',
  color: '#f4f4f5',
  fontSize: 13.5,
  outline: 'none',
} as const;

export interface PostgresFormState {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  sslmode: (typeof SSL_MODES)[number];
  schema: string;
}

export const EMPTY_POSTGRES_FORM: PostgresFormState = {
  host: '',
  port: '5432',
  database: '',
  username: '',
  password: '',
  sslmode: 'require',
  schema: 'public',
};

export function buildConnectionString(form: PostgresFormState): PostgresConnectionRequest {
  const auth = form.username
    ? `${encodeURIComponent(form.username)}${form.password ? `:${encodeURIComponent(form.password)}` : ''}@`
    : '';
  const connection_string = `postgresql://${auth}${form.host}:${form.port}/${form.database}?sslmode=${form.sslmode}`;
  return { connection_string, source_schema: form.schema.trim() || 'public' };
}

interface PostgresConnectFormProps {
  projectId: number;
  form: PostgresFormState;
  onChange: (form: PostgresFormState) => void;
  testResult: ConnectionTestResponse | null;
  onTestResult: (result: ConnectionTestResponse | null) => void;
}

export default function PostgresConnectForm({
  projectId,
  form,
  onChange,
  testResult,
  onTestResult,
}: PostgresConnectFormProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  function update<K extends keyof PostgresFormState>(key: K, value: PostgresFormState[K]) {
    onChange({ ...form, [key]: value });
    onTestResult(null);
  }

  const canTest = form.host.trim() && form.port.trim() && form.database.trim() && form.username.trim();

  async function handleTest() {
    if (!canTest || isTesting) return;
    setIsTesting(true);
    setTestError(null);
    onTestResult(null);
    try {
      const payload = buildConnectionString(form);
      const result = await testPostgresConnection(projectId, payload);
      onTestResult(result);
    } catch (err) {
      setTestError(extractErrorMessage(err, 'Could not reach the server to test this connection.'));
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label htmlFor="pg-host" style={fieldLabelStyle}>
            Host
          </label>
          <input
            id="pg-host"
            type="text"
            value={form.host}
            onChange={(e) => update('host', e.target.value)}
            placeholder="db.example.com"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="pg-port" style={fieldLabelStyle}>
            Port
          </label>
          <input
            id="pg-port"
            type="text"
            inputMode="numeric"
            value={form.port}
            onChange={(e) => update('port', e.target.value)}
            placeholder="5432"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label htmlFor="pg-database" style={fieldLabelStyle}>
            Database
          </label>
          <input
            id="pg-database"
            type="text"
            value={form.database}
            onChange={(e) => update('database', e.target.value)}
            placeholder="analytics"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="pg-username" style={fieldLabelStyle}>
            Username
          </label>
          <input
            id="pg-username"
            type="text"
            autoComplete="off"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            placeholder="stratum_reader"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label htmlFor="pg-password" style={fieldLabelStyle}>
            Password
          </label>
          <input
            id="pg-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="pg-sslmode" style={fieldLabelStyle}>
            SSL mode
          </label>
          <select
            id="pg-sslmode"
            value={form.sslmode}
            onChange={(e) => update('sslmode', e.target.value as PostgresFormState['sslmode'])}
            style={inputStyle}
          >
            {SSL_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 18, maxWidth: '50%' }}>
        <label htmlFor="pg-schema" style={fieldLabelStyle}>
          Schema
        </label>
        <input
          id="pg-schema"
          type="text"
          value={form.schema}
          onChange={(e) => update('schema', e.target.value)}
          placeholder="public"
          style={inputStyle}
        />
      </div>

      <button
        type="button"
        onClick={handleTest}
        disabled={!canTest || isTesting}
        className="flex items-center justify-center"
        style={{
          gap: 8,
          height: 38,
          padding: '0 16px',
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.28)',
          background: 'rgba(148, 163, 184, 0.06)',
          color: '#f4f4f5',
          fontSize: 13,
          fontWeight: 500,
          cursor: canTest && !isTesting ? 'pointer' : 'not-allowed',
          opacity: canTest ? 1 : 0.5,
        }}
      >
        {isTesting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        {isTesting ? 'Testing connection...' : 'Test Connection'}
      </button>

      {testError && (
        <p role="alert" style={{ fontSize: 13, color: '#f87171', marginTop: 14 }}>
          {testError}
        </p>
      )}

      {testResult && (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 8,
            border: testResult.success
              ? '1px solid rgba(111, 105, 255, 0.35)'
              : '1px solid rgba(248, 113, 113, 0.3)',
            background: testResult.success ? 'rgba(99, 102, 241, 0.07)' : 'rgba(248, 113, 113, 0.06)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            {testResult.success ? (
              <CheckCircle2 size={15} color="#a5b4fc" aria-hidden="true" />
            ) : (
              <XCircle size={15} color="#f87171" aria-hidden="true" />
            )}
            <span style={{ fontSize: 13.5, fontWeight: 600, color: testResult.success ? '#e0e7ff' : '#f87171' }}>
              {testResult.success ? 'Connection successful' : 'Connection failed'}
            </span>
          </div>
          {!testResult.success && (
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.6)', marginTop: 6, marginLeft: 23 }}>
              {testResult.message}
            </p>
          )}
          {testResult.success && (
            <div style={{ marginTop: 8, marginLeft: 23, fontSize: 12.5, color: 'rgba(226, 232, 240, 0.65)' }}>
              {typeof testResult.tables_found === 'number' && (
                <div>Tables available: {testResult.tables_found}</div>
              )}
              {testResult.schemas_available && testResult.schemas_available.length > 0 && (
                <div style={{ marginTop: 2 }}>Schemas: {testResult.schemas_available.join(', ')}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

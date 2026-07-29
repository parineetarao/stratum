import { useState } from 'react';
import { Database, FileSpreadsheet } from 'lucide-react';
import { connectPostgres, discoverSchema, extractErrorMessage, type ProjectDomain } from '@/lib/api';
import { buildConnectionString, type PostgresFormState } from './PostgresConnectForm';
import type { SourceType } from './SourceSelectStep';

interface ReviewStepProps {
  projectId: number;
  name: string;
  description: string;
  domain: ProjectDomain | '';
  sourceType: SourceType;
  postgresForm: PostgresFormState;
  csvFileName: string | null;
  onBack: () => void;
  onCreated: () => void;
}

const rowStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0' } as const;
const labelStyle = { fontSize: 13, color: 'rgba(226, 232, 240, 0.55)' } as const;
const valueStyle = { fontSize: 13, color: '#f4f4f5', fontWeight: 500, textAlign: 'right' as const };

export default function ReviewStep({
  projectId,
  name,
  description,
  domain,
  sourceType,
  postgresForm,
  csvFileName,
  onBack,
  onCreated,
}: ReviewStepProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      if (sourceType === 'postgresql') {
        const payload = buildConnectionString(postgresForm);
        await connectPostgres(projectId, payload);
      }
      try {
        await discoverSchema(projectId);
      } catch {
        // Best-effort — schema can be discovered later from the project workspace.
      }
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create the project. Please try again.'));
      setIsCreating(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: 28,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 4 }}>
        Review and create
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)', marginBottom: 18 }}>
        Confirm the details below before creating your project.
      </p>

      <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <div style={{ ...rowStyle, borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <span style={labelStyle}>Project name</span>
          <span style={valueStyle}>{name}</span>
        </div>
        {description && (
          <div style={{ ...rowStyle, borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
            <span style={labelStyle}>Description</span>
            <span style={{ ...valueStyle, maxWidth: 320 }}>{description}</span>
          </div>
        )}
        <div style={{ ...rowStyle, borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <span style={labelStyle}>Domain</span>
          <span style={valueStyle}>{domain || 'None'}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Data source</span>
          <span className="flex items-center" style={{ ...valueStyle, gap: 6, justifyContent: 'flex-end' }}>
            {sourceType === 'postgresql' ? (
              <>
                <Database size={13} aria-hidden="true" />
                {postgresForm.database || 'PostgreSQL'} @ {postgresForm.host}
              </>
            ) : (
              <>
                <FileSpreadsheet size={13} aria-hidden="true" />
                {csvFileName ?? 'Uploaded file'}
              </>
            )}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 13, color: '#f87171', marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 24 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={isCreating}
          style={{
            height: 40,
            padding: '0 16px',
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            background: 'transparent',
            color: 'rgba(226, 232, 240, 0.75)',
            fontSize: 13.5,
            cursor: isCreating ? 'not-allowed' : 'pointer',
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.75 : 1,
          }}
        >
          {isCreating ? 'Creating project...' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}

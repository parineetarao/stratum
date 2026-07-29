'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import PostgresConnectForm, {
  buildConnectionString,
  type PostgresFormState,
} from '@/components/projects/new/PostgresConnectForm';
import {
  connectPostgres,
  extractErrorMessage,
  type Connection,
  type ConnectionTestResponse,
  type PostgresConnectionDetails,
} from '@/lib/api';

function initialFormState(details: PostgresConnectionDetails | null): PostgresFormState {
  return {
    host: details?.host ?? '',
    port: details?.port ? String(details.port) : '5432',
    database: details?.database ?? '',
    username: details?.user ?? '',
    password: '',
    sslmode: (details?.sslmode as PostgresFormState['sslmode']) ?? 'require',
    schema: details?.source_schema ?? 'public',
  };
}

interface EditConnectionDialogProps {
  projectId: number;
  currentDetails: PostgresConnectionDetails | null;
  onClose: () => void;
  onUpdated: (connection: Connection) => void;
}

export default function EditConnectionDialog({
  projectId,
  currentDetails,
  onClose,
  onUpdated,
}: EditConnectionDialogProps) {
  const [form, setForm] = useState<PostgresFormState>(() => initialFormState(currentDetails));
  const [testResult, setTestResult] = useState<ConnectionTestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = Boolean(testResult?.success) && form.password.trim().length > 0;

  async function handleSave() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = buildConnectionString(form);
      const connection = await connectPostgres(projectId, payload);
      onUpdated(connection);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update this connection. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 3, 5, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 20,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#07090d',
          padding: 26,
          margin: '20px 0',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 4 }}>
          Edit Connection
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)', marginBottom: 20 }}>
          Update your database credentials. For security, re-enter the password and test the
          connection before saving.
        </p>

        <PostgresConnectForm
          projectId={projectId}
          form={form}
          onChange={setForm}
          testResult={testResult}
          onTestResult={setTestResult}
        />

        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#f87171', marginTop: 14 }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'transparent',
              color: 'rgba(226, 232, 240, 0.75)',
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="flex items-center justify-center"
            style={{
              gap: 8,
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: canSave && !isSaving ? 'pointer' : 'not-allowed',
              opacity: canSave ? 1 : 0.5,
            }}
          >
            {isSaving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {isSaving ? 'Saving...' : 'Save Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

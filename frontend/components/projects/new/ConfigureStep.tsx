import PostgresConnectForm, { type PostgresFormState } from './PostgresConnectForm';
import CsvUploadForm from './CsvUploadForm';
import type { SourceType } from './SourceSelectStep';
import type { Connection, ConnectionTestResponse, TableMetadata } from '@/lib/api';

interface ConfigureStepProps {
  projectId: number;
  sourceType: SourceType;
  postgresForm: PostgresFormState;
  onPostgresFormChange: (form: PostgresFormState) => void;
  pgTestResult: ConnectionTestResponse | null;
  onPgTestResult: (result: ConnectionTestResponse | null) => void;
  csvConnection: Connection | null;
  onCsvConnected: (connection: Connection, preview: TableMetadata | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function ConfigureStep({
  projectId,
  sourceType,
  postgresForm,
  onPostgresFormChange,
  pgTestResult,
  onPgTestResult,
  csvConnection,
  onCsvConnected,
  onBack,
  onContinue,
}: ConfigureStepProps) {
  const canContinue = sourceType === 'postgresql' ? Boolean(pgTestResult?.success) : Boolean(csvConnection);

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
        {sourceType === 'postgresql' ? 'Configure PostgreSQL connection' : 'Configure CSV upload'}
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)', marginBottom: 22 }}>
        {sourceType === 'postgresql'
          ? 'Enter your database credentials and test the connection before continuing.'
          : 'Upload your dataset. It will be validated automatically once received.'}
      </p>

      {sourceType === 'postgresql' ? (
        <PostgresConnectForm
          projectId={projectId}
          form={postgresForm}
          onChange={onPostgresFormChange}
          testResult={pgTestResult}
          onTestResult={onPgTestResult}
        />
      ) : (
        <CsvUploadForm projectId={projectId} connection={csvConnection} onConnected={onCsvConnected} />
      )}

      <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 24 }}>
        <button
          type="button"
          onClick={onBack}
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
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            opacity: canContinue ? 1 : 0.45,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

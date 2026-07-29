'use client';

import CsvUploadForm from '@/components/projects/new/CsvUploadForm';
import type { Connection, TableMetadata } from '@/lib/api';

interface ReplaceCsvDialogProps {
  projectId: number;
  connection: Connection | null;
  onClose: () => void;
  onReplaced: (connection: Connection, preview: TableMetadata | null) => void;
}

export default function ReplaceCsvDialog({ projectId, connection, onClose, onReplaced }: ReplaceCsvDialogProps) {
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
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#07090d',
          padding: 26,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 4 }}>
          Replace Dataset
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)', marginBottom: 20 }}>
          Uploading a new file replaces the current dataset. Previously discovered metadata will
          be re-scanned.
        </p>

        <CsvUploadForm
          projectId={projectId}
          connection={connection}
          onConnected={(nextConnection, preview) => {
            onReplaced(nextConnection, preview);
          }}
        />

        <div className="flex items-center justify-end" style={{ marginTop: 22 }}>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

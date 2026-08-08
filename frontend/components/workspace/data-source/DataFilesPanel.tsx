import { useCallback, useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Plus, Trash2, XCircle } from 'lucide-react';
import {
  connectFiles,
  deleteConnectionFile,
  listConnectionFiles,
  extractErrorMessage,
  type ConnectionFile,
} from '@/lib/api';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

interface DataFilesPanelProps {
  projectId: number;
  onFilesChanged: () => void;
}

export default function DataFilesPanel({ projectId, onFilesChanged }: DataFilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ConnectionFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    listConnectionFiles(projectId)
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  useEffect(() => load(), [load]);

  async function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      await connectFiles(projectId, Array.from(fileList));
      load();
      onFilesChanged();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not upload these files. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove(file: ConnectionFile) {
    setError(null);
    setRemovingId(file.id);
    try {
      await deleteConnectionFile(projectId, file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      onFilesChanged();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not remove this file.'));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: 22,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>Data Files</h2>
          <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)', marginTop: 2 }}>
            Each file becomes one table. Upload more files any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 12px',
            borderRadius: 7,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            background: 'rgba(148, 163, 184, 0.06)',
            color: '#f4f4f5',
            fontSize: 12.5,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.6 : 1,
          }}
        >
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus size={14} aria-hidden="true" />
          )}
          Add files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            handleAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="flex items-center" style={{ gap: 7, marginBottom: 14 }}>
          <XCircle size={14} color="#f87171" aria-hidden="true" />
          <p role="alert" style={{ fontSize: 13, color: '#f87171' }}>
            {error}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center" style={{ padding: '24px 0' }}>
          <Loader2 size={18} className="animate-spin" color="#8b7dff" aria-hidden="true" />
        </div>
      ) : files.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.5)', padding: '12px 0' }}>
          No files uploaded yet.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                borderRadius: 9,
                border: '1px solid rgba(148, 163, 184, 0.18)',
                background: 'rgba(148, 163, 184, 0.04)',
                padding: '12px 14px',
              }}
            >
              <div className="flex items-start justify-between" style={{ gap: 8 }}>
                <div className="flex items-center" style={{ gap: 9, minWidth: 0 }}>
                  <FileSpreadsheet size={16} color="rgba(226, 232, 240, 0.6)" aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#f4f4f5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={file.original_filename}
                    >
                      {file.original_filename}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.45)', marginTop: 2 }}>
                      table: {file.table_name} · {file.file_type.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(file)}
                  disabled={removingId === file.id}
                  aria-label={`Remove ${file.original_filename}`}
                  style={{
                    flexShrink: 0,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(248, 113, 113, 0.75)',
                    cursor: removingId === file.id ? 'not-allowed' : 'pointer',
                    padding: 4,
                  }}
                >
                  {removingId === file.id ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={14} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

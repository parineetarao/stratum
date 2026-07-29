import { useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { connectFile, discoverSchema, extractErrorMessage, type Connection, type TableMetadata } from '@/lib/api';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface CsvUploadFormProps {
  projectId: number;
  connection: Connection | null;
  onConnected: (connection: Connection, preview: TableMetadata | null) => void;
}

export default function CsvUploadForm({ projectId, connection, onConnected }: CsvUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(
    connection?.original_filename ? { name: connection.original_filename, size: 0 } : null
  );
  const [preview, setPreview] = useState<TableMetadata | null>(null);

  async function processFile(file: File) {
    if (!hasAcceptedExtension(file.name)) {
      setError('Only CSV and Excel files are supported.');
      return;
    }

    setSelectedFile({ name: file.name, size: file.size });
    setError(null);
    setPreview(null);
    setIsProcessing(true);

    try {
      const nextConnection = await connectFile(projectId, file);
      let tablePreview: TableMetadata | null = null;
      try {
        const schema = await discoverSchema(projectId);
        tablePreview = schema.tables[0] ?? null;
        setPreview(tablePreview);
      } catch {
        // Preview is best-effort — the connection itself already succeeded.
      }
      onConnected(nextConnection, tablePreview);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not upload this file. Please try again.'));
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        style={{
          borderRadius: 10,
          border: isDragging ? '1px solid rgba(111, 105, 255, 0.7)' : '1px dashed rgba(148, 163, 184, 0.28)',
          background: isDragging ? 'rgba(99, 102, 241, 0.07)' : 'rgba(148, 163, 184, 0.03)',
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = '';
          }}
        />
        <UploadCloud size={24} strokeWidth={1.5} color="rgba(226, 232, 240, 0.5)" style={{ margin: '0 auto 12px' }} aria-hidden="true" />
        <p style={{ fontSize: 13.5, color: '#f4f4f5', marginBottom: 4 }}>
          Click to upload or drag and drop
        </p>
        <p style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.45)' }}>CSV, XLSX, or XLS</p>
      </div>

      {selectedFile && (
        <div
          className="flex items-center justify-between"
          style={{
            gap: 12,
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: 'rgba(148, 163, 184, 0.04)',
          }}
        >
          <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
            <FileText size={16} color="rgba(226, 232, 240, 0.6)" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: '#f4f4f5',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedFile.name}
              </div>
              {selectedFile.size > 0 && (
                <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              )}
            </div>
          </div>

          {isProcessing ? (
            <Loader2 size={15} className="animate-spin" color="rgba(226, 232, 240, 0.6)" aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                flexShrink: 0,
                height: 30,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: 'transparent',
                color: 'rgba(226, 232, 240, 0.75)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Replace
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center" style={{ gap: 7, marginTop: 14 }}>
          <XCircle size={14} color="#f87171" aria-hidden="true" />
          <p role="alert" style={{ fontSize: 13, color: '#f87171' }}>
            {error}
          </p>
        </div>
      )}

      {!isProcessing && !error && preview && (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid rgba(111, 105, 255, 0.35)',
            background: 'rgba(99, 102, 241, 0.07)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
            <CheckCircle2 size={15} color="#a5b4fc" aria-hidden="true" />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e0e7ff' }}>File validated</span>
          </div>
          <div style={{ marginLeft: 23, fontSize: 12.5, color: 'rgba(226, 232, 240, 0.65)' }}>
            <div>Row count: {preview.row_count.toLocaleString()}</div>
            <div style={{ marginTop: 2 }}>
              Detected columns ({preview.column_count}): {preview.columns.map((c) => c.name).join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

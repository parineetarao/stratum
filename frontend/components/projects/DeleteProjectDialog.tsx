'use client';

import { useState } from 'react';
import { deleteProject, extractErrorMessage, type Project } from '@/lib/api';

interface DeleteProjectDialogProps {
  project: Project;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

export default function DeleteProjectDialog({ project, onClose, onDeleted }: DeleteProjectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
      onDeleted(project.id);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete the project. Please try again.'));
      setIsDeleting(false);
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
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#07090d',
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 10 }}>
          Delete project
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.65)', marginBottom: 18 }}>
          This will permanently delete &ldquo;{project.name}&rdquo; and its connection data. This
          action cannot be undone.
        </p>

        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#f87171', marginBottom: 14 }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end" style={{ gap: 10 }}>
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
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.75 : 1,
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

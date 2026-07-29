'use client';

import { useState, type FormEvent } from 'react';
import { updateProject, extractErrorMessage, type Project } from '@/lib/api';

interface RenameProjectDialogProps {
  project: Project;
  onClose: () => void;
  onRenamed: (project: Project) => void;
}

export default function RenameProjectDialog({ project, onClose, onRenamed }: RenameProjectDialogProps) {
  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Project name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, { name: trimmed });
      onRenamed(updated);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not rename the project. Please try again.'));
    } finally {
      setIsSubmitting(false);
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
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background: '#07090d',
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 16 }}>
          Rename Project
        </h2>

        <label htmlFor="rename-project-name" style={{ display: 'block', fontSize: 13, color: 'rgba(226, 232, 240, 0.7)', marginBottom: 6 }}>
          Project name
        </label>
        <input
          id="rename-project-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          aria-invalid={Boolean(error)}
          style={{
            width: '100%',
            height: 42,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            background: 'rgba(2, 3, 5, 0.6)',
            color: '#f4f4f5',
            fontSize: 14,
            outline: 'none',
            marginBottom: 14,
          }}
        />

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
            type="submit"
            disabled={isSubmitting}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

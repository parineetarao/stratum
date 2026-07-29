'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Menu } from 'lucide-react';
import {
  createProject,
  updateProject,
  extractErrorMessage,
  type ProjectDomain,
  type Connection,
  type ConnectionTestResponse,
  type TableMetadata,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import Sidebar from '@/components/projects/Sidebar';
import StepIndicator from '@/components/projects/new/StepIndicator';
import ProjectDetailsStep from '@/components/projects/new/ProjectDetailsStep';
import SourceSelectStep, { type SourceType } from '@/components/projects/new/SourceSelectStep';
import ConfigureStep from '@/components/projects/new/ConfigureStep';
import ReviewStep from '@/components/projects/new/ReviewStep';
import { EMPTY_POSTGRES_FORM, type PostgresFormState } from '@/components/projects/new/PostgresConnectForm';

export default function NewProjectPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth < 1050;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [step, setStep] = useState(1);
  const hasCompletedRef = useRef(false);

  // Step 1 — project details
  const [projectId, setProjectId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<ProjectDomain | ''>('');
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Step 2 — source selection
  const [sourceType, setSourceType] = useState<SourceType | null>(null);

  // Step 3 — configure and validate
  const [postgresForm, setPostgresForm] = useState<PostgresFormState>(EMPTY_POSTGRES_FORM);
  const [pgTestResult, setPgTestResult] = useState<ConnectionTestResponse | null>(null);
  const [csvConnection, setCsvConnection] = useState<Connection | null>(null);
  const [, setCsvPreview] = useState<TableMetadata | null>(null);

  const isDirty = Boolean(name.trim() || description.trim() || domain || sourceType || projectId);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty || hasCompletedRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function handleBackToProjects() {
    if (isDirty && !hasCompletedRef.current) {
      const confirmed = window.confirm(
        'You have unsaved changes in this project setup. Leave without finishing?'
      );
      if (!confirmed) return;
    }
    router.push('/projects');
  }

  async function handleDetailsContinue() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setDetailsError('Project name is required.');
      return;
    }
    setDetailsError(null);
    setIsSavingDetails(true);
    try {
      if (projectId === null) {
        const project = await createProject({
          name: trimmedName,
          description: description.trim() || undefined,
          domain: domain || undefined,
        });
        setProjectId(project.id);
      } else {
        await updateProject(projectId, {
          name: trimmedName,
          description: description.trim(),
          domain: domain || undefined,
        });
      }
      setStep(2);
    } catch (err) {
      setDetailsError(extractErrorMessage(err, 'Could not save project details. Please try again.'));
    } finally {
      setIsSavingDetails(false);
    }
  }

  function handleSelectSource(type: SourceType) {
    if (type !== sourceType) {
      setSourceType(type);
      setPgTestResult(null);
      setCsvConnection(null);
      setCsvPreview(null);
    }
  }

  function handleCsvConnected(connection: Connection, preview: TableMetadata | null) {
    setCsvConnection(connection);
    setCsvPreview(preview);
  }

  function handleProjectCreated() {
    hasCompletedRef.current = true;
    if (projectId !== null) {
      router.push(`/projects/${projectId}`);
    }
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: '#020305' }}>
        <Loader2 size={28} className="animate-spin" color="#8b7dff" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020305', color: '#f4f4f5' }}>
      <Sidebar
        email={user?.email ?? ''}
        isOverlay={isCompact}
        isOpen={isCompact ? isMobileSidebarOpen : true}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <main
        className="flex flex-col items-center"
        style={{
          marginLeft: isCompact ? 0 : 214,
          padding: isCompact ? '24px 28px 60px' : '28px 52px 60px',
          minHeight: '100vh',
        }}
      >
        <div style={{ width: '100%', maxWidth: 760 }}>
          {isCompact && (
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open menu"
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(148, 163, 184, 0.06)',
                color: '#f4f4f5',
                marginBottom: 20,
                cursor: 'pointer',
              }}
            >
              <Menu size={17} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={handleBackToProjects}
            className="flex items-center"
            style={{
              gap: 6,
              border: 'none',
              background: 'transparent',
              color: 'rgba(226, 232, 240, 0.6)',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to Projects
          </button>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 650,
              letterSpacing: '-0.02em',
              color: '#f5f5f7',
              marginBottom: 6,
            }}
          >
            Create a new project
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.62)', marginBottom: 32 }}>
            Set up a workspace and connect its first data source.
          </p>

          <StepIndicator currentStep={step} />

          {step === 1 && (
            <ProjectDetailsStep
              name={name}
              onNameChange={setName}
              description={description}
              onDescriptionChange={setDescription}
              domain={domain}
              onDomainChange={setDomain}
              error={detailsError}
              isSubmitting={isSavingDetails}
              onCancel={handleBackToProjects}
              onContinue={handleDetailsContinue}
            />
          )}

          {step === 2 && (
            <SourceSelectStep
              selected={sourceType}
              onSelect={handleSelectSource}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && sourceType && projectId !== null && (
            <ConfigureStep
              projectId={projectId}
              sourceType={sourceType}
              postgresForm={postgresForm}
              onPostgresFormChange={setPostgresForm}
              pgTestResult={pgTestResult}
              onPgTestResult={setPgTestResult}
              csvConnection={csvConnection}
              onCsvConnected={handleCsvConnected}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
            />
          )}

          {step === 4 && sourceType && projectId !== null && (
            <ReviewStep
              projectId={projectId}
              name={name.trim()}
              description={description.trim()}
              domain={domain}
              sourceType={sourceType}
              postgresForm={postgresForm}
              csvFileName={csvConnection?.original_filename ?? null}
              onBack={() => setStep(3)}
              onCreated={handleProjectCreated}
            />
          )}
        </div>
      </main>
    </div>
  );
}

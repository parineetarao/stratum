import type { CSSProperties } from 'react';
import { PROJECT_DOMAINS, type ProjectDomain } from '@/lib/api';

const DOMAIN_LABELS: Record<ProjectDomain, string> = {
  banking: 'Banking',
  finance: 'Finance',
  retail: 'Retail',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  logistics: 'Logistics',
  education: 'Education',
  ecommerce: 'E-commerce',
  saas: 'SaaS',
  telecommunications: 'Telecommunications',
};

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: 'rgba(226, 232, 240, 0.7)',
  marginBottom: 7,
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(2, 3, 5, 0.6)',
  color: '#f4f4f5',
  fontSize: 14,
  outline: 'none',
};

interface ProjectDetailsStepProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  domain: ProjectDomain | '';
  onDomainChange: (value: ProjectDomain | '') => void;
  error: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export default function ProjectDetailsStep({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  domain,
  onDomainChange,
  error,
  isSubmitting,
  onCancel,
  onContinue,
}: ProjectDetailsStepProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: '#05070a',
        padding: 28,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 20 }}>
        Project details
      </h2>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="project-name" style={fieldLabelStyle}>
          Project name <span style={{ color: '#f87171' }}>*</span>
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="e.g. Retail Analytics"
          autoFocus
          aria-invalid={Boolean(error)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="project-description" style={fieldLabelStyle}>
          Description <span style={{ color: 'rgba(226, 232, 240, 0.4)' }}>(optional)</span>
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="What is this project for?"
          rows={3}
          style={{
            ...inputStyle,
            height: 'auto',
            padding: '10px 12px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginBottom: error ? 10 : 4 }}>
        <label htmlFor="project-domain" style={fieldLabelStyle}>
          Domain <span style={{ color: 'rgba(226, 232, 240, 0.4)' }}>(optional)</span>
        </label>
        <select
          id="project-domain"
          value={domain}
          onChange={(event) => onDomainChange(event.target.value as ProjectDomain | '')}
          style={{ ...inputStyle, color: domain ? '#f4f4f5' : 'rgba(226, 232, 240, 0.4)' }}
        >
          <option value="">No domain</option>
          {PROJECT_DOMAINS.map((value) => (
            <option key={value} value={value}>
              {DOMAIN_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 13, color: '#f87171', marginTop: 12 }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 22 }}>
        <button
          type="button"
          onClick={onCancel}
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
          onClick={onContinue}
          disabled={isSubmitting}
          style={{
            height: 40,
            padding: '0 20px',
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
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

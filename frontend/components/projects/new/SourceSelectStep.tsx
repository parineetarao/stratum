import { Database, FileSpreadsheet } from 'lucide-react';

export type SourceType = 'postgresql' | 'csv';

interface SourceOption {
  type: SourceType;
  title: string;
  description: string;
  icon: typeof Database;
}

const OPTIONS: SourceOption[] = [
  {
    type: 'postgresql',
    title: 'PostgreSQL',
    description: 'Connect an existing PostgreSQL database.',
    icon: Database,
  },
  {
    type: 'csv',
    title: 'CSV Upload',
    description: 'Upload a structured CSV dataset.',
    icon: FileSpreadsheet,
  },
];

interface SourceSelectStepProps {
  selected: SourceType | null;
  onSelect: (type: SourceType) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function SourceSelectStep({ selected, onSelect, onBack, onContinue }: SourceSelectStepProps) {
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
        Choose a data source
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(226, 232, 240, 0.55)', marginBottom: 20 }}>
        Select one source to connect to this project.
      </p>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type)}
              className="flex flex-col items-start text-left"
              style={{
                gap: 12,
                padding: 20,
                borderRadius: 10,
                cursor: 'pointer',
                border: isSelected
                  ? '1px solid rgba(111, 105, 255, 0.7)'
                  : '1px solid rgba(148, 163, 184, 0.2)',
                background: isSelected ? 'rgba(99, 102, 241, 0.07)' : 'rgba(148, 163, 184, 0.03)',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(148, 163, 184, 0.06)',
                  color: isSelected ? '#c4b5fd' : 'rgba(226, 232, 240, 0.75)',
                }}
              >
                <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#f5f5f7', marginBottom: 4 }}>
                  {option.title}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.55)' }}>
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

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
          disabled={!selected}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: selected ? 'pointer' : 'not-allowed',
            opacity: selected ? 1 : 0.45,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

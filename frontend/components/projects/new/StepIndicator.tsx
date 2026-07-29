import { Check } from 'lucide-react';

export interface StepDef {
  index: number;
  label: string;
}

export const STEPS: StepDef[] = [
  { index: 1, label: 'Project Details' },
  { index: 2, label: 'Choose Data Source' },
  { index: 3, label: 'Configure and Validate' },
  { index: 4, label: 'Create Project' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 0, marginBottom: 32 }}>
      {STEPS.map((step, i) => {
        const isComplete = step.index < currentStep;
        const isActive = step.index === currentStep;
        return (
          <div key={step.index} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div className="flex items-center" style={{ gap: 9 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  flexShrink: 0,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: isActive
                    ? '1px solid rgba(111, 105, 255, 0.7)'
                    : '1px solid rgba(148, 163, 184, 0.24)',
                  background: isComplete
                    ? 'linear-gradient(135deg, #6f35f4, #2ea7ff)'
                    : isActive
                    ? 'rgba(99, 102, 241, 0.12)'
                    : 'transparent',
                  color: isComplete || isActive ? '#f5f5f7' : 'rgba(226, 232, 240, 0.45)',
                }}
              >
                {isComplete ? <Check size={12} aria-hidden="true" /> : step.index}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive || isComplete ? '#f5f5f7' : 'rgba(226, 232, 240, 0.45)',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  minWidth: 24,
                  margin: '0 14px',
                  background: isComplete ? 'rgba(111, 105, 255, 0.5)' : 'rgba(148, 163, 184, 0.16)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

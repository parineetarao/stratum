import Link from 'next/link';
import { Check, AlertTriangle } from 'lucide-react';
import type { WorkflowStage } from '@/lib/api';
import { stageRoute } from '@/lib/workspaceNav';

interface ProgressTrackerProps {
  projectId: number;
  workflow: WorkflowStage[];
  overallProgressPct: number;
}

const STATUS_LABEL: Record<WorkflowStage['status'], string> = {
  completed: 'Completed',
  requires_review: 'Needs Review',
  in_progress: 'In Progress',
  pending: 'Pending',
};

function StepCircle({ stage, index }: { stage: WorkflowStage; index: number }) {
  if (stage.status === 'completed') {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6f35f4, #2ea7ff)',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <Check size={13} aria-hidden="true" />
      </div>
    );
  }

  if (stage.status === 'requires_review') {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1.5px solid #f59e0b',
          background: 'rgba(245, 158, 11, 0.1)',
          color: '#fbbf24',
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={12} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: stage.is_current ? '1.5px solid rgba(139, 92, 246, 0.7)' : '1.5px solid rgba(148, 163, 184, 0.24)',
        background: stage.is_current ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
        color: stage.is_current ? '#c4b5fd' : 'rgba(226, 232, 240, 0.4)',
        fontSize: 11.5,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {index + 1}
    </div>
  );
}

export default function ProgressTracker({ projectId, workflow, overallProgressPct }: ProgressTrackerProps) {
  const currentIndex = workflow.findIndex((s) => s.is_current);
  const stepLabel = currentIndex === -1 ? workflow.length : currentIndex + 1;

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div className="flex items-start" style={{ minWidth: workflow.length * 108 }}>
          {workflow.map((stage, index) => (
            <div key={stage.id} className="flex items-center" style={{ flex: index < workflow.length - 1 ? 1 : undefined }}>
              <Link
                href={stageRoute(projectId, stageRouteSegment(stage))}
                className="flex flex-col items-center text-center"
                style={{ gap: 8, textDecoration: 'none', width: 92 }}
              >
                <StepCircle stage={stage} index={index} />
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: stage.is_current ? 600 : 500,
                      color: stage.status === 'pending' && !stage.is_current ? 'rgba(226, 232, 240, 0.45)' : '#e2e8f0',
                    }}
                  >
                    {stage.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(226, 232, 240, 0.4)', marginTop: 2 }}>
                    {STATUS_LABEL[stage.status]}
                  </div>
                </div>
              </Link>
              {index < workflow.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    minWidth: 16,
                    margin: '0 4px',
                    marginTop: -20,
                    background:
                      stage.status === 'completed'
                        ? 'rgba(139, 92, 246, 0.5)'
                        : 'rgba(148, 163, 184, 0.16)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 14, marginTop: 22 }}>
        <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)', whiteSpace: 'nowrap' }}>
          Step {stepLabel} of {workflow.length}
        </span>
        <div
          style={{
            flex: 1,
            height: 5,
            borderRadius: 999,
            background: 'rgba(148, 163, 184, 0.14)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${overallProgressPct}%`,
              borderRadius: 999,
              background: 'linear-gradient(90deg, #8b5cf6, #2ea7ff)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', whiteSpace: 'nowrap' }}>
          {overallProgressPct}%
        </span>
      </div>
    </div>
  );
}

function stageRouteSegment(stage: WorkflowStage): string {
  return stage.route.replace(/^\//, '');
}

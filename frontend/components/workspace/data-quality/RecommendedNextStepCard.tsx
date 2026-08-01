import Link from 'next/link';
import { ArrowRight, CheckCircle2, Copy, FileWarning, Sparkles, TableProperties } from 'lucide-react';
import type { QualityReportResponse } from '@/lib/api';
import { stageRoute } from '@/lib/workspaceNav';

function Stat({
  icon: Icon,
  color,
  value,
  label,
  sublabel,
}: {
  icon: typeof Copy;
  color: string;
  value: number;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center" style={{ gap: 12 }}>
      <div
        className="flex items-center justify-center"
        style={{ width: 38, height: 38, borderRadius: 10, background: `${color}1a`, color, flexShrink: 0 }}
      >
        <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'rgba(226, 232, 240, 0.6)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.4)' }}>{sublabel}</div>
      </div>
    </div>
  );
}

export default function RecommendedNextStepCard({ report, projectId }: { report: QualityReportResponse; projectId: number }) {
  if (report.total_issues === 0) {
    return (
      <div
        className="flex items-center"
        style={{
          gap: 12,
          borderRadius: 12,
          border: '1px solid rgba(52, 211, 153, 0.25)',
          background: 'rgba(52, 211, 153, 0.05)',
          padding: '18px 22px',
        }}
      >
        <CheckCircle2 size={20} style={{ color: '#34d399' }} aria-hidden="true" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>No issues detected</div>
          <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)' }}>
            This dataset passed every quality check in the latest profiling run.
          </p>
        </div>
      </div>
    );
  }

  const impact = report.issue_impact;

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(139, 125, 255, 0.3)',
        background: 'rgba(139, 125, 255, 0.04)',
        padding: '20px 24px',
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 20, flexWrap: 'wrap' }}>
        <div className="flex items-start" style={{ gap: 12, minWidth: 260 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(139, 125, 255, 0.12)',
              color: '#a78bfa',
              flexShrink: 0,
            }}
          >
            <Sparkles size={17} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 650, color: '#f5f5f7', marginBottom: 4 }}>
              Recommended Next Step
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.55)', maxWidth: 360 }}>
              Addressing the issues below can improve your data quality score significantly.
            </p>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 32, flexWrap: 'wrap' }}>
          <Stat
            icon={Copy}
            color="#f87171"
            value={impact.duplicate_records}
            label="Duplicate Records"
            sublabel={`Across ${impact.duplicate_tables} table${impact.duplicate_tables === 1 ? '' : 's'}`}
          />
          <Stat
            icon={TableProperties}
            color="#fbbf24"
            value={impact.missing_values}
            label="Missing Values"
            sublabel={`Across ${impact.missing_value_tables} table${impact.missing_value_tables === 1 ? '' : 's'}`}
          />
          <Stat
            icon={FileWarning}
            color="#a78bfa"
            value={impact.invalid_formats}
            label="Invalid Formats"
            sublabel={`Across ${impact.invalid_format_tables} table${impact.invalid_format_tables === 1 ? '' : 's'}`}
          />
        </div>

        <div className="flex items-center" style={{ gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)', marginBottom: 4 }}>
              Estimated Improvement
            </div>
            <div className="flex items-center" style={{ gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{report.overall_score}</span>
              <ArrowRight size={13} style={{ color: 'rgba(226,232,240,0.4)' }} aria-hidden="true" />
              <span style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>{report.potential_score}</span>
            </div>
            {report.potential_score > report.overall_score && (
              <div style={{ fontSize: 11.5, color: '#34d399', marginTop: 2 }}>
                +{report.potential_score - report.overall_score} points
              </div>
            )}
          </div>

          <Link
            href={stageRoute(projectId, 'cleaning')}
            className="flex items-center justify-center"
            style={{
              gap: 7,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(100deg, #6f35f4 0%, #5169ff 55%, #2ea7ff 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Go to Cleaning
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

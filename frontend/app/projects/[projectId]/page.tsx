'use client';

import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import SummaryStrip from '@/components/workspace/overview/SummaryStrip';
import ProgressTracker from '@/components/workspace/overview/ProgressTracker';
import NextStepCard from '@/components/workspace/overview/NextStepCard';
import DataSourceHealthCard from '@/components/workspace/overview/DataSourceHealthCard';
import QualityCard from '@/components/workspace/overview/QualityCard';
import ActivityCard from '@/components/workspace/overview/ActivityCard';
import TablesCard from '@/components/workspace/overview/TablesCard';
import OverviewCard from '@/components/workspace/overview/OverviewCard';

export default function ProjectOverviewPage() {
  const { overview } = useWorkspace();
  const viewportWidth = useViewportWidth();

  const isNarrow = viewportWidth < 650;
  const isTablet = viewportWidth < 1050;

  const summaryColumns = isNarrow ? 1 : isTablet ? 2 : 4;
  const midColumns = isNarrow ? 1 : isTablet ? 2 : 3;
  const tablesColumns = isNarrow ? 1 : isTablet ? 2 : 3;

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <SummaryStrip overview={overview} columns={summaryColumns} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : '2fr 1fr',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        <OverviewCard title="Project Progress" subtitle="You're making great progress.">
          <ProgressTracker
            projectId={overview.project.id}
            workflow={overview.workflow}
            overallProgressPct={overview.overall_progress_pct}
          />
        </OverviewCard>

        <NextStepCard projectId={overview.project.id} nextStep={overview.next_step} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${midColumns}, minmax(0, 1fr))`,
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        <DataSourceHealthCard overview={overview} />
        <QualityCard overview={overview} />
        <ActivityCard activity={overview.activity} />
      </div>

      <TablesCard overview={overview} columns={tablesColumns} />
    </div>
  );
}

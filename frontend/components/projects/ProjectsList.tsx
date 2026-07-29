import type { Project } from '@/lib/api';
import type { ProjectWithConnection } from '@/lib/projectView';
import ProjectRow from './ProjectRow';

// Full desktop width keeps Current Stage and Progress as separate columns.
const WIDE_COLUMNS_TEMPLATE =
  'minmax(180px, 2.2fr) minmax(150px, 1.4fr) minmax(140px, 1fr) minmax(100px, 0.9fr) minmax(110px, 0.9fr) 40px';
// Tablet width (sidebar collapsed, table still used) merges Stage+Progress into
// one column so five columns fit without triggering horizontal scroll.
const COMPACT_COLUMNS_TEMPLATE =
  'minmax(160px, 2.2fr) minmax(130px, 1.3fr) minmax(130px, 1.1fr) minmax(90px, 0.9fr) 32px';

interface ProjectsListProps {
  items: ProjectWithConnection[];
  isNarrow: boolean;
  isCompact: boolean;
  onOpen: (project: Project) => void;
  onRenameRequest: (project: Project) => void;
  onDeleteRequest: (project: Project) => void;
}

export default function ProjectsList({
  items,
  isNarrow,
  isCompact,
  onOpen,
  onRenameRequest,
  onDeleteRequest,
}: ProjectsListProps) {
  const mergeStageProgress = isCompact && !isNarrow;
  const columnsTemplate = mergeStageProgress ? COMPACT_COLUMNS_TEMPLATE : WIDE_COLUMNS_TEMPLATE;
  if (items.length === 0) {
    return (
      <div
        style={{
          borderRadius: 12,
          background: '#05070a',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.5)' }}>
          No projects match your search or filter.
        </p>
      </div>
    );
  }

  if (isNarrow) {
    return (
      <div>
        {items.map((item) => (
          <ProjectRow
            key={item.project.id}
            item={item}
            columnsTemplate={columnsTemplate}
            isNarrow
            mergeStageProgress
            onOpen={() => onOpen(item.project)}
            onRenameRequest={() => onRenameRequest(item.project)}
            onDeleteRequest={() => onDeleteRequest(item.project)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        background: '#05070a',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        padding: isCompact ? '8px 14px' : '8px 20px',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columnsTemplate,
          gap: isCompact ? 10 : 16,
          padding: '10px 4px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'rgba(226, 232, 240, 0.4)',
        }}
      >
        <span>Project</span>
        <span>Data Source</span>
        <span>{mergeStageProgress ? 'Stage' : 'Current Stage'}</span>
        {!mergeStageProgress && <span>Progress</span>}
        <span>Last Updated</span>
        <span />
      </div>

      {items.map((item) => (
        <ProjectRow
          key={item.project.id}
          item={item}
          columnsTemplate={columnsTemplate}
          isNarrow={false}
          mergeStageProgress={mergeStageProgress}
          onOpen={() => onOpen(item.project)}
          onRenameRequest={() => onRenameRequest(item.project)}
          onDeleteRequest={() => onDeleteRequest(item.project)}
        />
      ))}
    </div>
  );
}

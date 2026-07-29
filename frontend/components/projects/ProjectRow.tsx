import { Database, FileSpreadsheet } from 'lucide-react';
import type { ProjectWithConnection } from '@/lib/projectView';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import ActionsMenu from './ActionsMenu';
import StageWithProgress, { ProgressBar, StageLabel } from './StageBadge';

interface ProjectRowProps {
  item: ProjectWithConnection;
  columnsTemplate: string;
  isNarrow: boolean;
  mergeStageProgress?: boolean;
  onOpen: () => void;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
}

function DataSourceCell({ item }: { item: ProjectWithConnection }) {
  if (item.connectionUnresolved) {
    return (
      <div style={{ width: 110, height: 16, borderRadius: 4, background: 'rgba(148, 163, 184, 0.08)' }} />
    );
  }

  const Icon = item.dataSource.isConnected && item.connection?.connection_type === 'postgresql'
    ? Database
    : FileSpreadsheet;

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      {item.dataSource.isConnected && (
        <Icon size={14} style={{ color: 'rgba(226, 232, 240, 0.5)', flexShrink: 0 }} aria-hidden="true" />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: item.dataSource.isConnected ? '#e2e8f0' : 'rgba(226, 232, 240, 0.45)' }}>
          {item.dataSource.label}
        </div>
        {item.dataSource.detail && (
          <div
            style={{
              fontSize: 11.5,
              color: 'rgba(226, 232, 240, 0.4)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.dataSource.detail}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectRow({
  item,
  columnsTemplate,
  isNarrow,
  mergeStageProgress,
  onOpen,
  onRenameRequest,
  onDeleteRequest,
}: ProjectRowProps) {
  const { project } = item;
  const lastUpdated = formatRelativeTime(project.updated_at ?? project.created_at);

  if (isNarrow) {
    return (
      <div
        onClick={onOpen}
        style={{
          borderRadius: 10,
          border: '1px solid rgba(148, 163, 184, 0.12)',
          background: 'rgba(148, 163, 184, 0.03)',
          padding: 14,
          marginBottom: 10,
          cursor: 'pointer',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>{project.name}</div>
          <div onClick={(event) => event.stopPropagation()}>
            <ActionsMenu
              onOpen={onOpen}
              onRenameRequest={onRenameRequest}
              onDeleteRequest={onDeleteRequest}
            />
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <DataSourceCell item={item} />
          <StageLabel stage={item.stage} isUnresolved={item.connectionUnresolved} />
        </div>
        <div className="flex items-center justify-between">
          <ProgressBar stage={item.stage} isUnresolved={item.connectionUnresolved} width={80} />
          <span style={{ fontSize: 11.5, color: 'rgba(226, 232, 240, 0.45)' }}>{lastUpdated}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="items-center"
      style={{
        display: 'grid',
        gridTemplateColumns: columnsTemplate,
        gap: 16,
        padding: '14px 4px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        cursor: 'pointer',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#f5f5f7' }}>{project.name}</div>
        {project.description && (
          <div
            style={{
              fontSize: 12,
              color: 'rgba(226, 232, 240, 0.45)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}
          >
            {project.description}
          </div>
        )}
      </div>

      <DataSourceCell item={item} />

      {mergeStageProgress ? (
        <StageWithProgress stage={item.stage} isUnresolved={item.connectionUnresolved} />
      ) : (
        <>
          <StageLabel stage={item.stage} isUnresolved={item.connectionUnresolved} />
          <ProgressBar stage={item.stage} isUnresolved={item.connectionUnresolved} />
        </>
      )}

      <span style={{ fontSize: 12.5, color: 'rgba(226, 232, 240, 0.5)' }}>{lastUpdated}</span>

      <div
        className="flex items-center justify-end"
        onClick={(event) => event.stopPropagation()}
      >
        <ActionsMenu
          onOpen={onOpen}
          onRenameRequest={onRenameRequest}
          onDeleteRequest={onDeleteRequest}
        />
      </div>
    </div>
  );
}

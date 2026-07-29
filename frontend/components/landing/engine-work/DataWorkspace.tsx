'use client';

import type { ReactNode } from 'react';
import RawDataPanel from './RawDataPanel';
import SchemaRelationshipsPanel from './SchemaRelationshipsPanel';
import DataQualityPanel from './DataQualityPanel';
import WarehouseModelPanel from './WarehouseModelPanel';
import GeneratedSqlPanel from './GeneratedSqlPanel';
import AnalyticsPreviewPanel from './AnalyticsPreviewPanel';
import { STAGE_COLORS, type ExplorationStage } from './engine-work-data';

export interface RevealFlags {
  raw: boolean;
  discovery: boolean;
  relationships: boolean;
  warehouse: boolean;
  analytics: boolean;
}

interface DataWorkspaceProps {
  activeStage: ExplorationStage;
  reveal: RevealFlags;
  reducedMotion: boolean;
}

const TRANSITION = 'opacity 320ms cubic-bezier(0.22,1,0.36,1), transform 320ms cubic-bezier(0.22,1,0.36,1), box-shadow 320ms cubic-bezier(0.22,1,0.36,1), background 320ms ease';

function regionEmphasis(
  regionStages: ExplorationStage[],
  activeStage: ExplorationStage,
  faintWhen?: ExplorationStage[]
): { opacity: number; scale: number; accent: string | null } {
  if (activeStage === 'all') return { opacity: 1, scale: 1, accent: null };
  if (regionStages.includes(activeStage)) return { opacity: 1, scale: 1.012, accent: STAGE_COLORS[activeStage as Exclude<ExplorationStage, 'all'>] };
  if (faintWhen?.includes(activeStage)) return { opacity: 0.55, scale: 1, accent: null };
  return { opacity: 0.32, scale: 1, accent: null };
}

function Region({
  children,
  emphasis,
  borderRight,
  borderBottom,
}: {
  children: ReactNode;
  emphasis: { opacity: number; scale: number; accent: string | null };
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <div
      className="relative min-w-0"
      style={{
        opacity: emphasis.opacity,
        transform: `scale(${emphasis.scale})`,
        transformOrigin: 'center',
        boxShadow: emphasis.accent ? `inset 0 0 0 1px ${emphasis.accent}55` : 'inset 0 0 0 1px transparent',
        background: emphasis.accent ? `${emphasis.accent}0A` : 'transparent',
        borderRight: borderRight ? '1px solid rgba(255,255,255,0.07)' : undefined,
        borderBottom: borderBottom ? '1px solid rgba(255,255,255,0.07)' : undefined,
        transition: TRANSITION,
      }}
    >
      {children}
    </div>
  );
}

export default function DataWorkspace({ activeStage, reveal, reducedMotion }: DataWorkspaceProps) {
  const rawEmphasis = regionEmphasis(['raw'], activeStage, ['discovery']);
  const schemaEmphasis = regionEmphasis(['discovery', 'relationships'], activeStage);
  const qualityEmphasis = regionEmphasis([], activeStage);
  const warehouseEmphasis = regionEmphasis(['warehouse'], activeStage);
  const sqlEmphasis = regionEmphasis(['warehouse'], activeStage);
  const analyticsEmphasis = regionEmphasis(['analytics'], activeStage);

  return (
    <div className="flex h-full flex-col">
      <div className="grid" style={{ gridTemplateColumns: '1.05fr 1fr 1.1fr', flex: 1, minHeight: 0 }}>
        <Region emphasis={rawEmphasis} borderRight>
          <RawDataPanel revealed={reveal.raw} reducedMotion={reducedMotion} />
        </Region>
        <Region emphasis={schemaEmphasis} borderRight>
          <SchemaRelationshipsPanel
            nodesRevealed={reveal.discovery}
            linksRevealed={reveal.relationships}
            nodesEmphasis={activeStage === 'discovery'}
            linksEmphasis={activeStage === 'relationships'}
            reducedMotion={reducedMotion}
          />
        </Region>
        <Region emphasis={qualityEmphasis}>
          <DataQualityPanel revealed={reveal.relationships} reducedMotion={reducedMotion} />
        </Region>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 0.68fr 1.45fr', flex: 1, minHeight: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Region emphasis={warehouseEmphasis} borderRight>
          <WarehouseModelPanel revealed={reveal.warehouse} emphasis={activeStage === 'warehouse'} reducedMotion={reducedMotion} />
        </Region>
        <Region emphasis={sqlEmphasis} borderRight>
          <GeneratedSqlPanel revealed={reveal.warehouse} reducedMotion={reducedMotion} />
        </Region>
        <Region emphasis={analyticsEmphasis}>
          <AnalyticsPreviewPanel revealed={reveal.analytics} reducedMotion={reducedMotion} />
        </Region>
      </div>
    </div>
  );
}

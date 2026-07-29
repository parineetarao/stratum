'use client';

import { STAGE_CONTROLS, STAGE_COLORS, type ExplorationStage } from './engine-work-data';

interface StageControlsProps {
  pinnedStage: ExplorationStage;
  activeStage: ExplorationStage;
  hoverEnabled: boolean;
  onHover: (stage: ExplorationStage | null) => void;
  onPin: (stage: Exclude<ExplorationStage, 'all'>) => void;
  isMobile?: boolean;
}

export default function StageControls({ pinnedStage, activeStage, hoverEnabled, onHover, onPin, isMobile = false }: StageControlsProps) {
  return (
    <div
      className={isMobile ? 'flex overflow-x-auto' : 'flex flex-wrap items-center justify-center'}
      style={{ gap: 10, WebkitOverflowScrolling: 'touch' }}
    >
      {STAGE_CONTROLS.map((stage) => {
        const Icon = stage.icon;
        const isPinned = pinnedStage === stage.key;
        const isActive = activeStage === stage.key;
        const color = STAGE_COLORS[stage.key];

        return (
          <button
            key={stage.key}
            type="button"
            aria-pressed={isPinned}
            onMouseEnter={() => hoverEnabled && onHover(stage.key)}
            onMouseLeave={() => hoverEnabled && onHover(null)}
            onFocus={() => hoverEnabled && onHover(stage.key)}
            onBlur={() => hoverEnabled && onHover(null)}
            onClick={() => onPin(stage.key)}
            className="flex flex-shrink-0 cursor-pointer items-center font-semibold"
            style={{
              gap: 9,
              height: 50,
              padding: '0 20px',
              borderRadius: 12,
              fontSize: 13.5,
              background: isActive ? `${color}24` : '#07090E',
              border: isActive ? `1px solid ${color}94` : '1px solid rgba(255,255,255,0.12)',
              color: isActive ? '#C4B5FD' : 'rgba(245,245,247,0.78)',
              transition: 'background 260ms ease, border-color 260ms ease, color 260ms ease',
            }}
          >
            <Icon size={16} color={isActive ? color : 'rgba(245,245,247,0.7)'} />
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { TRANSFORMATION_STAGES, type ExplorationStage } from './engine-work-data';

interface TransformationPathProps {
  activeStage: ExplorationStage;
  /** How many of the 5 stages have been "reached" by the scroll reveal (0-5, fractional while filling). */
  reachedCount: number;
  isMobile?: boolean;
}

export default function TransformationPath({ activeStage, reachedCount, isMobile = false }: TransformationPathProps) {
  return (
    <div
      className={isMobile ? 'flex items-center overflow-x-auto' : 'flex items-center justify-center'}
      style={{ gap: 0, WebkitOverflowScrolling: 'touch' }}
    >
      {TRANSFORMATION_STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const isReached = reachedCount >= i + 0.5;
        const isCurrentActive = activeStage === stage.key;
        const dotColor = isReached ? stage.color : 'rgba(245,245,247,0.22)';
        const connectorFill = Math.min(1, Math.max(0, reachedCount - (i + 1)));

        return (
          <div key={stage.key} className="flex items-center" style={{ flexShrink: 0 }}>
            <div className="flex flex-col items-center" style={{ minWidth: isMobile ? 96 : 128, padding: '0 4px' }}>
              <div className="flex items-center" style={{ gap: 7, marginBottom: 4 }}>
                <Icon size={14} color={isCurrentActive ? stage.color : 'rgba(245,245,247,0.6)'} />
                <span
                  className="uppercase font-semibold"
                  style={{
                    fontSize: 11.5,
                    letterSpacing: '0.1em',
                    color: isCurrentActive ? stage.color : 'rgba(245,245,247,0.78)',
                    transition: 'color 280ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage.label}
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: 'rgba(245,245,247,0.4)', whiteSpace: 'nowrap' }}>{stage.descriptor}</span>
            </div>

            {i < TRANSFORMATION_STAGES.length - 1 && (
              <div className="relative flex-shrink-0" style={{ width: isMobile ? 28 : 46, height: 6, margin: '0 2px' }}>
                <div
                  className="absolute left-0 top-1/2"
                  style={{ width: '100%', height: 1, background: 'rgba(245,245,247,0.14)', transform: 'translateY(-50%)' }}
                />
                <div
                  className="absolute left-0 top-1/2"
                  style={{
                    width: `${connectorFill * 100}%`,
                    height: 1,
                    transform: 'translateY(-50%)',
                    background: `linear-gradient(90deg, ${stage.color}, ${TRANSFORMATION_STAGES[i + 1].color})`,
                    transition: 'width 420ms cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    top: '50%',
                    left: 0,
                    transform: 'translate(-50%, -50%)',
                    background: dotColor,
                    transition: 'background 280ms ease',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

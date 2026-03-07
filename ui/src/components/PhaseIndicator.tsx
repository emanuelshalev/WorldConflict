import './PhaseIndicator.css';

export type TurnPhase = 'news' | 'briefing' | 'diplomacy' | 'military' | 'domestic' | 'confirm';

interface PhaseIndicatorProps {
  currentPhase: TurnPhase;
  onPhaseClick?: (phase: TurnPhase) => void;
}

const PHASES: { id: TurnPhase; label: string; icon: string }[] = [
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'briefing', label: 'Briefing', icon: '📋' },
  { id: 'diplomacy', label: 'Diplomacy', icon: '🤝' },
  { id: 'military', label: 'Military', icon: '⚔️' },
  { id: 'domestic', label: 'Domestic', icon: '🏛️' },
  { id: 'confirm', label: 'Confirm', icon: '✓' },
];

export function PhaseIndicator({ currentPhase, onPhaseClick }: PhaseIndicatorProps) {
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase);

  return (
    <div className="phase-indicator">
      <div className="phase-track">
        {PHASES.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isCompleted = index < currentIndex;
          const isPending = index > currentIndex;

          return (
            <div
              key={phase.id}
              className={`phase-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}
              onClick={() => onPhaseClick?.(phase.id)}
            >
              <div className="phase-icon">{phase.icon}</div>
              <div className="phase-label">{phase.label}</div>
              {index < PHASES.length - 1 && (
                <div className={`phase-connector ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

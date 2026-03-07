import { useGameStore } from '../store/gameStore';
import { TurnBriefingPanel } from './TurnBriefingPanel';

export function Sidebar() {
  const { worldState } = useGameStore();

  if (!worldState) {
    return (
      <aside className="sidebar">
        <div className="sidebar-empty">
          <p>Start a new game to begin</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <TurnBriefingPanel />
    </aside>
  );
}

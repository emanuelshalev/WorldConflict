import { type JSX, Suspense, lazy, useEffect } from 'react';
import { autoBriefOn } from '../../lib/learn';
import { useGameStore } from '../../store/gameStore';
import { situationFor, useExplain } from './explain';

const Briefing = lazy(() => import('./BriefingPanel'));

/**
 * "What is going on here?" (design-learn.md §3 C, D-53): the situation briefing. A right drawer
 * on desktop and tablet, a full-screen sheet on phones. One line, a map, who is who, why it
 * matters, what really happened (dated), the line where the real world ends and the game
 * begins, and "On this card": every name in the card that asked (concept B folded in).
 */

const BRIEFED_KEY = 'worldconflict.learn.briefed.v1';

function briefed(): string[] {
  try {
    const raw = localStorage.getItem(BRIEFED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function noteBriefed(id: string): void {
  try {
    localStorage.setItem(BRIEFED_KEY, JSON.stringify([...new Set([...briefed(), id])]));
  } catch {
    // Without storage the briefing may open again next session: harmless
  }
}

/** The big labelled button on each crisis (never icon-only). Renders nothing without a briefing. */
export function SituationButton({ blocks, cardTitle, className = '', situationId }: { blocks?: string[]; cardTitle?: string; className?: string; situationId?: string }): JSX.Element | null {
  const payload = useGameStore((s) => s.codex);
  const fp = useGameStore((s) => s.worldState?.flashpointId ?? null);
  const sc = useGameStore((s) => s.worldState?.scenarioId ?? null);
  const openBriefing = useExplain((s) => s.openBriefing);
  const open = useExplain((s) => s.briefing);
  const situation = situationId ? (payload?.situations.find((x) => x.id === situationId) ?? null) : situationFor(payload?.situations, fp, sc);
  if (!situation) return null;
  return (
    <button
      type="button"
      className={`lx-situation ${className}`.trim()}
      aria-haspopup="dialog"
      aria-expanded={open?.situationId === situation.id}
      onClick={() => openBriefing({ situationId: situation.id, blocks, cardTitle })}
    >
      <span className="lx-info-i" aria-hidden>
        i
      </span>
      What is going on here?
    </button>
  );
}

/**
 * Host: renders the open briefing, and opens it once per situation on its first crisis when the
 * player asked for that (off by default; on at Guide me unless turned off, D-53).
 */
export function SituationBriefing(): JSX.Element | null {
  const req = useExplain((s) => s.briefing);
  const payload = useGameStore((s) => s.codex);
  const world = useGameStore((s) => s.worldState);
  const screen = useGameStore((s) => s.screen);
  const backstory = useGameStore((s) => s.showBackstory);
  const learn = useGameStore((s) => s.learn);
  const first = useGameStore((s) => s.pendingDecisions[0]);
  const auto = autoBriefOn(learn);
  const current = situationFor(payload?.situations, world?.flashpointId, world?.scenarioId);
  useEffect(() => {
    if (!auto || screen !== 'game' || backstory || !current || !first || useExplain.getState().briefing) return;
    if (briefed().includes(current.id)) return;
    noteBriefed(current.id);
    useExplain.getState().openBriefing({ situationId: current.id, blocks: [first.situation, ...first.options.map((o) => o.description)], cardTitle: first.title });
  }, [auto, screen, backstory, current, first]);
  if (!req) return null;
  const situation = payload?.situations.find((s) => s.id === req.situationId);
  return situation ? (
    <Suspense fallback={null}>
      <Briefing situation={situation} />
    </Suspense>
  ) : null;
}

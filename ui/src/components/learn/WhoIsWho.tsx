import type { JSX } from 'react';
import type { CodexEntry, Situation } from '../../lib/codexMatch';
import { flag } from '../../lib/format';
import { useGameStore } from '../../store/gameStore';
import { isPlayerEntry, roleLine } from './liveLine';
import { initials, useCodex, useExplain } from './explain';

/**
 * Who is who (design-learn.md §3 C): flag discs with initials (no likeness), the role line from
 * the game's own leader data (era files stay the single source), and each side's stance. The
 * player's row is marked YOU. Each row opens that entry's explainer.
 */

export function WhoDisc({ entry }: { entry: CodexEntry }) {
  return (
    <span className={`lx-disc${entry.kind === 'person' ? '' : ' place'}`} aria-hidden>
      {initials(entry.name)}
      {entry.countryId && <i className="lx-disc-flag">{flag(entry.countryId)}</i>}
    </span>
  );
}

export function WhoIsWho({ situation, playerId }: { situation: Situation; playerId?: string | null }): JSX.Element | null {
  const codex = useCodex();
  const view = useGameStore((s) => s.playerView);
  const open = useExplain((s) => s.openExplainer);
  if (!codex) return null;
  const rows = situation.whoIsWho
    .map((w) => ({ w, e: codex.byId.get(w.entryId) }))
    .filter((r): r is { w: Situation['whoIsWho'][number]; e: CodexEntry } => !!r.e);
  if (rows.length === 0) return null;
  return (
    <ul className="lx-who">
      {rows.map(({ w, e }) => {
        const you = isPlayerEntry(e, view, playerId);
        return (
          <li key={w.entryId}>
            <button type="button" className="lx-who-row" aria-haspopup="dialog" onClick={(ev) => open({ kind: 'entry', id: e.id }, ev.currentTarget)}>
              <WhoDisc entry={e} />
              <span className="lx-who-text">
                <b>
                  {e.name}
                  {you && <span className="lx-you">You</span>}
                </b>
                <small>{roleLine(e, view)}</small>
                <span>{w.stance}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** "Who is who" as a row of 3 to 4 discs (the briefing before month 1): each opens its entry. */
export function WhoRow({ situation }: { situation: Situation }): JSX.Element | null {
  const codex = useCodex();
  const open = useExplain((s) => s.openExplainer);
  if (!codex) return null;
  const rows = situation.whoIsWho
    .map((w) => codex.byId.get(w.entryId))
    .filter((e): e is CodexEntry => !!e)
    .slice(0, 4);
  if (rows.length < 2) return null;
  return (
    <div className="lx-whorow" role="group" aria-label="Who is who">
      <span className="lx-kicker">Who is who</span>
      <div className="lx-whorow-list">
        {rows.map((e) => (
          <button key={e.id} type="button" className="lx-whorow-btn" aria-haspopup="dialog" onClick={(ev) => open({ kind: 'entry', id: e.id }, ev.currentTarget)}>
            <WhoDisc entry={e} />
            <span>{e.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

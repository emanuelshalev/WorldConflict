import type { CSSProperties, JSX } from 'react';
import { useGameStore } from '../../store/gameStore';
import { isFictionalLeader, samePerson } from './liveLine';
import { useCodex, useExplain } from './explain';

/**
 * A leader's name that opens their card (design-learn.md §6, dossier row): the codex person
 * entry when the leader is the real one, "Person · fictional" when they came to power during
 * this game, plain text otherwise. A labelled button (the name), never hover-only.
 */
export function LeaderLink({ countryId, style }: { countryId: string; style?: CSSProperties }): JSX.Element | null {
  const codex = useCodex();
  const c = useGameStore((s) => s.playerView.find((v) => v.id === countryId));
  const open = useExplain((s) => s.openExplainer);
  if (!c) return null;
  const name = c.leader.name;
  const real = codex?.entries.find((e) => e.kind === 'person' && e.countryId === countryId && samePerson(e.name, name));
  const fictional = !real && isFictionalLeader(c);
  if (!real && !fictional) return <b style={style}>{name}</b>;
  return (
    <button
      type="button"
      className="lx-mark lx-leader"
      style={style}
      aria-haspopup="dialog"
      aria-label={`${name}: who is this?`}
      onClick={(e) => open(real ? { kind: 'entry', id: real.id } : { kind: 'fictional', countryId }, e.currentTarget)}
    >
      {name}{' '}
      <span className="lx-info-i small" aria-hidden>
        i
      </span>
    </button>
  );
}

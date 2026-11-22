import { IconBolt, IconX } from '@tabler/icons-react';
import { type EraMap, type EraSituation, useGameStore } from '../../store/gameStore';
import { codexTargetFor, openSituationCodex } from '../learn/explain';
import { SITUATION_KINDS, situationKindOf } from '../../lib/crisisKind';
import { BLOC_SIDE_COLOR, blocSideOf, stabilityWord, unplayableIn } from './eraLayers';

const PHASE_WORD = { ACTIVE: '', BREWING: 'Brewing', FROZEN: 'Frozen' } as const;
const PHASE_HINT = { ACTIVE: '', BREWING: 'not yet, but coming', FROZEN: 'the fighting stopped, nothing is settled' } as const;

interface Props {
  era: EraMap;
  situation: EraSituation;
  /** docked in the dossier (B), floating next to the pin (A desktop) or a bottom sheet (phone). */
  variant: 'docked' | 'floating' | 'sheet';
  /** The nation currently picked in the list. */
  picked?: string;
  onLead: (countryId: string) => void;
  onFlashpoint?: (flashpointId: string) => void;
  onClose: () => void;
}

/**
 * The situation card (design-worldmap.md 3.3): kind and phase, the year it started, the title, a
 * short blurb, the sides with their camp, leader and stability, and what you can do about it:
 * lead one of the sides, or play it as a 15-minute Flashpoint when one exists.
 */
export function EraCard({ era, situation: s, variant, picked, onLead, onFlashpoint, onClose }: Props) {
  const kind = SITUATION_KINDS[situationKindOf(s.kind)];
  const K = kind.icon;
  const sides = blocSideOf(era);
  const rows = s.countries.map((id) => era.countries.find((c) => c.id === id)).filter((c) => !!c);
  const leadable = rows.filter((c) => !unplayableIn(era, c.id)).slice(0, 2);
  const phase = PHASE_WORD[s.phase];
  // "What is going on here?" (design-worldmap.md 3.3, B-26): the codex briefing or entry named by
  // codexId; a flashpoint's briefing loads on click, so it counts as available.
  const codex = useGameStore((st) => st.codex);
  const explainable = !!s.codexId && (!!codexTargetFor(s.codexId, codex) || s.codexId === s.flashpointId);
  return (
    <section className={`era-card ${variant}`} aria-label={`${s.title}: situation`} style={{ ['--pin' as string]: kind.color }}>
      <header className="era-card-head">
        <span className="era-card-kind">
          <span className="era-card-icon" style={{ color: kind.ink ?? '#fff' }}>
            <K size={13} stroke={2.2} />
          </span>
          {kind.label}
          {phase && (
            <span className={`era-phase ${s.phase.toLowerCase()}`} title={PHASE_HINT[s.phase]}>
              {phase}
            </span>
          )}
          {s.since && <span className="era-card-since num">since {s.since.slice(0, 4)}</span>}
        </span>
        <button type="button" className="era-card-x" onClick={onClose} aria-label="Close the situation card">
          <IconX size={16} />
        </button>
      </header>
      <h3>{s.title}</h3>
      <p className="era-card-blurb">{s.blurb}</p>
      {explainable && (
        <button
          type="button"
          className="lx-situation era-card-explain"
          aria-haspopup="dialog"
          onClick={(e) => void openSituationCodex(s, era.scenarioId, e.currentTarget)}
        >
          <span className="lx-info-i" aria-hidden>
            i
          </span>
          What is going on here?
        </button>
      )}
      {phase && <p className="era-card-phase-note">{phase}: {PHASE_HINT[s.phase]}.</p>}
      {rows.length > 0 && (
        <ul className="era-card-sides">
          {rows.map((c) => {
            const b = sides.get(c.id) ?? (c.partOf ? sides.get(c.partOf) : undefined);
            const off = unplayableIn(era, c.id);
            return (
              <li key={c.id}>
                <span className="era-sw" style={{ background: b ? BLOC_SIDE_COLOR[b.side] : 'var(--line-2)' }} title={b ? b.name : 'No camp'} />
                <span className="era-card-who">
                  <b>{c.status === 'STATE' ? c.name : (c.label ?? c.name)}</b>
                  <small>{off ? 'Not a state in this era' : c.leader ? `${c.leader.name}, ${c.leader.title}` : 'Leader invented for this era'}</small>
                </span>
                {!off && (
                  <span className="era-card-stab num" title="Stability: how firmly the government holds">
                    {stabilityWord(c.stability)} {c.stability}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="era-card-acts">
        {leadable.map((c, i) => (
          <button key={c.id} type="button" className={`wc-btn ${i === 0 && picked !== c.id ? 'primary' : ''} ${picked === c.id ? 'on' : ''}`} onClick={() => onLead(c.id)} aria-pressed={picked === c.id}>
            Lead {c.name}
          </button>
        ))}
        {s.flashpointId && onFlashpoint && (
          <button type="button" className="wc-btn ghost era-card-fp" onClick={() => onFlashpoint(s.flashpointId as string)}>
            <IconBolt size={15} /> Play it as a 15-minute Flashpoint
          </button>
        )}
      </div>
    </section>
  );
}

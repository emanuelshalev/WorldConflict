import { IconBuildingCommunity, IconListCheck, IconMicrophone, IconPhoneCall, IconSearch, IconTarget, IconUsers } from '@tabler/icons-react';
import { type DeskFocus, type Meeting, useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { meetingSuggestion } from '../../lib/staff';

const KIND_ICON: Record<Meeting['kind'], typeof IconPhoneCall> = {
  CALL: IconPhoneCall,
  STAFF: IconUsers,
  VISIT: IconBuildingCommunity,
  PRESS: IconMicrophone,
};

type RowState = 'needs' | 'staff' | 'done' | 'deputy';

const sameFocus = (a: DeskFocus, b: DeskFocus) => a.kind === b.kind && (a.id ?? '') === (b.id ?? '');

function Dot({ state }: { state: RowState }) {
  const word = state === 'needs' ? 'Needs you' : state === 'staff' ? 'Staff pick' : state === 'deputy' ? 'Deputy' : 'Decided';
  return <i className={`nav-dot ${state}`} aria-label={word} title={word} />;
}

export function Navigator() {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const focus = useGameStore((s) => s.focus);
  const setFocus = useGameStore((s) => s.setFocus);
  const actions = useGameStore((s) => s.pendingActions);
  const status = useGameStore((s) => s.objectiveStatus);
  if (!world) return null;
  const agenda = world.agenda ?? [];
  const attending = agenda.filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId).length;
  const row = (f: DeskFocus, body: React.ReactNode, state?: RowState, cls = '') => (
    <button key={`${f.kind}-${f.id ?? ''}`} role="option" aria-selected={sameFocus(focus, f)} className={`nav-row ${cls} ${sameFocus(focus, f) ? 'on' : ''}`} onClick={() => setFocus(f)}>
      {state && <Dot state={state} />}
      {body}
    </button>
  );
  const met = status.filter((c) => !c.bonus && c.met).length;
  const primary = status.filter((c) => !c.bonus).length;
  return (
    <nav className="navigator" role="listbox" aria-label="This month's desk">
      {world.objective &&
        row(
          { kind: 'mission' },
          <>
            <IconTarget size={15} />
            <span className="nav-label">Mission</span>
            <span className="nav-meta num">{primary ? `${met}/${primary} · ` : ''}{world.maxTurns - world.turn} mo</span>
          </>,
          undefined,
          'mission',
        )}
      <div className="nav-head">Crises <span className="num">{decisions.length}</span></div>
      {decisions.length === 0 && <div className="nav-empty">No crisis this month</div>}
      {decisions.map((d) =>
        row(
          { kind: 'crisis', id: d.id },
          <>
            <span className="nav-label">
              {d.affectedCountries.slice(0, 2).map((id) => flag(id)).join(' ')} {d.title}
            </span>
            <span className={`nav-tag ${reviewed[d.id] ? 'mine' : 'staff'}`}>{reviewed[d.id] ? 'Your call' : 'Staff pick'}</span>
          </>,
          reviewed[d.id] ? 'done' : choices[d.id] ? 'staff' : 'needs',
          d.urgency === 'EXISTENTIAL' ? 'existential' : d.urgency === 'URGENT' ? 'urgent' : '',
        ),
      )}
      <div className="nav-head">
        Meetings <span className="num">{attending}/3 in person</span>
      </div>
      {agenda.map((m) => {
        const Icon = KIND_ICON[m.kind];
        const pick = choices[m.id];
        const deputy = pick && pick === m.defaultOptionId;
        const state: RowState = !pick ? 'needs' : deputy ? 'deputy' : 'done';
        return row(
          { kind: 'meeting', id: m.id },
          <>
            <Icon size={14} />
            <span className="nav-label">
              {m.withCountry ? `${flag(m.withCountry)} ` : ''}
              {m.speaker}
            </span>
            <span className={`nav-tag ${!pick ? 'suggest' : deputy ? 'deputy' : 'mine'}`}>{!pick ? (meetingSuggestion(m) ? 'Suggested' : 'Open') : deputy ? 'Deputy' : 'You attend'}</span>
          </>,
          state,
          m.urgency === 'URGENT' || m.urgency === 'EXISTENTIAL' ? 'urgent' : '',
        );
      })}
      <div className="nav-head">Orders <span className="num">{actions.length}/6</span></div>
      {row(
        { kind: 'suggestions' },
        <>
          <IconListCheck size={15} />
          <span className="nav-label">Staff suggestions</span>
          <span className="nav-meta num">{actions.filter((a) => a.origin === 'staff').length} queued</span>
        </>,
      )}
      {row(
        { kind: 'catalog' },
        <>
          <IconSearch size={15} />
          <span className="nav-label">All orders</span>
          <span className="nav-meta">/</span>
        </>,
      )}
    </nav>
  );
}

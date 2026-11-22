import { IconAlertTriangle, IconBuildingCommunity, IconListCheck, IconMicrophone, IconPhoneCall, IconSearch, IconUsers } from '@tabler/icons-react';
import { type DeskFocus, type Meeting, useGameStore } from '../../store/gameStore';
import { flag } from '../../lib/format';
import { crisisSelection, meetingSelection } from '../../lib/month';
import { TERMS, term } from '../../lib/glossary';
import { nowNeed, stateOf, STATE_WORD } from '../../lib/goals';

/**
 * Everything on this month's desk (full desk). A column at 1280 px and up, with the mission as its
 * objective rows; filing tabs along the top of the stage below that. Every crisis row names its
 * selection (Cabinet pick, Approved, Your pick), never "Your call".
 */

const KIND_ICON: Record<Meeting['kind'], typeof IconPhoneCall> = {
  CALL: IconPhoneCall,
  STAFF: IconUsers,
  VISIT: IconBuildingCommunity,
  PRESS: IconMicrophone,
};
const KIND_WORD: Record<Meeting['kind'], string> = { CALL: 'Call', STAFF: 'Staff meeting', VISIT: 'Visit', PRESS: 'Interview' };

type RowState = 'needs' | 'staff' | 'done' | 'deputy';

const sameFocus = (a: DeskFocus, b: DeskFocus) => a.kind === b.kind && (a.id ?? '') === (b.id ?? '');

function Dot({ state }: { state: RowState }) {
  const word = state === 'needs' ? 'Needs you' : state === 'staff' ? 'Cabinet pick' : state === 'deputy' ? 'Deputy' : 'Decided';
  return <i className={`nav-dot ${state}`} aria-label={word} title={word} />;
}

export function Navigator({ tabs = false }: { tabs?: boolean }) {
  const world = useGameStore((s) => s.worldState);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const choices = useGameStore((s) => s.decisionChoices);
  const reviewed = useGameStore((s) => s.reviewed);
  const focus = useGameStore((s) => s.focus);
  const setFocus = useGameStore((s) => s.setFocus);
  const actions = useGameStore((s) => s.pendingActions);
  const status = useGameStore((s) => s.objectiveStatus);
  const setDrawer = useGameStore((s) => s.setDrawer);
  if (!world) return null;
  const agenda = world.agenda ?? [];
  const attending = agenda.filter((m) => choices[m.id] && choices[m.id] !== m.defaultOptionId).length;
  const row = (f: DeskFocus, body: React.ReactNode, state?: RowState, cls = '', label?: string) => (
    <button
      key={`${f.kind}-${f.id ?? ''}`}
      type="button"
      role={tabs ? 'tab' : 'option'}
      aria-selected={sameFocus(focus, f)}
      aria-label={label}
      className={`nav-row ${cls} ${state ? `st-${state}` : ''} ${sameFocus(focus, f) ? 'on' : ''}`}
      onClick={() => setFocus(f)}
    >
      {state && <Dot state={state} />}
      {body}
    </button>
  );
  const primary = status.filter((c) => !c.bonus);
  const head = (text: React.ReactNode) => !tabs && <div className="nav-head">{text}</div>;
  return (
    <nav className={tabs ? 'nav-tabs' : 'navigator'} role={tabs ? 'tablist' : 'listbox'} aria-label="This month's desk">
      {!tabs && world.objective && (
        <>
          <div className="nav-head">
            Mission <span className="num">{world.maxTurns - world.turn} months left</span>
          </div>
          <div className="nav-mission">
            {primary.map((c) => {
              const s = stateOf(c);
              return (
                <button key={c.label} type="button" className={`nav-goal s-${s}`} onClick={() => setDrawer('objective')} aria-label={`${c.short ?? c.label}: ${STATE_WORD[s]}${nowNeed(c) ? `, ${nowNeed(c)}` : ''}`}>
                  <i className={`gseg s-${s}`} aria-hidden />
                  <span>
                    <b>{c.short ?? c.label}</b>
                    <small>{nowNeed(c) ?? STATE_WORD[s].toLowerCase()}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {head(
        <>
          Crises <span className="num">{decisions.length}</span>
        </>,
      )}
      {decisions.length === 0 && !tabs && <div className="nav-empty">No crisis this month</div>}
      {decisions.map((d) => {
        const sel = crisisSelection(d, choices, reviewed);
        return row(
          { kind: 'crisis', id: d.id },
          <>
            {tabs && <IconAlertTriangle size={15} aria-hidden />}
            <span className="nav-label">
              {!tabs && d.affectedCountries.slice(0, 2).map((id) => flag(id)).join(' ')} {tabs ? `Crisis: ${d.title}` : d.title}
              {!tabs && <small className="nav-sub">{sel.text}</small>}
            </span>
            {!tabs && <span className={`nav-tag sel-${sel.kind}`}>{sel.word}</span>}
          </>,
          sel.kind === 'cabinet' ? 'staff' : 'done',
          d.urgency === 'EXISTENTIAL' ? 'existential' : d.urgency === 'URGENT' ? 'urgent' : '',
          `${d.title}: ${sel.text}`,
        );
      })}
      {head(<span>{TERMS.meetings.name} <span className="num">{term('{n} of {m}', attending, 3)}</span></span>)}
      {agenda.map((m) => {
        const Icon = KIND_ICON[m.kind];
        const sel = meetingSelection(m, choices, reviewed);
        const state: RowState = sel.kind === 'waiting' ? 'needs' : sel.kind === 'deputy' ? 'deputy' : 'done';
        return row(
          { kind: 'meeting', id: m.id },
          <>
            <Icon size={15} aria-hidden />
            <span className="nav-label">
              {tabs ? `${KIND_WORD[m.kind]}: ` : ''}
              {m.withCountry && !tabs ? `${flag(m.withCountry)} ` : ''}
              {m.speaker}
              {!tabs && <small className="nav-sub">{KIND_WORD[m.kind]}</small>}
            </span>
            {!tabs && <span className={`nav-tag sel-${sel.kind}`}>{sel.kind === 'waiting' ? 'Open' : sel.kind === 'deputy' ? 'Deputy' : 'You attend'}</span>}
          </>,
          state,
          m.urgency === 'URGENT' || m.urgency === 'EXISTENTIAL' ? 'urgent' : '',
          `${m.speaker}, ${KIND_WORD[m.kind]}: ${sel.text}`,
        );
      })}
      {head(<span>{TERMS.orders.name} <span className="num">{term('{n} of {m}', actions.length, 6)}</span></span>)}
      {row(
        { kind: 'suggestions' },
        <>
          <IconListCheck size={15} aria-hidden />
          <span className="nav-label">
            {tabs ? 'Advisors' : "Advisors' suggestions"}
            {!tabs && <small className="nav-sub">{actions.filter((a) => a.origin === 'staff').length} added by staff</small>}
          </span>
        </>,
      )}
      {row(
        { kind: 'catalog' },
        <>
          <IconSearch size={15} aria-hidden />
          <span className="nav-label">
            All orders
            {!tabs && <small className="nav-sub">Search or browse</small>}
          </span>
          {!tabs && <kbd>/</kbd>}
        </>,
      )}
    </nav>
  );
}

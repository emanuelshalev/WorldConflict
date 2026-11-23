import { IconX } from '@tabler/icons-react';
import { useGameStore } from '../../store/gameStore';
import { type AgendaItem, agendaItems, agendaProgress, currentItem, openItem, simpleAgenda } from '../../lib/agenda';
import { STATE_WORD, stateOf } from '../../lib/goals';
import { useLayout } from '../../lib/layout';

/**
 * The month's things (design-agenda 0.12 D2, design-layout L-19): one component, forms `column`
 * (desk, 1600 wide and up, or Everything at 1280), `panel` (See all over the Thing), `float` (Map,
 * W and U) and `sheet` (phones). Each thing is a full-width row button with its state in words
 * ("To do", "You are here", "Decided: ...") and an Open face; no numbers in circles. Month 1 names
 * the meetings the ministers take; "Your mission" closes the column on tall screens.
 */

export type ListForm = 'column' | 'panel' | 'float' | 'sheet';

function rowState(it: AgendaItem, here: boolean, full: boolean): string {
  const rec = full && it.state === 'todo' && it.rec ? ` · recommended: ${it.rec}` : '';
  if (here) return `You are here · ${it.state === 'todo' ? 'to do' : it.stateText.charAt(0).toLowerCase() + it.stateText.slice(1)}`;
  return `${it.stateText}${rec}`;
}

export function Mission() {
  const world = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  if (!world) return null;
  const goals = status.filter((c) => !c.bonus);
  if (!goals.length) return null;
  return (
    <div className="th-facts al-mission" aria-label="Your mission">
      <h3>
        Your mission: month {Math.min(world.turn + 1, world.maxTurns)} of {world.maxTurns}
      </h3>
      {goals.map((c) => (
        <p key={c.label} className="r">
          <span>{c.short ?? c.label}</span>
          <span>{STATE_WORD[stateOf(c)]}</span>
        </p>
      ))}
    </div>
  );
}

export function AgendaList({ form }: { form: ListForm }) {
  const world = useGameStore((s) => s.worldState);
  const agendaKey = useGameStore((s) => s.agendaKey);
  const review = useGameStore((s) => s.review);
  const showDesk = useGameStore((s) => s.showDesk);
  useGameStore((s) => s.decisionChoices);
  useGameStore((s) => s.reviewed);
  useGameStore((s) => s.pendingActions);
  useGameStore((s) => s.skipped);
  useGameStore((s) => s.deskShown);
  const L = useLayout();
  if (!world) return null;
  const items = agendaItems();
  const cur = review ? undefined : currentItem(items, agendaKey);
  const { done, left } = agendaProgress(items);
  const simple = simpleAgenda();
  const meetings = world.agenda?.length ?? 0;
  // At 1920 the rows say only the state; wider screens add what is recommended (Art Director, 12)
  const full = form !== 'column' || L.cls === 'W' || L.cls === 'U';
  const close = () => useGameStore.setState({ listOpen: false });
  return (
    <section className={`agenda-list f-${form}`} data-region="list" data-form={form} id="agenda-list" aria-label={`This month: ${items.length} things`} data-agenda="">
      <div className="al-head">
        <h2>This month: {items.length} things</h2>
        {(form === 'panel' || form === 'sheet') && (
          <button type="button" className="wc-btn small al-close" onClick={close} aria-label="Close the list">
            <IconX size={16} aria-hidden /> Close
          </button>
        )}
      </div>
      <p className="al-hint">
        {done} done, {left} to go. Open any of them.
      </p>
      <ul className="al-rows">
        {items.map((it) => {
          const here = cur?.key === it.key;
          return (
            <li key={it.key}>
              <button type="button" className={`lrow s-${it.state}${here ? ' now' : ''}`} aria-current={here ? 'step' : undefined} onClick={() => openItem(it.key)} data-agenda-item={it.kind}>
                <span className="lrow-t">
                  <b>{it.title}</b>
                  <span className="lrow-st">{rowState(it, here, full)}</span>
                </span>
                <span className="face">Open</span>
              </button>
            </li>
          );
        })}
      </ul>
      {simple && meetings > 0 && (
        <div className="al-flat">
          <p>
            Your ministers take this month's {meetings} meeting{meetings === 1 ? '' : 's'} (no effect). From month 2 you choose.
          </p>
          <button type="button" className="wc-btn small" onClick={showDesk} data-show-desk="">
            See the meetings anyway
          </button>
        </div>
      )}
      {form === 'column' && <span className="al-grow" aria-hidden />}
      {form === 'column' && L.tallPlus && <Mission />}
    </section>
  );
}

import { IconX } from '@tabler/icons-react';
import { useGameStore } from '../../store/gameStore';
import { type AgendaItem, agendaItems, agendaProgress, currentItem, openItem, simpleAgenda } from '../../lib/agenda';
import { STATE_WORD, stateOf } from '../../lib/goals';
import { TERMS } from '../../lib/glossary';
import { useRef, useState } from 'react';
import { useFitLevel, useLayout } from '../../lib/layout';

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
  const ref = useRef<HTMLElement>(null);
  // The group a fold's Show opened (accordion: the other group folds), or null
  const [shown, setShown] = useState<'decided' | 'todo' | null>(null);
  const items = world ? agendaItems() : [];
  const cur = review ? undefined : currentItem(items, agendaKey);
  // The fit rule of the List (design review S2-1, L-13: the List never scrolls and never clips a
  // row): while its rows do not fit its box, 1 compact rows (no recommended answer in them), 2 fold
  // the hint and the mission foot, 3 each row on as few lines as it needs (title and state run on),
  // 4 fold the decided rows into one row with Show, 5 fold the other rows still to do (never the
  // one on screen, an open call or Your own orders), 6 the folds name only their count (their titles stay in the Show button's label). Phones (the sheet) keep the page's own scroll.
  const fitKey = `${form}|${shown}|${cur?.key}|${items.map((x) => `${x.key}:${x.state}:${x.stateText}`).join(',')}`;
  const level = useFitLevel(ref, fitKey, form === 'sheet' ? 0 : 6);
  if (!world) return null;
  const { done, left } = agendaProgress(items);
  const simple = simpleAgenda();
  const meetings = world.agenda?.length ?? 0;
  // At 1920 the rows say only the state; wider screens add what is recommended (Art Director, 12)
  const full = (form !== 'column' || L.cls === 'W' || L.cls === 'U') && level < 1;
  const close = () => useGameStore.setState({ listOpen: false });
  // Done: decided or skipped; the rest (to do, optional) is still to do
  const isDone = (it: AgendaItem) => it.state === 'decided' || it.state === 'skipped';
  // Never folded: the row on screen, an open call, and Your own orders (the way to every order)
  const keep = (it: AgendaItem) => it.key === cur?.key || (it.call && it.state === 'todo') || it.kind === 'own';
  const foldDecided = shown === 'todo' || (shown !== 'decided' && level >= 4);
  const foldTodo = shown === 'decided' || (shown !== 'todo' && level >= 5);
  const folded = (it: AgendaItem) => !keep(it) && ((foldDecided && isDone(it)) || (foldTodo && !isDone(it)));
  const group = (g: 'decided' | 'todo') => items.filter((it) => folded(it) && (g === 'todo' ? !isDone(it) : isDone(it)));
  const fold = (g: 'decided' | 'todo') => {
    const its = group(g);
    if (!its.length) return null;
    const word = g === 'todo' ? `${its.length} more to do` : `${its.length} done`;
    return (
      <li key={`fold-${g}`}>
        <button type="button" className="lrow lrow-fold" onClick={() => setShown(g)} data-list-fold={g} aria-label={`Show ${word}: ${its.map((x) => x.title).join(', ')}`}>
          <span className="lrow-t">
            <b>{word}</b>
            {level < 6 && <span className="lrow-st">{its.map((x) => x.title).join(', ')}</span>}
          </span>
          <span className="face">Show</span>
        </button>
      </li>
    );
  };
  return (
    <section ref={ref} className={`agenda-list f-${form}${level >= 1 ? ' is-compact' : ''}${level >= 3 ? ' is-runon' : ''}`} data-region="list" data-form={form} id="agenda-list" aria-label={`This month: ${items.length} things`} data-agenda="" data-fit={form === 'sheet' ? undefined : level}>
      <div className="al-head">
        <h2>This month: {items.length} things</h2>
        {(form === 'panel' || form === 'sheet') && (
          <button type="button" className="wc-btn small al-close" onClick={close} aria-label="Close the list">
            <IconX size={16} aria-hidden /> Close
          </button>
        )}
      </div>
      {level < 2 && (
        <p className="al-hint">
          {done} done, {left} to go. Open any of them.
        </p>
      )}
      <ul className="al-rows">
        {items.map((it) => {
          if (folded(it)) {
            // The fold's row stands where its first row was
            const g = isDone(it) ? 'decided' : 'todo';
            return group(g)[0]?.key === it.key ? fold(g) : null;
          }
          const here = cur?.key === it.key;
          return (
            <li key={it.key}>
              <button type="button" className={`lrow s-${it.state}${here ? ' now' : ''}${it.call ? ' is-call' : ''}`} aria-current={here ? 'step' : undefined} onClick={() => openItem(it.key)} data-agenda-item={it.kind} data-call={it.call ? '' : undefined}>
                <span className="lrow-t">
                  <b>{it.title}</b>
                  <span className="lrow-st">
                    {it.call && <b>{TERMS.yourCall.name} · </b>}
                    {rowState(it, here, full)}
                  </span>
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
          <span className="al-flat-btns">
            <button type="button" className="wc-btn small" onClick={showDesk} data-show-desk="">
              See the meetings anyway
            </button>
            <button type="button" className="wc-btn small" onClick={() => useGameStore.setState({ focus: { kind: 'catalog' }, listOpen: false, review: false })} data-all-orders="">
              All orders
            </button>
          </span>
        </div>
      )}
      {form === 'column' && <span className="al-grow" aria-hidden />}
      {form === 'column' && L.tallPlus && level < 2 && <Mission />}
    </section>
  );
}

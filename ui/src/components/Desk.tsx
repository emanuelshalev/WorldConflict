import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { defaultDeskView, meetingPick, setupMonth } from '../lib/month';
import { agendaItems, chooseAllRecommended, chooseAnswer, chooseSmall, currentItem, neighbours, openItem, skipItem } from '../lib/agenda';
import { cabinetPick } from '../lib/month';
import { useFitLevel, useLayout } from '../lib/layout';
import { useExecute } from '../lib/useExecute';
import { Thing } from './desk/YourMove';
import { AgendaList } from './desk/AgendaList';
import { Plan } from './desk/Plan';
import { Detail } from './desk/Detail';
import { ReviewPage } from './desk/ReviewPage';
import { PhoneMonth } from './desk/PhoneMonth';
import '../styles/layout.css';
import '../styles/desk-stage.css';

/**
 * The desk (design-layout.md L-1, sections 3 and 4): the five regions as one grid. The State band
 * and the month Bar sit above (App); here the List (a column from 1600 wide, or with Everything
 * from 1280), the Thing (the current thing of the agenda, the review page, or an order view) and
 * the Plan (rail from 1280 wide, the bar below it). Nothing scrolls at 1024 x 768 and up: the
 * Thing compacts on short screens and fills tall ones, the Plan folds by the fit rule. Phones get
 * their own tree (PhoneMonth).
 */

/** Desk keys: 1-4 choose, S skip, Enter the recommended answer, J/K next and previous thing, Shift+A
 *  Choose all recommended (only while the list is on screen), / All orders, Ctrl+Enter execute. */
function useDeskKeys(enabled: boolean) {
  const ex = useExecute();
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const s = useGameStore.getState();
      if (s.activeModal || s.showChronicle || s.drawer || s.showBackstory) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        ex.run();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter on a focused button presses that control, not the card shortcut
      if (e.key === 'Enter' && t?.closest('button, a[href], [role="button"]')) return;
      const items = agendaItems(s);
      const cur = currentItem(items, s.agendaKey);
      const detail = s.focus.kind === 'catalog' || s.focus.kind === 'order' || s.focus.kind === 'suggestions';
      const decision = cur?.decision ?? cur?.meeting;
      const options = decision ? decision.options.filter((o) => !cur?.meeting || o.id !== cur.meeting.defaultOptionId) : [];
      if (e.key === 'j' || e.key === 'k') {
        const { back, next } = neighbours(items, cur);
        const to = e.key === 'j' ? next : back;
        if (to) openItem(to.key);
      } else if (e.key === 'A' && e.shiftKey) {
        // Only where the Recommended list is on screen (RS-005): the rail, a float or an open panel
        const list = document.querySelector('[data-staff-picks] [data-choose-all]');
        if (list && (list as HTMLElement).offsetParent !== null) chooseAllRecommended();
        else return;
      } else if (e.key === '/') {
        e.preventDefault();
        flushSync(() => s.setFocus({ kind: 'catalog' }));
        document.getElementById('catalog-search')?.focus();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.focus.kind === 'order') {
        s.removePendingAction(Number(s.focus.id));
        s.setFocus({ kind: 'mission' });
      } else if (detail || s.review || !cur) return;
      else if ((e.key === 's' || e.key === 'S') && cur.kind !== 'own') skipItem(cur);
      else if (e.key === 'Enter' && cur.kind === 'crisis' && cur.decision) chooseAnswer(cur, cabinetPick(cur.decision).id);
      else if (e.key === 'Enter' && cur.kind === 'meeting' && cur.meeting) {
        const o = meetingPick(cur.meeting);
        if (!o) return;
        chooseAnswer(cur, o.id);
      } else if (e.key === 'Enter' && cur.kind === 'meetings') chooseSmall(cur);
      else if (/^[1-4]$/.test(e.key) && (cur.kind === 'crisis' || cur.kind === 'meeting')) {
        const o = options[Number(e.key) - 1];
        if (!o) return;
        chooseAnswer(cur, o.id);
      } else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, ex]);
}

export function Desk() {
  const world = useGameStore((s) => s.worldState);
  const gameOver = useGameStore((s) => s.gameOver);
  const saveId = useGameStore((s) => s.saveId);
  const deskMode = useGameStore((s) => s.deskMode);
  const deskView = useGameStore((s) => s.deskView);
  const review = useGameStore((s) => s.review);
  const listOpen = useGameStore((s) => s.listOpen);
  const focus = useGameStore((s) => s.focus);
  const selected = useGameStore((s) => s.selectedCountryId);
  const picked = useGameStore((s) => s.orderTarget);
  const setTarget = useGameStore((s) => s.setOrderTarget);
  const me = usePlayerCountry();
  const L = useLayout();
  const itemRef = useRef<HTMLElement>(null);
  const agendaKey = useGameStore((s) => s.agendaKey);
  const choices = useGameStore((s) => s.decisionChoices);
  // The Thing never scrolls: when its content is taller than the room, it drops detail in steps
  const fit = useFitLevel(itemRef, `${agendaKey}|${review}|${focus.kind}|${Object.keys(choices).length}|${deskMode}`, 3);
  // A country picked on the big map becomes the order target until the player picks another
  const target = picked || (selected && selected !== world?.playerCountryId ? selected : '');
  const turn = world?.turn;
  // The month's defaults (recommended answers, staff orders) once per save and month
  useEffect(() => {
    if (saveId && turn !== undefined) void setupMonth();
  }, [saveId, turn]);
  // Months 1 and 2, phones and tablets open in "One at a time" (without overwriting the saved choice)
  useEffect(() => {
    if (turn === undefined) return;
    const s = useGameStore.getState();
    if (defaultDeskView(s.worldState, s.deskView) === 'focus' && s.deskView !== 'focus') useGameStore.setState({ deskView: 'focus' });
  }, [turn]);
  useDeskKeys((deskMode === 'desk' || deskMode === 'map') && !gameOver);
  if (!world || !me || gameOver || deskMode !== 'desk') return null;
  if (L.cls === 'P') return <PhoneMonth target={target} setTarget={setTarget} />;
  const detail = focus.kind === 'catalog' || focus.kind === 'order' || focus.kind === 'suggestions';
  const first = world.turn === 0;
  const listColumn = L.listColumn || (L.planRail && deskView === 'full' && !first);
  return (
    <section className={`desk-screen${listColumn ? ' has-list' : ''}${review ? ' is-review' : ''}`} aria-label="Your desk" data-cls={L.cls}>
      {listColumn && <AgendaList form="column" />}
      <main className="item" data-region="item" id="desk-stage" ref={itemRef} data-fit={fit}>
        {review ? <ReviewPage /> : detail ? <Detail target={target} setTarget={setTarget} /> : <Thing />}
        {!listColumn && listOpen && <AgendaList form="panel" />}
      </main>
      {!review && (L.planRail ? <Plan form="rail" /> : <Plan form="bar" />)}
    </section>
  );
}

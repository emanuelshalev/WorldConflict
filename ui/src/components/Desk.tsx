import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { crisisStaffPick, meetingSuggestion } from '../lib/staff';
import { useGameStore } from '../store/gameStore';
import { approveAll, setupMonth } from '../lib/month';
import { Navigator } from './desk/Navigator';
import { deskItems } from '../lib/deskItems';
import { Detail } from './desk/Detail';
import { CommandRail } from './desk/CommandRail';
import { useExecute } from '../lib/useExecute';

/**
 * The desk: everything this month on the left, the item in focus in the middle, and on the right
 * what you will do (the 2D map of the subject, budgets, the selection, readiness and Execute).
 * Nothing on the right ever scrolls out of sight.
 */

function CoachTip() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('worldconflict.deskTip') === 'done';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const stacked = window.matchMedia?.('(max-width: 1099px)').matches ?? false;
  const dismiss = () => {
    try {
      localStorage.setItem('worldconflict.deskTip', 'done');
    } catch {
      /* storage unavailable */
    }
    setHidden(true);
  };
  return (
    <div className="desk-tip" role="note">
      <span>
        {stacked ? (
          <>
            <b>Top:</b> what needs you. <b>Below:</b> the item you are on. <b>Bottom sheet:</b> what you will do this month.
          </>
        ) : (
          <>
            <b>Left:</b> what needs you. <b>Middle:</b> the item you are on. <b>Right:</b> what you will do this month.
          </>
        )}{' '}
        Your staff have pre-filled everything: change what you do not like, approve the rest, then Execute.
      </span>
      <button className="wc-btn ghost small" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}

/** Desk shortcuts: J/K walk the desk, 1-3 pick an option, Shift+A approve all, / search. */
function useDeskKeys(enabled: boolean) {
  const ex = useExecute();
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const s = useGameStore.getState();
      if (s.activeModal || s.showChronicle || s.drawer) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        ex.run();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const items = deskItems();
      const at = items.findIndex((x) => x.kind === s.focus.kind && (x.id ?? '') === (s.focus.id ?? ''));
      if (e.key === 'j' || e.key === 'k') {
        const next = items[Math.max(0, Math.min(items.length - 1, at + (e.key === 'j' ? 1 : -1)))];
        if (next) s.setFocus({ kind: next.kind, id: next.id });
      } else if (e.key === 'A' && e.shiftKey) approveAll();
      else if (e.key === '/') {
        e.preventDefault();
        flushSync(() => s.setFocus({ kind: 'catalog' }));
        document.getElementById('catalog-search')?.focus();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.focus.kind === 'order') {
        s.removePendingAction(Number(s.focus.id));
        s.setFocus({ kind: 'suggestions' });
      } else if (e.key === 'Enter' && s.focus.kind === 'crisis') {
        const d = s.pendingDecisions.find((x) => x.id === s.focus.id);
        if (!d) return;
        s.chooseDecision(d.id, s.decisionChoices[d.id] ?? crisisStaffPick(d, s.worldState?.objective).id);
      } else if (e.key === 'Enter' && s.focus.kind === 'meeting') {
        const m = s.worldState?.agenda?.find((x) => x.id === s.focus.id);
        const o = m && meetingSuggestion(m);
        if (!m || !o) return;
        s.chooseDecision(m.id, o.id);
      } else if (/^[1-3]$/.test(e.key) && (s.focus.kind === 'crisis' || s.focus.kind === 'meeting')) {
        const item = s.focus.kind === 'crisis' ? s.pendingDecisions.find((d) => d.id === s.focus.id) : s.worldState?.agenda?.find((m) => m.id === s.focus.id);
        const opts = item?.options.filter((o) => s.focus.kind === 'crisis' || o.id !== item.defaultOptionId) ?? [];
        const o = opts[Number(e.key) - 1];
        if (item && o) s.chooseDecision(item.id, o.id);
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
  const selected = useGameStore((s) => s.selectedCountryId);
  const [picked, setTarget] = useState('');
  // A country picked on the big map becomes the order target until the player picks another
  const target = picked || (selected && selected !== world?.playerCountryId ? selected : '');
  const turn = world?.turn;
  // The month's defaults (staff picks, staff orders) once per save and month
  useEffect(() => {
    if (saveId && turn !== undefined) void setupMonth();
  }, [saveId, turn]);
  useDeskKeys(deskMode === 'desk' && !gameOver);
  if (!world || gameOver || deskMode !== 'desk') return null;
  return (
    <section className="desk-screen" aria-label="Your desk">
      <Navigator />
      <div className="desk-center">
        <CoachTip />
        <Detail target={target} setTarget={setTarget} />
      </div>
      <CommandRail catalogTarget={target} />
    </section>
  );
}

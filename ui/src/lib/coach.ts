import { create } from 'zustand';
import { useGameStore } from '../store/gameStore';

/**
 * The month 1 coach (design-month.md 4.2): three steps, one bubble at a time, each anchored to the
 * thing it talks about and dismissed by doing it, not by "Got it". After the first result card one
 * last line on the card, then the coach is finished for good (`worldconflict.coach = done`),
 * replayable from Settings ("Show me around again").
 *
 *   1 move      "This is your move this month. Pick one."           done when an option is tapped
 *   2 advisors  "Your advisors added these. Keep them, or tap Add."  done on Add, Remove or "Fine"
 *   3 execute   "When you are ready, run the month."                  done on Execute
 *   4 result    "Your mission bar moved. Tap it any time..."           on the first result card
 */
export type CoachStep = 'move' | 'advisors' | 'execute' | 'result' | 'done';

const KEY = 'worldconflict.coach';
const ORDER: CoachStep[] = ['move', 'advisors', 'execute', 'result', 'done'];

function read(): CoachStep {
  try {
    const v = localStorage.getItem(KEY) as CoachStep | null;
    // The old desk tip counts as done: a returning player is not coached again
    if (!v && localStorage.getItem('worldconflict.deskTip') === 'done') return 'done';
    return v && ORDER.includes(v) ? v : 'move';
  } catch {
    return 'move';
  }
}

function write(step: CoachStep) {
  try {
    localStorage.setItem(KEY, step);
  } catch {
    /* storage unavailable */
  }
}

export const COACH_TEXT: Record<Exclude<CoachStep, 'done'>, string> = {
  move: 'This is your move this month. Pick one.',
  advisors: 'Your advisors added these. Keep them, or tap Add on another.',
  execute: 'When you are ready, run the month.',
  result: 'Your mission bar moved. Tap it any time to see what each goal needs.',
};

interface CoachState {
  step: CoachStep;
  /** Move past `from` (no-op when the coach is elsewhere: acting before a bubble skips it). */
  advance: (from: CoachStep) => void;
  finish: () => void;
  replay: () => void;
}

export const useCoach = create<CoachState>((set, get) => ({
  step: read(),
  advance: (from) => {
    const now = get().step;
    const at = ORDER.indexOf(now);
    const past = ORDER.indexOf(from);
    if (now === 'done' || past < at) return;
    const next = ORDER[Math.min(ORDER.length - 1, past + 1)];
    write(next);
    set({ step: next });
  },
  finish: () => {
    write('done');
    set({ step: 'done' });
  },
  replay: () => {
    write('move');
    set({ step: 'move' });
  },
}));

/** Step numbers for the bubble ("Step 1 of 3"). */
export const coachIndex = (s: CoachStep) => Math.min(3, ORDER.indexOf(s) + 1);

// Advance by doing: an answered crisis, a changed plan, an executed month
useGameStore.subscribe((st, prev) => {
  const coach = useCoach.getState();
  if (coach.step === 'done' || !st.worldState) return;
  if (st.reviewed !== prev.reviewed && Object.keys(st.reviewed).length > Object.keys(prev.reviewed).length && st.monthKey === prev.monthKey)
    coach.advance('move');
  // Only the player's own edits count (setupMonth queues staff orders with origin "staff")
  const mineNow = st.pendingActions.filter((a) => a.origin !== 'staff').length;
  const minePrev = prev.pendingActions.filter((a) => a.origin !== 'staff').length;
  const removed = st.dismissedStaff.length > prev.dismissedStaff.length;
  if (st.monthKey === prev.monthKey && (mineNow !== minePrev || removed)) {
    if (coach.step === 'move') coach.advance('move');
    useCoach.getState().advance('advisors');
  }
  if (prev.worldState && st.worldState.turn > prev.worldState.turn) {
    const c = useCoach.getState();
    if (c.step === 'move' || c.step === 'advisors' || c.step === 'execute') {
      write('result');
      useCoach.setState({ step: 'result' });
    }
  }
});

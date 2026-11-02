import {
  MEETING_SLOTS,
  type DeskFocus,
  type PendingAction,
  capitalLeft,
  fetchPreview,
  orderKey,
  useGameStore,
} from '../store/gameStore';
import { DANGEROUS, computeSuggestions, crisisStaffPick, meetingPriority, meetingSuggestion } from './staff';
import { pcCost } from './actions';

/**
 * The month's starting position on the desk: every crisis on the staff pick, up to three staff
 * orders queued within the capital, meetings suggested but waiting for approval. Applied once per
 * save and month, client side (the server only ever sees the final choices). The player's edits are
 * saved per save and month, so a reload comes back to the same desk.
 */

interface Stored {
  pendingActions: PendingAction[];
  decisionChoices: Record<string, string>;
  reviewed: Record<string, true>;
  dismissedStaff: string[];
}

const storeKey = (key: string) => `worldconflict.pending.${key}`;
const STAFF_ORDERS = 2;
/** The staff always leave this much political capital for the player's own orders. */
const RESERVE_PC = 1;
/** Orders with worse odds than this are left for the player to decide. */
const MIN_ODDS = 0.35;

function readStored(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(storeKey(key));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/** The first thing that needs the player: a crisis, else a meeting, else the staff orders. */
export function firstFocus(): DeskFocus {
  const s = useGameStore.getState();
  if (s.pendingDecisions[0]) return { kind: 'crisis', id: s.pendingDecisions[0].id };
  const m = s.worldState?.agenda?.[0];
  if (m) return { kind: 'meeting', id: m.id };
  return { kind: 'suggestions' };
}

let setupRunning: string | null = null;

export async function setupMonth(): Promise<void> {
  const s = useGameStore.getState();
  const world = s.worldState;
  if (!world || !s.saveId || s.gameOver) return;
  const key = `${s.saveId}:${world.turn}`;
  if (s.monthKey === key || setupRunning === key) return;
  setupRunning = key;
  try {
    // Forget the desks of earlier months of this save
    try {
      const prefix = storeKey(`${s.saveId}:`);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix) && k !== storeKey(key)) localStorage.removeItem(k);
      }
    } catch {
      /* storage unavailable */
    }
    const stored = readStored(key);
    if (stored) {
      useGameStore.setState({ ...stored, monthKey: key, deskMode: 'desk' });
      useGameStore.setState({ focus: firstFocus() });
      return;
    }
    // 1. Crises: the staff pick, paid for in order
    const choices: Record<string, string> = { ...s.decisionChoices };
    let pc = world.politicalCapital;
    for (const d of s.pendingDecisions) {
      if (choices[d.id]) continue;
      const pick = crisisStaffPick(d, world.objective, pc);
      choices[d.id] = pick.id;
      pc += pick.effects.pc ?? 0;
    }
    useGameStore.setState({ decisionChoices: choices, reviewed: {}, dismissedStaff: [], monthKey: key, deskMode: 'desk' });
    useGameStore.setState({ focus: firstFocus() });
    // 2. Orders: up to three safe staff suggestions within the capital
    if (!useGameStore.getState().staffOrders) return;
    const me = world.countries.find((c) => c.id === world.playerCountryId);
    const suggestions = computeSuggestions(world, s.playerView, me);
    // Last month's orders: the staff do not repeat one on their own
    const lastMonth = new Set((world.turnReport?.orders ?? []).map((o) => o.label));
    let queued = 0;
    for (const sug of suggestions) {
      if (queued >= STAFF_ORDERS) break;
      const now = useGameStore.getState();
      if (now.monthKey !== key) return; // the month moved on while we waited for a preview
      if (DANGEROUS.has(sug.action.type)) continue;
      if (now.pendingActions.some((a) => orderKey(a) === orderKey(sug.action))) continue;
      if (lastMonth.has(sug.action.label)) continue;
      if (pcCost(sug.action.type) > capitalLeft(now) - RESERVE_PC) continue;
      const preview = await fetchPreview(sug.action);
      if (!preview || preview.blocked || preview.missionWarning) continue;
      const odds = preview.successChance == null ? 1 : preview.successChance > 1 ? preview.successChance / 100 : preview.successChance;
      if (odds < MIN_ODDS) continue;
      if (useGameStore.getState().monthKey !== key) return;
      useGameStore.getState().addPendingAction({ ...sug.action, preview, origin: 'staff', why: `${sug.who}: ${sug.why}` });
      queued++;
    }
  } finally {
    setupRunning = null;
  }
}

/** Every staff suggestion not yet approved: crisis picks to confirm and meetings to attend. */
export function pendingApprovals(): { crises: string[]; meetings: Array<{ id: string; optionId: string }>; deputies: string[] } {
  const s = useGameStore.getState();
  const world = s.worldState;
  if (!world) return { crises: [], meetings: [], deputies: [] };
  const crises = s.pendingDecisions.filter((d) => !s.reviewed[d.id]).map((d) => d.id);
  const agenda = world.agenda ?? [];
  const attending = agenda.filter((m) => s.decisionChoices[m.id] && s.decisionChoices[m.id] !== m.defaultOptionId).length;
  let free = MEETING_SLOTS - attending;
  let pc = Math.max(0, capitalLeft(s));
  const meetings: Array<{ id: string; optionId: string }> = [];
  for (const m of meetingPriority(agenda, world.objective)) {
    if (free <= 0) break;
    if (s.decisionChoices[m.id]) continue;
    const o = meetingSuggestion(m);
    if (!o) continue;
    const cost = -(o.effects.pc ?? 0);
    if (cost > 0 && cost > pc) continue;
    pc -= Math.max(0, cost);
    meetings.push({ id: m.id, optionId: o.id });
    free--;
  }
  // Every other open meeting goes to a deputy, so the calendar is settled
  const taken = new Set(meetings.map((m) => m.id));
  const deputies = agenda.filter((m) => !s.decisionChoices[m.id] && !taken.has(m.id) && m.defaultOptionId).map((m) => m.id);
  return { crises, meetings, deputies };
}

/** Approve all: confirm the crisis picks and attend the suggested meetings (the rest go to deputies). */
export function approveAll(): void {
  const { crises, meetings, deputies } = pendingApprovals();
  const s = useGameStore.getState();
  const reviewed = { ...s.reviewed };
  const choices = { ...s.decisionChoices };
  for (const id of crises) reviewed[id] = true;
  for (const m of meetings) {
    choices[m.id] = m.optionId;
    reviewed[m.id] = true;
  }
  const agenda = s.worldState?.agenda ?? [];
  for (const id of deputies) {
    const m = agenda.find((x) => x.id === id);
    if (m?.defaultOptionId) choices[id] = m.defaultOptionId;
  }
  useGameStore.setState({ reviewed, decisionChoices: choices });
}

// Save the desk on every change, per save and month
useGameStore.subscribe((st, prev) => {
  if (!st.monthKey || setupRunning === st.monthKey) return;
  if (st.pendingActions === prev.pendingActions && st.decisionChoices === prev.decisionChoices && st.reviewed === prev.reviewed && st.dismissedStaff === prev.dismissedStaff) return;
  try {
    const data: Stored = { pendingActions: st.pendingActions, decisionChoices: st.decisionChoices, reviewed: st.reviewed, dismissedStaff: st.dismissedStaff };
    localStorage.setItem(storeKey(st.monthKey), JSON.stringify(data));
  } catch {
    /* storage unavailable or full */
  }
});

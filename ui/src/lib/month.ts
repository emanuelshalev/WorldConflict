import {
  MEETING_SLOTS,
  type ConditionStatus,
  type DecisionOption,
  type DeskFocus,
  type GameState,
  type Impact,
  type Meeting,
  type PendingAction,
  type PendingDecision,
  type WorldState,
  capitalLeft,
  countryName,
  fetchPreview,
  orderKey,
  useGameStore,
} from '../store/gameStore';
import { DANGEROUS, computeSuggestions, crisisStaffPick, meetingPriority, meetingSuggestion } from './staff';
import { pcCost } from './actions';
import { effectArrows } from './format';

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
    // The engine's staff queue first (variety rules: no order type two months running, at most
    // twice in four months; safe and affordable), else the top suggestions
    const suggestions = s.advice?.staffOrders ?? computeSuggestions(world, s.playerView, me);
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

// ============================================================================
// The month's hierarchy (design-month.md 3): one move, one goal, one result
// ============================================================================

/** Next month's political capital refill (src/core/costs.ts politicalCapitalIncome). */
export function pcIncome(world: WorldState | null | undefined): number {
  if (!world) return 2;
  return 2 + (world.mode === 'FLASHPOINT' ? 1 : 0) + (world.difficulty === 'ANALYST' ? 1 : 0);
}

/** The cabinet's pick for a crisis (the engine's consensus when the payload has it). */
export function cabinetPick(d: PendingDecision): DecisionOption {
  return crisisStaffPick(d, useGameStore.getState().worldState?.objective);
}

/** The option with the best mission score (engine). */
export function missionPick(d: PendingDecision): DecisionOption | undefined {
  const id = useGameStore.getState().advice?.missionPicks[d.id];
  return id ? d.options.find((o) => o.id === id) : undefined;
}

/** What the staff answer in a meeting (engine pick first). */
export function meetingPick(m: Meeting): DecisionOption | undefined {
  const id = useGameStore.getState().advice?.meetingPicks[m.id];
  return (id ? m.options.find((o) => o.id === id) : undefined) ?? meetingSuggestion(m);
}

export type SelectionKind = 'cabinet' | 'approved' | 'yours' | 'waiting' | 'deputy';

export interface Selection {
  kind: SelectionKind;
  option?: DecisionOption;
  /** "Cabinet pick: Back channel via Muscat" */
  text: string;
  /** "Cabinet pick" (rows and tags where the option name does not fit) */
  word: string;
}

/** The named selection state of a crisis (never "Your call"). */
export function crisisSelection(d: PendingDecision, choices: Record<string, string>, reviewed: Record<string, true>): Selection {
  const cab = cabinetPick(d);
  const chosen = d.options.find((o) => o.id === choices[d.id]) ?? cab;
  if (!reviewed[d.id]) return { kind: 'cabinet', option: chosen, text: `Cabinet pick: ${chosen.label}`, word: 'Cabinet pick' };
  if (chosen.id === cab.id) return { kind: 'approved', option: chosen, text: `Approved: ${chosen.label}`, word: 'Approved' };
  return { kind: 'yours', option: chosen, text: `Your pick: ${chosen.label}`, word: 'Your pick' };
}

/** The named selection state of a meeting. */
export function meetingSelection(m: Meeting, choices: Record<string, string>, reviewed: Record<string, true>): Selection {
  const pick = choices[m.id];
  const sugg = meetingPick(m);
  if (!pick) return { kind: 'waiting', option: sugg, text: sugg ? `Staff would answer: ${sugg.label}` : 'Waiting for you', word: 'Waiting' };
  if (pick === m.defaultOptionId) return { kind: 'deputy', text: 'A deputy goes', word: 'Deputy' };
  const o = m.options.find((x) => x.id === pick);
  if (o && sugg && o.id === sugg.id && !reviewed[m.id]) return { kind: 'cabinet', option: o, text: `Staff attend: ${o.label}`, word: 'Staff attend' };
  if (o && sugg && o.id === sugg.id) return { kind: 'approved', option: o, text: `Approved: ${o.label}`, word: 'Approved' };
  return { kind: 'yours', option: o, text: `Your pick: ${o?.label ?? ''}`, word: 'Your pick' };
}

export interface MissionTag {
  tone: 'risk' | 'help' | 'bonus';
  text: string;
  /** Other objectives this option also moves (shown as "+1 more"). */
  more: number;
}

/** A goal's name in a tag: its numbers in brackets when short ("stability 78%+"), else the short label. */
export function goalName(c: Pick<ConditionStatus, 'label' | 'short'> | undefined, fallback = ''): string {
  if (!c) return fallback;
  const inner = /\(([^)]+)\)/.exec(c.label)?.[1];
  if (inner && inner.length <= 26 && /\d/.test(inner)) return inner;
  return c.short ?? c.label.replace(/\s*[(:].*$/, '');
}

/** At most one mission tag: breaks, then hurts, then helps, then helps a bonus (design-month 3.4). */
export function missionTag(impact: Impact | undefined, status: ConditionStatus[]): MissionTag | null {
  if (!impact) return null;
  const name = (effect: 'helps' | 'hurts' | 'breaks', bonus: boolean, fallback: string) => {
    const link = impact.links?.find((l) => l.effect === effect && l.bonus === bonus);
    return goalName(link ? status[link.index] : undefined, fallback);
  };
  const total = impact.breaks.length + impact.hurts.length + impact.helps.length + impact.bonusHelps.length;
  if (impact.breaks.length) return { tone: 'risk', text: `Breaks: ${name('breaks', false, impact.breaks[0])}`, more: total - 1 };
  if (impact.hurts.length) return { tone: 'risk', text: `Hurts: ${name('hurts', false, impact.hurts[0])}`, more: total - 1 };
  if (impact.helps.length) return { tone: 'help', text: `Helps: ${name('helps', false, impact.helps[0])}`, more: total - 1 };
  if (impact.bonusHelps.length) return { tone: 'bonus', text: `Helps: ${name('helps', true, impact.bonusHelps[0])} (bonus)`, more: total - 1 };
  return null;
}

const possessive = (n: string) => (/s$/.test(n) ? `${n}'` : `${n}'s`);
const PLAIN_LABELS = new Set(['Approval', 'Stability', 'Legitimacy', 'Economy', 'Mobilization', 'Counter-intel']);

export interface EffectWord {
  text: string;
  tone: 'up' | 'down';
  strength: number;
}

/** Effect arrows in words, strongest first: "Approval up a lot", "Yemen's view of you up". */
export function effectWords(o: DecisionOption): EffectWord[] {
  return effectArrows(o, countryName)
    .map((a) => {
      const how = `${a.dir === 'up' ? 'up' : 'down'}${a.strength >= 3 ? ' a lot' : ''}`;
      let text: string;
      if (a.label === 'WAR') text = 'Starts a war';
      else if (a.label === 'Airstrike') text = 'Air strikes';
      else if (['Consequences later', 'Coup-proofed'].includes(a.label) || /^(Ceasefire with|Gaza (war|truce))/.test(a.label)) text = a.label;
      else if (a.label === 'Tension') text = `World tension ${how}`;
      else if (a.label === 'Pol. capital') text = `Political capital ${how}`;
      else if (a.label === 'Allies' || a.label === 'Rivals') text = `${a.label}' view of you ${how}`;
      else if (PLAIN_LABELS.has(a.label) || /Gaza|West Bank|Ground held|Settlement/.test(a.label)) text = `${a.label} ${how}`;
      else text = `${possessive(a.label)} view of you ${how}`;
      return { text, tone: a.good ? ('up' as const) : ('down' as const), strength: a.strength };
    })
    .sort((x, y) => y.strength - x.strength);
}

export type PrimaryItem = { kind: 'crisis'; decision: PendingDecision } | { kind: 'meeting'; meeting: Meeting } | { kind: 'quiet' } | null;

/** The month's one primary decision (design-month 3.2): first match wins. */
export function primaryItem(state: GameState = useGameStore.getState()): PrimaryItem {
  const world = state.worldState;
  if (!world) return null;
  const ds = state.pendingDecisions;
  const tagged = (d: PendingDecision) => Object.values(state.missionImpact[d.id] ?? {}).some((i) => i.helps.length + i.hurts.length + i.breaks.length > 0);
  const d = ds.find((x) => x.urgency === 'EXISTENTIAL') ?? ds.find(tagged) ?? ds.find((x) => x.urgency === 'URGENT') ?? ds[0];
  if (d) return { kind: 'crisis', decision: d };
  const targets = new Set([...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])].flatMap((c) => [c.targetId, c.otherId]).filter(Boolean));
  const m = (world.agenda ?? []).find((x) => x.withCountry && targets.has(x.withCountry));
  if (m) return { kind: 'meeting', meeting: m };
  return { kind: 'quiet' };
}

export function primaryId(p: PrimaryItem): string | undefined {
  return p?.kind === 'crisis' ? p.decision.id : p?.kind === 'meeting' ? p.meeting.id : undefined;
}

export interface PlanLine {
  text: string;
  /** Cabinet picks and staff orders that work against the mission. */
  against: Array<{ id: string; kind: 'crisis' | 'order'; label: string; goal: string }>;
}

/** "Your pick on 1 crisis, 2 staff orders, you attend 2 meetings", plus what works against the mission. */
export function planSummary(state: GameState = useGameStore.getState()): PlanLine {
  const world = state.worldState;
  const parts: string[] = [];
  const crises = state.pendingDecisions.map((d) => crisisSelection(d, state.decisionChoices, state.reviewed));
  const n = (k: number, w: string, ws = `${w}s`) => `${k} ${k === 1 ? w : ws}`;
  const yours = crises.filter((c) => c.kind === 'yours').length;
  const approved = crises.filter((c) => c.kind === 'approved').length;
  const cabinet = crises.filter((c) => c.kind === 'cabinet').length;
  if (yours) parts.push(`your pick on ${n(yours, 'crisis', 'crises')}`);
  if (approved) parts.push(`${n(approved, 'cabinet pick')} approved`);
  if (cabinet) parts.push(`cabinet pick on ${n(cabinet, 'crisis', 'crises')}`);
  const staff = state.pendingActions.filter((a) => a.origin === 'staff').length;
  const mine = state.pendingActions.length - staff;
  if (mine) parts.push(n(mine, 'order of yours', 'orders of yours'));
  if (staff) parts.push(n(staff, 'staff order'));
  const agenda = world?.agenda ?? [];
  const attend = agenda.filter((m) => state.decisionChoices[m.id] && state.decisionChoices[m.id] !== m.defaultOptionId).length;
  if (attend) parts.push(`you attend ${n(attend, 'meeting')}`);
  else if (agenda.length) parts.push(`deputies take ${n(agenda.length, 'meeting')}`);
  const text = parts.length ? parts.join(', ').replace(/^./, (c) => c.toUpperCase()) : 'Nothing decided yet: the month runs on its own';
  const against: PlanLine['against'] = [];
  state.pendingDecisions.forEach((d, i) => {
    const sel = crises[i];
    if (sel.kind !== 'cabinet' || !sel.option) return;
    const tag = missionTag(state.missionImpact[d.id]?.[sel.option.id], state.objectiveStatus);
    if (tag?.tone === 'risk') against.push({ id: d.id, kind: 'crisis', label: sel.option.label, goal: tag.text.replace(/^(Hurts|Breaks): /, '') });
  });
  state.pendingActions.forEach((a, i) => {
    if (a.origin === 'staff' && a.preview?.missionWarning) against.push({ id: String(i), kind: 'order', label: a.label, goal: a.preview.missionWarning });
  });
  return { text, against };
}

/** The desk view: Focus on phones and tablets and in months 1 and 2, else the player's choice. */
export function defaultDeskView(world: WorldState | null | undefined, stored: 'focus' | 'full'): 'focus' | 'full' {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 1100;
  if (narrow || (world?.turn ?? 0) < 2) return 'focus';
  return stored;
}

/** The authored situation's first sentence (the lede) and the rest. */
export function splitLede(text: string): [string, string] {
  const m = /^(.+?[.!?])(\s+)(?=[A-Z"'“])/.exec(text);
  if (!m) return [text, ''];
  return [m[1], text.slice(m[0].length)];
}

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
  approveProposal,
  capitalLeft,
  committedActions,
  countryName,
  fetchPreview,
  orderKey,
  useGameStore,
} from '../store/gameStore';
import { DANGEROUS, computeSuggestions, crisisStaffPick, meetingPriority, meetingSuggestion } from './staff';
import { pcCost } from './actions';
import { MAX_ORDERS } from './budget';
import { effectArrows } from './format';
import { TERMS } from './glossary';

/**
 * The month's starting position on the desk: every crisis on the staff pick, up to two staff
 * orders proposed within the capital (F-02-4: proposals spend nothing until approved, and Execute
 * leaves unapproved ones out), meetings suggested but waiting for approval. Applied once per save
 * and month, client side (the server only ever sees the final choices). The player's edits are
 * saved per save and month, so a reload comes back to the same desk.
 */

interface Stored {
  pendingActions: PendingAction[];
  decisionChoices: Record<string, string>;
  reviewed: Record<string, true>;
  dismissedStaff: string[];
}

const storeKey = (key: string) => `worldconflict.pending.${key}`;
/** Mirrors src/core/advisors.ts STAFF_ORDERS, RESERVE_PC and MIN_ODDS (tests compare them). */
export const STAFF_ORDERS = 2;
/** The staff always leave this much political capital for the player's own orders. */
export const RESERVE_PC = 1;
/** Orders with worse odds than this are left for the player to decide. */
export const MIN_ODDS = 0.35;

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
    // 2. Orders: up to two safe staff proposals within the capital (the engine's staffOrders rule:
    //    affordable after the crisis picks, leaving RESERVE_PC). Proposals hold nothing, so the
    //    running total of proposed costs stands in for the capital they would take.
    if (!useGameStore.getState().staffOrders) return;
    const me = world.countries.find((c) => c.id === world.playerCountryId);
    // The engine's staff queue first (variety rules: no order type two months running, at most
    // twice in four months; safe and affordable), else the top suggestions
    const suggestions = s.advice?.staffOrders ?? computeSuggestions(world, s.playerView, me);
    // Last month's orders: the staff do not repeat one on their own
    const lastMonth = new Set((world.turnReport?.orders ?? []).map((o) => o.label));
    let queued = 0;
    let proposedPc = 0;
    for (const sug of suggestions) {
      if (queued >= STAFF_ORDERS) break;
      const now = useGameStore.getState();
      if (now.monthKey !== key) return; // the month moved on while we waited for a preview
      if (DANGEROUS.has(sug.action.type)) continue;
      if (now.pendingActions.some((a) => orderKey(a) === orderKey(sug.action))) continue;
      if (lastMonth.has(sug.action.label)) continue;
      if (pcCost(sug.action.type) > capitalLeft(now) - proposedPc - RESERVE_PC) continue;
      const preview = await fetchPreview(sug.action);
      if (!preview || preview.blocked || preview.missionWarning) continue;
      const odds = preview.successChance == null ? 1 : preview.successChance > 1 ? preview.successChance / 100 : preview.successChance;
      if (odds < MIN_ODDS) continue;
      if (useGameStore.getState().monthKey !== key) return;
      useGameStore.getState().addPendingAction({ ...sug.action, preview, origin: 'staff', why: `${sug.who}: ${sug.why}`, proposed: true });
      proposedPc += pcCost(sug.action.type);
      queued++;
    }
  } finally {
    setupRunning = null;
  }
}

/**
 * Every staff suggestion not yet approved, in the engine's order (advisors.ts buildAdvice): crisis
 * picks to confirm, then staff proposals that fit the capital and order slots, then meetings to
 * attend with what is left.
 */
export function pendingApprovals(): { crises: string[]; orders: number[]; meetings: Array<{ id: string; optionId: string }>; deputies: string[] } {
  const s = useGameStore.getState();
  const world = s.worldState;
  if (!world) return { crises: [], orders: [], meetings: [], deputies: [] };
  const crises = s.pendingDecisions.filter((d) => !s.reviewed[d.id]).map((d) => d.id);
  let pc = Math.max(0, capitalLeft(s));
  let slots = MAX_ORDERS - committedActions(s.pendingActions).length;
  const orders: number[] = [];
  s.pendingActions.forEach((a, i) => {
    if (!a.proposed) return;
    const cost = pcCost(a.type);
    if (cost > pc || slots <= 0) return;
    pc -= cost;
    slots--;
    orders.push(i);
  });
  const agenda = world.agenda ?? [];
  const attending = agenda.filter((m) => s.decisionChoices[m.id] && s.decisionChoices[m.id] !== m.defaultOptionId).length;
  let free = MEETING_SLOTS - attending;
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
  return { crises, orders, meetings, deputies };
}

/**
 * Approve all: confirm the crisis picks, approve the staff proposals that fit and attend the
 * suggested meetings (the rest go to deputies). This is what the balance harness's staff policy
 * plays (scripts/simulate.ts).
 */
export function approveAll(): void {
  const { crises, orders, meetings, deputies } = pendingApprovals();
  for (const i of orders) approveProposal(i);
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
  // "stability 78%+", "US relations 70+"; a bare "relations 40+" does not say whose, so the label wins
  if (inner && inner.length <= 26 && /\d/.test(inner) && !/^relations\b/i.test(inner)) return inner;
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
  const committed = committedActions(state.pendingActions);
  const staff = committed.filter((a) => a.origin === 'staff').length;
  const mine = committed.length - staff;
  const waiting = state.pendingActions.length - committed.length;
  if (mine) parts.push(n(mine, 'order of yours', 'orders of yours'));
  if (staff) parts.push(n(staff, 'staff order'));
  if (waiting) parts.push(`${n(waiting, 'staff proposal')} not approved (${waiting === 1 ? 'it will not run' : 'they will not run'})`);
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

/** Words the Guide me lede keeps before More (F-02-1: newcomers get fewer words, not more). */
export const GUIDE_LEDE_WORDS = 16;

/**
 * The Guide me lede: at most `max` words, cut at a clause break (comma, colon, semicolon) when one
 * falls in the second half, else at a word, with an ellipsis. `trimmed` says whether More has
 * anything to add from this sentence. Other levels show the authored lede untouched.
 */
export function guideLede(text: string, max = GUIDE_LEDE_WORDS): { short: string; trimmed: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return { short: text.trim(), trimmed: false };
  const head = words.slice(0, max);
  let cut = -1;
  for (let i = head.length - 1; i >= Math.ceil(max / 2) - 1; i--) {
    if (/[,;:]$/.test(head[i])) {
      cut = i;
      break;
    }
  }
  const kept = cut >= 0 ? head.slice(0, cut + 1) : head;
  return { short: `${kept.join(' ').replace(/[,;:]$/, '')}…`, trimmed: true };
}

/** "Approval about +2 · Iran: relations about -4": the top predicted effects of a proposal (F-02-4). */
export function proposalEffects(a: Pick<PendingAction, 'preview'>, max = 2): string {
  return (a.preview?.effects ?? [])
    .slice(0, max)
    .map((e) => `${e.target && e.target !== 'Global' ? `${e.target}: ` : ''}${e.metric} ${/^[+-]?\d+(\.\d+)?%?$/.test(e.delta.trim()) ? `about ${e.delta}` : e.delta}`)
    .join(' · ');
}

export const MISSION_SENTENCE_ID = 'mission-sentence';

/** The goal line's month-1 link: back to the desk, scroll to the sentence, focus it and flash it. */
export function showMissionSentence(): void {
  const s = useGameStore.getState();
  if (s.deskMode !== 'desk') s.setDeskMode('desk');
  // Two frames: the desk may mount first when the link is pressed in Map mode
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const el = document.getElementById(MISSION_SENTENCE_ID);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
    el.classList.remove('is-flash');
    void el.offsetWidth;
    el.classList.add('is-flash');
  }));
}

// ============================================================================
// Staff picks (RS-005): what Approve all approves, listed next to the button
// ============================================================================

export type StaffPickKind = 'crisis' | 'order' | 'meeting' | 'deputy';

export interface StaffPickItem {
  key: string;
  kind: StaffPickKind;
  /** The crisis or meeting id, or the proposal's index in pendingActions. */
  id: string;
  /** "Cabinet pick: Reply via Muscat", "Order: Sanctions on Iran", "Meeting: ...", "Deputy takes: ..." */
  title: string;
  /** What it answers or who proposes it: "Crisis: The January clock". */
  what: string;
  /** What it changes, in words: "Will change: Approval down · Iran's view of you up" (may be empty). */
  change: string;
  /** At most one mission tag (Helps / Hurts / Breaks). */
  tag: MissionTag | null;
  /** Political capital it spends when approved. */
  cost: number;
  /** False for a proposal that no longer fits the capital or order slots: Approve all leaves it out. */
  fits: boolean;
  /** Why it does not fit (only when fits is false). */
  reason?: string;
  /** The option it picks (crises and meetings). */
  optionId?: string;
}

const changeLine = (words: string[]) => (words.length ? `Will change: ${words.join(' · ')}` : '');

/**
 * Every staff pick waiting for approval, in the order Approve all takes them (pendingApprovals):
 * cabinet picks on crises, staff orders, meetings the staff would attend, meetings a deputy takes,
 * and last any proposal that no longer fits (shown, not counted). Each says what it does and what
 * it changes, so nothing is approved unseen (RS-005).
 */
export function staffPickItems(state: GameState = useGameStore.getState()): StaffPickItem[] {
  const world = state.worldState;
  if (!world) return [];
  const { crises, orders, meetings, deputies } = pendingApprovals();
  const items: StaffPickItem[] = [];
  for (const id of crises) {
    const d = state.pendingDecisions.find((x) => x.id === id);
    if (!d) continue;
    const o = crisisSelection(d, state.decisionChoices, state.reviewed).option;
    if (!o) continue;
    items.push({
      key: `crisis:${id}`,
      kind: 'crisis',
      id,
      title: `Cabinet pick: ${o.label}`,
      what: `Crisis: ${d.title}`,
      change: changeLine(effectWords(o).slice(0, 2).map((w) => w.text)),
      tag: missionTag(state.missionImpact[id]?.[o.id], state.objectiveStatus),
      cost: Math.max(0, -(o.effects.pc ?? 0)),
      fits: true,
      optionId: o.id,
    });
  }
  const order = (i: number, fits: boolean) => {
    const a = state.pendingActions[i];
    if (!a) return;
    const cost = pcCost(a.type);
    const who = a.why?.split(':')[0];
    const fx = proposalEffects(a);
    const warn = a.preview?.missionWarning;
    const left = Math.max(0, capitalLeft(state));
    items.push({
      key: `order:${orderKey(a)}`,
      kind: 'order',
      id: String(i),
      title: `Order: ${a.label}`,
      what: `Proposed by ${who || 'staff'} · ${cost ? `◆ ${cost} if approved` : 'free'}`,
      change: fx ? `Will change: ${fx}` : '',
      tag: warn ? { tone: 'risk', text: warn, more: 0 } : missionTag(state.orderImpact[a.label], state.objectiveStatus),
      cost,
      fits,
      ...(fits ? {} : { reason: cost > left ? `Needs ◆ ${cost}, you have ◆ ${left}` : `All ${MAX_ORDERS} orders this month are used` }),
    });
  };
  for (const i of orders) order(i, true);
  const agenda = world.agenda ?? [];
  for (const p of meetings) {
    const m = agenda.find((x) => x.id === p.id);
    const o = m?.options.find((x) => x.id === p.optionId);
    if (!m || !o) continue;
    const cost = Math.max(0, -(o.effects.pc ?? 0));
    items.push({
      key: `meeting:${m.id}`,
      kind: 'meeting',
      id: m.id,
      title: `Meeting: ${o.label}`,
      what: `You attend: ${m.title}${cost ? ` · ◆ ${cost}` : ''}`,
      change: changeLine(effectWords(o).slice(0, 2).map((w) => w.text)),
      tag: missionTag(state.missionImpact[m.id]?.[o.id], state.objectiveStatus),
      cost,
      fits: true,
      optionId: o.id,
    });
  }
  for (const id of deputies) {
    const m = agenda.find((x) => x.id === id);
    if (!m) continue;
    const o = m.options.find((x) => x.id === m.defaultOptionId);
    items.push({
      key: `deputy:${m.id}`,
      kind: 'deputy',
      id: m.id,
      title: `Deputy takes: ${m.title}`,
      what: o ? `Default answer: ${o.label}` : 'Default answer',
      change: o ? changeLine(effectWords(o).slice(0, 2).map((w) => w.text)) : '',
      tag: o ? missionTag(state.missionImpact[m.id]?.[o.id], state.objectiveStatus) : null,
      cost: 0,
      fits: true,
      ...(m.defaultOptionId ? { optionId: m.defaultOptionId } : {}),
    });
  }
  // Proposals Approve all would leave out: still shown, so the list matches the plan
  const counted = new Set(orders);
  state.pendingActions.forEach((a, i) => {
    if (a.proposed && !counted.has(i)) order(i, false);
  });
  return items;
}

/** "1 crisis answer, 2 orders, 1 meeting": what the Approve button covers (fitting picks only). */
export function staffPicksBreakdown(items: readonly StaffPickItem[]): string {
  const c = (k: StaffPickKind) => items.filter((x) => x.fits && x.kind === k).length;
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const parts: string[] = [];
  if (c('crisis')) parts.push(n(c('crisis'), 'crisis answer', 'crisis answers'));
  if (c('order')) parts.push(n(c('order'), 'order', 'orders'));
  if (c('meeting')) parts.push(n(c('meeting'), 'meeting', 'meetings'));
  if (c('deputy')) parts.push(n(c('deputy'), 'meeting for a deputy', 'meetings for a deputy'));
  return parts.join(', ');
}

/** "Approve 4 staff picks" / "Approve 1 staff pick" (glossary approveAll). */
export function approveLabel(n: number): string {
  const label = TERMS.approveAll.name.split('{n}').join(String(n));
  return n === 1 ? label.replace(/picks$/, 'pick') : label;
}

/** Approve one staff pick: the same effect Approve all has on that item. */
export function approveStaffPick(item: Pick<StaffPickItem, 'kind' | 'id' | 'optionId'>): { ok: boolean } {
  if (item.kind === 'order') return approveProposal(Number(item.id));
  const s = useGameStore.getState();
  if (item.kind === 'crisis') {
    useGameStore.setState({ reviewed: { ...s.reviewed, [item.id]: true } });
    return { ok: true };
  }
  if (!item.optionId) return { ok: false };
  const choices = { ...s.decisionChoices, [item.id]: item.optionId };
  if (item.kind === 'meeting') useGameStore.setState({ decisionChoices: choices, reviewed: { ...s.reviewed, [item.id]: true } });
  else useGameStore.setState({ decisionChoices: choices });
  return { ok: true };
}

/** Change: open the pick on the desk (the crisis card, the order, the meeting). */
export function openStaffPick(item: Pick<StaffPickItem, 'kind' | 'id'>): void {
  const s = useGameStore.getState();
  if (item.kind === 'crisis') {
    s.setFocus({ kind: 'crisis', id: item.id });
    return;
  }
  s.setDeskView('full');
  s.setFocus(item.kind === 'order' ? { kind: 'order', id: item.id } : { kind: 'meeting', id: item.id });
}

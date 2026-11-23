import { type DecisionOption, type GameState, type Meeting, type PendingDecision, countryName, orderKey, useGameStore } from '../store/gameStore';
import { ADVISOR_NAMES } from './format';
import { approveAll, cabinetPick, callSet, meetingAdviser, meetingPick, missionTag, primaryItem, splitLede } from './month';
import { pcCost } from './actions';

/**
 * The month as a guided agenda (design-agenda.md 0, round 3; design-layout.md 6). One list, one
 * order, the same words on the desk, in Map mode and on phones: crises, then meetings that matter,
 * then the small meetings in one group, then the recommended orders in one group, then the
 * player's own orders (optional). Every thing ends with a choice (Choose on an answer card) or a
 * deliberate Skip; Choose all recommended is the one shortcut. State is derived from the store
 * (decisionChoices, reviewed, pendingActions) plus `skipped`; nothing is stored twice.
 */

export type AgendaKind = 'crisis' | 'meeting' | 'meetings' | 'orders' | 'move' | 'own';
export type AgendaState = 'todo' | 'decided' | 'skipped' | 'optional';

export interface AgendaItem {
  /** 'crisis:<id>' | 'meeting:<id>' | 'meetings' | 'orders' | 'own' */
  key: string;
  kind: AgendaKind;
  /** "Xi Jinping calls", "Small meetings (2)", "Recommended orders (2)", "Your own orders" */
  title: string;
  /** False for the player's own orders (optional): progress counts only the things that need you. */
  needsYou: boolean;
  state: AgendaState;
  /** The state in words: "To do", "Decided: Joint patrol", "Skipped: your Foreign Minister answers". */
  stateText: string;
  /** What the advisers recommend, in words ("reaffirm the alliance"), while it is still to do. */
  rec?: string;
  decision?: PendingDecision;
  meeting?: Meeting;
  /** The small meetings of the group. */
  meetings?: Meeting[];
  /** Indexes of the recommended orders (pendingActions) of the group. */
  orders?: number[];
  /** "Your call" (D-84): Choose all never decides it; two advisers recommend different answers. */
  call?: boolean;
}

export interface SkipMeaning {
  /** The Skip card's title: "Skip this call: your Foreign Minister answers". */
  label: string;
  /** Who answers and what they say, with the cost: "She says "We note your concern." Free, but China -3." */
  means: string;
  /** "You can still open the call again before you execute." */
  after: string;
}

const KIND_VERB: Record<Meeting['kind'], string> = { CALL: 'calls', VISIT: 'visits', STAFF: 'meets you', PRESS: 'interviews you' };

/** "Xi Jinping calls", "PM Takaichi visits"; staff meetings and interviews keep their own title. */
export function meetingTitle(m: Meeting): string {
  if (m.kind === 'CALL' || m.kind === 'VISIT') return `${m.speaker} ${KIND_VERB[m.kind]}`;
  return m.title;
}

/** "call", "visit", "meeting", "interview" (Skip wording). */
export function meetingNoun(m: Pick<Meeting, 'kind'>): string {
  return m.kind === 'CALL' ? 'call' : m.kind === 'VISIT' ? 'visit' : m.kind === 'PRESS' ? 'interview' : 'meeting';
}

/** "China -3, approval -2": the numbers an option moves, short (what a skipped meeting costs). */
export function costWords(o: Pick<DecisionOption, 'effects' | 'tensionDelta'> | undefined, max = 3): string[] {
  if (!o) return [];
  const out: Array<{ t: string; a: number }> = [];
  for (const [k, v] of Object.entries(o.effects ?? {})) {
    if (!v) continue;
    const n = `${v > 0 ? '+' : ''}${Math.round(v)}`;
    if (k.startsWith('relations:')) out.push({ t: `${countryName(k.split(':')[1])} ${n}`, a: Math.abs(v) });
    else if (k === 'approval' || k === 'stability' || k === 'legitimacy') out.push({ t: `${k} ${n}`, a: Math.abs(v) });
  }
  if (o.tensionDelta) out.push({ t: `world tension ${o.tensionDelta > 0 ? '+' : ''}${Math.round(o.tensionDelta)}`, a: Math.abs(o.tensionDelta) });
  return out.sort((x, y) => y.a - x.a).slice(0, max).map((x) => x.t);
}

/** "Free, but China -3" / "Free, no effect": a default answer's cost in one phrase. */
export function costPhrase(o: Pick<DecisionOption, 'effects' | 'tensionDelta'> | undefined): string {
  const w = costWords(o);
  const pc = o?.effects?.pc ?? 0;
  const head = pc < 0 ? `Costs ◆ ${-pc}` : 'Free';
  return w.length ? `${head}, but ${w.join(', ')}` : `${head}, no effect`;
}

const hasImpact = (state: GameState, id: string) => Object.values(state.missionImpact[id] ?? {}).some((i) => i.helps.length + i.hurts.length + i.breaks.length + i.bonusHelps.length > 0);

/** The minister who takes a meeting for the player. */
export function ministerFor(m: Pick<Meeting, 'kind' | 'title'>): string {
  return ADVISOR_NAMES[meetingAdviser(m)] ?? 'Chief of Staff';
}

/** Month 1 lists only what needs the player (the crisis and the recommended orders), unless they asked for the rest. */
export function simpleAgenda(state: GameState = useGameStore.getState()): boolean {
  return (state.worldState?.turn ?? 0) < 1 && !state.deskShown;
}

/** The small meetings: no goal at stake and the advisers send a minister (they need no decision). */
export function smallMeetings(state: GameState = useGameStore.getState()): Meeting[] {
  const agenda = state.worldState?.agenda ?? [];
  const deputies = new Set(state.advice?.deputies ?? []);
  const small = agenda.filter((m) => !hasImpact(state, m.id) && (deputies.has(m.id) || (!state.advice && (m.kind === 'STAFF' || m.kind === 'PRESS'))));
  return small.length >= 2 ? small : [];
}

/** Every thing of the month, in order, with its state (design-agenda 3.1, 0.2). */
export function agendaItems(state: GameState = useGameStore.getState()): AgendaItem[] {
  const world = state.worldState;
  if (!world) return [];
  const items: AgendaItem[] = [];
  const skipped = state.skipped ?? {};
  // 1. Crises: the month's primary first, then by urgency
  const primary = primaryItem(state);
  const rank = (d: PendingDecision) => (primary?.kind === 'crisis' && primary.decision.id === d.id ? 0 : d.urgency === 'EXISTENTIAL' ? 1 : d.urgency === 'URGENT' ? 2 : 3);
  const calls = callSet(state);
  // Calls come first (D-84 R1: the crisis, then the mission move), the routine after
  const crises = [...state.pendingDecisions].sort((a, b) => Number(calls.crises.has(b.id)) - Number(calls.crises.has(a.id)) || rank(a) - rank(b));
  for (const d of crises) {
    const key = `crisis:${d.id}`;
    const cab = cabinetPick(d);
    const call = calls.crises.has(d.id);
    const chosen = d.options.find((o) => o.id === state.decisionChoices[d.id]) ?? cab;
    const decided = !!state.reviewed[d.id];
    const st: AgendaState = decided ? 'decided' : skipped[key] ? 'skipped' : 'todo';
    items.push({
      key,
      kind: 'crisis',
      title: d.title,
      needsYou: true,
      state: st,
      stateText: st === 'decided' ? `Decided: ${chosen.label}` : st === 'skipped' ? (call ? 'Skipped: the cabinet waits' : `Skipped: your cabinet goes with ${cab.label}`) : 'To do',
      rec: call ? undefined : cab.label,
      decision: d,
      call,
    });
  }
  pushMove(state, items, calls.moves);
  if (simpleAgenda(state)) {
    pushOrders(state, items, calls.moves);
    return items;
  }
  // 2. Meetings that matter (mission meetings first), 3. the small meetings as one thing
  const small = smallMeetings(state);
  const smallIds = new Set(small.map((m) => m.id));
  const targets = new Set([...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])].flatMap((c) => [c.targetId, c.otherId]).filter(Boolean));
  const mRank = (m: Meeting) => (m.withCountry && targets.has(m.withCountry) ? 0 : hasImpact(state, m.id) ? 1 : m.kind === 'CALL' || m.kind === 'VISIT' ? 2 : 3);
  const meetings = (world.agenda ?? []).filter((m) => !smallIds.has(m.id)).sort((a, b) => mRank(a) - mRank(b));
  for (const m of meetings) {
    const key = `meeting:${m.id}`;
    const pick = state.decisionChoices[m.id];
    const rec = meetingPick(m);
    const st: AgendaState = skipped[key] ? 'skipped' : pick ? 'decided' : 'todo';
    const o = m.options.find((x) => x.id === pick);
    const call = calls.meetings.has(m.id);
    items.push({
      call,
      key,
      kind: 'meeting',
      title: meetingTitle(m),
      needsYou: true,
      state: st,
      stateText:
        st === 'skipped' ? `Skipped: your ${ministerFor(m)} answers` : st === 'decided' ? (pick === m.defaultOptionId ? `Decided: your ${ministerFor(m)} takes it` : `Decided: ${o?.label ?? ''}`) : 'To do',
      rec: call ? undefined : rec?.label,
      meeting: m,
    });
  }
  if (small.length) {
    const st: AgendaState = skipped.meetings ? 'skipped' : small.every((m) => state.decisionChoices[m.id]) ? 'decided' : 'todo';
    const all = small.length === 2 ? 'both' : 'all';
    const attended = small.filter((m) => state.decisionChoices[m.id] && state.decisionChoices[m.id] !== m.defaultOptionId);
    items.push({
      key: 'meetings',
      kind: 'meetings',
      title: `Small meetings (${small.length})`,
      needsYou: true,
      state: st,
      stateText:
        st === 'skipped' ? 'Skipped: your ministers take them' : st === 'decided' ? (attended.length ? `Decided: you take ${attended.map(meetingTitle).join(', ')}` : `Decided: your ministers take ${all}`) : 'To do',
      rec: `your ministers take ${all}`,
      meetings: small,
    });
  }
  pushOrders(state, items, calls.moves);
  // 5. The player's own orders: optional
  const committed = state.pendingActions.filter((a) => !a.proposed && a.origin !== 'staff');
  const ideas = state.advice?.suggestions.length ?? 0;
  items.push({
    key: 'own',
    kind: 'own',
    title: 'Your own orders',
    needsYou: false,
    state: skipped.own ? 'skipped' : 'optional',
    stateText: skipped.own
      ? 'Skipped: no more orders this month'
      : committed.length
        ? `Optional · ${committed.length} order${committed.length === 1 ? '' : 's'} of yours, all orders`
        : `Optional · ${ideas} suggestion${ideas === 1 ? '' : 's'}, all orders`,
  });
  return items;
}

/** 4. The recommended orders, as one thing (design-agenda 0.2). */
function pushOrders(state: GameState, items: AgendaItem[], moves: Set<string>): void {
  const idx = state.pendingActions.map((a, i) => ({ a, i })).filter((x) => x.a.origin === 'staff' && !moves.has(orderKey(x.a)));
  if (!idx.length) return;
  const open = idx.filter((x) => x.a.proposed);
  const st: AgendaState = state.skipped?.orders && open.length ? 'skipped' : open.length ? 'todo' : 'decided';
  const chosen = idx.filter((x) => !x.a.proposed);
  items.push({
    key: 'orders',
    kind: 'orders',
    title: `Recommended orders (${idx.length})`,
    needsYou: true,
    state: st,
    stateText: st === 'skipped' ? 'Skipped: they do not run' : st === 'decided' ? `Decided: ${chosen.map((x) => x.a.label).join(', ') || 'none run'}` : 'To do',
    rec: open.map((x) => x.a.label).join(', '),
    orders: idx.map((x) => x.i),
  });
}

/** The mission move (D-84 R1 b, F): the recommended orders that push a goal, as one call. */
function pushMove(state: GameState, items: AgendaItem[], moves: Set<string>): void {
  const idx = state.pendingActions.map((a, i) => ({ a, i })).filter((x) => x.a.origin === 'staff' && moves.has(orderKey(x.a)));
  if (!idx.length) return;
  const chosen = idx.filter((x) => !x.a.proposed);
  const st: AgendaState = chosen.length ? 'decided' : state.skipped?.move ? 'skipped' : 'todo';
  items.push({
    key: 'move',
    kind: 'move',
    title: 'The move for your mission',
    needsYou: true,
    state: st,
    stateText: st === 'skipped' ? 'Skipped: no move this month' : st === 'decided' ? `Decided: ${chosen.map((x) => x.a.label).join(', ')}` : 'To do',
    orders: idx.map((x) => x.i),
    call: true,
  });
}

/** The calls still open (D-84 R8): listed before Execute. */
export function openCalls(items: readonly AgendaItem[]): AgendaItem[] {
  return items.filter((x) => x.call && x.state === 'todo');
}

/** "1 done, 5 to go" counts (things that need the player). */
export function agendaProgress(items: readonly AgendaItem[]): { done: number; total: number; left: number } {
  const need = items.filter((x) => x.needsYou);
  const done = need.filter((x) => x.state !== 'todo').length;
  return { done, total: need.length, left: need.length - done };
}

/** The thing on screen: the chosen one, else the first still to do, else the first. */
export function currentItem(items: readonly AgendaItem[], key: string | null = useGameStore.getState().agendaKey): AgendaItem | undefined {
  return (key ? items.find((x) => x.key === key) : undefined) ?? items.find((x) => x.state === 'todo') ?? items[0];
}

/** What Skip means for a thing: who answers, what they say, what it costs (design-agenda 0.3, 0.12 D5). */
export function skipMeaning(item: AgendaItem, state: GameState = useGameStore.getState()): SkipMeaning {
  if (item.kind === 'crisis' && item.decision && item.call) {
    // D-84 R7: on a call the cabinet is split, so it waits: the engine's default applies
    const d = item.decision;
    const def = d.options.find((o) => o.id === d.defaultOptionId);
    const tag = def ? missionTag(state.missionImpact[d.id]?.[def.id], state.objectiveStatus) : null;
    return {
      label: 'Skip: the cabinet waits',
      means: `${def ? `It goes with ${def.label}.` : 'No answer is given.'}${tag ? ` ${tag.text}.` : ''}`,
      after: 'You can still make this call before you execute.',
    };
  }
  if (item.kind === 'move') {
    const pc = (item.orders ?? []).reduce((s, i) => s + (state.pendingActions[i]?.proposed ? pcCost(state.pendingActions[i].type) : 0), 0);
    return { label: 'Hold this month', means: `No move for your mission. Political capital stays${pc ? ` (◆ ${pc} of it)` : ''}; above ◆ 6 it is lost.`, after: 'You can still make your move before you execute.' };
  }
  if (item.kind === 'crisis' && item.decision) {
    const cab = cabinetPick(item.decision);
    return { label: 'Skip for now: your cabinet decides', means: `Your cabinet goes with its recommendation, ${cab.label}.`, after: 'You can come back before you execute.' };
  }
  if (item.kind === 'meeting' && item.meeting) {
    const m = item.meeting;
    const o = m.options.find((x) => x.id === m.defaultOptionId);
    const said = o ? `They say "${splitLede(o.label)[0]}". ` : '';
    return { label: `Skip this ${meetingNoun(m)}: your ${ministerFor(m)} answers`, means: `${said}${costPhrase(o)}.`, after: `You can still open the ${meetingNoun(m)} again before you execute.` };
  }
  if (item.kind === 'meetings') return { label: 'Skip: your ministers take them', means: 'Each one gets the usual answer. Free, no effect.', after: 'You can open them again before you execute.' };
  if (item.kind === 'orders') {
    const pc = (item.orders ?? []).reduce((s, i) => s + (state.pendingActions[i]?.proposed ? pcCost(state.pendingActions[i].type) : 0), 0);
    return { label: 'Skip: they do not run', means: pc ? `Nothing happens. ◆ ${pc} stays for your own orders.` : 'Nothing happens.', after: 'You can choose them before you execute.' };
  }
  return { label: 'No more orders this month', means: 'Unspent political capital carries over (up to ◆ 6).', after: 'You can add orders before you execute.' };
}

// ============================================================================
// Acting on the agenda (one way to decide: Choose; one shortcut: Choose all recommended)
// ============================================================================

const unskip = (key: string) => {
  const s = useGameStore.getState();
  if (!s.skipped[key]) return s.skipped;
  const next = { ...s.skipped };
  delete next[key];
  return next;
};

/** Choose an answer of a crisis or a meeting. */
export function chooseAnswer(item: AgendaItem, optionId: string): void {
  const id = item.decision?.id ?? item.meeting?.id;
  if (!id) return;
  const s = useGameStore.getState();
  useGameStore.setState({ decisionChoices: { ...s.decisionChoices, [id]: optionId }, reviewed: { ...s.reviewed, [id]: true }, skipped: unskip(item.key) });
  advance(item.key);
}

/** The small meetings: the ministers take them all, or the player takes one in person. */
export function chooseSmall(item: AgendaItem, attend?: string): void {
  const s = useGameStore.getState();
  const choices = { ...s.decisionChoices };
  const reviewed = { ...s.reviewed };
  for (const m of item.meetings ?? []) {
    const pick = m.id === attend ? meetingPick(m)?.id : m.defaultOptionId;
    if (pick) choices[m.id] = pick;
    if (m.id === attend) reviewed[m.id] = true;
  }
  useGameStore.setState({ decisionChoices: choices, reviewed, skipped: unskip(item.key) });
  advance(item.key);
}

/** Skip a thing on purpose: what happens is named on the Skip card. */
export function skipItem(item: AgendaItem): void {
  const s = useGameStore.getState();
  const choices = { ...s.decisionChoices };
  const reviewed = { ...s.reviewed };
  if (item.decision) {
    // A skipped call has no answer (the engine's default, D-84 R7); a routine crisis keeps the cabinet's
    if (item.call) delete choices[item.decision.id];
    else choices[item.decision.id] = cabinetPick(item.decision).id;
    delete reviewed[item.decision.id];
  }
  for (const m of item.meeting ? [item.meeting] : (item.meetings ?? [])) {
    if (m.defaultOptionId) choices[m.id] = m.defaultOptionId;
    delete reviewed[m.id];
  }
  useGameStore.setState({ decisionChoices: choices, reviewed, skipped: { ...s.skipped, [item.key]: true } });
  advance(item.key);
}

/** Undo a skip: the thing is to do again. */
export function undoSkip(item: AgendaItem): void {
  const s = useGameStore.getState();
  const choices = { ...s.decisionChoices };
  for (const m of item.meeting ? [item.meeting] : (item.meetings ?? [])) delete choices[m.id];
  useGameStore.setState({ decisionChoices: choices, skipped: unskip(item.key), agendaKey: item.key, review: false });
}

/** Choose all recommended (D-73): the recommended answer for every thing still to do (approveAll). */
export function chooseAllRecommended(): void {
  approveAll();
}

/** Open a thing (from the List, the Plan's Open, Back and Next). */
export function openItem(key: string): void {
  const s = useGameStore.getState();
  useGameStore.setState({ agendaKey: key, review: false, listOpen: false, focus: { kind: 'mission' }, deskMode: s.deskMode });
}

/** After a choice: in "One at a time" the next thing still to do opens; when none is left, the review page. */
export function advance(from: string): void {
  const s = useGameStore.getState();
  if (s.deskView === 'full') return;
  const items = agendaItems(s);
  const at = items.findIndex((x) => x.key === from);
  const order = [...items.slice(at + 1), ...items.slice(0, Math.max(0, at))];
  const next = order.find((x) => x.state === 'todo');
  if (next) useGameStore.setState({ agendaKey: next.key });
  else if (s.deskMode === 'desk') useGameStore.setState({ agendaKey: from, review: true });
}

/** The thing before and after the current one (Back and Next). */
export function neighbours(items: readonly AgendaItem[], cur: AgendaItem | undefined): { back?: AgendaItem; next?: AgendaItem } {
  const at = cur ? items.findIndex((x) => x.key === cur.key) : -1;
  return { back: at > 0 ? items[at - 1] : undefined, next: at >= 0 ? items[at + 1] : items[0] };
}

/** "If you execute now:" in 1 to 3 plain bullets (design-agenda 0.6): yours, the ministers' with costs, what does not run. */
export function executeNow(state: GameState = useGameStore.getState()): string[] {
  const world = state.worldState;
  if (!world) return [];
  const out: string[] = [];
  // D-84 R8: each open call first, with what skipping it means
  const items = agendaItems(state);
  const callItems = items.filter((x) => x.call && x.state !== 'decided');
  for (const c of callItems) out.push(`${c.state === 'skipped' ? `You skipped your call, ${c.title}:` : `Your call, ${c.title}, is open:`} ${skipMeaning(c, state).means}`);
  const callIds = new Set(callItems.map((c) => c.decision?.id).filter(Boolean));
  const decided = state.pendingDecisions.filter((d) => state.reviewed[d.id]);
  const open = state.pendingDecisions.filter((d) => !state.reviewed[d.id] && !callIds.has(d.id));
  if (decided.length === 1) out.push(`Your answer to ${decided[0].title} happens.`);
  else if (decided.length > 1) out.push(`Your answers to ${decided.length} crises happen.`);
  if (open.length) out.push(open.length === 1 ? `Your cabinet's recommended answer to ${open[0].title} applies.` : `Your cabinet's recommended answers to ${open.length} crises apply.`);
  const agenda = world.agenda ?? [];
  const attend = agenda.filter((m) => state.decisionChoices[m.id] && state.decisionChoices[m.id] !== m.defaultOptionId);
  const ministers = agenda.filter((m) => !state.decisionChoices[m.id] || state.decisionChoices[m.id] === m.defaultOptionId);
  if (attend.length) out.push(`You take ${attend.length} meeting${attend.length === 1 ? '' : 's'} yourself.`);
  if (ministers.length) {
    const costs = ministers.flatMap((m) => costWords(m.options.find((o) => o.id === m.defaultOptionId), 1));
    out.push(`Your ministers take ${ministers.length} meeting${ministers.length === 1 ? '' : 's'} for you${costs.length ? `: ${costs.slice(0, 3).join(', ')}` : ', free'}.`);
  }
  const committed = state.pendingActions.filter((a) => !a.proposed);
  const waiting = state.pendingActions.filter((a) => a.proposed);
  if (committed.length) out.push(`${committed.length} order${committed.length === 1 ? ' runs' : 's run'} (◆ ${committed.reduce((s, a) => s + pcCost(a.type), 0)}).`);
  if (waiting.length) {
    const pc = waiting.reduce((s, a) => s + pcCost(a.type), 0);
    out.push(`The ${waiting.length === 1 ? 'recommended order does' : `${waiting.length} recommended orders do`} not run${pc ? ` (◆ ${pc} stay${pc === 1 ? 's' : ''})` : ''}.`);
  }
  if (!out.length) out.push('Nothing is decided: the month runs on its own.');
  return out.slice(0, Math.max(3, callItems.length + 1));
}

export interface CallSide {
  optionId: string;
  who: string;
  reason: string;
  aim: 'mission' | 'calm';
}

/**
 * The two sides of a crisis or meeting call (D-84 R4, R5): who recommends which answer and why,
 * and the Chief of Staff's sentence for Guide me. The engine's `advice.calls` first; until it lands,
 * the mission side is the mission note's answer (or the one that helps most goals) and the calm
 * side the cabinet's answer (or one that moves no goal), never one that hurts a goal when another
 * does not.
 */
export function callSides(item: AgendaItem, state: GameState = useGameStore.getState()): { sides: CallSide[]; guide: string; pushPc: number } {
  const d = item.decision ?? item.meeting;
  if (!d) return { sides: [], guide: '', pushPc: 0 };
  const sent = callSet(state).byId[d.id];
  const options = item.meeting ? d.options.filter((o) => o.id !== item.meeting?.defaultOptionId) : d.options;
  const label = (id: string) => options.find((o) => o.id === id)?.label ?? '';
  if (sent?.sides.length) {
    const sides = sent.sides.filter((x) => x.optionId && options.some((o) => o.id === x.optionId)).map((x) => ({ optionId: x.optionId as string, who: x.who, reason: x.reason, aim: x.aim }));
    const m = sides.find((x) => x.aim === 'mission');
    const c = sides.find((x) => x.aim === 'calm');
    return { sides, guide: sent.guide ?? (m && c ? `For your mission: ${label(m.optionId)}. To keep things calm: ${label(c.optionId)}.` : ''), pushPc: sent.pushPc ?? 0 };
  }
  const imp = state.missionImpact[d.id] ?? {};
  const helps = (o: DecisionOption) => imp[o.id]?.helps.length ?? 0;
  const hurts = (o: DecisionOption) => (imp[o.id]?.hurts.length ?? 0) + (imp[o.id]?.breaks.length ?? 0);
  const note = item.decision ? state.advice?.missionNotes?.[d.id] : undefined;
  const mission = options.find((o) => o.id === note?.optionId) ?? [...options].sort((a, b) => helps(b) - hurts(b) - (helps(a) - hurts(a)))[0];
  const safe = options.filter((o) => hurts(o) === 0);
  let calm = item.decision ? cabinetPick(item.decision) : (meetingPick(item.meeting as Meeting) ?? options[0]);
  // The calm side: the answer that hurts no goal (or the fewest), moves none if it can (D-72 per adviser)
  const others = options.filter((o) => o.id !== mission?.id).sort((a, b) => hurts(a) - hurts(b) || helps(a) - helps(b));
  if (!calm || calm.id === mission?.id || (hurts(calm) > 0 && safe.length)) calm = safe.find((o) => o.id !== mission?.id && helps(o) === 0) ?? safe.find((o) => o.id !== mission?.id) ?? others[0] ?? calm;
  if (!mission || !calm) return { sides: [], guide: '', pushPc: 0 };
  const name = (o: DecisionOption, fallback: string) => ADVISOR_NAMES[o.backedBy[0] ?? ''] ?? fallback;
  const reason = (o: DecisionOption) => splitLede(o.description)[0];
  let mWho = name(mission, item.meeting ? ministerFor(item.meeting) : 'Foreign Minister');
  let cWho = name(calm, 'Chief of Staff');
  if (cWho === mWho) cWho = mWho === 'Chief of Staff' ? 'Foreign Minister' : 'Chief of Staff';
  if (mWho === cWho) mWho = 'Foreign Minister';
  const sides: CallSide[] = [
    { optionId: mission.id, who: mWho, reason: note?.text ? `${reason(mission)} ${note.text}.` : reason(mission), aim: 'mission' },
    { optionId: calm.id, who: cWho, reason: reason(calm), aim: 'calm' },
  ];
  return { sides, guide: `For your mission: ${mission.label}. To keep things calm: ${calm.label}.`, pushPc: 0 };
}

import type { OutcomeStatus, Reaction, ReportFact, TurnReport, WorldState } from '../store/gameStore';
import { STATUS_WORD, statusOf, verdictForStatus } from './outcome';
import { countryName } from '../store/gameStore';
import type { SceneKind } from '../scenes/kinds';
import { actionFamily, cleanChoice, guardFamily, leftOpenChoice, sceneForAction, sceneForDecision, sceneForOutcome } from '../scenes/kinds';
import type { MapEffect } from '../scenes/OutcomeMap';
import { mapEffect } from './mapEffect';
import { shareFacts } from './numbers';

/**
 * The month debrief: the turn report grouped into at most three pages (the month's highlight,
 * diplomacy by country, home and security), each holding several outcome cards, before the paper.
 * Pure: everything shown comes from the engine's report, nothing is invented here.
 */

/** `mixed`: something went right and something failed in the same card (R5). */
export type Verdict = 'good' | 'bad' | 'mixed' | 'neutral';

export interface CardLine {
  /** What you did, or what they did. */
  text: string;
  icon?: string; // action type for ActionIcon, or a meeting kind
  ok?: boolean;
}

export interface OutcomeCardData {
  key: string;
  kicker: string;
  country?: string;
  headline: string;
  lines: CardLine[];
  reaction?: Reaction;
  facts: ReportFact[];
  watch?: string;
  verdict: Verdict;
  scene?: SceneKind;
  map?: { target?: string; effect: MapEffect };
  front?: { before: number; after: number; ended: boolean };
  /** Their view of you, before and after the month (diplomacy cards). */
  relation?: { before: number; after: number };
  /**
   * The engine's status for the player's own item(s) on this card, and why (F-02-2). Absent on
   * cards that are not the player's doing (a front, a hot zone, a foreign move): those get no stamp.
   */
  status?: OutcomeStatus;
  reason?: string;
}

export interface DebriefPage {
  key: 'highlight' | 'diplomacy' | 'home';
  title: string;
  cards: OutcomeCardData[];
  /** Small print under the cards: staff-handled meetings, the rest of the world. */
  footnotes: Array<{ title: string; items: string[] }>;
}

type Decision = TurnReport['decisions'][number];
type Order = TurnReport['orders'][number];

const possessiveName = (n: string) => (/s$/i.test(n) ? `${n}'` : `${n}'s`);

const DOMESTIC_VOICES = /^(On the street|Interior ministry|The establishment|Markets|The general staff|The evening news|UN )/;

/** The counterpart's own reply first, and never one whose tone contradicts the month's change. */
function pickReaction(id: string, list: Array<Reaction | undefined>, rel?: { before: number; after: number }): Reaction | undefined {
  const d = rel ? rel.after - rel.before : 0;
  const agrees = (r: Reaction) => !rel || (d > 0 ? r.tone !== 'angry' && r.tone !== 'cold' : d < 0 ? r.tone !== 'warm' : true);
  const all = list.filter((r): r is Reaction => !!r);
  const own = all.filter((r) => !DOMESTIC_VOICES.test(r.who));
  void id;
  return own.find(agrees) ?? all.find((r) => agrees(r) && DOMESTIC_VOICES.test(r.who) && !rel);
}

const KIND_WORD: Record<string, string> = { CALL: 'Call', VISIT: 'State visit', STAFF: 'Staff meeting', PRESS: 'Interview', CRISIS: 'Crisis' };

/** The card's verdict is its engine status, never a tally of the colours of its numbers (F-02-2). */
function verdictOf(status: OutcomeStatus): Verdict {
  return verdictForStatus(status);
}

/**
 * R1: the scene of the chosen option (the same call the desk thumbnail makes), then R3: a failed
 * or bad outcome never keeps a celebratory scene.
 */
function decisionScene(d: Decision, verdict: Verdict): SceneKind {
  const kind = sceneForDecision({ kind: d.kind, templateId: d.templateId, title: d.title, label: d.choice, scene: (d as { scene?: string }).scene });
  return sceneForOutcome(kind, verdict);
}

/** R3 and R4 for an order: the action's scene, kept in its family, swapped when it failed. */
function orderScene(o: Order, verdict: Verdict): SceneKind | undefined {
  if (!o.type) return undefined;
  return sceneForOutcome(guardFamily(sceneForAction(o.type), actionFamily(o.type)), verdict, o.ok);
}

function decisionCard(d: Decision, i: number): OutcomeCardData {
  const status = statusOf(d) ?? 'DONE';
  const verdict = verdictOf(status);
  return {
    status,
    reason: d.reason,
    key: `d${i}`,
    kicker: `${KIND_WORD[d.kind ?? 'CRISIS'] ?? 'Decision'}${d.withCountry ? ` · ${countryName(d.withCountry)}` : ''}`,
    country: d.withCountry,
    // A crisis left open ran its default answer: the engine's "(no decision taken)" is the truth, so
    // it is never told as the leader's answer or the player's choice (design-rereview C2-2)
    headline: leftOpenChoice(d.choice) ? `Left open: ${cleanChoice(d.choice)}` : (d.headline ?? d.title),
    lines: [{ text: leftOpenChoice(d.choice) ? `You left it open: ${cleanChoice(d.choice)} went ahead by default` : `You: ${d.choice}`, icon: d.kind }],
    reaction: d.reaction,
    facts: shareFacts(d.facts),
    watch: d.watch,
    verdict,
    scene: decisionScene(d, verdict),
  };
}

const HEADLINE_SUFFIX: Partial<Record<OutcomeStatus, string>> = { FAILED: ': it failed', REFUSED: ': refused', NO_EFFECT: ': no effect', PARTLY: ': partly done' };

function orderCard(o: Order, i: number): OutcomeCardData {
  const status = statusOf(o) ?? 'DONE';
  const verdict = verdictOf(status);
  return {
    status,
    reason: o.reason,
    key: `o${i}`,
    kicker: `Order${o.target ? ` · ${countryName(o.target)}` : ''}`,
    country: o.target,
    headline: o.label + (HEADLINE_SUFFIX[status] ?? ''),
    lines: [{ text: (o.story ?? o.detail).replace(/\.\.+/g, '.'), icon: o.type, ok: o.ok }],
    reaction: o.reaction,
    facts: shareFacts(o.facts),
    watch: o.watch,
    verdict,
    scene: orderScene(o, verdict),
    map: o.target ? { target: o.target, effect: mapEffect(o.type) ?? 'none' } : undefined,
  };
}

/** Merge everything about one country into one card: meetings, orders, their moves, their view of you. */
const HOSTILE = /DENOUNCE|DECLARE_WAR|AIRSTRIKE|DEPLOY_BORDER|BREAK_ALLIANCE|NUCLEAR|INTEL_|MOBILIZE/;
/** The player's acts of war (engine turn.ts ACTS_OF_WAR): they lead the country's card. */
const ACT_OF_WAR = /^(DIPLOMACY_DECLARE_WAR|MILITARY_AIRSTRIKE|NUCLEAR_STRIKE)$/;

function countryCard(id: string, decisions: Array<[Decision, number]>, orders: Array<[Order, number]>, moveList: Array<{ type: string; label: string; target?: string }>, rel?: { before: number; after: number }, home?: string, ownRel?: { before: number; after: number }): OutcomeCardData {
  const moves = moveList.map((m) => m.label);
  const hostile = moveList.some((m) => HOSTILE.test(m.type));
  const relDelta = rel ? rel.after - rel.before : 0;
  decisions = [...decisions].sort((a, b) => Number(b[0].kind === 'CALL' || b[0].kind === 'VISIT') - Number(a[0].kind === 'CALL' || a[0].kind === 'VISIT'));
  // R5: one card, one verdict. If one of your own orders failed, it leads the card
  const failed = orders.find(([o]) => statusOf(o) === 'FAILED' || statusOf(o) === 'REFUSED');
  if (failed) orders = [failed, ...orders.filter((x) => x !== failed)];
  // F-04-7: your act of war on this country (a declaration or a strike) leads its card, above a
  // call or a visit the same month and above another order that failed
  const act = orders.find(([o]) => ACT_OF_WAR.test(o.type ?? '') && statusOf(o) !== 'REFUSED');
  if (act) orders = [act, ...orders.filter((x) => x !== act)];
  const failLeads = !!failed && (!act || act === failed);
  const lead: OutcomeCardData = act ? orderCard(act[0], act[1]) : failed ? orderCard(failed[0], failed[1]) : decisions[0] ? decisionCard(decisions[0][0], decisions[0][1]) : orders[0] ? orderCard(orders[0][0], orders[0][1]) : {
    key: `c-${id}`,
    kicker: countryName(id),
    country: id,
    headline: hostile ? `${countryName(id)} moves against you` : moveList.some((m) => m.target === home) ? `${countryName(id)} reaches out to you` : (moveList[0]?.label ?? countryName(id)),
    lines: [],
    facts: [],
    verdict: hostile ? 'bad' : relDelta > 0 ? 'good' : 'neutral',
  };
  const extra: CardLine[] = [
    ...decisions.slice(failed || act ? 0 : 1).map(([d]) => ({ text: `${KIND_WORD[d.kind ?? 'CRISIS']}: ${d.choice}`, icon: d.kind })),
    ...orders.slice(failed || act || !decisions[0] ? 1 : 0).map(([o]) => { const s = statusOf(o) ?? 'DONE'; return { text: `${o.label}${s === 'DONE' ? '' : ` (${STATUS_WORD[s].toLowerCase()})`}`, icon: o.type, ok: s !== 'FAILED' && s !== 'REFUSED' }; }),
    ...moves.map((m) => ({ text: `They: ${m.replace(/^[^:]+: /, '')}`, icon: 'THEM' })),
  ];
  // Their view of you over the whole month (all your dealings plus theirs), so the reply, the
  // numbers and the verdict tell one story
  // The month total leads; your move's own effect on their view follows as its share, so "Court
  // Poland" is never credited with a drop that Poland's own moves caused
  // Your own view of them works the same way (QA3R-2a): it is the number a relation goal
  // measures, so the month total leads, as on the result card's mission row
  const ownView = ownRel ? lead.facts.some((f) => /^Your view of /.test(f.label)) : false;
  const facts = lead.facts.map((f) =>
    rel && / view of you$/.test(f.label)
      ? { ...f, label: 'Their view, from your move', share: true }
      : ownView && /^Your view of /.test(f.label)
        ? { ...f, label: 'Your view, from your move', share: true }
        : f,
  );
  if (rel) facts.unshift({ label: `${possessiveName(countryName(id))} view of you this month`, before: rel.before, after: rel.after });
  if (ownView && ownRel) facts.unshift({ label: `Your view of ${countryName(id)} this month`, before: ownRel.before, after: ownRel.after });
  const firstOrder = orders[0]?.[0];
  // R5 with the engine's statuses (F-02-2): one card, one status. Your items set it; a card with
  // only their moves has none (no stamp), so "China moves against you" is never stamped FAILED.
  const mine = orders.length + decisions.length;
  const failedStatus = failed ? statusOf(failed[0]) : undefined;
  const status: OutcomeStatus | undefined = !mine ? undefined : failed ? (mine > 1 ? 'PARTLY' : failedStatus) : lead.status;
  const reason = failed && mine > 1 ? `${failed[0].label}: ${failed[0].reason ?? failed[0].detail}` : lead.reason;
  const verdict: Verdict = status ? verdictOf(status) : lead.verdict;
  const other = decisions[0] ? decisionCard(decisions[0][0], decisions[0][1]) : undefined;
  const failWord = failedStatus === 'REFUSED' ? 'refused' : 'failed';
  const headline = failLeads && failed ? `${failed[0].label} ${failWord}${other ? `; ${other.headline.charAt(0).toLowerCase()}${other.headline.slice(1)}` : ''}` : lead.headline;
  return {
    ...lead,
    headline,
    key: `c-${id}`,
    country: id,
    lines: [...lead.lines, ...extra].slice(0, 5),
    facts: facts.slice(0, 3),
    reaction: pickReaction(id, [lead.reaction, ...decisions.map(([d]) => d.reaction), ...orders.map(([o]) => o.reaction)], rel),
    relation: rel,
    verdict,
    status,
    reason,
    kicker: `${countryName(id)}${mine ? '' : ' · their move'}${decisions.length + orders.length + moves.length > 1 ? ` · ${decisions.length + orders.length + moves.length} items` : ''}`,
    scene: failLeads && failed ? orderScene(failed[0], 'bad') : lead.scene && sceneForOutcome(lead.scene, verdict),
    map: { target: id, effect: firstOrder ? mapEffect(firstOrder.type) ?? 'court' : decisions[0] ? 'court' : 'denounce' },
  };
}

/** The report item behind a home card key (`d3`, `o1`), when it repeats last month's. */
function repeatOf(report: TurnReport, key: string): boolean {
  const i = Number(key.slice(1));
  if (key.startsWith('o')) return !!report.orders[i]?.repeat;
  if (key.startsWith('d')) return !!report.decisions[i]?.repeat;
  return false;
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const DIMINISHING = new Set(['DOMESTIC_REFORM', 'DOMESTIC_PROPAGANDA']);

/** "Reform program again (3rd in 6 months): Stability +1.2, smaller each time". */
function repeatLine(report: TurnReport, c: OutcomeCardData): string {
  const i = Number(c.key.slice(1));
  const order = c.key.startsWith('o') ? report.orders[i] : undefined;
  const label = order ? order.label : (report.decisions[i]?.choice ?? c.headline);
  const count = order?.again && order.again > 1 ? ` (${ordinal(order.again)} in 6 months)` : '';
  const f = c.facts[0];
  const d = f ? Math.round((f.after - f.before) * 10) / 10 : 0;
  const fact = f && d ? `: ${f.label} ${d > 0 ? '+' : ''}${d}` : ': the same result as last month';
  const less = order?.type && DIMINISHING.has(order.type) && (order.again ?? 0) >= 2 ? ', smaller each time' : '';
  return `${label} again${count}${fact}${less}`;
}

export function buildPages(report: TurnReport, world: WorldState): DebriefPage[] {
  const home = world.playerCountryId;
  const decisions = report.decisions.map((d, i) => [d, i] as [Decision, number]);
  const orders = report.orders.map((o, i) => [o, i] as [Order, number]);
  const relations = new Map((report.relations ?? []).map((r) => [r.id, r]));
  const yourView = new Map((report.yourView ?? []).map((r) => [r.id, r]));
  const moves = (report.world ?? []).filter((m) => m.target === home);

  // 1. Highlight
  const h = report.highlight;
  let highlight: OutcomeCardData | null = null;
  if (h?.ref === 'decision' && report.decisions[h.index]) highlight = decisionCard(report.decisions[h.index], h.index);
  else if (h?.ref === 'order' && report.orders[h.index]) highlight = orderCard(report.orders[h.index], h.index);
  else if (h?.ref === 'war' && report.wars?.[h.index]) {
    const w = report.wars[h.index];
    const moved = w.frontAfter - w.frontBefore;
    highlight = {
      key: 'war',
      kicker: `War · ${countryName(w.vs)}`,
      country: w.vs,
      headline: w.ended ? `The war with ${countryName(w.vs)} is over` : moved >= 0 ? `Your forces gain ground against ${countryName(w.vs)}` : `${countryName(w.vs)} pushes your forces back`,
      lines: [],
      facts: [{ label: 'Front (your side)', before: w.frontBefore, after: w.frontAfter }],
      verdict: moved >= 0 ? 'good' : 'bad',
      scene: 'war_room',
      front: { before: w.frontBefore, after: w.frontAfter, ended: w.ended },
    };
  }

  // 2. Diplomacy: one card per counterpart country
  type Slot = { d: Array<[Decision, number]>; o: Array<[Order, number]>; m: Array<{ type: string; label: string; target?: string }> };
  const byCountry = new Map<string, Slot>();
  const slot = (id: string) => byCountry.get(id) ?? (byCountry.set(id, { d: [], o: [], m: [] }), byCountry.get(id) as Slot);
  for (const x of decisions) if (x[0].withCountry && x[0].attended !== false && x[0].withCountry !== home) slot(x[0].withCountry).d.push(x);
  for (const x of orders) if (x[0].target && x[0].target !== home) slot(x[0].target).o.push(x);
  for (const m of moves) slot(m.actor).m.push({ type: m.type, label: m.label, target: m.target });
  // Your own business with a country first (calls, visits, orders), then what others did to you
  const weight = (id: string, v: { d: unknown[]; o: unknown[]; m: unknown[] }) => {
    const r = relations.get(id);
    return (v.d.length + v.o.length) * 100 + Math.abs((r?.after ?? 0) - (r?.before ?? 0)) + v.m.length;
  };
  const diplomacy = [...byCountry.entries()]
    .sort((a, b) => weight(b[0], b[1]) - weight(a[0], a[1]))
    .map(([id, v]) => countryCard(id, v.d, v.o, v.m, relations.get(id), home, yourView.get(id)));
  // Staff-handled meetings: the ones that moved something get a line; routine ones one count (R4)
  const deputyMeetings = decisions.filter(([d]) => d.attended === false && d.kind !== 'CRISIS');
  const routine = deputyMeetings.filter(([d]) => !d.watch && !(d.facts ?? []).length).length;
  const staffHandled = [
    ...deputyMeetings.filter(([d]) => d.watch || (d.facts ?? []).length).map(([d]) => `${d.speaker ?? d.title}: ${d.choice.replace(/ \(you did not attend\)$/, '')}${d.watch ? `. ${d.watch}` : ''}`),
    ...(routine ? [`Your ministers took ${routine} small meeting${routine > 1 ? 's' : ''}`] : []),
  ];
  const inCard = new Set([...byCountry.keys()]);
  const abroad = (report.world ?? []).filter((m) => m.target !== home && !inCard.has(m.actor)).slice(0, 4).map((m) => m.label);
  const movers = (report.relations ?? []).filter((r) => !inCard.has(r.id)).slice(0, 3).map((r) => `${countryName(r.id)}'s view of you: ${r.before} → ${r.after}`);

  // 3. Home and security
  const homeCards: OutcomeCardData[] = [
    ...decisions.filter(([d]) => !d.withCountry && d.attended !== false).map(([d, i]) => decisionCard(d, i)),
    ...decisions.filter(([d]) => d.kind === 'CRISIS' && d.attended === false).map(([d, i]) => decisionCard(d, i)),
    ...orders.filter(([o]) => !o.target || o.target === home).map(([o, i]) => orderCard(o, i)),
    ...(report.wars ?? []).map((w, i) => ({
      key: `w${i}`,
      kicker: `War · ${countryName(w.vs)}`,
      country: w.vs,
      headline: w.ended ? 'The guns fall silent' : w.frontAfter === w.frontBefore ? 'The front holds' : `The front moves ${Math.abs(w.frontAfter - w.frontBefore)} ${w.frontAfter > w.frontBefore ? 'in your favour' : 'against you'}`,
      lines: [],
      facts: [{ label: 'Front (your side, 50 = stalemate)', before: w.frontBefore, after: w.frontAfter }],
      verdict: (w.frontAfter >= w.frontBefore ? 'good' : 'bad') as Verdict,
      scene: 'war_room' as SceneKind,
      front: { before: w.frontBefore, after: w.frontAfter, ended: w.ended },
    })),
  ];
  const zones = new Map<string, NonNullable<TurnReport['hot']>>();
  for (const z of report.hot ?? []) zones.set(z.id, [...(zones.get(z.id) ?? []), z]);
  for (const [id, list] of zones) {
    const metricWord: Record<string, string> = { violence: 'Violence', humanitarian: 'Hunger', aid: 'Aid getting in', governance: 'Civil order', control: 'Ground held' };
    const bad = list.reduce((s, z) => s + Math.sign(z.after - z.before) * (/violence|humanitarian|control/.test(z.metric) ? 1 : -1), 0);
    homeCards.push({
      key: `z-${id}`,
      kicker: `Hot zone · ${list[0].phase.toLowerCase()}`,
      headline: `${list[0].name}: ${bad > 0 ? 'worse this month' : bad < 0 ? 'a little better this month' : 'no clear change'}`,
      lines: [],
      facts: list.map((z) => ({ label: metricWord[z.metric] ?? z.metric, before: z.before, after: z.after, good: !/violence|humanitarian|control/.test(z.metric) })),
      verdict: bad > 0 ? 'bad' : bad < 0 ? 'good' : 'neutral',
      map: { target: id === 'GAZA' ? 'GAZ' : 'PSX', effect: bad > 0 ? 'strike' : 'none' },
    });
  }
  // Repeats (R5): an order or decision with the same result as last month collapses to one line
  const repeats = homeCards.filter((c) => repeatOf(report, c.key) && c.key !== highlight?.key);
  for (const c of repeats) homeCards.splice(homeCards.indexOf(c), 1);
  const againItems = repeats.map((c) => repeatLine(report, c));
  // Causes that also moved last month come after the new ones, as "Still: ..."
  const still = new Set(report.causesRepeated ?? []);
  const causes = [...report.causes.filter((c) => !still.has(c)), ...report.causes.filter((c) => still.has(c)).map((c) => `Still: ${c.charAt(0).toLowerCase()}${c.slice(1)}`)];
  const homeFoot = [
    ...(againItems.length ? [{ title: 'Again this month', items: againItems }] : []),
    ...(causes.length ? [{ title: 'Why your numbers moved', items: causes.slice(0, 4) }] : []),
  ];

  const isHighlight = (c: OutcomeCardData) => !!highlight && (c.key === highlight.key || (highlight.country !== undefined && c.key === `c-${highlight.country}` && c.lines.length <= 1));
  const pages: DebriefPage[] = [];
  if (highlight) pages.push({ key: 'highlight', title: 'The month', cards: [highlight], footnotes: [] });
  const dipCards = diplomacy.filter((c) => !isHighlight(c));
  const dipFoot = [
    ...(staffHandled.length ? [{ title: 'Taken by your ministers', items: staffHandled }] : []),
    ...(movers.length ? [{ title: 'Also changed their view of you', items: movers }] : []),
    ...(abroad.length ? [{ title: 'Meanwhile abroad', items: abroad }] : []),
  ];
  if (dipCards.length || dipFoot.length) pages.push({ key: 'diplomacy', title: 'Diplomacy', cards: dipCards, footnotes: dipFoot });
  const security = homeCards.some((c) => c.front || c.key.startsWith('z-') || c.key.startsWith('o'));
  const homeShown = homeCards.filter((c) => !isHighlight(c));
  if (homeShown.length || homeFoot.length) pages.push({ key: 'home', title: security ? 'Home and security' : 'Home front', cards: homeShown, footnotes: homeFoot });
  return pages.slice(0, 3);
}

/**
 * The card for "What your choice did" on the result card: the engine's `yourMove`, the player's
 * own decision or order. Never the month's front: a war highlight is not the player's choice
 * (QA S2-1, Maya's "Your forces gain ground against Iran" two months running).
 */
export function yourMoveCard(report: TurnReport): OutcomeCardData | null {
  const h = report.highlight;
  const ref = report.yourMove ?? (h && h.ref !== 'war' ? { ref: h.ref, index: h.index } : undefined);
  if (!ref) return null;
  if (ref.ref === 'decision') {
    const d = report.decisions[ref.index];
    return d ? decisionCard(d, ref.index) : null;
  }
  const o = report.orders[ref.index];
  return o ? orderCard(o, ref.index) : null;
}

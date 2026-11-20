import type { Reaction, ReportFact, TurnReport, WorldState } from '../store/gameStore';
import { countryName } from '../store/gameStore';
import type { SceneKind } from '../scenes/kinds';
import { sceneForAction, sceneForCrisis } from '../scenes/kinds';
import type { MapEffect } from '../scenes/OutcomeMap';
import { mapEffect } from './mapEffect';

/**
 * The month debrief: the turn report grouped into at most three pages (the month's highlight,
 * diplomacy by country, home and security), each holding several outcome cards, before the paper.
 * Pure: everything shown comes from the engine's report, nothing is invented here.
 */

export type Verdict = 'good' | 'bad' | 'neutral';

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

const KIND_WORD: Record<string, string> = { CALL: 'Call', VISIT: 'State visit', STAFF: 'Staff meeting', PRESS: 'Interview', CRISIS: 'Crisis' };

function verdictOf(facts: ReportFact[] = [], reaction?: Reaction, ok = true): Verdict {
  if (!ok) return 'bad';
  const score = facts.reduce((s, f) => s + Math.sign(f.after - f.before) * (f.good === false ? -1 : 1), 0) + (reaction?.tone === 'warm' ? 1 : reaction?.tone === 'angry' || reaction?.tone === 'cold' ? -1 : 0);
  return score > 0 ? 'good' : score < 0 ? 'bad' : 'neutral';
}

function decisionScene(d: Decision): SceneKind {
  if (d.kind === 'CALL' || d.kind === 'VISIT') return 'summit';
  if (d.kind === 'STAFF') return 'cabinet';
  if (d.kind === 'PRESS') return 'tv_interview';
  return sceneForCrisis(d.templateId, d.title);
}

function decisionCard(d: Decision, i: number): OutcomeCardData {
  return {
    key: `d${i}`,
    kicker: `${KIND_WORD[d.kind ?? 'CRISIS'] ?? 'Decision'}${d.withCountry ? ` · ${countryName(d.withCountry)}` : ''}`,
    country: d.withCountry,
    headline: d.headline ?? d.title,
    lines: [{ text: `You: ${d.choice.replace(/ \(no decision taken\)$/, ' (no decision taken)')}`, icon: d.kind }],
    reaction: d.reaction,
    facts: d.facts ?? [],
    watch: d.watch,
    verdict: verdictOf(d.facts, d.reaction, !/no decision taken/.test(d.choice)),
    scene: decisionScene(d),
  };
}

function orderCard(o: Order, i: number): OutcomeCardData {
  return {
    key: `o${i}`,
    kicker: `Order${o.target ? ` · ${countryName(o.target)}` : ''}`,
    country: o.target,
    headline: o.label + (o.ok ? '' : ': it failed'),
    lines: [{ text: (o.story ?? o.detail).replace(/\.\.+/g, '.'), icon: o.type, ok: o.ok }],
    reaction: o.reaction,
    facts: o.facts ?? [],
    watch: o.watch,
    verdict: verdictOf(o.facts, o.reaction, o.ok),
    scene: o.type ? sceneForAction(o.type) : undefined,
    map: o.target ? { target: o.target, effect: mapEffect(o.type) ?? 'none' } : undefined,
  };
}

/** Merge everything about one country into one card: meetings, orders, their moves, their view of you. */
function countryCard(id: string, decisions: Array<[Decision, number]>, orders: Array<[Order, number]>, moves: string[], rel?: { before: number; after: number }): OutcomeCardData {
  const lead: OutcomeCardData = decisions[0] ? decisionCard(decisions[0][0], decisions[0][1]) : orders[0] ? orderCard(orders[0][0], orders[0][1]) : {
    key: `c-${id}`,
    kicker: countryName(id),
    country: id,
    headline: `${countryName(id)} moves against you`,
    lines: [],
    facts: [],
    verdict: 'bad',
  };
  const extra: CardLine[] = [
    ...decisions.slice(1).map(([d]) => ({ text: `${KIND_WORD[d.kind ?? 'CRISIS']}: ${d.choice}`, icon: d.kind })),
    ...orders.slice(decisions[0] ? 0 : 1).map(([o]) => ({ text: `${o.label}${o.ok ? '' : ' (failed)'}`, icon: o.type, ok: o.ok })),
    ...moves.map((m) => ({ text: `They: ${m.replace(/^[^:]+: /, '')}`, icon: 'THEM' })),
  ];
  const facts = [...lead.facts];
  // The whole month's change in their view of you, when no card fact already shows it
  if (rel && !facts.some((f) => / view of you$/.test(f.label))) facts.unshift({ label: `${countryName(id)}'s view of you (month)`, before: rel.before, after: rel.after });
  const firstOrder = orders[0]?.[0];
  return {
    ...lead,
    key: `c-${id}`,
    kicker: `${countryName(id)}${decisions.length + orders.length + moves.length > 1 ? ` · ${decisions.length + orders.length + moves.length} items` : ''}`,
    country: id,
    lines: [...lead.lines, ...extra].slice(0, 5),
    facts: facts.slice(0, 3),
    reaction: lead.reaction ?? orders.map(([o]) => o.reaction).find(Boolean),
    relation: rel,
    map: { target: id, effect: firstOrder ? mapEffect(firstOrder.type) ?? 'court' : decisions[0] ? 'court' : 'denounce' },
  };
}

export function buildPages(report: TurnReport, world: WorldState): DebriefPage[] {
  const home = world.playerCountryId;
  const decisions = report.decisions.map((d, i) => [d, i] as [Decision, number]);
  const orders = report.orders.map((o, i) => [o, i] as [Order, number]);
  const relations = new Map((report.relations ?? []).map((r) => [r.id, r]));
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
  const byCountry = new Map<string, { d: Array<[Decision, number]>; o: Array<[Order, number]>; m: string[] }>();
  const slot = (id: string) => byCountry.get(id) ?? (byCountry.set(id, { d: [], o: [], m: [] }), byCountry.get(id) as { d: Array<[Decision, number]>; o: Array<[Order, number]>; m: string[] });
  for (const x of decisions) if (x[0].withCountry && x[0].attended !== false && x[0].withCountry !== home) slot(x[0].withCountry).d.push(x);
  for (const x of orders) if (x[0].target && x[0].target !== home) slot(x[0].target).o.push(x);
  for (const m of moves) slot(m.actor).m.push(m.label);
  // Your own business with a country first (calls, visits, orders), then what others did to you
  const weight = (id: string, v: { d: unknown[]; o: unknown[]; m: unknown[] }) => {
    const r = relations.get(id);
    return (v.d.length + v.o.length) * 100 + Math.abs((r?.after ?? 0) - (r?.before ?? 0)) + v.m.length;
  };
  const diplomacy = [...byCountry.entries()]
    .sort((a, b) => weight(b[0], b[1]) - weight(a[0], a[1]))
    .map(([id, v]) => countryCard(id, v.d, v.o, v.m, relations.get(id)));
  const staffHandled = decisions.filter(([d]) => d.attended === false && d.kind !== 'CRISIS').map(([d]) => `${d.speaker ?? d.title}: ${d.choice.replace(/ \(you did not attend\)$/, '')}${d.watch ? `. ${d.watch}` : ''}`);
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
      headline: w.ended ? 'The guns fall silent' : `The front moves ${Math.abs(w.frontAfter - w.frontBefore)} ${w.frontAfter >= w.frontBefore ? 'in your favour' : 'against you'}`,
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
  const homeFoot = report.causes.length ? [{ title: 'Why your numbers moved', items: report.causes.slice(0, 4) }] : [];

  const isHighlight = (c: OutcomeCardData) => !!highlight && (c.key === highlight.key || (highlight.country !== undefined && c.key === `c-${highlight.country}` && c.lines.length <= 1));
  const pages: DebriefPage[] = [];
  if (highlight) pages.push({ key: 'highlight', title: 'The month', cards: [highlight], footnotes: [] });
  const dipCards = diplomacy.filter((c) => !isHighlight(c));
  const dipFoot = [
    ...(staffHandled.length ? [{ title: 'Handled by your staff', items: staffHandled }] : []),
    ...(movers.length ? [{ title: 'Also changed their view of you', items: movers }] : []),
    ...(abroad.length ? [{ title: 'Meanwhile abroad', items: abroad }] : []),
  ];
  if (dipCards.length || dipFoot.length) pages.push({ key: 'diplomacy', title: 'Diplomacy', cards: dipCards, footnotes: dipFoot });
  const security = homeCards.some((c) => c.front || c.key.startsWith('z-') || c.key.startsWith('o'));
  const homeShown = homeCards.filter((c) => !isHighlight(c));
  if (homeShown.length || homeFoot.length) pages.push({ key: 'home', title: security ? 'Home and security' : 'Home front', cards: homeShown, footnotes: homeFoot });
  return pages.slice(0, 3);
}

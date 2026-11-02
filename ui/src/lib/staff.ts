import {
  type CountryFull,
  type DecisionOption,
  type Meeting,
  type Objective,
  type PendingAction,
  type PendingDecision,
  type PlayerViewCountry,
  type WorldState,
  countryName,
} from '../store/gameStore';
import { effectArrows } from './format';
import { pcCost } from './actions';

/**
 * What the staff recommend each month: the suggested orders (mission first, then wars, then the
 * home front), the staff pick for each crisis, and the suggested answer for each meeting. Pure
 * functions of the payload, so the desk, the map strip and the month's defaults agree.
 */

export interface Suggestion {
  who: string;
  label: string;
  why: string;
  action: PendingAction;
}

// Our relation with each country by month, so advisors notice when courting isn't working.
const relationMemory = new Map<number, Record<string, number>>();

/** Why an option endangers the mission (relations, stats or a war the mission forbids), or null. */
export function missionRisk(o: DecisionOption, objective: Objective | null | undefined): string | null {
  if (!objective) return null;
  for (const c of [...objective.primary, ...objective.bonus]) {
    if (c.kind === 'RELATION_MIN' && c.targetId && (o.effects[`relations:${c.targetId}`] ?? 0) < 0)
      return `Hurts a mission goal: ${c.label}`;
    if (c.kind === 'STAT_MIN' && c.stat && (o.effects[c.stat] ?? 0) < 0) return `Hurts a mission goal: ${c.label}`;
    if (
      c.kind === 'NO_WAR_WITH' &&
      o.actions.some((a) => a.type === 'DIPLOMACY_DECLARE_WAR' && a.targetCountryId === c.targetId)
    )
      return `Breaks the mission: ${c.label}`;
  }
  if (o.actions.some((a) => a.type === 'DIPLOMACY_DECLARE_WAR')) return 'Takes you to war';
  return null;
}

const STAT_NAMES: Record<string, string> = { approval: 'Approval', stability: 'Stability', legitimacy: 'Legitimacy' };
const INSURGENCY_ORDER = ['NONE', 'UNREST', 'REBELLION', 'GUERILLA'];

export function computeSuggestions(world: WorldState | null, view: PlayerViewCountry[], me: CountryFull | null | undefined): Suggestion[] {
  {
    if (!world || !me) return [];
    relationMemory.set(world.turn, { ...me.relations });
    const out: Array<Suggestion & { p: number }> = [];
    const others = view.filter((v) => !v.isPlayer);
    const rel = (id: string) => Math.round(me.relations[id] ?? 0);
    const lastAddress = (world.turnReport?.orders ?? []).some((o) => o.ok && o.label === 'National address');
    // Courting stalled: we courted them last month and the relation still did not rise
    const courtStalled = (id: string) => {
      const before = relationMemory.get(world.turn - 1)?.[id];
      const courted = (world.turnReport?.orders ?? []).some((o) => o.ok && o.label === `Court ${countryName(id)}`);
      return courted && before !== undefined && (me.relations[id] ?? 0) <= before;
    };
    const court = (id: string, p: number, why: string): Suggestion & { p: number } => ({
      p,
      who: 'Foreign Minister',
      label: `Court ${countryName(id)}`,
      why,
      action: { type: 'DIPLOMACY_IMPROVE_RELATIONS', label: `Court ${countryName(id)}`, targetCountryId: id },
    });
    const reform: Suggestion['action'] = { type: 'DOMESTIC_REFORM', label: 'Reform program' };
    const address: Suggestion['action'] = { type: 'DOMESTIC_PROPAGANDA', label: 'National address' };

    // 0. After our own nuclear strike, everyone at the table says the same thing: end it
    const nukeShock = [...(world.director.shocks ?? [])].reverse().find((x) => x.kind === 'NUCLEAR_STRIKE' && x.by === me.id && world.turn - x.turn <= 6);
    if (nukeShock?.target && me.atWarWith.includes(nukeShock.target)) {
      out.push({
        p: 1000,
        who: 'Foreign Minister',
        label: `Propose ceasefire to ${countryName(nukeShock.target)}`,
        why: `After the strike, ${countryName(nukeShock.target)} cannot hold out and the world is watching. End it now, on our terms.`,
        action: { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: `Propose ceasefire to ${countryName(nukeShock.target)}`, targetCountryId: nukeShock.target },
      });
    }

    // 1. The mission comes first: protect every objective condition that is unmet or slipping
    const goals = [
      ...(world.objective?.primary ?? []).map((c) => ({ c, bonus: false })),
      ...(world.objective?.bonus ?? []).map((c) => ({ c, bonus: true })),
    ];
    for (const { c, bonus } of goals) {
      const boost = bonus ? -8 : 0;
      if (c.kind === 'RELATION_MIN' && c.targetId && !me.atWarWith.includes(c.targetId)) {
        const need = c.min ?? 0;
        const now = rel(c.targetId);
        if (now < need + 10) {
          const gap = now < need ? `needs ${need}+, now ${now}` : `needs ${need}+, now ${now}: keep the margin`;
          out.push(court(c.targetId, (now < need ? 96 : 88) + boost, `Mission: ${countryName(c.targetId)} ${gap}.${courtStalled(c.targetId) ? ' Last month did not move them; keep at it and avoid crisis options that anger them.' : ''}`));
        }
      } else if (c.kind === 'STAT_MIN' && c.stat) {
        const need = c.min ?? 50;
        const now = Math.round(me[c.stat] ?? 0);
        if (now < need + 8) {
          const name = STAT_NAMES[c.stat] ?? c.stat;
          if (c.stat === 'approval' && !lastAddress)
            out.push({ p: (now < need ? 94 : 86) + boost, who: 'Chief of Staff', label: 'National address', why: `Mission: approval needs ${need}%+, now ${now}%.`, action: address });
          else
            out.push({ p: (now < need ? 93 : 85) + boost, who: 'Interior Minister', label: 'Reform program', why: `Mission: ${name.toLowerCase()} needs ${need}%+, now ${now}%.`, action: reform });
        }
      } else if (c.kind === 'WAR_ENDED' && c.targetId) {
        const at = c.targetId;
        if (at !== me.id && world.wars.some((w) => [w.attackerId, w.defenderId].includes(at)) && !me.atWarWith.includes(at))
          out.push({ p: 92 + boost, who: 'Foreign Minister', label: `Mediate peace for ${countryName(at)}`, why: 'Mission: this war must end. Every round of talks wears both sides down.', action: { type: 'DIPLOMACY_MEDIATE', label: `Mediate peace for ${countryName(at)}`, targetCountryId: at } });
      } else if (c.kind === 'NO_WAR_WITH' && c.targetId && !me.atWarWith.includes(c.targetId)) {
        const now = rel(c.targetId);
        if (now < -40 && !courtStalled(c.targetId))
          out.push(court(c.targetId, 70 + boost, `Mission: no war with ${countryName(c.targetId)}. Relations ${now}; lower the temperature.`));
      } else if (c.kind === 'NO_NUCLEAR' && c.targetId) {
        const v = others.find((o) => o.id === c.targetId);
        const est = v?.nuclearProgress?.estimate ?? 0;
        if (v && v.nuclearStatus === 'DEVELOPING')
          out.push(
            est > 55
              ? { p: 89 + boost, who: 'Intelligence Chief', label: `Sabotage ${v.name}`, why: `Mission: ${v.name} must not test. Their program may be ~${Math.round(est)}% along.`, action: { type: 'INTEL_SABOTAGE', label: `Sabotage ${v.name}`, targetCountryId: v.id } }
              : { p: 74 + boost, who: 'Intelligence Chief', label: `Spy on ${v.name}`, why: `Mission: watch ${v.name}'s program (~${Math.round(est)}% by our estimate).`, action: { type: 'INTEL_GATHER', label: `Spy on ${v.name}`, targetCountryId: v.id } },
          );
      } else if (c.kind === 'SCORE_PAR' && !bonus && world.score) {
        // The score drifts toward what the situation deserves: lift its weakest part, early
        const need = c.min ?? world.objective?.par ?? 100;
        const now = world.score.total;
        if (now < need + 6) {
          const gap = now < need ? `needs ${need}+, now ${now}` : `needs ${need}+, now ${now}: keep the margin`;
          const parts = (['approval', 'prestige', 'security', 'economic'] as const).map((k) => ({ k, v: world.score[k] }));
          const weakest = parts.sort((a, b) => a.v - b.v)[0].k;
          const p = now < need ? 91 : 84;
          if (weakest === 'approval' && !lastAddress)
            out.push({ p, who: 'Chief of Staff', label: 'National address', why: `Mission: leadership score ${gap}. Approval is its weakest part.`, action: address });
          else if (weakest === 'prestige') {
            const partner = [...others]
              .filter((v) => !me.atWarWith.includes(v.id) && !(me.history?.historicalRivals ?? []).includes(v.id) && rel(v.id) > -30 && rel(v.id) < 70 && !courtStalled(v.id))
              .sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
            if (partner) out.push(court(partner.id, p, `Mission: leadership score ${gap}. World standing is its weakest part.`));
          } else
            out.push({ p, who: 'Interior Minister', label: 'Reform program', why: `Mission: leadership score ${gap}. A stronger, steadier country lifts it.`, action: reform });
        }
      } else if (c.kind === 'INSURGENCY_MAX') {
        if (INSURGENCY_ORDER.indexOf(me.insurgencyLevel) >= INSURGENCY_ORDER.indexOf(c.level ?? 'UNREST'))
          out.push({ p: 90 + boost, who: 'Interior Minister', label: 'Soft policing', why: `Mission: insurgency must stay at ${(c.level ?? 'UNREST').toLowerCase()} or below.`, action: { type: 'DOMESTIC_POLICING', label: 'Soft policing', params: { tactic: 'SOFT' } } });
      }
    }

    // 2. Wars we are in
    for (const enemy of me.atWarWith) {
      const war = world.wars.find((w) => [w.attackerId, w.defenderId].includes(enemy) && [w.attackerId, w.defenderId].includes(me.id));
      const mine = war ? (war.attackerId === me.id ? war.frontline : 100 - war.frontline) : 50;
      out.push(
        mine < 50
          ? { p: 95, who: 'Foreign Minister', label: `Propose ceasefire to ${countryName(enemy)}`, why: mine <= 35 ? 'They have what they wanted. Their terms will sting, but far less than a defeat.' : 'The front is going badly. Stop the bleeding.', action: { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: `Propose ceasefire to ${countryName(enemy)}`, targetCountryId: enemy } }
          : { p: 70, who: 'Defense Minister', label: 'Mobilize forces', why: 'We hold the initiative. Press it.', action: { type: 'MILITARY_MOBILIZE', label: 'Mobilize forces' } },
      );
    }

    // 3. The home front and general statecraft
    if (me.stability < 50 || me.legitimacy < 45)
      out.push({ p: 84, who: 'Interior Minister', label: 'Reform program', why: `Stability ${Math.round(me.stability)}%: the state needs shoring up.`, action: reform });
    if (me.approval < 55 && !lastAddress)
      out.push({ p: 75, who: 'Chief of Staff', label: 'National address', why: `Approval ${Math.round(me.approval)}%. Speak to the nation (works less if repeated).`, action: address });
    const missionIds = new Set(goals.map(({ c }) => c.targetId).filter(Boolean));
    const worst = [...others]
      .filter((v) => !me.atWarWith.includes(v.id) && !missionIds.has(v.id) && !courtStalled(v.id))
      .sort((a, b) => a.relationWithPlayer - b.relationWithPlayer)[0];
    if (worst && worst.relationWithPlayer < -20)
      out.push(court(worst.id, world.objective ? 40 : 60, `Relations ${Math.round(worst.relationWithPlayer)}. Lower the temperature before it boils over.`));
    const friend = [...others].filter((v) => v.relationWithPlayer > 45 && !me.alliances.includes(v.id)).sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
    if (friend)
      out.push({ p: 45, who: 'Foreign Minister', label: `Offer pact to ${friend.name}`, why: 'They like us. A defense pact deters our rivals.', action: { type: 'DIPLOMACY_PROPOSE_ALLIANCE', label: `Offer defense pact to ${friend.name}`, targetCountryId: friend.id } });
    const nuke = others.find((v) => v.nuclearStatus === 'DEVELOPING' && (v.nuclearProgress?.estimate ?? 0) > 35 && v.relationWithPlayer < -20);
    if (nuke)
      out.push({ p: 80, who: 'Intelligence Chief', label: `Spy on ${nuke.name}`, why: `Their program may be ~${Math.round(nuke.nuclearProgress?.estimate ?? 0)}% along. We need certainty.`, action: { type: 'INTEL_GATHER', label: `Spy on ${nuke.name}`, targetCountryId: nuke.id } });
    if (me.insurgencyLevel === 'REBELLION' || me.insurgencyLevel === 'GUERILLA')
      out.push({ p: 78, who: 'Interior Minister', label: 'Soft policing', why: 'Win hearts, not just streets. Slow but no backlash.', action: { type: 'DOMESTIC_POLICING', label: 'Soft policing', params: { tactic: 'SOFT' } } });
    const meddled = (world.turnReport?.causes ?? []).some((c) => c.startsWith('Foreign covert'));
    const shielded = world.turn <= (world.director.counterIntelUntil ?? -1);
    if (meddled && !shielded)
      out.push({ p: 92, who: 'Intelligence Chief', label: 'Hunt foreign spies', why: 'Foreign services are working on our streets. A spy hunt foils most of their operations for three months.', action: { type: 'INTEL_COUNTER_INTEL', label: 'Hunt foreign spies' } });
    if (out.length < 3 && !shielded)
      out.push({ p: 10, who: 'Intelligence Chief', label: 'Hunt foreign spies', why: 'Rivals are always probing. Harden our services.', action: { type: 'INTEL_COUNTER_INTEL', label: 'Hunt foreign spies' } });
    // One suggestion per order: keep the highest-priority reason
    const seen = new Set<string>();
    return out
      .sort((a, b) => b.p - a.p)
      .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
      .slice(0, 5);
  }
}

/** Good arrows minus bad ones, weighted by size: how the effects read at a glance. */
export function netScore(o: DecisionOption): number {
  return effectArrows(o, countryName).reduce((s, a) => s + (a.good ? a.strength : -a.strength), 0);
}

const backers = (o: DecisionOption) => o.backedBy?.length ?? 0;

/**
 * The staff pick for a crisis: among options that do not endanger the mission, the one most advisors
 * back; ties go to the better net effect, then not the "do nothing" default, then the cheaper one.
 * Never an option whose capital cost would overdraw the month.
 */
export function crisisStaffPick(d: PendingDecision, objective: Objective | null | undefined, pcAvailable = 99): DecisionOption {
  const affordable = d.options.filter((o) => (o.effects.pc ?? 0) >= 0 || pcAvailable + (o.effects.pc ?? 0) >= 0);
  const pool = affordable.length ? affordable : d.options;
  const safe = pool.filter((o) => !missionRisk(o, objective));
  const candidates = safe.length ? safe : pool;
  return [...candidates].sort(
    (a, b) =>
      backers(b) - backers(a) ||
      netScore(b) - netScore(a) ||
      Number(a.id === d.defaultOptionId) - Number(b.id === d.defaultOptionId) ||
      -(a.effects.pc ?? 0) + (b.effects.pc ?? 0),
  )[0];
}

/** The answer the staff suggest for a meeting (never the deputy; free answers first). */
export function meetingSuggestion(m: Meeting): DecisionOption | undefined {
  const pool = m.options.filter((o) => o.id !== m.defaultOptionId);
  return [...pool].sort((a, b) => Number((b.effects.pc ?? 0) >= 0) - Number((a.effects.pc ?? 0) >= 0) || netScore(b) - netScore(a))[0];
}

const KIND_RANK: Record<Meeting['kind'], number> = { VISIT: 0, CALL: 1, STAFF: 2, PRESS: 3 };

/** Which meetings to attend in person first: emergencies, mission countries, then visits, calls, staff, press. */
export function meetingPriority(agenda: Meeting[], objective: Objective | null | undefined): Meeting[] {
  const missionIds = new Set([...(objective?.primary ?? []), ...(objective?.bonus ?? [])].map((c) => c.targetId).filter(Boolean));
  const rank = (m: Meeting) =>
    (m.urgency === 'URGENT' || m.urgency === 'EXISTENTIAL' ? -20 : 0) +
    (m.withCountry && missionIds.has(m.withCountry) ? -10 : 0) +
    KIND_RANK[m.kind] -
    (meetingSuggestion(m) ? netScore(meetingSuggestion(m) as DecisionOption) / 10 : 0);
  return [...agenda].sort((a, b) => rank(a) - rank(b));
}

/** Orders the staff never queue on their own. */
export const DANGEROUS = new Set([
  'DIPLOMACY_DECLARE_WAR',
  'DIPLOMACY_BREAK_ALLIANCE',
  'MILITARY_DEPLOY_BORDER',
  'MILITARY_AIRSTRIKE',
  'NUCLEAR_FUND_PROGRAM',
  'NUCLEAR_STRIKE',
  'INTEL_SUPPORT_REBELS',
  'INTEL_ASSASSINATE',
  'INTEL_COUP',
]);

export const orderCost = (a: Pick<PendingAction, 'type'>) => pcCost(a.type);

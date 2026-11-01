import type { SeededRandom } from "../seed.js";
import type { CountryState, WorldState } from "../types.js";
import { isNuclearStandoff } from "./nuclear.js";

export const IMPROVE_RELATIONS_COST_M = 100; // $100M/month from the spec

export function getRelation(a: CountryState, bId: string): number {
  return a.relations[bId] ?? 0;
}

export function shiftRelation(a: CountryState, bId: string, delta: number): void {
  a.relations[bId] = Math.max(-100, Math.min(100, (a.relations[bId] ?? 0) + delta));
}

export function improveRelations(actor: CountryState, target: CountryState): void {
  // Diminishing returns at high relations
  const current = getRelation(actor, target.id);
  const gain = current > 60 ? 3 : current > 20 ? 5 : 7;
  shiftRelation(actor, target.id, gain);
  shiftRelation(target, actor.id, Math.ceil(gain * 0.7));
}

/**
 * Approval effect of a denunciation. Tough words against an adversary rally the
 * public, but the effect wears off with repetition; condemning a partner, or a
 * country voters never think about, plays as grandstanding.
 */
export function denounceApprovalDelta(
  actor: CountryState,
  target: CountryState,
  recentDenunciations = 0,
): number {
  const relation = getRelation(actor, target.id);
  const adversary = relation <= -25 || (actor.history.historicalRivals ?? []).includes(target.id);
  if (adversary) return Math.round(2 * 0.5 ** recentDenunciations * 10) / 10;
  if (relation >= 25 || actor.alliances.includes(target.id)) return -2;
  return recentDenunciations >= 2 ? -1 : 0;
}

export function denounce(
  world: WorldState,
  actor: CountryState,
  target: CountryState,
  recentDenunciations = 0,
  maxApproval = Number.POSITIVE_INFINITY,
): number {
  const approvalDelta = Math.min(
    maxApproval,
    denounceApprovalDelta(actor, target, recentDenunciations),
  );
  shiftRelation(actor, target.id, -12);
  shiftRelation(target, actor.id, -15);
  // Words are cheap: denunciations add a little tension, not a crisis
  world.globalTension = Math.min(100, world.globalTension + 0.25);
  // Target's allies disapprove
  for (const allyId of target.alliances) {
    const ally = world.countries.find((c) => c.id === allyId);
    if (ally) shiftRelation(ally, actor.id, -5);
  }
  actor.approval = Math.max(0, Math.min(100, actor.approval + approvalDelta));
  return approvalDelta;
}

/** Taiwan has no formal defence treaties (the US relationship is the Taiwan Relations Act). */
const NO_FORMAL_PACTS = new Set(["TWN"]);
const MAX_PACTS = 4;
/** Real governments sign few new defence pacts: a third of the old acceptance rate. */
const PACT_RARITY = 0.35;

export interface AllianceResult {
  accepted: boolean;
  reason: string;
}

export function proposeAlliance(
  actor: CountryState,
  target: CountryState,
  rng: SeededRandom,
): AllianceResult {
  if (actor.alliances.includes(target.id)) {
    return { accepted: false, reason: "Already allied" };
  }
  // Formal mutual-defence treaties are rare and deliberate
  if (NO_FORMAL_PACTS.has(target.id) || NO_FORMAL_PACTS.has(actor.id)) {
    return { accepted: false, reason: "No state signs a formal defence treaty with Taiwan." };
  }
  if (target.atWarWith.length > 0 || actor.atWarWith.length > 0) {
    return {
      accepted: false,
      reason: `${target.name} won't sign a mutual-defence treaty in the middle of a war.`,
    };
  }
  if (target.alliances.length >= MAX_PACTS || actor.alliances.length >= MAX_PACTS) {
    return { accepted: false, reason: `${target.name} won't take on another treaty commitment.` };
  }
  const relation = getRelation(target, actor.id);
  if (relation < 60) {
    return {
      accepted: false,
      reason: `${target.name} rebuffed the proposal — relations must reach PROFITABLE first (currently ${relation}).`,
    };
  }
  // Historical rivals are reluctant even at decent relations
  const isRival = (target.history.historicalRivals ?? []).includes(actor.id);
  const loyaltyFactor = target.personality.allianceLoyalty / 100;
  const chance = Math.min(
    0.9,
    (relation / 100) * (0.5 + loyaltyFactor * 0.5) * (isRival ? 0.4 : 1) * PACT_RARITY,
  );
  if (rng.next() < chance) {
    actor.alliances.push(target.id);
    target.alliances.push(actor.id);
    shiftRelation(actor, target.id, 10);
    shiftRelation(target, actor.id, 10);
    return { accepted: true, reason: `${target.name} agreed to a mutual defense pact.` };
  }
  return {
    accepted: false,
    reason: `${target.name} declined — not yet convinced of the partnership's value.`,
  };
}

export function breakAlliance(world: WorldState, actor: CountryState, target: CountryState): void {
  actor.alliances = actor.alliances.filter((id) => id !== target.id);
  target.alliances = target.alliances.filter((id) => id !== actor.id);
  shiftRelation(actor, target.id, -25);
  shiftRelation(target, actor.id, -35);
  // Reputation: other allies trust the actor less
  for (const allyId of actor.alliances) {
    const ally = world.countries.find((c) => c.id === allyId);
    if (ally) shiftRelation(ally, actor.id, -8);
  }
}

export interface WarDeclarationCheck {
  allowed: boolean;
  nuclearStandoff: boolean;
  reason: string;
}

export function canDeclareWar(actor: CountryState, target: CountryState): WarDeclarationCheck {
  if (actor.atWarWith.includes(target.id)) {
    return { allowed: false, nuclearStandoff: false, reason: "Already at war" };
  }
  if (isNuclearStandoff(actor, target)) {
    return {
      allowed: true, // allowed but suicidal — UI shows "ATTACK MEANS DISASTER"
      nuclearStandoff: true,
      reason:
        "ATTACK MEANS DISASTER: both arsenals are operational. Any strike risks global nuclear holocaust.",
    };
  }
  return { allowed: true, nuclearStandoff: false, reason: "" };
}

/**
 * Wars rarely end on the first offer: exhaustion, flexibility and who holds
 * the initiative decide. A side that is winning seldom stops.
 */
/**
 * How far the target is ahead, from its own side of the frontline (50 = stalemate).
 * At 65+ its war aims are largely met: it will stop if the loser accepts its terms.
 */
export function targetAdvantage(
  war: { attackerId: string; frontline: number },
  actor: CountryState,
): number {
  return war.attackerId === actor.id ? 100 - war.frontline : war.frontline;
}

/** Suing for peace while clearly losing: the winner dictates terms. */
export const TERMS_THRESHOLD = 65;
export const TERMS_COST = { approval: 6, legitimacy: 5 };
/** The side that dictated the peace gets credit at home, short of a victory's +12. */
export const TERMS_GAIN = { approval: 5, legitimacy: 3 };

export function ceasefireChance(
  war: { attackerId: string; frontline: number; exhaustion: number },
  actor: CountryState,
  target: CountryState,
): number {
  const advantage = targetAdvantage(war, actor);
  let chance =
    0.05 +
    Math.max(0, war.exhaustion - 40) / 200 +
    target.personality.diplomaticFlexibility / 600 -
    target.personality.warPropensity / 700;
  if (advantage >= TERMS_THRESHOLD) {
    // Winning, with its aims mostly achieved: a favourable peace beats grinding on
    chance += 0.12;
  } else if (advantage > 55) {
    chance *= 0.3; // ahead, but not yet enough to dictate terms
  }
  return Math.max(0.02, Math.min(0.9, chance));
}

/** A third party brokering talks between two belligerents. */
export function mediationChance(
  war: { exhaustion: number },
  mediator: CountryState,
  a: CountryState,
  b: CountryState,
): number {
  const trust =
    (Math.max(0, a.relations[mediator.id] ?? 0) + Math.max(0, b.relations[mediator.id] ?? 0)) / 2;
  const flex = (a.personality.diplomaticFlexibility + b.personality.diplomaticFlexibility) / 2;
  const chance = 0.03 + Math.max(0, war.exhaustion - 35) / 170 + trust / 350 + flex / 900;
  return Math.max(0.03, Math.min(0.75, chance));
}

export function mediate(
  world: WorldState,
  mediator: CountryState,
  target: CountryState,
  rng: SeededRandom,
): { ok: boolean; ended: boolean; otherId?: string; reason: string } {
  const war = world.wars.find((w) => w.attackerId === target.id || w.defenderId === target.id);
  if (!war) return { ok: false, ended: false, reason: `${target.name} is not at war` };
  if (war.attackerId === mediator.id || war.defenderId === mediator.id) {
    return {
      ok: false,
      ended: false,
      reason: "You are a party to this war — propose a ceasefire instead",
    };
  }
  const otherId = war.attackerId === target.id ? war.defenderId : war.attackerId;
  const other = world.countries.find((c) => c.id === otherId);
  if (!other) return { ok: false, ended: false, reason: "No counterpart" };
  const chance = mediationChance(war, mediator, target, other);
  shiftRelation(target, mediator.id, 3);
  shiftRelation(other, mediator.id, 3);
  if (rng.next() < chance) {
    world.wars = world.wars.filter((w) => w.id !== war.id);
    target.atWarWith = target.atWarWith.filter((id) => id !== other.id);
    other.atWarWith = other.atWarWith.filter((id) => id !== target.id);
    target.relations[other.id] = -40;
    other.relations[target.id] = -40;
    shiftRelation(target, mediator.id, 10);
    shiftRelation(other, mediator.id, 10);
    world.globalTension = Math.max(0, world.globalTension - 8);
    return { ok: true, ended: true, otherId, reason: `Talks succeeded: the guns fall silent` };
  }
  // Failed talks still build pressure toward peace
  war.exhaustion = Math.min(100, war.exhaustion + 5);
  return {
    ok: true,
    ended: false,
    otherId,
    reason: `Talks stalled — but both sides are wearier (exhaustion ${Math.round(war.exhaustion)})`,
  };
}

export function proposeCeasefire(
  world: WorldState,
  actor: CountryState,
  target: CountryState,
  rng: SeededRandom,
): boolean {
  const war = world.wars.find(
    (w) =>
      (w.attackerId === actor.id && w.defenderId === target.id) ||
      (w.attackerId === target.id && w.defenderId === actor.id),
  );
  if (!war) return false;
  const chance = ceasefireChance(war, actor, target);
  if (rng.next() < chance) {
    if (targetAdvantage(war, actor) >= TERMS_THRESHOLD) {
      // Accepting the winner's terms is humbling, but far cheaper than defeat
      actor.approval = Math.max(0, actor.approval - TERMS_COST.approval);
      actor.legitimacy = Math.max(0, actor.legitimacy - TERMS_COST.legitimacy);
      target.approval = Math.min(100, target.approval + TERMS_GAIN.approval);
      target.legitimacy = Math.min(100, target.legitimacy + TERMS_GAIN.legitimacy);
    }
    world.wars = world.wars.filter((w) => w.id !== war.id);
    actor.atWarWith = actor.atWarWith.filter((id) => id !== target.id);
    target.atWarWith = target.atWarWith.filter((id) => id !== actor.id);
    actor.relations[target.id] = -50;
    target.relations[actor.id] = -50;
    actor.mobilizationLevel = Math.max(20, actor.mobilizationLevel - 25);
    target.mobilizationLevel = Math.max(20, target.mobilizationLevel - 25);
    world.globalTension = Math.max(0, world.globalTension - 6);
    return true;
  }
  return false;
}

/**
 * Monthly diplomatic drift: shared/opposed interests slowly pull relations.
 */
/**
 * Relations relax toward a structural equilibrium (alliances, rivalries,
 * regime affinity) instead of sliding forever: events and diplomacy push
 * relations around; absent new pushes they settle back. Rivals stay cold,
 * but courting them can make a lasting difference.
 */
export function applyDiplomaticDrift(world: WorldState): void {
  for (const country of world.countries) {
    for (const other of world.countries) {
      if (country.id === other.id) continue;
      let target = 0;
      if (country.alliances.includes(other.id)) target += 55;
      if ((country.history.historicalAllies ?? []).includes(other.id)) target += 25;
      if ((country.history.historicalRivals ?? []).includes(other.id)) target -= 45;
      if (country.regimeType === other.regimeType) target += 8;
      if (
        (country.regimeType === "DEMOCRACY" &&
          (other.regimeType === "AUTOCRACY" || other.regimeType === "COMMUNIST")) ||
        (other.regimeType === "DEMOCRACY" &&
          (country.regimeType === "AUTOCRACY" || country.regimeType === "COMMUNIST"))
      ) {
        target -= 12;
      }
      if (country.atWarWith.includes(other.id)) target = -100;
      const current = country.relations[other.id] ?? 0;
      shiftRelation(country, other.id, (target - current) * 0.02);
    }
  }
}

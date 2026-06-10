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

export function denounce(world: WorldState, actor: CountryState, target: CountryState): void {
  shiftRelation(actor, target.id, -12);
  shiftRelation(target, actor.id, -15);
  world.globalTension = Math.min(100, world.globalTension + 0.8);
  // Target's allies disapprove
  for (const allyId of target.alliances) {
    const ally = world.countries.find((c) => c.id === allyId);
    if (ally) shiftRelation(ally, actor.id, -5);
  }
  // Actor's public enjoys strength
  actor.approval = Math.min(100, actor.approval + 2);
}

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
    (relation / 100) * (0.5 + loyaltyFactor * 0.5) * (isRival ? 0.4 : 1),
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
  // Acceptance depends on who is winning and exhaustion
  const actorIsAttacker = war.attackerId === actor.id;
  const targetWinning = actorIsAttacker ? war.frontline < 45 : war.frontline > 55;
  let chance = 0.35 + war.exhaustion / 200;
  if (targetWinning) chance -= 0.25;
  chance += target.personality.diplomaticFlexibility / 400;
  if (rng.next() < chance) {
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
export function applyDiplomaticDrift(world: WorldState): void {
  for (const country of world.countries) {
    for (const other of world.countries) {
      if (country.id === other.id) continue;
      let drift = 0;
      // Allies drift together
      if (country.alliances.includes(other.id)) drift += 0.5;
      // Historical rivals drift apart absent active diplomacy
      if ((country.history.historicalRivals ?? []).includes(other.id)) drift -= 0.4;
      // Regime affinity
      if (country.regimeType === other.regimeType) drift += 0.1;
      if (
        (country.regimeType === "DEMOCRACY" &&
          (other.regimeType === "AUTOCRACY" || other.regimeType === "COMMUNIST")) ||
        (other.regimeType === "DEMOCRACY" &&
          (country.regimeType === "AUTOCRACY" || country.regimeType === "COMMUNIST"))
      ) {
        drift -= 0.15;
      }
      if (drift !== 0) shiftRelation(country, other.id, drift);
    }
  }
}

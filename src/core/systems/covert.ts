import type { SeededRandom } from "../seed.js";
import type { CountryState, GameEvent, InsurgencyLevel, WorldState } from "../types.js";
import type { GovernmentChange } from "./government.js";
import { installPuppetRegime, replaceLeaderAfterAssassination } from "./government.js";

export interface CovertOutcome {
  success: boolean;
  exposed: boolean;
  description: string;
  governmentChange: GovernmentChange | null;
}

export const COVERT_COSTS_M: Record<string, number> = {
  INTEL_GATHER: 50,
  INTEL_SABOTAGE: 200,
  INTEL_DESTABILIZE: 100,
  INTEL_SUPPORT_REBELS: 150,
  INTEL_COUNTER_INTEL: 75,
  INTEL_MISINFORMATION: 100,
  INTEL_PROPAGANDA: 75,
  INTEL_ASSASSINATE: 300,
  INTEL_COUP: 500,
};

const INSURGENCY_ORDER: InsurgencyLevel[] = ["NONE", "UNREST", "REBELLION", "GUERILLA"];

export function escalateInsurgency(level: InsurgencyLevel): InsurgencyLevel {
  const i = INSURGENCY_ORDER.indexOf(level);
  return INSURGENCY_ORDER[Math.min(i + 1, INSURGENCY_ORDER.length - 1)];
}

export function deescalateInsurgency(level: InsurgencyLevel, steps = 1): InsurgencyLevel {
  const i = INSURGENCY_ORDER.indexOf(level);
  return INSURGENCY_ORDER[Math.max(i - steps, 0)];
}

function successChance(actor: CountryState, target: CountryState, base: number): number {
  const edge = actor.intelLevel - target.counterIntelLevel;
  return Math.max(0.05, Math.min(0.95, base + edge / 200));
}

export function resolveCovertOp(
  world: WorldState,
  actor: CountryState,
  target: CountryState,
  opType: string,
  rng: SeededRandom,
): CovertOutcome {
  let success = false;
  let description = "";
  let governmentChange: GovernmentChange | null = null;
  let exposureChanceOnFail = 0.5;
  let exposureChanceOnSuccess = 0.15;

  switch (opType) {
    case "INTEL_GATHER": {
      success = rng.next() < successChance(actor, target, 0.75);
      if (success) {
        const belief = actor.beliefs[target.id];
        if (belief) belief.accuracy = Math.min(95, belief.accuracy + 25);
        description = `Our agents penetrated ${target.name}'s institutions; intelligence picture sharpened.`;
      } else {
        description = `Intelligence operation in ${target.name} came up empty.`;
      }
      exposureChanceOnFail = 0.3;
      break;
    }
    case "INTEL_DESTABILIZE": {
      success =
        rng.next() < successChance(actor, target, 0.55 + (target.stability < 50 ? 0.15 : 0));
      if (success) {
        target.stability = clamp(target.stability - 8);
        target.legitimacy = clamp(target.legitimacy - 5);
        description = `Destabilization campaign in ${target.name}: strikes, scandals and street protests erode the government.`;
      } else {
        description = `Destabilization attempt in ${target.name} fizzled.`;
      }
      break;
    }
    case "INTEL_SUPPORT_REBELS": {
      const hasInsurgency = target.insurgencyLevel !== "NONE";
      success = rng.next() < successChance(actor, target, hasInsurgency ? 0.65 : 0.35);
      if (success) {
        target.insurgencyLevel = escalateInsurgency(target.insurgencyLevel);
        target.stability = clamp(target.stability - 6);
        description = `Weapons and money reached opposition fighters in ${target.name}; insurgency intensifies to ${target.insurgencyLevel}.`;
      } else {
        description = `Attempt to arm rebels in ${target.name} was intercepted.`;
      }
      exposureChanceOnFail = 0.65;
      break;
    }
    case "INTEL_SABOTAGE": {
      success = rng.next() < successChance(actor, target, 0.45);
      if (success) {
        target.gdp *= 0.992;
        if (target.nuclear.status === "DEVELOPING") {
          target.nuclear.progress = Math.max(0, target.nuclear.progress - 15);
        }
        description = `Sabotage in ${target.name}: refineries burn, centrifuges fail, infrastructure crumbles mysteriously.`;
      } else {
        description = `Sabotage operation in ${target.name} failed.`;
      }
      exposureChanceOnFail = 0.6;
      break;
    }
    case "INTEL_MISINFORMATION": {
      const targetIsOpen = target.regimeType === "DEMOCRACY";
      success = rng.next() < successChance(actor, target, targetIsOpen ? 0.65 : 0.5);
      if (success) {
        // Corrupt the target's beliefs about us
        const belief = target.beliefs[actor.id];
        if (belief) {
          belief.militaryStrength *= rng.nextBool() ? 1.5 : 0.6;
          belief.accuracy = Math.max(5, belief.accuracy - 30);
        }
        target.approval = clamp(target.approval - 3);
        description = `Disinformation flooded ${target.name}'s media; their picture of our capabilities is now badly distorted.`;
      } else {
        description = `Disinformation campaign against ${target.name} was debunked.`;
      }
      exposureChanceOnFail = 0.35;
      break;
    }
    case "INTEL_PROPAGANDA": {
      success = rng.next() < successChance(actor, target, 0.6);
      if (success) {
        target.legitimacy = clamp(target.legitimacy - 5);
        description = `Propaganda broadcasts undermine faith in ${target.name}'s government.`;
      } else {
        description = `Propaganda effort against ${target.name} gained no traction.`;
      }
      exposureChanceOnFail = 0.3;
      break;
    }
    case "INTEL_ASSASSINATE": {
      const targetWeak = target.stability < 40 || target.insurgencyLevel !== "NONE";
      if (!targetWeak) {
        return {
          success: false,
          exposed: rng.next() < 0.4,
          description: `${target.name}'s security cordon is impenetrable; the assassination plan was aborted.`,
          governmentChange: null,
        };
      }
      success = rng.next() < successChance(actor, target, 0.25);
      if (success) {
        governmentChange = replaceLeaderAfterAssassination(world, target, rng);
        description = `${target.name}'s leader is dead. No one has claimed responsibility — yet.`;
      } else {
        description = `Assassination attempt against ${target.name}'s leader failed.`;
      }
      exposureChanceOnFail = 0.75;
      exposureChanceOnSuccess = 0.4;
      break;
    }
    case "INTEL_COUP": {
      const coupPossible = target.insurgencyLevel === "GUERILLA" || target.stability < 25;
      if (!coupPossible) {
        return {
          success: false,
          exposed: rng.next() < 0.5,
          description: `${target.name}'s government is too entrenched for a coup; our contacts refused to move.`,
          governmentChange: null,
        };
      }
      success = rng.next() < successChance(actor, target, 0.3);
      if (success) {
        governmentChange = installPuppetRegime(world, target, actor.id, rng);
        description = `Our officers' faction seized power in ${target.name}. The new government remembers its friends.`;
      } else {
        description = `Coup plot in ${target.name} collapsed; plotters arrested.`;
      }
      exposureChanceOnFail = 0.85;
      exposureChanceOnSuccess = 0.5;
      break;
    }
    default:
      return {
        success: false,
        exposed: false,
        description: "Unknown operation",
        governmentChange: null,
      };
  }

  const exposed = rng.next() < (success ? exposureChanceOnSuccess : exposureChanceOnFail);
  if (exposed) {
    const penalty = opType === "INTEL_ASSASSINATE" || opType === "INTEL_COUP" ? 45 : 20;
    target.relations[actor.id] = Math.max(-100, (target.relations[actor.id] ?? 0) - penalty);
    actor.relations[target.id] = Math.max(-100, (actor.relations[target.id] ?? 0) - 10);
    world.globalTension = clamp(world.globalTension + 1.5, 0, 100);
    // Third parties judge severe violations
    if (penalty >= 45) {
      for (const other of world.countries) {
        if (other.id === actor.id || other.id === target.id) continue;
        other.relations[actor.id] = Math.max(-100, (other.relations[actor.id] ?? 0) - 8);
      }
    }
  }

  return { success, exposed, description, governmentChange };
}

export function covertEvent(
  world: WorldState,
  actor: CountryState,
  target: CountryState,
  outcome: CovertOutcome,
  opType: string,
): GameEvent | null {
  // Only exposed ops or government changes make the news
  if (!outcome.exposed && !outcome.governmentChange) return null;
  const title = outcome.exposed
    ? `${actor.name} covert operation EXPOSED in ${target.name}`
    : outcome.governmentChange
      ? outcome.governmentChange.kind === "ASSASSINATION"
        ? `Assassination in ${target.name}`
        : `Coup in ${target.name}`
      : `Covert activity in ${target.name}`;
  return {
    id: `evt_covert_${actor.id}_${target.id}_${world.turn}_${opType}`,
    type: "COVERT",
    title,
    description: outcome.exposed
      ? `${outcome.description} Evidence points to ${actor.name}; diplomatic fallout is severe.`
      : outcome.description,
    affectedCountries: [actor.id, target.id],
    turn: world.turn,
    severity: outcome.governmentChange ? "CRITICAL" : "MAJOR",
  };
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

import type { SeededRandom } from "../seed.js";
import type { CountryState, GameEvent, WorldState } from "../types.js";
import { deescalateInsurgency, escalateInsurgency } from "./covert.js";
import { shiftRelation } from "./diplomacy.js";
import { growthMood } from "./economy.js";

/**
 * Monthly domestic update: stability, legitimacy, approval, insurgencies.
 */
export function updateDomestic(world: WorldState, rng: SeededRandom): GameEvent[] {
  const events: GameEvent[] = [];

  for (const country of world.countries) {
    if (country.collapsed) continue;

    // --- Stability drift ---
    let delta = 0;
    if (country.growthRate > 0.025) delta += 0.6;
    if (country.growthRate < 0) delta -= 0.8;
    if (country.legitimacy > 65) delta += 0.4;
    if (country.legitimacy < 40) delta -= 0.6;
    if (country.atWarWith.length === 0) delta += 0.3;
    switch (country.insurgencyLevel) {
      case "UNREST":
        delta -= 0.7;
        break;
      case "REBELLION":
        delta -= 1.8;
        break;
      case "GUERILLA":
        delta -= 3.2;
        break;
      default:
        break;
    }
    // Aggravated internal divisions simmer
    for (const division of country.internalDivisions) {
      if (division.tension > 60) delta -= 0.3;
    }
    // AI states fight for their survival: weak governments consolidate, crack down,
    // call in favors — preventing every fragile state from spiraling to collapse.
    // The player gets explicit crisis cards (coup plots, protests) instead.
    const isPlayer = country.id === world.playerCountryId;
    if (!isPlayer) {
      if (country.stability < 35) delta += 1.0;
      if (country.stability < 20) delta += 0.8;
    } else if (country.stability < 30) {
      delta += 0.5; // institutions still push back a little
      // A legitimate government is not stuck at rock bottom: the state slowly reasserts itself
      if (country.stability < 15)
        delta += (15 - country.stability) * 0.06 * (country.legitimacy / 60);
    }
    // No society stays perfectly calm: complacency, factions and news cycles erode the top
    if (country.stability > 85) delta -= (country.stability - 85) * 0.1;
    country.stability = clamp(country.stability + delta);
    if (country.legitimacy > 88)
      country.legitimacy = clamp(country.legitimacy - (country.legitimacy - 88) * 0.12);

    // --- Approval drift (public mood tracks economy and peace) ---
    let approvalDelta = 0;
    const mood = growthMood(country);
    approvalDelta += mood > 0 ? 0.5 : mood < 0 ? -1 : 0;
    approvalDelta += country.stability > 60 ? 0.3 : country.stability < 35 ? -0.8 : 0;
    if (country.underGlobalEmbargo) approvalDelta -= 0.5;
    if (country.atWarWith.length > 0) approvalDelta -= 0.6; // war weariness
    // Public opinion is fickle: approval drifts back toward the middle
    approvalDelta += (50 - country.approval) * 0.04;
    // Sky-high approval is a bubble: honeymoons and rallies fade faster than they form
    if (country.approval > 75) approvalDelta -= (country.approval - 75) * 0.06;
    // Incumbency fatigue: voters tire of the same face after two years
    if (isPlayer && world.turn - country.leader.sinceTurn > 24) approvalDelta -= 0.3;
    country.approval = clamp(country.approval + approvalDelta);

    // --- Legitimacy converges slowly toward approval for democracies ---
    if (country.regimeType === "DEMOCRACY") {
      country.legitimacy = clamp(
        country.legitimacy + (country.approval - country.legitimacy) * 0.05,
      );
    } else {
      // Autocracies sustain legitimacy via control, eroded by instability
      if (country.stability < 30) country.legitimacy = clamp(country.legitimacy - 0.8);
    }

    // --- Insurgency dynamics ---
    if (country.insurgencyLevel !== "NONE") {
      const result = deescalateInsurgency(
        country.insurgencyLevel,
        country.policingTactic === "HARD" ? 2 : 1,
      );
      if (country.policingTactic === "HARD") {
        // Fast suppression, international outcry
        if (rng.nextBool(0.35)) {
          country.insurgencyLevel = result;
        }
        country.stability = clamp(country.stability - 0.5);
        for (const other of world.countries) {
          if (other.id === country.id) continue;
          if (other.regimeType === "DEMOCRACY") shiftRelation(other, country.id, -1.5);
        }
      } else {
        // Soft approach: slow, steady, no backlash
        if (rng.nextBool(0.12)) {
          country.insurgencyLevel = result;
        }
      }
    } else if (country.stability < 30 && rng.nextBool(0.12)) {
      country.insurgencyLevel = escalateInsurgency(country.insurgencyLevel);
      events.push({
        id: `evt_unrest_${country.id}_${world.turn}`,
        type: "STABILITY",
        title: `Unrest spreads in ${country.name}`,
        description: `Mass protests and strikes erupt across ${country.name} as faith in ${country.leader.title} ${country.leader.name}'s government collapses.`,
        affectedCountries: [country.id],
        turn: world.turn,
        severity: "MAJOR",
      });
    }

    // --- Collapse check ---
    // A player's state only collapses at the end of a lost civil war; before that
    // they are deposed (with warning) by a coup or revolution.
    const collapseThreshold =
      country.stability <= 2 &&
      country.legitimacy <= 10 &&
      (!isPlayer || country.insurgencyLevel === "GUERILLA");
    if (collapseThreshold) {
      country.collapsed = true;
      country.mobilizationLevel = 0;
      events.push({
        id: `evt_collapse_${country.id}_${world.turn}`,
        type: "STABILITY",
        title: `STATE COLLAPSE: ${country.name}`,
        description: `${country.name} has ceased to function as a state. Government authority has evaporated; armed factions carve up the country.`,
        affectedCountries: [country.id],
        turn: world.turn,
        severity: "CRITICAL",
      });
    }
  }

  return events;
}

export function applyPropaganda(country: CountryState, effect = 1): void {
  country.legitimacy = clamp(country.legitimacy + 5 * effect);
  country.approval = clamp(country.approval + 4 * effect);
  country.stability = clamp(country.stability + 2 * effect);
}

export function applyReform(country: CountryState): void {
  // Diminishing returns: the last points toward a perfect state are the hardest
  const headroom = (v: number) => Math.min(1, Math.max(0.15, (100 - v) / 45));
  country.stability = clamp(country.stability + 6 * headroom(country.stability));
  country.legitimacy = clamp(country.legitimacy + 4 * headroom(country.legitimacy));
  country.approval = clamp(country.approval + 2);
  // Reform slightly aggravates hardline factions in rigid systems
  if (country.personality.ideologicalRigidity > 70) {
    country.legitimacy = clamp(country.legitimacy - 2);
  }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

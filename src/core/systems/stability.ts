import type { SeededRandom } from "../seed.js";
import type { CountryState, GameEvent, WorldState } from "../types.js";
import { deescalateInsurgency, escalateInsurgency } from "./covert.js";
import { shiftRelation } from "./diplomacy.js";

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
    // States fight for their survival: weak governments consolidate, crack down,
    // call in favors — preventing every fragile state from spiraling to collapse
    if (country.stability < 35) delta += 1.0;
    if (country.stability < 20) delta += 0.8;
    country.stability = clamp(country.stability + delta);

    // --- Approval drift (public mood tracks economy and peace) ---
    let approvalDelta = 0;
    approvalDelta += country.growthRate > 0.02 ? 0.5 : country.growthRate < 0 ? -1 : 0;
    approvalDelta += country.stability > 60 ? 0.3 : country.stability < 35 ? -0.8 : 0;
    if (country.underGlobalEmbargo) approvalDelta -= 0.5;
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
    if (country.stability <= 2 && country.legitimacy <= 10) {
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

export function applyPropaganda(country: CountryState): void {
  country.legitimacy = clamp(country.legitimacy + 5);
  country.approval = clamp(country.approval + 4);
  country.stability = clamp(country.stability + 2);
}

export function applyReform(country: CountryState): void {
  country.stability = clamp(country.stability + 6);
  country.legitimacy = clamp(country.legitimacy + 4);
  country.approval = clamp(country.approval + 2);
  // Reform slightly aggravates hardline factions in rigid systems
  if (country.personality.ideologicalRigidity > 70) {
    country.legitimacy = clamp(country.legitimacy - 2);
  }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

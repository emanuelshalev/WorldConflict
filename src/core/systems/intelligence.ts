import type { SeededRandom } from "../seed.js";
import type {
  Belief,
  CountryState,
  PlayerViewCountry,
  UncertainRange,
  WorldState,
} from "../types.js";
import { relationToLevel } from "../types.js";
import { militaryStrength } from "./military.js";

/**
 * Update every country's beliefs about every other country.
 * Accuracy derives from observer intel vs target counter-intel, boosted by
 * alliance intel-sharing; existing op-driven accuracy boosts decay slowly.
 */
export function updateBeliefs(world: WorldState, rng: SeededRandom): void {
  for (const observer of world.countries) {
    for (const target of world.countries) {
      if (observer.id === target.id) continue;

      const prior = observer.beliefs[target.id];
      let accuracy = observer.intelLevel - target.counterIntelLevel / 2;
      if (observer.alliances.includes(target.id)) accuracy += 25; // allies share intel
      // Allies of the observer share what they know about the target
      const allyBonus = observer.alliances.some((aid) => {
        const ally = world.countries.find((c) => c.id === aid);
        return ally && (ally.beliefs[target.id]?.accuracy ?? 0) > 70;
      })
        ? 10
        : 0;
      accuracy += allyBonus;
      // Persist boosts from INTEL_GATHER ops (decay toward baseline)
      if (prior && prior.accuracy > accuracy) {
        accuracy = accuracy + (prior.accuracy - accuracy) * 0.7;
      }
      accuracy = Math.max(10, Math.min(95, accuracy));

      const noise = (1 - accuracy / 100) * 0.6;
      const distort = (value: number): number => value * (1 + (rng.next() - 0.5) * 2 * noise);

      // Staleness: low intel sees old data (lagging updates)
      const stale = prior && accuracy < 40 && world.turn - prior.lastUpdatedTurn < 4;
      const belief: Belief = stale
        ? { ...prior }
        : {
            militaryStrength: Math.max(0, distort(militaryStrength(target))),
            gdp: Math.max(0, distort(target.gdp)),
            stability: Math.max(0, Math.min(100, distort(target.stability))),
            nuclearProgress:
              target.nuclear.status === "TESTED" || target.nuclear.status === "ARMED"
                ? 100 // public knowledge after a test
                : accuracy > 55
                  ? Math.max(0, Math.min(100, distort(target.nuclear.progress)))
                  : 0, // covert programs invisible to weak intelligence services
            accuracy,
            lastUpdatedTurn: world.turn,
          };
      belief.accuracy = accuracy;
      observer.beliefs[target.id] = belief;
    }
  }
}

function range(estimate: number, confidence: number): UncertainRange {
  const spread = (1 - confidence / 100) * 0.5;
  return {
    estimate,
    low: Math.max(0, estimate * (1 - spread)),
    high: estimate * (1 + spread),
    confidence,
  };
}

function exactRange(value: number): UncertainRange {
  return { estimate: value, low: value, high: value, confidence: 100 };
}

/**
 * Build the world as the player's intelligence services see it.
 * Ground truth is only exposed for the player's own country.
 */
export function buildPlayerView(world: WorldState): PlayerViewCountry[] {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  if (!player) return [];

  return world.countries.map((country) => {
    const isPlayer = country.id === player.id;
    const publicNuclear = country.nuclear.status === "TESTED" || country.nuclear.status === "ARMED";

    if (isPlayer) {
      return {
        id: country.id,
        name: country.name,
        iso3: country.iso3,
        isPlayer: true,
        regimeType: country.regimeType,
        leader: country.leader,
        politicalSystem: country.politicalSystem,
        alliances: country.alliances,
        atWarWith: country.atWarWith,
        relationWithPlayer: 100,
        diplomaticLevel: "MILITARY_PACT",
        insurgencyLevel: country.insurgencyLevel,
        history: country.history,
        gdp: exactRange(country.gdp),
        militaryStrength: exactRange(militaryStrength(country)),
        manpower: exactRange(country.manpower),
        stability: exactRange(country.stability),
        nuclearStatus: country.nuclear.status,
        nuclearProgress: exactRange(country.nuclear.progress),
        intelConfidence: 100,
        full: country,
      };
    }

    const belief = player.beliefs[country.id];
    const confidence = belief?.accuracy ?? 20;
    const relation = player.relations[country.id] ?? 0;
    const atWar = player.atWarWith.includes(country.id);
    const allied = player.alliances.includes(country.id);

    return {
      id: country.id,
      name: country.name,
      iso3: country.iso3,
      isPlayer: false,
      // Public knowledge
      regimeType: country.regimeType,
      leader: country.leader,
      politicalSystem: country.politicalSystem,
      alliances: country.alliances,
      atWarWith: country.atWarWith,
      relationWithPlayer: relation,
      diplomaticLevel: relationToLevel(relation, atWar, allied),
      insurgencyLevel: country.insurgencyLevel,
      history: country.history,
      // Intel-filtered estimates
      gdp: range(belief?.gdp ?? country.gdp, confidence),
      militaryStrength: range(belief?.militaryStrength ?? 0, confidence),
      manpower: range(
        country.manpower *
          (belief ? belief.militaryStrength / Math.max(1, militaryStrength(country)) : 1),
        confidence,
      ),
      stability: range(belief?.stability ?? 50, confidence),
      nuclearStatus: publicNuclear
        ? country.nuclear.status
        : (belief?.nuclearProgress ?? 0) > 10
          ? "DEVELOPING"
          : country.nuclear.status === "LATENT"
            ? "LATENT"
            : "NONE",
      nuclearProgress:
        publicNuclear || (belief?.nuclearProgress ?? 0) > 10
          ? range(belief?.nuclearProgress ?? 0, confidence)
          : null,
      intelConfidence: confidence,
    };
  });
}

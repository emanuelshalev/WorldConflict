import { combineSeed, createSeed, SeededRandom } from "../core/seed.js";
import type { CountryIntent, CountryState, WorldState } from "../core/types.js";
import { generateDeterministicIntents, PersonalityAI } from "./fallback.js";

/**
 * Country agents are driven by the deterministic PersonalityAI, which makes
 * decisions from each country's personality, history, regime constraints and
 * intelligence beliefs. (LLM-driven agents can layer on top of this via the
 * same CountryIntent contract; the simulation core never depends on them.)
 */
export class CountryAgent {
  private ai = new PersonalityAI();

  generateIntent(country: CountryState, world: WorldState): CountryIntent {
    const rng = new SeededRandom(
      combineSeed(combineSeed(world.seed, world.turn), createSeed(7, country.id)),
    );
    return this.ai.generateIntent(country, world, rng);
  }
}

export function generateAllCountryIntents(world: WorldState): CountryIntent[] {
  return generateDeterministicIntents(world);
}

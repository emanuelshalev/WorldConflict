import { describe, expect, it } from "vitest";
import { PersonalityAI, generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { SeededRandom } from "../../src/core/seed.js";
import { ActionSchema } from "../../src/core/types.js";

const loader = createDataLoader();

describe("PersonalityAI", () => {
  it("produces valid intents for every AI country", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const intents = generateDeterministicIntents(world);
    expect(intents.length).toBe(24); // everyone but the player
    for (const intent of intents) {
      expect(intent.actions.length).toBeLessThanOrEqual(3);
      for (const action of intent.actions) {
        expect(() => ActionSchema.parse(action)).not.toThrow();
      }
    }
  });

  it("is deterministic for the same world", () => {
    const world1 = loader.initializeWorldState("2025", "USA", 42);
    const world2 = loader.initializeWorldState("2025", "USA", 42);
    expect(JSON.stringify(generateDeterministicIntents(world1))).toBe(
      JSON.stringify(generateDeterministicIntents(world2)),
    );
  });

  it("prioritizes domestic crisis management when stability collapses", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const chn = world.countries.find((c) => c.id === "CHN");
    if (!chn) throw new Error("no CHN");
    chn.stability = 20;
    chn.legitimacy = 25;
    const ai = new PersonalityAI();
    const intent = ai.generateIntent(chn, world, new SeededRandom(1));
    const domestic = intent.actions.some(
      (a) => a.type === "DOMESTIC_REFORM" || a.type === "DOMESTIC_PROPAGANDA",
    );
    expect(domestic).toBe(true);
  });

  it("mobilizes and considers peace when losing a war", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const irn = world.countries.find((c) => c.id === "IRN");
    const sau = world.countries.find((c) => c.id === "SAU");
    if (!irn || !sau) throw new Error("missing countries");
    irn.atWarWith = ["SAU"];
    sau.atWarWith = ["IRN"];
    irn.mobilizationLevel = 30;
    world.wars.push({
      id: "war_IRN_SAU_0",
      attackerId: "IRN",
      defenderId: "SAU",
      startTurn: 0,
      frontline: 20, // Iran (attacker) collapsing
      attackerCasualties: 50000,
      defenderCasualties: 10000,
      exhaustion: 50,
    });
    const ai = new PersonalityAI();
    const intent = ai.generateIntent(irn, world, new SeededRandom(5));
    const sensible = intent.actions.some(
      (a) => a.type === "MILITARY_MOBILIZE" || a.type === "DIPLOMACY_PROPOSE_CEASEFIRE",
    );
    expect(sensible).toBe(true);
  });

  it("acts on beliefs, not ground truth", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const rus = world.countries.find((c) => c.id === "RUS");
    if (!rus) throw new Error("no RUS");
    rus.politicalSystem.nextElectionTurn = null; // remove election caution
    rus.relations.POL = -70;
    // RUS believes its rival Poland is on the brink even though it isn't
    rus.beliefs.POL = {
      militaryStrength: 1000,
      gdp: 1e9,
      stability: 10,
      nuclearProgress: 0,
      accuracy: 90,
      lastUpdatedTurn: 0,
    };
    const ai = new PersonalityAI();
    // With many seeds, the weak-believed rival should attract aggression
    let consideredAggression = false;
    for (let seed = 0; seed < 30; seed++) {
      const intent = ai.generateIntent(rus, world, new SeededRandom(seed));
      if (
        intent.actions.some(
          (a) =>
            (a.type === "DIPLOMACY_DECLARE_WAR" ||
              a.type === "INTEL_DESTABILIZE" ||
              a.type === "INTEL_SUPPORT_REBELS") &&
            a.targetCountryId === "POL",
        )
      ) {
        consideredAggression = true;
        break;
      }
    }
    expect(consideredAggression).toBe(true);
  });
});

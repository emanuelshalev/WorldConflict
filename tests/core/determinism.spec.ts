import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();

function simulate(seed: number, player: string, turns: number): WorldState {
  let world = loader.initializeWorldState("2025", player, seed);
  const engine = new TurnEngine();
  for (let i = 0; i < turns; i++) {
    const intents = generateDeterministicIntents(world);
    world = engine.executeTurn(world, [{ type: "DOMESTIC_PROPAGANDA" }], intents).newState;
    if (world.gameOver) break;
  }
  return world;
}

describe("Determinism", () => {
  it("same seed produces an identical 24-turn world", () => {
    const a = simulate(12345, "USA", 24);
    const b = simulate(12345, "USA", 24);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("different seeds diverge", () => {
    const a = simulate(1, "USA", 12);
    const b = simulate(2, "USA", 12);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("world initialization is deterministic", () => {
    const a = loader.initializeWorldState("1990", "DEU", 777);
    const b = loader.initializeWorldState("1990", "DEU", 777);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

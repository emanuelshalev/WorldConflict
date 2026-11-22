import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDataLoader, unplayableReason } from "../../src/core/data-loader.js";

// B-17: nations that are not states in an era (Ukrainian SSR in 1960, Trucial States...) cannot be led
const dir = mkdtempSync(join(tmpdir(), "wc-era-playable-"));
process.env.DB_DRIVER = "json";
process.env.SAVES_DIR = dir;

let app: FastifyInstance;
beforeAll(async () => {
  const { gameRoutes } = await import("../../src/api/routes/game.js");
  app = Fastify({ logger: false });
  await app.register(gameRoutes, { prefix: "/api" });
  await app.ready();
});
afterAll(async () => {
  await app?.close();
  rmSync(dir, { recursive: true, force: true });
});

const newGame = (scenarioId: string, playerCountryId: string) =>
  app.inject({
    method: "POST",
    url: "/api/new-game",
    payload: { scenarioId, playerCountryId, mode: "TERM" },
  });

describe("era playability (B-17)", () => {
  const loader = createDataLoader();

  it("names a reason for every PART_OF or NOT_INDEPENDENT nation, and none for states", () => {
    for (const s of loader.loadAvailableScenarios()) {
      for (const id of Object.keys(s.eraStatus)) expect(unplayableReason(s, id)).toMatch(/not/);
      expect(unplayableReason(s, "USA")).toBeNull();
    }
    expect(unplayableReason(loader.loadScenario("1960"), "UKR")).toContain("Ukrainian SSR");
  });

  it("the engine refuses them", () => {
    expect(() =>
      loader.newGame({ scenarioId: "1960", playerCountryId: "UKR", seed: 1, mode: "TERM" }),
    ).toThrow(/Ukrainian SSR/);
  });

  it("POST /new-game answers 400 with the reason", async () => {
    const res = await newGame("1990", "BLR");
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("Byelorussian SSR");
  });

  it("still starts a real state in the same era", async () => {
    const res = await newGame("1960", "USA");
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});

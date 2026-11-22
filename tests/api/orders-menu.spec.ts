import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ENGINE_ORDERS } from "../../src/core/orders.js";

// JSON saves in a temp folder: no native SQLite needed
const dir = mkdtempSync(join(tmpdir(), "wc-orders-menu-"));
process.env.DB_DRIVER = "json";
process.env.SAVES_DIR = dir;

let app: FastifyInstance;
let saveId: string;
let newGame: Record<string, unknown>;

beforeAll(async () => {
  const { gameRoutes } = await import("../../src/api/routes/game.js");
  app = Fastify({ logger: false });
  await app.register(gameRoutes, { prefix: "/api" });
  await app.ready();
  newGame = (
    await app.inject({
      method: "POST",
      url: "/api/new-game",
      payload: { playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 4242 },
    })
  ).json();
  saveId = newGame.saveId as string;
});
afterAll(async () => {
  await app?.close();
  rmSync(dir, { recursive: true, force: true });
});

const menu = async (targetCountryId: string | null) =>
  (await app.inject({ method: "POST", url: "/api/orders/menu", payload: { saveId, targetCountryId } })).json();

describe("POST /api/orders/menu", () => {
  it("payloads carry the capital refill and cap", async () => {
    expect(newGame.pcIncome).toBe(3); // Flashpoint
    expect(newGame.pcCap).toBe(6);
    const loaded = (await app.inject({ method: "GET", url: `/api/load/${saveId}` })).json();
    expect(loaded.pcIncome).toBe(3);
    expect(loaded.pcCap).toBe(6);
  });

  it("returns every targeted engine order for a country, labelled once", async () => {
    const res = await menu("IRN");
    expect(res.success).toBe(true);
    expect(res.pcIncome).toBe(3);
    const ids = res.orders.map((o: { id: string }) => o.id);
    expect(ids).toEqual(ENGINE_ORDERS.filter((o) => o.targeted).map((o) => o.id));
    const war = res.orders.find((o: { id: string }) => o.id === "declare-war");
    expect(war.label).toBe("Declare war on Iran");
    expect(war.irreversible).toBe(true);
    expect(war.costPC).toBe(2);
    const spy = res.orders.find((o: { id: string }) => o.id === "spy");
    expect(spy.block).toBeNull();
    expect(typeof spy.summary).toBe("string");
  });

  it("carries rule-layer blocks with codes", async () => {
    const res = await menu("CHN");
    const nuke = res.orders.find((o: { id: string }) => o.id === "nuclear-strike");
    // The USA is armed but not at war with China
    expect(nuke.block?.code).toBe("NOT_AT_WAR");
    expect(nuke.block.reason).toBe("Only in wartime. You are not at war with China.");
    const ceasefire = res.orders.find((o: { id: string }) => o.id === "ceasefire");
    expect(ceasefire.block.code).toBe("NOT_AT_WAR");
    const breakPact = res.orders.find((o: { id: string }) => o.id === "break-pact");
    expect(breakPact.block.code).toBe("NOT_ALLIED");
  });

  it("returns the untargeted orders when there is no target", async () => {
    const res = await menu(null);
    const ids = res.orders.map((o: { id: string }) => o.id);
    expect(ids).toEqual(ENGINE_ORDERS.filter((o) => !o.targeted).map((o) => o.id));
    const mobilize = res.orders.find((o: { id: string }) => o.id === "mobilize");
    expect(mobilize.defenseShare).toBeGreaterThan(0);
    expect(mobilize.costM).toBeGreaterThan(0);
  });

  it("refuses an unknown save or country", async () => {
    const missing = await app.inject({
      method: "POST",
      url: "/api/orders/menu",
      payload: { saveId: "nope", targetCountryId: "IRN" },
    });
    expect(missing.statusCode).toBe(404);
    const bad = await app.inject({
      method: "POST",
      url: "/api/orders/menu",
      payload: { saveId, targetCountryId: "XXX" },
    });
    expect(bad.statusCode).toBe(400);
  });
});

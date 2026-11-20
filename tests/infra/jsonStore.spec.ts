import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";
import { WorldStateSchema } from "../../src/core/types.js";
import { JsonStore } from "../../src/infra/db.js";

const dir = mkdtempSync(join(tmpdir(), "wc-saves-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("JSON save store (no native SQLite needed)", () => {
  it("saves, lists, updates, logs turns, loads and deletes a game", async () => {
    const store = new JsonStore(dir);
    const world = createDataLoader().newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    const id = await store.createSave({
      name: "Test",
      worldState: JSON.stringify(world),
      playerCountry: "USA",
      playerId: "p1",
      leaderName: null,
      llmUsage: null,
      seed: 1,
      turn: 0,
    });
    expect((await store.listSaves("p1")).map((s) => s.id)).toEqual([id]);
    expect(await store.listSaves("someone-else")).toEqual([]);
    await store.addTurnLog(id, 0, "[]", "[]");
    await store.updateSave(id, { turn: 1 });
    const back = await store.getSave(id);
    expect(back?.turn).toBe(1);
    expect(back?.updatedAt).toBeInstanceOf(Date);
    expect(WorldStateSchema.parse(JSON.parse(back?.worldState ?? "{}")).playerCountryId).toBe("USA");
    expect(await store.turnLogs(id)).toHaveLength(1);
    await store.deleteSave(id);
    expect(await store.getSave(id)).toBeNull();
  });

  it("keeps accounts and refuses path tricks in ids", async () => {
    const store = new JsonStore(dir);
    await store.createPlayer("ada", "salt:hash");
    expect((await store.findPlayer("ada"))?.passwordHash).toBe("salt:hash");
    expect(await store.findPlayer("nobody")).toBeNull();
    await expect(store.getSave("../etc/passwd")).rejects.toThrow();
  });
});

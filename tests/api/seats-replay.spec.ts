import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";

/**
 * Iteration 3 (D-56, F-02-6, F-02-7): every v0.9.0 seat is back (the West Bank in 2025 and 2026,
 * the nations an era did not have through an explicit "What if"), a save can be replayed and
 * branched from any earlier month, Saved games lists an account's and a guest's games together,
 * and a One Term can open on a chosen situation.
 */
const dir = mkdtempSync(join(tmpdir(), "wc-seats-"));
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

const post = (url: string, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: `/api${url}`, payload });

describe("seats restored (QA S1-2, D-56)", () => {
  it("the West Bank is playable in 2025 and 2026 without any flag", async () => {
    for (const scenarioId of ["2025", "2026"]) {
      const res = await post("/new-game", { scenarioId, playerCountryId: "PSX", mode: "TERM", seed: 7 });
      expect(res.statusCode, scenarioId).toBe(200);
      expect(res.json().worldState.origin.whatIf).toBeUndefined();
    }
  });

  it("the West Bank seat gets its own decisions again (raids, a role in Gaza)", async () => {
    const { TurnEngine } = await import("../../src/core/turn.js");
    const { generateDeterministicIntents } = await import("../../src/agents/fallback.js");
    const seen = new Set<string>();
    for (const seed of [1, 2, 3]) {
      let w = createDataLoader().newGame({ scenarioId: "2026", playerCountryId: "PSX", mode: "TERM", seed });
      for (let m = 0; m < 24 && !w.gameOver; m++) {
        for (const d of w.pendingDecisions) seen.add(d.templateId);
        const decisions = w.pendingDecisions.map((d) => ({ decisionId: d.id, optionId: d.options[0].id }));
        w = new TurnEngine().executeTurn(w, [], generateDeterministicIntents(w), decisions).newState;
      }
    }
    expect([...seen].some((t) => t === "westbank_raid" || t === "pa_gaza_role")).toBe(true);
  }, 60_000);

  const whatIfSeats: Array<[string, string]> = [
    ["1960", "UKR"],
    ["1960", "BLR"],
    ["1960", "SYR"],
    ["1960", "ARE"],
    ["1960", "PSX"],
    ["1960", "NGA"],
    ["1990", "UKR"],
    ["1990", "BLR"],
  ];

  it("nations an era did not have are refused without What if, with the way to turn it on", async () => {
    for (const [scenarioId, id] of whatIfSeats) {
      const res = await post("/new-game", { scenarioId, playerCountryId: id, mode: "TERM", seed: 7 });
      expect(res.statusCode, `${scenarioId} ${id}`).toBe(400);
      expect(res.json().error).toMatch(/What if/);
    }
  });

  it("with whatIf: true every one of them starts, as alternate history, and is a state in game", async () => {
    for (const [scenarioId, id] of whatIfSeats) {
      const res = await post("/new-game", {
        scenarioId,
        playerCountryId: id,
        mode: "TERM",
        seed: 7,
        whatIf: true,
      });
      expect(res.statusCode, `${scenarioId} ${id}`).toBe(200);
      const body = res.json();
      expect(body.worldState.origin.whatIf).toBe(true);
      expect(body.worldState.playerBackstory).toMatch(/^What if: in this alternate history/);
      const me = body.worldState.countries.find((c: { id: string }) => c.id === id);
      expect(me.eraStatus).toBeUndefined();
      // A month resolves, and the player's own orders are not refused as "not a state"
      const turn = (
        await post("/turn", {
          saveId: body.saveId,
          playerActions: [{ type: "DOMESTIC_PROPAGANDA" }],
          decisions: body.pendingDecisions.map((d: { id: string; options: Array<{ id: string }> }) => ({
            decisionId: d.id,
            optionId: d.options[0].id,
          })),
        })
      ).json();
      expect(turn.success, `${scenarioId} ${id}`).toBe(true);
      expect(turn.worldState.turnReport.orders[0].code).not.toBe("NOT_A_STATE");
    }
    const saves = (await app.inject({ method: "GET", url: "/api/saves" })).json().saves;
    expect(saves.some((s: { name: string; whatIf?: boolean }) => /\(what if\)$/.test(s.name) && s.whatIf)).toBe(true);
  });

  it("whatIf does not change a seat that is a state", async () => {
    const a = (await post("/new-game", { scenarioId: "1960", playerCountryId: "USA", mode: "TERM", seed: 3 })).json();
    const b = (
      await post("/new-game", { scenarioId: "1960", playerCountryId: "USA", mode: "TERM", seed: 3, whatIf: true })
    ).json();
    expect(b.pendingDecisions).toEqual(a.pendingDecisions);
    expect(b.worldState.playerBackstory).toBe(a.worldState.playerBackstory);
  });
});

describe("Start with: the opening situation (F-02-7)", () => {
  it("opens a 2026 Term on the war in Ukraine when asked, deterministically", async () => {
    const body = { scenarioId: "2026", playerCountryId: "USA", mode: "TERM", seed: 11, opening: "ukraine" };
    const a = (await post("/new-game", body)).json();
    const b = (await post("/new-game", body)).json();
    expect(a.success).toBe(true);
    expect(a.pendingDecisions).toHaveLength(1);
    const d = a.pendingDecisions[0];
    expect(d.templateId).toBe("opening_war");
    expect(d.title).toMatch(/Ceasefire or Collapse/);
    expect(d.affectedCountries).toEqual(expect.arrayContaining(["USA", "UKR", "RUS"]));
    expect(d.options.map((o: { label: string }) => o.label)).toEqual(
      expect.arrayContaining(["Back Ukraine", "Broker talks", "Stay out of it"]),
    );
    expect(b.pendingDecisions).toEqual(a.pendingDecisions);
    expect(a.worldState.origin.opening).toBe("ukraine");
  });

  it("frames the crisis from a side's seat (Ukraine inherits its war)", async () => {
    const res = (
      await post("/new-game", { scenarioId: "2026", playerCountryId: "UKR", mode: "TERM", seed: 11, opening: "ukraine" })
    ).json();
    const d = res.pendingDecisions[0];
    expect(d.title).toMatch(/the war you inherit/);
    expect(d.options.map((o: { id: string }) => o.id)).toEqual(["press", "hold", "ceasefire"]);
  });

  it("leaves the default opening unchanged and refuses unknown or frozen situations", async () => {
    const loader = createDataLoader();
    const plain = (await post("/new-game", { scenarioId: "2026", playerCountryId: "USA", mode: "TERM", seed: 11 })).json();
    const direct = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", mode: "TERM", seed: 11 });
    expect(plain.pendingDecisions).toEqual(direct.pendingDecisions);
    expect(plain.worldState.origin.opening).toBeUndefined();
    for (const opening of ["atlantis", "gaza"]) {
      const res = await post("/new-game", { scenarioId: "2026", playerCountryId: "USA", mode: "TERM", seed: 11, opening });
      expect(res.statusCode, opening).toBe(400);
    }
  });

  it("every active situation of every era opens a crisis for a side and for an outsider", () => {
    const loader = createDataLoader();
    for (const s of loader.loadAvailableScenarios())
      for (const sit of s.situations.filter((x) => x.phase === "ACTIVE"))
        for (const player of [...sit.countries.slice(0, 1), "BRA"]) {
          let w: ReturnType<typeof loader.newGame>;
          try {
            w = loader.newGame({ scenarioId: s.id, playerCountryId: player, mode: "TERM", seed: 5, opening: sit.id });
          } catch (e) {
            // A side that is not a state in the era (none today) would be refused before the opening
            expect(String(e)).toMatch(/What if/);
            continue;
          }
          expect(w.pendingDecisions, `${s.id} ${sit.id} ${player}`).toHaveLength(1);
          expect(w.pendingDecisions[0].options.length).toBeGreaterThanOrEqual(2);
          expect(w.pendingDecisions[0].situation).not.toMatch(/undefined|NaN/);
        }
  });
});

describe("replay, branch and Saved games (F-02-6)", () => {
  type Payload = {
    saveId: string;
    worldState: { turn: number };
    pendingDecisions: Array<{ id: string; options: Array<{ id: string }> }>;
  };
  const playMonth = async (p: Payload, pick: number, actions: unknown[]) =>
    (
      await post("/turn", {
        saveId: p.saveId,
        playerActions: actions,
        decisions: p.pendingDecisions.map((d) => ({
          decisionId: d.id,
          optionId: d.options[Math.min(pick, d.options.length - 1)].id,
        })),
      })
    ).json() as Payload;

  it("a branch from month N is the exact world of month N, and the current month too", async () => {
    const { gameDb } = await import("../../src/infra/db.js");
    let p = (
      await post("/new-game", { scenarioId: "2026", playerCountryId: "USA", mode: "TERM", seed: 4321, playerId: "acct-1" })
    ).json() as Payload;
    const saveId = p.saveId;
    const snapshots: unknown[] = [(await gameDb.loadGame(saveId))?.worldState];
    const orders = [
      [{ type: "DOMESTIC_PROPAGANDA" }],
      [{ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: "IND" }],
      [],
      [{ type: "DOMESTIC_REFORM" }],
    ];
    for (let m = 0; m < orders.length; m++) {
      p = await playMonth(p, m % 2, orders[m]);
      expect(p.worldState.turn).toBe(m + 1);
      snapshots.push((await gameDb.loadGame(saveId))?.worldState);
    }
    for (const month of [0, 2, 4]) {
      const res = await post("/branch", { saveId, month, playerId: "acct-1" });
      expect(res.statusCode, `month ${month}`).toBe(200);
      const branch = res.json();
      expect(branch.saveId).not.toBe(saveId);
      expect(branch.worldState.turn).toBe(month);
      const rebuilt = (await gameDb.loadGame(branch.saveId))?.worldState;
      expect(rebuilt, `month ${month}`).toEqual(snapshots[month]);
    }
    // The branch is a game of its own: a different choice in month 3 moves away from the original
    const fromTwo = (await post("/branch", { saveId, month: 2 })).json() as Payload;
    const other = await playMonth(fromTwo, 1, [{ type: "MILITARY_MOBILIZE" }]);
    expect(other.worldState.turn).toBe(3);
    expect((await gameDb.loadGame(other.saveId))?.worldState).not.toEqual(snapshots[3]);
    // Saved games names the branch and keeps the original
    const list = (await app.inject({ method: "GET", url: "/api/saves?playerId=acct-1" })).json().saves as Array<{
      id: string;
      name: string;
      branchable: boolean;
      seed: number;
      mode: string;
    }>;
    expect(list.some((s) => s.id === saveId && s.branchable && s.seed === 4321 && s.mode === "TERM")).toBe(true);
    // HUD months (QA3-S3-4): a branch at 4 months done opens month 5
    expect(list.some((s) => / \(branch from month 5\)$/.test(s.name))).toBe(true);
    expect(list.some((s) => /\(branch from month 3\) \(branch/.test(s.name))).toBe(false);
  });

  it("refuses months outside the game and saves without a replay record", async () => {
    const { gameDb } = await import("../../src/infra/db.js");
    const p = (await post("/new-game", { scenarioId: "2026", playerCountryId: "USA", mode: "TERM", seed: 5 })).json();
    expect((await post("/branch", { saveId: p.saveId, month: 3 })).statusCode).toBe(400);
    const save = await gameDb.loadGame(p.saveId);
    if (!save) throw new Error("no save");
    const old = { ...save.worldState, origin: undefined };
    const oldId = await gameDb.saveGame("old", old);
    const res = await post("/branch", { saveId: oldId, month: 0 });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/before branching existed/);
    const listed = (await app.inject({ method: "GET", url: "/api/saves" })).json().saves;
    expect(listed.find((s: { id: string }) => s.id === oldId).branchable).toBe(false);
  });

  it("Saved games lists an account's games and this browser's guest games together", async () => {
    const guest = (
      await post("/new-game", { scenarioId: "2026", playerCountryId: "FRA", mode: "TERM", seed: 1, playerId: "guest-abc" })
    ).json();
    const acct = (
      await post("/new-game", { scenarioId: "2026", playerCountryId: "DEU", mode: "TERM", seed: 1, playerId: "acct-2" })
    ).json();
    const ids = (q: string) =>
      app
        .inject({ method: "GET", url: `/api/saves?${q}` })
        .then((r) => (r.json().saves as Array<{ id: string }>).map((s) => s.id));
    const both = await ids("playerId=acct-2&guestId=guest-abc");
    expect(both).toEqual(expect.arrayContaining([guest.saveId, acct.saveId]));
    expect(await ids("playerId=acct-2")).not.toContain(guest.saveId);
    expect(await ids("guestId=guest-abc")).toContain(guest.saveId);
  });
});

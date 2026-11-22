import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// JSON saves in a temp folder: no native SQLite needed
const dir = mkdtempSync(join(tmpdir(), "wc-reveal-"));
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

const newGame = async (body: Record<string, unknown>) =>
  (await app.inject({ method: "POST", url: "/api/new-game", payload: body })).json();

async function playToEnd(saveId: string) {
  let payload: { gameOver: unknown; pendingDecisions: Array<{ id: string; options: Array<{ id: string }> }> } =
    (await app.inject({ method: "GET", url: `/api/load/${saveId}` })).json();
  for (let i = 0; i < 14 && !payload.gameOver; i++) {
    payload = (
      await app.inject({
        method: "POST",
        url: "/api/turn",
        payload: {
          saveId,
          playerActions: [{ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "IRN" }],
          decisions: payload.pendingDecisions.map((d) => ({ decisionId: d.id, optionId: d.options[0].id })),
        },
      })
    ).json();
  }
  return payload;
}

describe("replay and seed codes", () => {
  it("two new games with the same seed and seat open on the same crisis", async () => {
    const a = await newGame({ playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 4242 });
    const b = await newGame({ playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 4242 });
    expect(a.success).toBe(true);
    expect(a.pendingDecisions[0]).toEqual(b.pendingDecisions[0]);
  });

  it("a seed code names the seat and the seed", async () => {
    const { seedCodeOf } = await import("../../src/core/reveal.js");
    const code = seedCodeOf({
      flashpointId: "hormuz-convoy",
      scenarioId: "2026",
      mode: "FLASHPOINT",
      playerCountryId: "USA",
      seed: 4242,
    });
    const viaCode = await newGame({ seedCode: code });
    const direct = await newGame({ playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 4242 });
    expect(viaCode.success).toBe(true);
    expect(viaCode.worldState.seed).toBe(4242);
    expect(viaCode.worldState.flashpointId).toBe("hormuz-convoy");
    expect(viaCode.pendingDecisions[0]).toEqual(direct.pendingDecisions[0]);
    const bad = await app.inject({ method: "POST", url: "/api/new-game", payload: { seedCode: "QQ-ZZZ-1" } });
    expect(bad.statusCode).toBe(400);
  });
});

describe("the reveal and run history", () => {
  it("refuses the reveal mid-game and leaks no chronicle ground truth while playing", async () => {
    const g = await newGame({ playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 99 });
    const early = await app.inject({ method: "GET", url: `/api/reveal/${g.saveId}` });
    expect(early.statusCode).toBe(409);
    const turn = (
      await app.inject({
        method: "POST",
        url: "/api/turn",
        payload: { saveId: g.saveId, playerActions: [], decisions: [] },
      })
    ).json();
    for (const body of [g, turn, (await app.inject({ method: "GET", url: `/api/load/${g.saveId}` })).json()]) {
      expect(body.worldState.chronicle?.start).toBeUndefined();
      expect(body.worldState.chronicle?.plots ?? {}).toEqual({});
      const iran = body.worldState.countries.find((c: { id: string }) => c.id === "IRN");
      expect(iran.beliefs).toEqual({});
      expect(iran.approval).toBe(50);
    }
    expect(turn.worldState.chronicle.series).toHaveLength(1);
    expect(turn.worldState.chronicle.aiTiersUsed).toEqual(["ALGORITHMIC"]);
  });

  it("serves the reveal after the end, records the run and lists it by seat", async () => {
    const g = await newGame({ playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 5 });
    const end = await playToEnd(g.saveId);
    expect(end.gameOver).toBeTruthy();

    const res = await app.inject({ method: "GET", url: `/api/reveal/${g.saveId}?guestId=guest-1` });
    expect(res.statusCode).toBe(200);
    const { reveal } = res.json();
    expect(reveal.seat.seatKey).toBe("hormuz-convoy:USA");
    expect(reveal.presidency.parts).toHaveLength(4);
    expect(reveal.replay.seed).toBe(5);
    expect(reveal.replay.deterministic).toBe(true);
    expect(reveal.run.saveId).toBe(g.saveId);
    expect(reveal.truth?.debrief).toContain("What really happened");
    expect(reveal.ranking.personalBest).toBeNull();

    const posted = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { saveId: g.saveId, guestId: "guest-1" },
    });
    expect(posted.statusCode).toBe(200);
    const run = posted.json();
    expect(run.run.score).toBe(reveal.presidency.total);
    expect(run.rank).toEqual({ position: 1, of: 1 });
    // Posting again replaces, never duplicates
    await app.inject({ method: "POST", url: "/api/runs", payload: { saveId: g.saveId, guestId: "guest-1" } });

    const list = (
      await app.inject({ method: "GET", url: "/api/runs?seat=hormuz-convoy:USA&guestId=guest-1" })
    ).json();
    expect(list.runs).toHaveLength(1);
    expect(list.runs[0].parts).toEqual(reveal.run.parts);
    expect(list.runs[0].detail.seedCode).toBe(reveal.replay.seedCode);
    expect(list.runs[0].guestId).toBeUndefined();
    expect(list.top).toEqual([]); // guests are not on the leaderboard

    const saves = (await app.inject({ method: "GET", url: "/api/saves" })).json();
    expect(saves.saves.every((s: { id: string }) => typeof s.id === "string")).toBe(true);

    const again = (
      await app.inject({ method: "GET", url: `/api/reveal/${g.saveId}?guestId=guest-1` })
    ).json();
    expect(again.reveal.ranking.personalBest).toBeNull(); // only other runs count as a previous best

    const midGame = await newGame({ playerCountryId: "USA", flashpointId: "hormuz-convoy", seed: 6 });
    const refused = await app.inject({ method: "POST", url: "/api/runs", payload: { saveId: midGame.saveId } });
    expect(refused.statusCode).toBe(409);
  });
});

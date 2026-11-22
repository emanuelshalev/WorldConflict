import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { codexRoutes } from "../../src/api/routes/codex.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(codexRoutes, { prefix: "/api" });
  await app.ready();
});
afterAll(async () => {
  await app?.close();
});

const get = (url: string, headers: Record<string, string> = {}) =>
  app.inject({ method: "GET", url, headers });

describe("GET /api/codex", () => {
  it("serves the 2026 codex with the flashpoint and scenario situations", async () => {
    const res = await get("/api/codex?scenario=2026&flashpoint=ceasefire-or-collapse");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.scenarioId).toBe("2026");
    expect(body.flashpointId).toBe("ceasefire-or-collapse");
    expect(body.date).toBe("2026-11");
    expect(body.version).toMatch(/^[0-9a-f]{16}$/);
    expect(body.entries.length).toBeGreaterThan(0);
    expect(body.situations[0].id).toBe("ceasefire-or-collapse");
    for (const e of body.entries) {
      expect(e.eras).toBeUndefined();
      expect(e.reviewedBy).toBeUndefined();
      expect(e.valid.from <= body.date).toBe(true);
    }
    expect(res.headers.etag).toBe(`"${body.version}"`);
    expect(res.headers["cache-control"]).toContain("max-age=86400");
  });

  it("derives the scenario and date from the flashpoint", async () => {
    const body = (await get("/api/codex?flashpoint=ceasefire-or-collapse")).json();
    expect(body.scenarioId).toBe("2026");
    expect(body.date).toBe("2026-11");
  });

  it("filters entries to the era", async () => {
    const body = (await get("/api/codex?scenario=1960")).json();
    expect(body.date).toBe("1960-01");
    const ids = body.entries.map((e: { id: string }) => e.id);
    expect(ids).not.toContain("volodymyr-zelensky");
    expect(body.situations.every((s: { id: string }) => s.id === "scenario-1960")).toBe(true);
  });

  it("answers 304 when the ETag matches", async () => {
    const first = await get("/api/codex?scenario=2026");
    const again = await get("/api/codex?scenario=2026", { "if-none-match": first.headers.etag as string });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe("");
  });

  it("rejects unknown and malformed ids", async () => {
    expect((await get("/api/codex?scenario=1066")).statusCode).toBe(404);
    expect((await get("/api/codex?flashpoint=nowhere")).statusCode).toBe(404);
    expect((await get("/api/codex?scenario=../etc")).statusCode).toBe(400);
  });
});

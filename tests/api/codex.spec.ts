import { cpSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { codexRoutes } from "../../src/api/routes/codex.js";
import { createDataLoader } from "../../src/core/data-loader.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(codexRoutes, { prefix: "/api", watchData: false });
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

// B-21: a running dev server served a stale codex after a data merge (the payloads were cached
// per process until restart). With watchData the route notices the change on disk.
describe("GET /api/codex after a data file changes", () => {
  const makeApp = async (watchData: boolean) => {
    const root = mkdtempSync(join(tmpdir(), "wc-codex-"));
    for (const sub of ["codex", "scenarios", "flashpoints"]) {
      cpSync(join(process.cwd(), "data", sub), join(root, sub), { recursive: true });
    }
    const a = Fastify({ logger: false });
    await a.register(codexRoutes, { prefix: "/api", loader: createDataLoader(root), watchData });
    await a.ready();
    return { a, root };
  };
  const edit = (root: string): string => {
    const file = join(root, "codex", "countries.json");
    const entries = JSON.parse(readFileSync(file, "utf-8"));
    entries[0].short = "Edited after the server started.";
    writeFileSync(file, JSON.stringify(entries));
    // Make the mtime change visible even on coarse-grained filesystems.
    const later = new Date(Date.now() + 5000);
    utimesSync(file, later, later);
    return entries[0].id;
  };

  it("serves the new data and a new ETag in development", async () => {
    const { a, root } = await makeApp(true);
    try {
      const first = await a.inject({ method: "GET", url: "/api/codex?scenario=2026" });
      expect(first.headers["cache-control"]).toBe("no-cache");
      const id = edit(root);
      const second = await a.inject({
        method: "GET",
        url: "/api/codex?scenario=2026",
        headers: { "if-none-match": first.headers.etag as string },
      });
      expect(second.statusCode).toBe(200);
      expect(second.headers.etag).not.toBe(first.headers.etag);
      const entry = second.json().entries.find((e: { id: string }) => e.id === id);
      expect(entry.short).toBe("Edited after the server started.");
    } finally {
      await a.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps the cached payload and the day-long cache in production", async () => {
    const { a, root } = await makeApp(false);
    try {
      const first = await a.inject({ method: "GET", url: "/api/codex?scenario=2026" });
      expect(first.headers["cache-control"]).toContain("max-age=86400");
      edit(root);
      const second = await a.inject({ method: "GET", url: "/api/codex?scenario=2026" });
      expect(second.headers.etag).toBe(first.headers.etag);
    } finally {
      await a.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

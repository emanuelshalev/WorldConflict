import { readFileSync } from "node:fs";
import { join } from "node:path";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { createDataLoader, type ScenarioData, ScenarioSchema } from "../../src/core/data-loader.js";
import { buildEraMap, MAX_RIVALS, RIVAL_THRESHOLD } from "../../src/core/era-map.js";
import { TIER1_COUNTRIES } from "../../src/core/types.js";

const loader = createDataLoader();
const profiles = loader.loadAllCountries();
const scenarios = loader.loadAvailableScenarios();
const flashpointIds = new Set(loader.loadAvailableFlashpoints().map((f) => f.id));
const roster = new Set<string>(TIER1_COUNTRIES);

// The concept draft (design-worldmap.md 4.4), the starting point of the era content
const DRAFT = join(
  process.cwd(),
  "devloop/instances/world-conflict/runs/iter-01/concepts/worldmap-era-data.json",
);

/** The draft uses `focus`, `labels` and a flat `merged` list (all into the Soviet Union). */
function withDraft(base: ScenarioData, draft: Record<string, unknown>): ScenarioData {
  const raw = JSON.parse(readFileSync(join("data/scenarios", `${base.id}.json`), "utf-8"));
  const merged = draft.merged as string[];
  return ScenarioSchema.parse({
    ...raw,
    blocs: draft.blocs,
    situations: draft.situations,
    eraStatus: draft.eraStatus,
    merged: merged.length ? { RUS: merged } : {},
    mapFocus: draft.focus,
    mapLabels: draft.labels,
  });
}

/** Content rules for a scenario's era map; returns human-readable problems. */
function eraProblems(s: ScenarioData): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const sit of s.situations) {
    if (ids.has(sit.id)) out.push(`${s.id}: duplicate situation ${sit.id}`);
    ids.add(sit.id);
    for (const c of sit.countries) if (!roster.has(c)) out.push(`${s.id}/${sit.id}: ${c} not roster`);
    if (sit.line) {
      for (const c of [sit.line.from, sit.line.to])
        if (!roster.has(c)) out.push(`${s.id}/${sit.id}: line end ${c} not roster`);
    }
    if (sit.flashpointId && !flashpointIds.has(sit.flashpointId))
      out.push(`${s.id}/${sit.id}: unknown flashpoint ${sit.flashpointId}`);
    const [lng, lat] = sit.at;
    if (lng < -180 || lng > 180 || lat < -80 || lat > 80) out.push(`${s.id}/${sit.id}: at`);
  }
  if (s.situations.length > 0) {
    for (const w of s.startingWars) {
      const covered = s.situations.some(
        (x) => x.countries.includes(w.attackerId) && x.countries.includes(w.defenderId),
      );
      if (!covered) out.push(`${s.id}: war ${w.attackerId}-${w.defenderId} has no situation`);
    }
  }
  for (const [id, st] of Object.entries(s.eraStatus)) {
    if (st.status === "PART_OF" && !st.partOf) out.push(`${s.id}: ${id} PART_OF without partOf`);
  }
  const blocIds = new Set<string>();
  for (const b of s.blocs) {
    if (blocIds.has(b.id)) out.push(`${s.id}: duplicate bloc ${b.id}`);
    blocIds.add(b.id);
  }
  return out;
}

describe("era map schema", () => {
  it("every scenario file parses (all era fields optional)", () => {
    expect(scenarios.map((s) => s.id).sort()).toEqual(["1960", "1990", "2025", "2026"]);
    for (const s of scenarios) {
      expect(Array.isArray(s.situations)).toBe(true);
      expect(s.situations.length).toBeLessThanOrEqual(12);
    }
  });

  it("authored era content follows the rules", () => {
    const problems = scenarios.flatMap(eraProblems);
    expect(problems).toEqual([]);
    // Once any era is authored, every era needs at least one situation
    if (scenarios.some((s) => s.situations.length > 0)) {
      for (const s of scenarios) expect(s.situations.length, s.id).toBeGreaterThan(0);
    }
  });

  it("the concept draft fits the schema and passes the content rules", () => {
    const draft = JSON.parse(readFileSync(DRAFT, "utf-8")) as Record<
      string,
      Record<string, unknown>
    >;
    for (const s of scenarios) {
      const full = withDraft(s, draft[s.id]);
      expect(eraProblems(full), s.id).toEqual([]);
      expect(full.situations.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("rejects bad situations", () => {
    const base = { id: "x", name: "x", startYear: 2000, globalTension: 40 };
    const sit = {
      id: "a",
      title: "A",
      kind: "WAR",
      at: [0, 0],
      weight: 3,
      blurb: "b",
    };
    expect(() => ScenarioSchema.parse({ ...base, situations: [sit] })).not.toThrow();
    expect(() =>
      ScenarioSchema.parse({ ...base, situations: [{ ...sit, kind: "PANDEMIC" }] }),
    ).toThrow();
    expect(() => ScenarioSchema.parse({ ...base, situations: [{ ...sit, at: [200, 0] }] })).toThrow();
    expect(() => ScenarioSchema.parse({ ...base, situations: [{ ...sit, weight: 6 }] })).toThrow();
    expect(() =>
      ScenarioSchema.parse({ ...base, situations: Array.from({ length: 13 }, () => sit) }),
    ).toThrow();
  });
});

describe("buildEraMap", () => {
  it("lists all roster countries with status, stability and nuclear", () => {
    for (const s of scenarios) {
      const map = buildEraMap(s, profiles);
      expect(map.countries.map((c) => c.id)).toEqual([...TIER1_COUNTRIES]);
      for (const c of map.countries) {
        expect(["STATE", "PART_OF", "NOT_INDEPENDENT"]).toContain(c.status);
        expect(c.stability).toBeGreaterThanOrEqual(0);
        expect(c.stability).toBeLessThanOrEqual(100);
        expect(typeof c.nuclear).toBe("string");
      }
      expect(map.year).toBe(s.startYear);
      expect(map.tension).toBe(s.globalTension);
    }
  });

  it("stability and names match a new game in that era", () => {
    for (const s of scenarios) {
      const world = loader.initializeWorldState(s.id, "USA", 11);
      const map = buildEraMap(s, profiles);
      for (const c of map.countries) {
        const live = world.countries.find((x) => x.id === c.id);
        expect(c.stability, `${s.id} ${c.id}`).toBe(Math.round(live?.stability ?? -1));
        expect(c.name).toBe(live?.name);
        if (c.leader) expect(c.leader.name).toBe(live?.leader.name);
      }
    }
  });

  it("is deterministic and does not share objects with the loader cache", () => {
    const s = loader.loadScenario("2026");
    const a = buildEraMap(s, profiles);
    const b = buildEraMap(s, profiles);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    a.blocs.push({ id: "MUT", name: "m", side: "OTHER", members: [] });
    a.hotspots[0]?.center.splice(0, 1);
    expect(JSON.stringify(buildEraMap(s, profiles))).toBe(JSON.stringify(b));
  });

  it("rivals are the worst pairs at -60 or worse, never at war, at most 8", () => {
    for (const s of scenarios) {
      const map = buildEraMap(s, profiles);
      expect(map.rivals.length).toBeLessThanOrEqual(MAX_RIVALS);
      const wars = new Set(map.wars.flatMap(({ a, b }) => [`${a}|${b}`, `${b}|${a}`]));
      for (const r of map.rivals) {
        expect(r.relation).toBeLessThanOrEqual(RIVAL_THRESHOLD);
        expect(wars.has(`${r.a}|${r.b}`)).toBe(false);
        expect(r.a < r.b).toBe(true);
      }
      const rel = map.rivals.map((r) => r.relation);
      expect([...rel].sort((x, y) => x - y)).toEqual(rel);
    }
    const w2026 = buildEraMap(loader.loadScenario("2026"), profiles).wars;
    expect(w2026).toContainEqual({ a: "RUS", b: "UKR" });
  });

  it("draft era content: blocs, merged polygons, era status and focus come through", () => {
    const draft = JSON.parse(readFileSync(DRAFT, "utf-8"));
    const s = withDraft(loader.loadScenario("1960"), draft["1960"]);
    const map = buildEraMap(s, profiles);
    const by = (id: string) => map.countries.find((c) => c.id === id);
    expect(by("UKR")).toMatchObject({ status: "PART_OF", partOf: "RUS", label: "Ukrainian SSR" });
    expect(by("RUS")?.name).toBe("Soviet Union");
    expect(by("RUS")?.bloc).toBe("WARSAW");
    expect(by("USA")?.bloc).toBe("NATO");
    expect(map.merged).toContainEqual({ id: "KAZ", partOf: "RUS" });
    expect(map.merged).toContainEqual({ id: "SYR", partOf: "EGY" });
    expect(map.focus).toEqual([22, 36]);
    expect(map.blocs.length).toBeGreaterThanOrEqual(4);
    const weights = map.situations.map((x) => x.weight);
    expect([...weights].sort((x, y) => y - x)).toEqual(weights);
    expect(map.situations[0].id).toBe("berlin");
  });
});

describe("GET /api/scenarios/:id/map", () => {
  it("returns the era map with a cache header, and 404 for unknown ids", async () => {
    const { gameRoutes } = await import("../../src/api/routes/game.js");
    const app = Fastify({ logger: false });
    await app.register(gameRoutes, { prefix: "/api" });
    await app.ready();
    try {
      const res = await app.inject({ method: "GET", url: "/api/scenarios/1960/map" });
      expect(res.statusCode).toBe(200);
      expect(res.headers["cache-control"]).toBe("public, max-age=3600");
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.map.scenarioId).toBe("1960");
      expect(body.map.countries).toHaveLength(TIER1_COUNTRIES.length);
      const bad = await app.inject({ method: "GET", url: "/api/scenarios/..%2Fx/map" });
      expect(bad.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

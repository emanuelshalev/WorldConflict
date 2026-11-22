import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { codexForGame } from "../../src/core/codex.js";
import { createDataLoader } from "../../src/core/data-loader.js";

/**
 * Era and flashpoint content fixes from the iteration 1 backlog: B-20 (Hormuz goal wording),
 * B-24 (East Germany and South Yemen shapes), B-25 (era labels vs labelAllow), B-26 (era
 * situations link to the codex).
 */

const loader = createDataLoader();
const scenarios = loader.loadAvailableScenarios();
const flashpoints = loader.loadAvailableFlashpoints();
const codex = loader.loadCodex();

type Ring = Array<[number, number]>;
type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };
interface Feature {
  properties: Record<string, unknown>;
  geometry: Geometry;
}
const readGeo = (rel: string): Feature[] =>
  JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8")).features;

function inRing(p: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
const polygons = (g: Geometry): Ring[][] => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const contains = (g: Geometry, p: [number, number]) =>
  polygons(g).some(([outer, ...holes]) => inRing(p, outer) && !holes.some((h) => inRing(p, h)));

/** Spherical polygon area in km² (outer ring only). */
function areaKm2(ring: Ring): number {
  const R = 6371;
  const rad = Math.PI / 180;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs((sum * R * R) / 2);
}

describe("B-20: Hormuz Convoy goal wording fits a late-November start", () => {
  const fp = flashpoints.find((f) => f.id === "hormuz-convoy");

  it("the USA approval goal no longer points at the (past) midterms, the condition is unchanged", () => {
    const goal = fp?.objectives.USA.primary.find(
      (c) => c.kind === "STAT_MIN" && c.stat === "approval",
    );
    expect(goal).toMatchObject({ kind: "STAT_MIN", stat: "approval", min: 56 });
    expect(goal?.label).not.toMatch(/midterm/i);
  });

  it("no flashpoint goal label in a game that opens after 3 November 2026 mentions the midterms", () => {
    for (const f of flashpoints.filter((x) => (x.date ?? "") >= "2026-11")) {
      for (const side of Object.values(f.objectives)) {
        for (const c of [...side.primary, ...(side.bonus ?? [])]) {
          expect(c.label, `${f.id}: ${c.label}`).not.toMatch(/midterm/i);
        }
      }
    }
  });
});

describe("B-25: an era label is never shadowed by a modern name the era allows", () => {
  const world = readGeo("ui/public/world.geojson");

  it.each(scenarios.filter((s) => s.mapLabels?.length).map((s) => [s.id, s]))(
    "%s: the country under each era label is not in labelAllow",
    (_id, sc) => {
      const allow = new Set(sc.labelAllow ?? []);
      for (const label of sc.mapLabels ?? []) {
        const under = world.find((f) => contains(f.geometry, label.at as [number, number]));
        const id = String(under?.properties.ADM0_A3 ?? "");
        expect(allow.has(id), `${label.name} sits on ${id}, which labelAllow names`).toBe(false);
      }
    },
  );

  it("1960 shows French Algeria, not Algeria", () => {
    const sc = scenarios.find((s) => s.id === "1960");
    expect(sc?.mapLabels?.some((l) => l.name === "French Algeria")).toBe(true);
    expect(sc?.labelAllow).not.toContain("DZA");
  });
});

describe("B-24: era shapes for East Germany and South Yemen", () => {
  const shapes = readGeo("ui/public/era/shapes.geojson");
  const byId = new Map(shapes.map((f) => [String(f.properties.id), f]));

  it("the file is small and holds DDR and YMD polygons", () => {
    expect(readFileSync(join(process.cwd(), "ui/public/era/shapes.geojson")).length).toBeLessThan(
      10_000,
    );
    expect([...byId.keys()].sort()).toEqual(["DDR", "YMD"]);
    for (const f of shapes) {
      expect(f.geometry.type).toBe("Polygon");
      const ring = (f.geometry as { coordinates: Ring[] }).coordinates[0];
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  it("the outlines have the right size and sit where the cities were", () => {
    const ddr = byId.get("DDR")?.geometry as Geometry;
    const ymd = byId.get("YMD")?.geometry as Geometry;
    // East Germany was about 108,000 km², South Yemen about 333,000 km²
    expect(areaKm2((ddr as { coordinates: Ring[] }).coordinates[0])).toBeGreaterThan(95_000);
    expect(areaKm2((ddr as { coordinates: Ring[] }).coordinates[0])).toBeLessThan(125_000);
    expect(areaKm2((ymd as { coordinates: Ring[] }).coordinates[0])).toBeGreaterThan(260_000);
    expect(areaKm2((ymd as { coordinates: Ring[] }).coordinates[0])).toBeLessThan(400_000);
    const east = { Leipzig: [12.37, 51.34], Dresden: [13.74, 51.05], Rostock: [12.1, 54.09], Magdeburg: [11.63, 52.13], Erfurt: [11.03, 50.98] };
    const west = { Hamburg: [9.99, 53.55], Hanover: [9.73, 52.37], Kassel: [9.48, 51.31], Nuremberg: [11.08, 49.45], Coburg: [10.96, 50.26], Wolfsburg: [10.79, 52.42], Luebeck: [10.69, 53.87] };
    for (const [name, p] of Object.entries(east)) expect(contains(ddr, p as [number, number]), name).toBe(true);
    for (const [name, p] of Object.entries(west)) expect(contains(ddr, p as [number, number]), name).toBe(false);
    const south = { Aden: [45.03, 12.8], Mukalla: [49.12, 14.54], Seiyun: [48.79, 15.94] };
    const north = { Sanaa: [44.21, 15.35], Taiz: [44.02, 13.58], Hodeidah: [42.95, 14.8], Mocha: [43.25, 13.32] };
    for (const [name, p] of Object.entries(south)) expect(contains(ymd, p as [number, number]), name).toBe(true);
    for (const [name, p] of Object.entries(north)) expect(contains(ymd, p as [number, number]), name).toBe(false);
  });

  it("an era names each shape it should draw (the globe only draws named shapes)", () => {
    const named = (id: string) =>
      new Set(scenarios.filter((s) => s.blocs.some((b) => b.members.includes(id))).map((s) => s.id));
    expect([...named("DDR")].sort()).toEqual(["1960", "1990"]);
    expect([...named("YMD")]).toEqual(["1990"]);
  });
});

describe("B-26: era situations open the codex", () => {
  it.each(scenarios.map((s) => [s.id, s]))(
    "%s: every codexId is a briefing or an entry valid at the era's start",
    (_id, sc) => {
      const date = `${sc.startYear}-${String(sc.startMonth).padStart(2, "0")}`;
      for (const s of sc.situations) {
        if (!s.codexId) continue;
        const game = codexForGame(codex, {
          scenarioId: sc.id,
          date,
          flashpointId: s.flashpointId ?? null,
        });
        const found =
          game.situations.some((x) => x.id === s.codexId) ||
          game.entries.some((e) => e.id === s.codexId);
        expect(found, `${sc.id}/${s.id} -> ${s.codexId}`).toBe(true);
        // A briefing for a flashpoint is reached through that flashpoint
        if (codex.situations.some((x) => x.id === s.codexId)) expect(s.flashpointId).toBe(s.codexId);
      }
    },
  );

  it("most situations in every era have one", () => {
    for (const sc of scenarios) {
      const linked = sc.situations.filter((s) => s.codexId).length;
      expect(linked, sc.id).toBeGreaterThanOrEqual(Math.ceil(sc.situations.length * 0.75));
    }
  });
});

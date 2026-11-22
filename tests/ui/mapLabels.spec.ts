import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TIER1_COUNTRIES } from "../../src/core/types";
import {
  featureAreaKm2,
  LABEL_MIN_PX,
  labelFeatures,
  labelFilter,
  maxTierAt,
  ROSTER,
  ringAreaKm2,
} from "../../ui/src/lib/mapLabels";
import { freeBox, titleInsets, zoomForDiameter } from "../../ui/src/lib/globeFit";

const geo = JSON.parse(readFileSync("ui/public/world.geojson", "utf-8")) as GeoJSON.FeatureCollection;
const byId = (fs: ReturnType<typeof labelFeatures>, id: string) =>
  fs.find((f) => f.properties.id === id)?.properties;

describe("mapLabels", () => {
  it("ROSTER mirrors the engine's simulated countries", () => {
    expect([...ROSTER].sort()).toEqual([...TIER1_COUNTRIES].sort());
  });

  it("computes spherical areas in km2", () => {
    // A 1x1 degree cell on the equator is about 12,364 km2
    const cell = ringAreaKm2([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
    expect(cell).toBeGreaterThan(12_200);
    expect(cell).toBeLessThan(12_500);
    const rus = geo.features.find((f) => f.properties?.ADM0_A3 === "RUS");
    const area = featureAreaKm2(rus as GeoJSON.Feature);
    expect(area).toBeGreaterThan(15_000_000);
    expect(area).toBeLessThan(18_500_000);
  });

  it("tiers by importance and size, never under 13 px", () => {
    const fs = labelFeatures(geo, { selected: "ISR", player: "UKR", sides: ["TWN"] });
    expect(byId(fs, "ISR")?.tier).toBe(0);
    expect(byId(fs, "UKR")?.tier).toBe(0);
    expect(byId(fs, "TWN")?.tier).toBe(0);
    for (const big of ["RUS", "CAN", "USA", "CHN", "BRA", "AUS", "IND"]) expect(byId(fs, big)?.tier).toBe(1);
    expect(byId(fs, "FRA")?.tier).toBe(2);
    expect(byId(fs, "LBN")?.tier).toBe(3);
    expect(byId(fs, "USA")?.name).toBe("United States");
    expect(byId(fs, "PSX")?.name).toBe("West Bank");
    for (const f of fs) expect(f.properties.size).toBeGreaterThanOrEqual(LABEL_MIN_PX);
    expect(byId(fs, "RUS")?.size).toBe(15);
    // Non-roster names are muted; roster names are not
    expect(byId(fs, "KAZ")?.muted).toBe(true);
    expect(byId(fs, "DEU")?.muted).toBe(false);
  });

  it("sort keys follow tiers (tier 0 placed first) and are unique", () => {
    const fs = labelFeatures(geo, { selected: "LBN" });
    const sorts = fs.map((f) => f.properties.sort);
    expect(new Set(sorts).size).toBe(sorts.length);
    expect(byId(fs, "LBN")?.sort).toBeLessThan(byId(fs, "RUS")?.sort ?? 0);
    for (let i = 1; i < fs.length; i++) {
      expect(fs[i].properties.tier).toBeGreaterThanOrEqual(fs[i - 1].properties.tier);
    }
  });

  it("applies era names and the anachronism guard", () => {
    const fs = labelFeatures(geo, {
      names: { RUS: "Soviet Union", DEU: "West Germany" },
      eraStatus: { UKR: { status: "PART_OF", label: "Ukrainian SSR" } },
      merged: ["UKR", "KAZ", "EST"],
      mapLabels: [{ at: [17.2, 49.5], name: "Czechoslovakia", rank: 2 }],
      labelAllow: ["MNG"],
    });
    const names = fs.map((f) => f.properties.name);
    expect(names).toContain("Soviet Union");
    expect(names).toContain("West Germany");
    expect(names).toContain("Ukrainian SSR");
    expect(names).toContain("Czechoslovakia");
    expect(names).toContain("Mongolia");
    for (const modern of ["Kazakhstan", "Czechia", "Ukraine", "Mali", "Estonia"]) expect(names).not.toContain(modern);
    expect(fs.find((f) => f.properties.name === "Ukrainian SSR")?.properties.italic).toBe(true);
    expect(fs.find((f) => f.properties.name === "Czechoslovakia")?.properties.italic).toBe(true);
  });

  it("is deterministic", () => {
    const a = JSON.stringify(labelFeatures(geo, { selected: "IRN" }));
    expect(JSON.stringify(labelFeatures(geo, { selected: "IRN" }))).toBe(a);
  });

  it("shows tiers by zoom relative to the fit", () => {
    expect(maxTierAt(2, 2, false)).toBe(2);
    expect(maxTierAt(2.8, 2, false)).toBe(3);
    expect(maxTierAt(2, 2, true)).toBe(1);
    expect(maxTierAt(2.6, 2, true)).toBe(2);
    expect(JSON.stringify(labelFilter(2, 2, true))).toContain('muted');
    expect(labelFilter(2, 2, false)).toEqual(['<=', ['get', 'tier'], 2]);
  });
});

describe("globeFit", () => {
  it("free box and diameter per design-worldmap 3.1", () => {
    const d = (w: number, h: number) => freeBox(w, h, titleInsets(w, h, 440)).diameter;
    expect(Math.round(d(1920, 1080))).toBeGreaterThan(940);
    expect(Math.round(d(1440, 900))).toBeGreaterThan(720);
    expect(Math.round(d(1024, 768))).toBeGreaterThan(540);
    expect(d(390, 844)).toBeGreaterThanOrEqual(370);
    const phone = titleInsets(390, 844, 0);
    expect(phone.top).toBe(160);
  });

  it("zoom doubles the diameter per step", () => {
    expect(zoomForDiameter(2, 400, 800)).toBeCloseTo(3);
    expect(zoomForDiameter(2, 400, 200)).toBeCloseTo(1);
    expect(zoomForDiameter(2, 400, 8000, 0, 3)).toBe(3);
  });
});

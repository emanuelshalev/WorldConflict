import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader";
import { buildEraMap } from "../../src/core/era-map";
import {
  angularDistance,
  BLOC_SIDE_COLOR,
  CALM_PINS,
  clusterPins,
  countryTip,
  defaultColourBy,
  eraCounts,
  eraFills,
  eraLines,
  eraPins,
  fanOffsets,
  isFarSide,
  MAX_FRONT_DEG,
  rgba,
  rimPoint,
  STABILITY_STEPS,
  stabilityWord,
  unplayableIn,
} from "../../ui/src/components/globe/eraLayers";
import type { EraMap } from "../../ui/src/store/gameStore";

const loader = createDataLoader();
const profiles = loader.loadAllCountries();
const era = (id: string) => buildEraMap(loader.loadScenario(id), profiles) as unknown as EraMap;
const geo = JSON.parse(readFileSync("ui/public/world.geojson", "utf-8")) as GeoJSON.FeatureCollection;
const at = (id: string): [number, number] | null => {
  const f = geo.features.find((x) => (x.properties as Record<string, unknown>)?.ADM0_A3 === id);
  const p = f?.properties as Record<string, number> | undefined;
  return p ? [p.LABEL_X, p.LABEL_Y] : null;
};

describe("eraLayers: colours", () => {
  it("opens historical eras on Blocs and November 2026 on Stability (D-54)", () => {
    expect(defaultColourBy(era("1960"))).toBe("blocs");
    expect(defaultColourBy(era("1990"))).toBe("blocs");
    expect(defaultColourBy(era("2025"))).toBe("blocs");
    expect(defaultColourBy(era("2026"))).toBe("stability");
  });

  it("1960 Blocs: the US and West Germany share West, the Soviet Union (with Ukraine) and Poland share East, Czechoslovakia is East", () => {
    const { fill } = eraFills(era("1960"), "blocs");
    const west = rgba(BLOC_SIDE_COLOR.WEST, 0.62);
    const east = rgba(BLOC_SIDE_COLOR.EAST, 0.62);
    expect(fill.USA).toBe(west);
    expect(fill.DEU).toBe(west);
    for (const id of ["RUS", "UKR", "BLR", "POL", "CZE", "SVK"]) expect(fill[id]).toBe(east);
  });

  it("merged republics take the Soviet colour in Stability mode too, with a hairline in that colour", () => {
    const f = eraFills(era("1960"), "stability");
    expect(f.fill.UKR).toBe(f.fill.RUS);
    expect(f.merged.UKR).toBe(f.fill.RUS);
    expect(f.outline.UKR).toBe(BLOC_SIDE_COLOR.EAST);
    expect(f.outline.USA).toBe(BLOC_SIDE_COLOR.WEST);
  });

  it("switching era changes the fills of at least 10 roster countries", () => {
    const a = eraFills(era("1960"), "blocs").fill;
    const b = eraFills(era("2026"), "blocs").fill;
    const changed = era("2026").countries.filter((c) => a[c.id] !== b[c.id]);
    expect(changed.length).toBeGreaterThanOrEqual(10);
  });

  it("five plain stability words, ordered", () => {
    expect(STABILITY_STEPS.map((s) => s.word)).toEqual(["Shaky", "Strained", "Holding", "Steady", "Solid"]);
    expect(stabilityWord(30)).toBe("Shaky");
    expect(stabilityWord(48)).toBe("Strained");
    expect(stabilityWord(76)).toBe("Solid");
  });
});

describe("eraLayers: situations and lines", () => {
  it("the calm view pins the five heaviest situations, numbered; the switch pins all", () => {
    for (const id of ["1960", "1990", "2025", "2026"]) {
      const e = era(id);
      const calm = eraPins(e, "calm");
      expect(calm).toHaveLength(Math.min(CALM_PINS, e.situations.length));
      expect(calm.map((p) => p.num)).toEqual([1, 2, 3, 4, 5].slice(0, calm.length));
      expect(eraPins(e, "all")).toHaveLength(e.situations.length);
      expect(eraCounts(e).situations).toBe(e.situations.length);
    }
  });

  it("draws every war between neighbours as a front, never a front across the world", () => {
    const e = era("2026");
    const lines = eraLines(e, "calm", null, at);
    const fronts = lines.filter((l) => l.style === "front");
    expect(fronts.some((l) => l.id.includes("RUS") && l.id.includes("UKR"))).toBe(true);
    for (const l of fronts) expect(angularDistance(l.from, l.to)).toBeLessThanOrEqual(MAX_FRONT_DEG);
    // The calm view has no rival lines; the switch adds the era's rivals
    expect(lines.some((l) => l.style === "rival")).toBe(false);
    expect(eraLines(e, "all", null, at).some((l) => l.style === "rival")).toBe(true);
  });

  it("the selected situation's line shows in the calm view, brighter", () => {
    const e = era("1960");
    const lines = eraLines(e, "calm", "berlin", at);
    expect(lines.find((l) => l.on)).toBeTruthy();
  });
});

describe("eraLayers: geometry", () => {
  it("rim points sit near the limb, toward the target", () => {
    const c: [number, number] = [20, 30];
    const target: [number, number] = [-80, 22]; // Cuba from Europe: far side
    expect(isFarSide(c, target)).toBe(true);
    const r = rimPoint(c, target, 80);
    expect(Math.abs(angularDistance(c, r) - 80)).toBeLessThan(0.01);
    expect(angularDistance(r, target)).toBeLessThan(angularDistance(c, target));
  });

  it("clusters pins closer than 28 px behind the heaviest, and fans them out", () => {
    const g = clusterPins([
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 110, y: 112 },
      { id: "c", x: 300, y: 100 },
    ]);
    expect(g.get("a")).toEqual(["a", "b"]);
    expect(g.get("c")).toEqual(["c"]);
    const fan = fanOffsets(3);
    expect(fan[0]).toEqual([0, 0]);
    expect(Math.hypot(...fan[1])).toBeGreaterThan(28);
  });
});

describe("eraLayers: hover card and playability (B-17)", () => {
  it("names the era leader, stability word and number, and camp", () => {
    const t = countryTip(era("2026"), "UKR");
    expect(t?.title).toBe("Ukraine");
    expect(t?.lines.join(" | ")).toMatch(/Volodymyr Zelensky, President/);
    expect(t?.lines.join(" | ")).toMatch(/Stability \d+ \((shaky|strained|holding|steady|solid)\)/);
    const s = countryTip(era("1960"), "RUS");
    expect(s?.title).toBe("Soviet Union");
    expect(s?.lines.join(" | ")).toMatch(/Camp: Warsaw Pact/);
  });

  it("marks the Ukrainian SSR in 1960 as not playable, and Ukraine in 2026 as playable", () => {
    expect(unplayableIn(era("1960"), "UKR")).toMatch(/Ukrainian SSR/);
    expect(unplayableIn(era("1990"), "BLR")).toMatch(/Byelorussian SSR/);
    expect(unplayableIn(era("2026"), "UKR")).toBeNull();
    expect(countryTip(era("1960"), "UKR")?.lines).toContain("Not playable in this era");
  });

  it("writes no em dash anywhere it can show", () => {
    for (const id of ["1960", "1990", "2025", "2026"]) {
      const e = era(id);
      for (const c of e.countries) {
        const t = countryTip(e, c.id);
        expect(`${t?.title} ${t?.lines.join(" ")}`).not.toContain("\u2014");
      }
    }
  });
});

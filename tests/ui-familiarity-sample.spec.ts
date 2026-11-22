import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { familiaritySample, sampleEra, sampleMarks, sampleText } from "../ui/src/lib/familiaritySample.js";

/**
 * QA3-S3-1: the familiarity question ("How well do you follow world news?") showed the 2026
 * Donetsk line in every era, an anachronism for a 1960 or 1990 seat. The sample follows the era
 * of the game being started.
 */
const ROOT = join(__dirname, "..");
const scenario = (id: string) => JSON.parse(readFileSync(join(ROOT, "data/scenarios", `${id}.json`), "utf8"));
const startDate = (id: string) => {
  const s = scenario(id);
  return `${s.startYear}-${String(s.startMonth).padStart(2, "0")}`;
};

describe("familiarity sample sentence (QA3-S3-1)", () => {
  it("each scenario's start date gets its own era's line", () => {
    for (const id of ["1960", "1990", "2025", "2026"]) expect(sampleEra(startDate(id)), id).toBe(id);
    // Every flashpoint plays in 2026
    for (const f of readdirSync(join(ROOT, "data/flashpoints")).filter((n) => n.endsWith(".json"))) {
      const fp = JSON.parse(readFileSync(join(ROOT, "data/flashpoints", f), "utf8"));
      expect(sampleEra(fp.date ?? startDate(fp.scenarioId)), f).toBe(fp.scenarioId === "2026" ? "2026" : sampleEra(startDate(fp.scenarioId)));
    }
    // Before a game exists (no world date) the current era
    expect(sampleEra(undefined)).toBe("2026");
  });

  it("no later-era names leak into an earlier era's line", () => {
    const later = /Donetsk|Kramatorsk|Gaza|Kursk|Berlin Wall|NATO/;
    expect(sampleText(familiaritySample("1960-01"))).not.toMatch(later);
    expect(sampleText(familiaritySample("1990-01"))).not.toMatch(/Donetsk|Kramatorsk|Gaza|Kursk/);
    expect(sampleText(familiaritySample("2025-01"))).not.toMatch(/Donetsk oblast, including|fortress belt/);
    expect(sampleText(familiaritySample("2026-11"))).toContain("Donetsk oblast");
    const texts = ["1960-01", "1990-01", "2025-01", "2026-11"].map((d) => sampleText(familiaritySample(d)));
    expect(new Set(texts).size).toBe(4);
  });

  it("each line marks at least one name for Guide me and has no em dash", () => {
    for (const d of ["1960-01", "1990-01", "2025-01", "2026-11"]) {
      const s = familiaritySample(d);
      expect(sampleMarks(s), d).toBeGreaterThanOrEqual(1);
      expect(sampleText(s)).not.toContain("—");
    }
  });

  it("the prompt renders the era's sample, not a hard-coded line", () => {
    const src = readFileSync(join(ROOT, "ui/src/components/learn/FamiliarityPrompt.tsx"), "utf8");
    expect(src).toContain("familiaritySample(");
    expect(src).not.toContain("Donetsk");
  });
});

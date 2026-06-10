import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ActionSchema,
  CountryProfileSchema,
  TIER1_COUNTRIES,
  relationToLevel,
  stabilityToLevel,
} from "../../src/core/types.js";
import { ScenarioSchema } from "../../src/core/data-loader.js";

describe("Core Types", () => {
  describe("TIER1_COUNTRIES", () => {
    it("has exactly 25 countries including the major powers", () => {
      expect(TIER1_COUNTRIES.length).toBe(25);
      expect(TIER1_COUNTRIES).toContain("USA");
      expect(TIER1_COUNTRIES).toContain("CHN");
      expect(TIER1_COUNTRIES).toContain("RUS");
    });
  });

  describe("diplomatic level mapping", () => {
    it("maps the 7-level hierarchy from relations", () => {
      expect(relationToLevel(0, true, false)).toBe("WAR");
      expect(relationToLevel(0, false, true)).toBe("MILITARY_PACT");
      expect(relationToLevel(80, false, false)).toBe("PROFITABLE");
      expect(relationToLevel(50, false, false)).toBe("BENEFICIAL");
      expect(relationToLevel(20, false, false)).toBe("FAVOURABLE");
      expect(relationToLevel(0, false, false)).toBe("SATISFACTORY");
      expect(relationToLevel(-50, false, false)).toBe("LAMENTABLE");
    });
  });

  describe("stability levels", () => {
    it("maps named levels", () => {
      expect(stabilityToLevel(90)).toBe("VERY_SOLID");
      expect(stabilityToLevel(65)).toBe("SOLID");
      expect(stabilityToLevel(45)).toBe("MODERATE");
      expect(stabilityToLevel(25)).toBe("UNSTABLE");
      expect(stabilityToLevel(5)).toBe("COLLAPSING");
    });
  });

  describe("ActionSchema", () => {
    it("accepts new action types", () => {
      expect(() => ActionSchema.parse({ type: "NUCLEAR_FUND_PROGRAM" })).not.toThrow();
      expect(() => ActionSchema.parse({ type: "INTEL_COUP", targetCountryId: "IRN" })).not.toThrow();
      expect(() =>
        ActionSchema.parse({
          type: "MILITARY_AIRSTRIKE",
          targetCountryId: "IRN",
          params: { targetType: "NUCLEAR" },
        }),
      ).not.toThrow();
    });
  });

  describe("data file conformance", () => {
    const dataPath = join(process.cwd(), "data");

    it("every country profile parses against CountryProfileSchema", () => {
      const files = readdirSync(join(dataPath, "countries")).filter((f) => f.endsWith(".json"));
      expect(files.length).toBeGreaterThanOrEqual(25);
      for (const file of files) {
        const raw = JSON.parse(readFileSync(join(dataPath, "countries", file), "utf-8"));
        expect(() => CountryProfileSchema.parse(raw), `parsing ${file}`).not.toThrow();
      }
    });

    it("every country profile has historical context", () => {
      const files = readdirSync(join(dataPath, "countries")).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const profile = CountryProfileSchema.parse(
          JSON.parse(readFileSync(join(dataPath, "countries", file), "utf-8")),
        );
        expect(profile.history.keyEvents.length, `${file} keyEvents`).toBeGreaterThanOrEqual(4);
        expect(profile.goals.length, `${file} goals`).toBeGreaterThanOrEqual(3);
        expect(profile.history.narrative, `${file} narrative`).toBeTruthy();
      }
    });

    it("every scenario parses against ScenarioSchema and has 25 leaders", () => {
      const files = readdirSync(join(dataPath, "scenarios")).filter((f) => f.endsWith(".json"));
      expect(files.length).toBe(3);
      for (const file of files) {
        const scenario = ScenarioSchema.parse(
          JSON.parse(readFileSync(join(dataPath, "scenarios", file), "utf-8")),
        );
        expect(Object.keys(scenario.leaders).length, `${file} leaders`).toBe(25);
      }
    });
  });
});

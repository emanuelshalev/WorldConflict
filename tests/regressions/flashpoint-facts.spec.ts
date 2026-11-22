import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";

/**
 * Regression guards for the flashpoint fact fixes of the iteration 1 backlog (content consultant,
 * runs/iter-01/backlog.md): B-01 to B-04 corrected real-world facts in the hooks, briefings and
 * debriefs; B-16 removed "before the midterms" premises from a game that opens in late November.
 */

const loader = createDataLoader();
const flashpoints = loader.loadAvailableFlashpoints();
const fp = (id: string) => {
  const f = flashpoints.find((x) => x.id === id);
  if (!f) throw new Error(`no flashpoint ${id}`);
  return f;
};
/** Every string inside a value, joined (hook, briefings, crises, debriefs). */
const allText = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(allText).join("\n");
  if (v && typeof v === "object") return Object.values(v).map(allText).join("\n");
  return "";
};

describe("B-01: Hormuz hook does not credit the foreign minister with the 'positive step' remark", () => {
  it("credits Tehran, not the foreign minister, and says no meeting is planned", () => {
    const text = allText(fp("hormuz-convoy"));
    expect(text).not.toMatch(/foreign minister calls it 'a positive step'/i);
    expect(text).toMatch(/Tehran calls it 'a positive step' and plans no meeting/);
  });
});

describe("B-02: Taiwan's special defence budget was cut by about 38%, not roughly in half", () => {
  it("states the cut as about 38% (NT$780 billion of NT$1.25 trillion)", () => {
    const hook = fp("quarantine").hook;
    expect(hook).not.toMatch(/roughly in half/i);
    expect(hook).toMatch(/about 38%/);
    expect(hook).toMatch(/NT\$780 billion/);
  });
});

describe("B-03: Bab al-Mandab government forces withdrew from the strait area on 15 November", () => {
  it("no debrief says the counteroffensive 'ground forward'; the hook and debriefs tell the withdrawal", () => {
    const f = fp("bab-al-mandab-burning");
    const text = allText(f);
    expect(text).not.toMatch(/ground forward/i);
    expect(f.hook).toMatch(/15 November/);
    expect(text).toMatch(/withdrew from the strait area on 15 November/);
  });
});

describe("B-04: the siege of El Obeid was reportedly broken in November", () => {
  it("the hook and the Sudan briefing do not present El Obeid as still besieged", () => {
    const f = fp("fire-on-the-nile");
    expect(f.hook).not.toMatch(/has besieged El Obeid/);
    expect(f.hook).toMatch(/besieged El Obeid[^.]*from July 2026 until/);
    const briefings = Object.values(f.objectives).map((o) => o.briefing).join("\n");
    expect(briefings).not.toMatch(/El Obeid under siege/);
    expect(briefings).toMatch(/siege of El Obeid only just reportedly broken/);
  });
});

describe("B-16: no 'before the midterms' premise in a game that opens in late November 2026", () => {
  it("no flashpoint text counts down to the midterms or sets the scene in their week", () => {
    const offenders: string[] = [];
    for (const f of flashpoints) {
      const text = allText(f);
      const re = /(\b(two|three|\d+) (days?|weeks?) (before|to) the midterms|week of the midterms|days to the midterms)/gi;
      for (const m of text.matchAll(re)) offenders.push(`${f.id}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("the USA briefings tell the midterms as done", () => {
    const usa = (id: string) => fp(id).objectives.USA?.briefing ?? "";
    expect(usa("ceasefire-or-collapse")).toMatch(/after the midterms/);
    expect(usa("hormuz-convoy")).toMatch(/the midterms are behind you/);
  });
});

import { describe, expect, it, vi } from "vitest";

// The UI store reads window.location at import; a bare stand-in is enough for these pure helpers
vi.hoisted(() => {
  (globalThis as unknown as { window: unknown }).window ??= { location: { search: "" }, innerWidth: 1440 };
});
import { readdirSync, readFileSync } from "node:fs";
import { effectWords, goalName, missionTag, monthDeskMode, splitLede } from "../ui/src/lib/month.js";
import { TAP_SLOP, pickNear } from "../ui/src/lib/mapPick.js";
import { metricWord, nowNeed, stepObjective } from "../ui/src/lib/goals.js";
import { scoreLine } from "../ui/src/lib/scoreWhy.js";
import { whyLine } from "../ui/src/lib/advisorRows.js";
import type { ConditionStatus, Impact, ScoreMove } from "../ui/src/store/gameStore.js";

/** The month's words (design-month.md 3 and 7): goal line, mission tags, effects, score line. */
const status: ConditionStatus[] = [
  { label: "The Houthis pushed off the coast (front 58+ your way, or a ceasefire)", short: "The Houthis pushed off the coast", met: false, failed: false, bonus: false, now: 42, need: 58, unit: "front", state: "off_track" },
  { label: "No open war with the Emirates", short: "No open war with the Emirates", met: true, failed: false, bonus: false, state: "on_track" },
  { label: "The kingdom holds its nerve (stability 78%+)", short: "The kingdom holds its nerve", met: false, failed: false, bonus: false, now: 62, need: 78, unit: "%", state: "off_track", step: true },
  { label: "Washington firmly behind you (US relations 70+)", short: "Washington firmly behind you", met: false, failed: false, bonus: true, now: 60, need: 70, unit: "view", state: "close" },
  { label: "Israel stays on side (relations 61+)", short: "Israel stays on side", met: true, failed: false, bonus: false, now: 85, need: 61, unit: "view", state: "on_track" },
];
const impact = (p: Partial<Impact>): Impact => ({ helps: [], hurts: [], breaks: [], bonusHelps: [], bonusHurts: [], score: 0, links: [], ...p });

describe("month words", () => {
  it("names a goal with the mission line's words, never its raw threshold", () => {
    expect(goalName(status[2])).toBe("The kingdom holds its nerve");
    expect(goalName(status[3])).toBe("Washington firmly behind you");
    expect(goalName({ label: "Voters stay on side (approval 56%+)" })).toBe("Voters stay on side");
    expect(goalName(status[4])).toBe("Israel stays on side");
    expect(goalName(status[0])).toBe("The Houthis pushed off the coast");
  });

  it("gives at most one mission tag: breaks, then hurts, then helps, then a bonus", () => {
    const sanaa = impact({ helps: ["The Houthis pushed off the coast"], hurts: ["The kingdom holds its nerve"], links: [{ index: 0, effect: "helps", bonus: false }, { index: 2, effect: "hurts", bonus: false }] });
    expect(missionTag(sanaa, status)).toEqual({ tone: "risk", text: "Hurts: The kingdom holds its nerve", more: 1 });
    const oman = impact({ helps: ["The kingdom holds its nerve"], links: [{ index: 2, effect: "helps", bonus: false }] });
    expect(missionTag(oman, status)?.text).toBe("Helps: The kingdom holds its nerve");
    const invite = impact({ bonusHelps: ["Washington firmly behind you"], links: [{ index: 3, effect: "helps", bonus: true }] });
    expect(missionTag(invite, status)).toEqual({ tone: "bonus", text: "Helps: Washington firmly behind you (bonus)", more: 0 });
    expect(missionTag(impact({}), status)).toBeNull();
  });

  it("writes effects in words, strongest first, never arrows or abbreviations", () => {
    const words = effectWords({ id: "o", label: "Bomb", description: "", effects: { approval: 10, legitimacy: -5, "relations:USA": -3 }, tensionDelta: 6, actions: [], backedBy: [] }).map((w) => w.text);
    expect(words[0]).toBe("Approval up a lot");
    expect(words).toContain("World tension up");
    expect(words.join(" ")).not.toMatch(/[▲▼]|APPR|STAB|Tens\b/);
  });

  it("splits the situation at its first sentence", () => {
    expect(splitLede("A Houthi missile killed 13. The kingdom wants an answer.")).toEqual(["A Houthi missile killed 13.", "The kingdom wants an answer."]);
    expect(splitLede("One line only")).toEqual(["One line only", ""]);
  });

  it("reads the goal line: metric, now and need, and this month's step", () => {
    expect(metricWord(status[2])).toBe("stability");
    expect(nowNeed(status[2])).toBe("stability 62%, needs 78%");
    expect(nowNeed(status[0])).toBe("front 42, needs 58");
    expect(nowNeed(status[4])).toBe("Israel stays on side: 85, needs 61");
    expect(stepObjective(status)).toBe(2);
    expect(stepObjective(status.map((c) => ({ ...c, step: false })))).toBe(0);
  });

  it("explains the score in one line that names the pull and the heading", () => {
    const part = (before: number, after: number, target: number, terms: Array<[string, number]>) => ({ before, after, target, terms: terms.map(([label, points]) => ({ label, points })) });
    const s: ScoreMove = {
      before: 100,
      after: 97,
      heading: 88,
      components: {
        economic: part(25, 25, 25, [["Base", 20], ["Trend growth 2% a year", 5]]),
        security: part(25, 23, 12, [["Base", 26], ["At war with India", -14]]),
        approval: part(25, 26, 30, [["Approval 60%", 30]]),
        prestige: part(25, 23, 21, [["Base", 20], ["The world's view of you (average 2)", 1]]),
      },
    };
    const line = scoreLine(s) ?? "";
    expect(line).toMatch(/^Score 100 → 97\./);
    expect(line).toContain("at war with india");
    expect(line).toMatch(/Heading to 88 if nothing changes\.$/);
    expect(scoreLine(undefined)).toBeNull();
  });

  it("keeps advisor lines in glossary words and under 120 characters", () => {
    expect(whyLine("Mission: leadership score needs 114+, now 100.")).toBe("Mission: score needs 114+, now 100.");
    expect(whyLine("x ".repeat(100)).length).toBeLessThanOrEqual(120);
  });
});

// QA3R-5b: Map mode reset to Desk every month; QA3R-5f: the Map switch was hidden on phones;
// QA3R-5d: near misses on small island states did nothing. Browser guards: QA3R-5.mjs, QA3R-5d.mjs.
describe("Map mode is the player's choice, in reach on every width (QA3R-5b, 5d, 5f)", () => {
  it("a new month keeps the mode the player chose; only month 1 opens on the desk", () => {
    expect(monthDeskMode(3, "map")).toBe("map");
    expect(monthDeskMode(3, "desk")).toBe("desk");
    expect(monthDeskMode(0, "map")).toBe("desk");
    const src = readFileSync("ui/src/lib/month.ts", "utf8");
    const setup = src.slice(src.indexOf("export async function setupMonth"), src.indexOf("export function pendingApprovals"));
    expect(setup).not.toMatch(/deskMode: 'desk'/);
    expect(setup.match(/monthDeskMode\(/g)?.length).toBe(2);
  });

  it("no stylesheet hides the Map / Desk switch at phone widths", () => {
    for (const f of readdirSync("ui/src/styles").filter((x) => x.endsWith(".css"))) {
      const css = readFileSync(`ui/src/styles/${f}`, "utf8");
      expect(css, f).not.toMatch(/\.mode-seg\s*\{[^}]*display:\s*none/);
    }
  });

  it("a near miss picks the smallest country drawn within the tap slop", () => {
    const box = (x0: number, y0: number, x1: number, y1: number) => ({
      type: "Polygon",
      coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
    });
    expect(TAP_SLOP).toBeGreaterThanOrEqual(12);
    expect(pickNear([{ id: "CHN", geometry: box(73, 18, 135, 53) }, { id: "TWN", geometry: box(120, 22, 122, 25.3) }])).toBe("TWN");
    expect(pickNear([{ id: "PHL", geometry: { type: "MultiPolygon", coordinates: [box(117, 5, 126, 19).coordinates] } }])).toBe("PHL");
    expect(pickNear([])).toBeUndefined();
    expect(readFileSync("ui/src/components/MapView.tsx", "utf8")).toMatch(/pickNear\(/);
  });
});

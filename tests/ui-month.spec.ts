import { describe, expect, it, vi } from "vitest";

// The UI store reads window.location at import; a bare stand-in is enough for these pure helpers
vi.hoisted(() => {
  (globalThis as unknown as { window: unknown }).window ??= { location: { search: "" }, innerWidth: 1440 };
});
import { effectWords, goalName, missionTag, splitLede } from "../ui/src/lib/month.js";
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
  it("names a goal by its numbers when they say whose, else by its label", () => {
    expect(goalName(status[2])).toBe("stability 78%+");
    expect(goalName(status[3])).toBe("US relations 70+");
    expect(goalName(status[4])).toBe("Israel stays on side");
    expect(goalName(status[0])).toBe("The Houthis pushed off the coast");
  });

  it("gives at most one mission tag: breaks, then hurts, then helps, then a bonus", () => {
    const sanaa = impact({ helps: ["The Houthis pushed off the coast"], hurts: ["The kingdom holds its nerve"], links: [{ index: 0, effect: "helps", bonus: false }, { index: 2, effect: "hurts", bonus: false }] });
    expect(missionTag(sanaa, status)).toEqual({ tone: "risk", text: "Hurts: stability 78%+", more: 1 });
    const oman = impact({ helps: ["The kingdom holds its nerve"], links: [{ index: 2, effect: "helps", bonus: false }] });
    expect(missionTag(oman, status)?.text).toBe("Helps: stability 78%+");
    const invite = impact({ bonusHelps: ["Washington firmly behind you"], links: [{ index: 3, effect: "helps", bonus: true }] });
    expect(missionTag(invite, status)).toEqual({ tone: "bonus", text: "Helps: US relations 70+ (bonus)", more: 0 });
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

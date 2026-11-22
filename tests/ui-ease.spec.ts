import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BIG_MOVE_MIN,
  MAX_SUGGESTED,
  type PickCountry,
  bigMove,
  briefingGoals,
  effectPhrase,
  optionSizes,
  pickerGroups,
  relationWord,
  resultScene,
  searchCountries,
  simpleMonth,
} from "../ui/src/lib/ease";
import { alternateScene, optionKeyword, sceneForDecision } from "../ui/src/scenes/kinds";
import type { ConditionStatus } from "../ui/src/store/gameStore";

// Iteration 2, ease of play: F-01-1 (country picker), F-01-4 (less at once), F-01-6 (effect sizes,
// Big move), QA S3-1 (art follows the choice)

const ui = (p: string) => readFileSync(`ui/src/${p}`, "utf8");

const COUNTRIES: PickCountry[] = [
  { id: "IRN", name: "Iran", relation: -90, atWar: true, capital: [51.4, 35.7] },
  { id: "IRL", name: "Ireland", relation: 40, capital: [-6.3, 53.3] },
  { id: "IRQ", name: "Iraq", relation: -10, capital: [44.4, 33.3] },
  { id: "GBR", name: "United Kingdom", relation: 70, ally: true, capital: [-0.1, 51.5] },
  { id: "MEX", name: "Mexico", relation: 20, capital: [-99.1, 19.4] },
  { id: "CAN", name: "Canada", relation: 60, ally: true, capital: [-75.7, 45.4] },
  { id: "CHN", name: "China", relation: -45, capital: [116.4, 39.9] },
  { id: "ARE", name: "United Arab Emirates", relation: 75, capital: [54.4, 24.5] },
];

describe("F-01-1 country picker", () => {
  it("says the relation in words, never a bare number", () => {
    expect(relationWord(-62).word).toBe("Hostile");
    expect(relationWord(-20).word).toBe("Cool");
    expect(relationWord(0).word).toBe("Neutral");
    expect(relationWord(20).word).toBe("Warm");
    expect(relationWord(55).word).toBe("Friendly");
    expect(relationWord(-90, { atWar: true }).word).toBe("At war with you");
    expect(relationWord(70, { ally: true }).tone).toBe("ally");
  });

  it("lists the crisis, recent targets, wars, allies, rivals and neighbours first, the rest A to Z", () => {
    const g = pickerGroups(COUNTRIES, { crisis: ["ARE"], recent: ["MEX"], rivals: ["CHN"], home: [-77, 38.9] });
    expect(g.suggested[0]).toMatchObject({ id: "ARE", why: "In the crisis" });
    expect(g.suggested[1]).toMatchObject({ id: "MEX", why: "Recent" });
    expect(g.suggested.find((c) => c.id === "IRN")?.why).toBe("At war with you");
    expect(g.suggested.find((c) => c.id === "CHN")?.why).toBe("Rival");
    expect(g.suggested.length).toBeLessThanOrEqual(MAX_SUGGESTED);
    // Nobody twice, nobody lost
    const ids = [...g.suggested, ...g.rest].map((c) => c.id);
    expect(new Set(ids).size).toBe(COUNTRIES.length);
    expect(g.rest.map((c) => c.name)).toEqual([...g.rest.map((c) => c.name)].sort((a, b) => a.localeCompare(b)));
  });

  it("accepts typing: prefixes, codes and the names people use", () => {
    expect(searchCountries(COUNTRIES, "ira")[0].id).toBe("IRN");
    expect(searchCountries(COUNTRIES, "ira").map((c) => c.id)).toEqual(["IRN", "IRQ"]);
    expect(searchCountries(COUNTRIES, "uk")[0].id).toBe("GBR");
    expect(searchCountries(COUNTRIES, "uae")[0].id).toBe("ARE");
    expect(searchCountries(COUNTRIES, "arab")[0].id).toBe("ARE");
    expect(searchCountries(COUNTRIES, "zz")).toEqual([]);
  });

  it("is one component on every surface, and the native dropdown is gone (parity)", () => {
    expect(ui("components/orders/OrderCatalog.tsx")).toContain("<CountryPicker");
    expect(ui("components/orders/OrderCatalog.tsx")).not.toMatch(/<select/);
    expect(ui("components/desk/Detail.tsx")).not.toMatch(/aria-label="Target country"/);
    expect(ui("components/MapActionMenu.tsx")).toContain("<CountryPicker");
    expect(ui("components/CountryDetailPanel.tsx")).toContain("<CountryPicker");
    // no "(-62)" relation numbers in brackets next to a name
    expect(ui("components/orders/OrderCatalog.tsx")).not.toMatch(/\(\{Math\.round\(v\.relationWithPlayer\)\}\)/);
    // tap on the map picks the target
    expect(ui("components/MapView.tsx")).toMatch(/s\.mapPick && id !== s\.worldState\.playerCountryId/);
    // 44 px rows and trigger
    expect(ui("styles/picker.css")).toMatch(/\.cp-row \{[^}]*min-height: 48px/);
    expect(ui("styles/picker.css")).toMatch(/\.cp-trigger \{[^}]*min-height: 44px/);
  });
});

const goal = (label: string, state: ConditionStatus["state"], bonus = false): ConditionStatus => ({ label, met: state === "on_track", failed: state === "failed", bonus, state });

describe("F-01-4 less at once", () => {
  it("month 1 in Focus view hides advisors, budgets and meetings until asked", () => {
    expect(simpleMonth(0, "focus", false)).toBe(true);
    // world.turn counts months played: turn 1 is month 2, when the whole desk is back
    expect(simpleMonth(1, "focus", false)).toBe(false);
    expect(simpleMonth(0, "focus", true)).toBe(false);
    expect(simpleMonth(0, "full", false)).toBe(false);
  });

  it("the briefing shows at most three goals, the ones that need work first, the rest behind All goals", () => {
    const status = [
      goal("Iran never tests a bomb", "on_track"),
      goal("The shooting stops", "off_track"),
      goal("Approval of 56%+", "off_track"),
      goal("The Gulf still trusts you", "on_track"),
      goal("Israel stays on side", "close"),
      goal("Score of 111+", "off_track", true),
      goal("Stability of 60%+", "off_track", true),
    ];
    const b = briefingGoals(status);
    expect(b.shown).toHaveLength(3);
    expect(b.shown.map((c) => c.label)).toEqual(["The shooting stops", "Approval of 56%+", "Israel stays on side"]);
    expect(b.shown.every((c) => !c.bonus)).toBe(true);
    expect(b.hidden).toBe(4);
    expect(ui("components/BackstoryModal.tsx")).toContain("All goals");
  });

  it("the result card art follows what happened and never repeats last month's room", () => {
    // a warmer partner after talks: the summit, not the cabinet room again
    expect(resultScene("cabinet", { verdict: "good", relation: 8, family: "diplomacy" })).toBe("summit");
    // a front that moved: the troops
    expect(resultScene("parliament", { verdict: "neutral", front: 4 })).toBe("deployment");
    // the public turned: the streets
    expect(resultScene("press", { verdict: "bad", approval: -4, family: "domestic" })).toBe("streets");
    // a failure never celebrates
    expect(resultScene("summit", { verdict: "bad", failed: true })).toBe("press");
    // never the same picture two months running
    expect(resultScene("cabinet", { verdict: "neutral" }, "cabinet", alternateScene)).not.toBe("cabinet");
    // the result card and the paper share one choice
    expect(ui("scenes/ResultCard.tsx")).toContain("monthScene(");
    expect(ui("components/Chronicle.tsx")).toContain("monthScene(");
  });

  it("the result card keeps Next month in view (QA S3-5): the body scrolls inside one screen", () => {
    expect(ui("scenes/result.css")).toMatch(/\.result-card \{ grid-template-rows: minmax\(0, 1fr\); \}/);
    expect(ui("scenes/ResultCard.tsx")).toContain("data-result-more");
  });
});

describe("F-01-6 how much does it do, what do I spend it on", () => {
  it("phrases effect sizes as 'about +N', keeps ranges", () => {
    expect(effectPhrase({ target: "You", metric: "Approval", delta: "+3" })).toBe("Approval about +3");
    expect(effectPhrase({ target: "Iran", metric: "Relations", delta: "+5 to +7" })).toBe("Iran: Relations +5 to +7");
    expect(effectPhrase({ target: "Global", metric: "Tension", delta: "-2" })).toBe("Tension about -2");
  });

  it("gives crisis options their sizes, biggest first", () => {
    const lines = optionSizes({ effects: { approval: -3, "relations:IRN": 8 }, tensionDelta: -6 }, (id) => (id === "IRN" ? "Iran" : id));
    expect(lines[0]).toEqual({ text: "Iran's view of you about +8", tone: "up" });
    expect(lines).toContainEqual({ text: "Approval about -3", tone: "down" });
    expect(lines).toContainEqual({ text: "World tension about -6", tone: "up" });
  });

  it("offers a Big move only with 3+ unspent seals, spending them on the mission", () => {
    const c = [
      { key: "a", label: "Court Oman", cost: 1, helps: 1 },
      { key: "b", label: "Spy on Iran", cost: 2, helps: 1 },
      { key: "c", label: "Hard crackdown", cost: 2, helps: 1, risky: true },
      { key: "d", label: "National address", cost: 1, helps: 0 },
      { key: "e", label: "Mediate", cost: 2, helps: 2, queued: true },
    ];
    expect(bigMove(c, BIG_MOVE_MIN - 1)).toBeNull();
    const m = bigMove(c, 3);
    expect(m?.seals).toBe(3);
    expect(m?.picks.map((p) => p.key).sort()).toEqual(["a", "b"]);
    expect(bigMove(c, 6)?.picks.some((p) => p.risky || p.queued || p.helps === 0)).toBe(false);
    expect(bigMove([], 5)).toBeNull();
  });
});

describe("QA S3-1 art follows the choice", () => {
  it("a negated phrase is not the thing itself", () => {
    expect(optionKeyword("More escorts, no strikes")?.scene).not.toBe("airstrike");
    expect(sceneForDecision({ title: "The midterm clock", label: "More escorts, no strikes" })).toBe("deployment");
  });
  it("hitting a navy is a strike, not a meeting room", () => {
    expect(optionKeyword("Hit the IRGC navy now")?.scene).toBe("airstrike");
  });
});

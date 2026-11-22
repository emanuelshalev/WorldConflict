import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Learning aids (design-learn.md WP4-WP8, decision D-53): popover placement never covers the
 * action area, "In your game" lines come from the belief-filtered view, situation lookup.
 */

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", fakeStorage());
  vi.stubGlobal("window", { location: { search: "" } });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
});
afterEach(() => vi.unstubAllGlobals());

const load = () => import("../ui/src/components/learn/explain.js");
const loadLive = () => import("../ui/src/components/learn/liveLine.js");

type Rect = { left: number; top: number; right: number; bottom: number };
const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
  Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

describe("explainer popover placement (D-53: never over Execute or the option cards)", () => {
  const view = { w: 1440, h: 900 };
  const rail = { left: 1080, top: 130, right: 1440, bottom: 870 }; // command rail with Execute
  const cards = { left: 24, top: 485, right: 1040, bottom: 775 }; // option cards

  it("goes above the word when there is room", async () => {
    const { placePopover } = await load();
    const anchor = { left: 400, top: 420, right: 480, bottom: 442 };
    const p = placePopover(anchor, { w: 380, h: 220 }, view, [rail, cards]);
    const r = { left: p.left, top: p.top, right: p.left + 380, bottom: p.top + p.maxHeight };
    expect(r.bottom).toBeLessThanOrEqual(anchor.top);
    expect(overlaps(r, rail) || overlaps(r, cards) || overlaps(r, anchor)).toBe(false);
  });

  it("a tall card short of room scrolls instead of covering the cards, the rail or the word", async () => {
    const { placePopover } = await load();
    const anchor = { left: 52, top: 300, right: 137, bottom: 322 };
    const p = placePopover(anchor, { w: 380, h: 480 }, view, [rail, cards]);
    const r = { left: p.left, top: p.top, right: p.left + 380, bottom: p.top + p.maxHeight };
    expect(overlaps(r, rail)).toBe(false);
    expect(overlaps(r, cards)).toBe(false);
    expect(overlaps(r, anchor)).toBe(false);
    expect(p.maxHeight).toBeGreaterThanOrEqual(170);
    expect(r.left).toBeGreaterThanOrEqual(12);
    expect(r.right).toBeLessThanOrEqual(view.w - 12);
  });

  it("a word inside an option card opens beside or above the cards, not over them", async () => {
    const { placePopover } = await load();
    const anchor = { left: 730, top: 680, right: 830, bottom: 700 };
    const p = placePopover(anchor, { w: 380, h: 260 }, view, [rail, cards]);
    const r = { left: p.left, top: p.top, right: p.left + 380, bottom: p.top + p.maxHeight };
    expect(overlaps(r, rail)).toBe(false);
    expect(overlaps(r, anchor)).toBe(false);
  });
});

describe("In your game line (belief-filtered, never ground truth)", () => {
  const range = (low: number, high: number) => ({ estimate: (low + high) / 2, low, high, confidence: 50 });
  const leader = (name: string, sinceTurn = 0) => ({ name, title: "President", style: "HAWKISH", origin: "ELECTED", sinceTurn });
  const view = [
    { id: "UKR", name: "Ukraine", isPlayer: true, leader: leader("Volodymyr Zelensky"), atWarWith: ["RUS"], relationWithPlayer: 100, stability: range(50, 50) },
    { id: "RUS", name: "Russia", isPlayer: false, leader: leader("Vladimir Putin"), atWarWith: ["UKR"], relationWithPlayer: -80, stability: range(40, 70) },
    { id: "USA", name: "United States", isPlayer: false, leader: leader("Lee Brandt", 3), atWarWith: [], relationWithPlayer: 45, stability: range(55, 65) },
  ] as never[];
  const world = {
    date: "2027-03",
    turn: 4,
    playerCountryId: "UKR",
    // Ground truth Russia stability is 12: the line must show the estimate range, not this
    countries: [
      { id: "UKR", name: "Ukraine", stability: 50 },
      { id: "RUS", name: "Russia", stability: 12 },
      { id: "USA", name: "United States", stability: 60 },
    ],
    wars: [{ attackerId: "RUS", defenderId: "UKR", frontline: 48 }],
    hotspots: [],
  } as never;
  const entry = (over: Record<string, unknown>) =>
    ({ id: "x", kind: "place", name: "X", aliases: ["X"], avoid: [], obscurity: 2, short: "", related: [], valid: { from: "2000-01" }, sources: [], asOf: "2026-11-22", ...over }) as never;

  it("a foreign country shows relations and the intelligence range", async () => {
    const { liveLine } = await loadLive();
    const line = liveLine(entry({ id: "russia", name: "Russia", countryId: "RUS" }), world, view) ?? "";
    expect(line).toContain("At war with you");
    expect(line).toContain("40 to 70");
    expect(line).not.toContain("12");
  });

  it("a place inside the player's war shows the front from the player's side", async () => {
    const { liveLine } = await loadLive();
    const line = liveLine(entry({ id: "pokrovsk", name: "Pokrovsk", countryId: "UKR" }), world, view) ?? "";
    expect(line).toContain("front line 52 of 100");
    expect(line).toContain("you are close to stalemate");
  });

  it("a real leader who lost power in this game says so; a new one is fictional", async () => {
    const { liveLine, fictionalLeader, isFictionalLeader } = await loadLive();
    const line = liveLine(entry({ id: "donald-trump", kind: "person", name: "Donald Trump", countryId: "USA" }), world, view) ?? "";
    expect(line).toContain("No longer in power in your game");
    expect(isFictionalLeader(view[2] as never)).toBe(true);
    const f = fictionalLeader(world, view, "USA");
    expect(f?.line).toContain("Came to power in your game in Feb 2027 (election)");
  });

  it("role lines come from the game's leader data", async () => {
    const { roleLine, samePerson } = await loadLive();
    const v = [{ ...(view[0] as object), leader: { ...leader("Volodymyr Zelenskyy"), sinceDate: "2019-05" } }] as never[];
    expect(samePerson("Volodymyr Zelensky", "Volodymyr Zelenskyy")).toBe(true);
    expect(roleLine(entry({ kind: "person", name: "Volodymyr Zelensky", countryId: "UKR" }), v)).toBe("President of Ukraine since 2019");
  });
});

describe("situation lookup", () => {
  it("prefers the flashpoint's briefing, then the scenario's", async () => {
    const { situationFor } = await load();
    const s = (id: string) => ({ id }) as never;
    expect(situationFor([s("scenario-2026"), s("ceasefire-or-collapse")], "ceasefire-or-collapse", "2026")?.id).toBe("ceasefire-or-collapse");
    expect(situationFor([s("scenario-2026")], null, "2026")?.id).toBe("scenario-2026");
    expect(situationFor([s("scenario-2026")], "other-flashpoint", "2026")?.id).toBe("scenario-2026");
    expect(situationFor([], "x", "2026")).toBeNull();
  });
});

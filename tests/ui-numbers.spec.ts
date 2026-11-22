import { describe, expect, it, vi } from "vitest";

// The UI store reads window.location at import; a bare stand-in is enough for these pure helpers
vi.hoisted(() => {
  (globalThis as unknown as { window: unknown }).window ??= { location: { search: "" }, innerWidth: 1440 };
});
import { readFileSync } from "node:fs";
import { buildPages } from "../ui/src/lib/debrief.js";
import { factTone, fmtValue, isMonthStat, shareFacts, shownDelta, splitMonth } from "../ui/src/lib/numbers.js";
import { defaultSide } from "../ui/src/lib/sides.js";
import { cardData, kindRank, rankHeadline, rankLines } from "../ui/src/components/reveal/model.js";
import type { RevealPayload, TurnReport, WorldState } from "../ui/src/store/gameStore.js";

/**
 * F-01-3: every number the month shows comes from one source and is coloured by what it means for
 * the player. Marcus saw approval 74 → 71.1 on a card and 70 on the tile, and a tension jump from a
 * Pakistani test credited to "Court North Korea"; Dan saw "Demand full withdrawal" forecast tension
 * up and then read tension 74 → 73 under it; Sam saw a green bar next to a red chip (UAE 75 → 71).
 */

const world = { playerCountryId: "USA", globalTension: 47, countries: [] } as unknown as WorldState;

function report(over: Partial<TurnReport> = {}): TurnReport {
  return {
    turn: 5,
    orders: [],
    decisions: [],
    deltas: { approval: { before: 74, after: 70.4 } },
    causes: ["Pakistan tested a nuclear device: world tension jumped"],
    moments: [],
    relations: [],
    world: [],
    wars: [],
    tension: { before: 33, after: 47 },
    ...over,
  } as TurnReport;
}

describe("one source for the month's numbers", () => {
  it("colours by good or bad for the player, never by the bare sign", () => {
    // Sam: the UAE's view of you fell 75 to 71 (a rise is good): bad, bar and chip alike
    expect(factTone({ label: "The UAE's view of you", before: 75, after: 71, good: true })).toBe("bad");
    // QA: a drop in world tension is good even when the fact does not say so
    expect(factTone({ label: "World tension", before: 74, after: 70 })).toBe("good");
    expect(factTone({ label: "Global tension", before: 70, after: 74, good: false })).toBe("bad");
    expect(factTone({ label: "Approval", before: 50, after: 50.01 })).toBe("flat");
  });

  it("shows whole numbers, and changes that add up from the shown values", () => {
    expect(fmtValue(71.1)).toBe("71");
    expect(fmtValue(1.234, "%/yr")).toBe("1.2");
    expect(shownDelta(74, 70.4)).toBe(-4);
    expect(shownDelta(74, 71.1, undefined, true)).toBe(-2.9);
    const s = splitMonth(74, 70.4, -0.4);
    expect(s).toEqual({ total: -4, yours: -4, rest: 0 });
    const t = splitMonth(74, 70.4, -1.4);
    expect(t.yours + t.rest).toBe(t.total);
  });

  it("a card shows a move's share of a month stat, never a second 'after' value", () => {
    const facts = shareFacts([
      { label: "Approval", before: 74, after: 71.1, good: true },
      { label: "Global tension", before: 74, after: 75, good: false },
      { label: "North Korea's view of you", before: -85, after: -75, good: true },
    ]);
    expect(facts.map((f) => !!f.share)).toEqual([true, true, false]);
    expect(isMonthStat("World tension")).toBe(true);
  });

  it("the debrief never puts the month's tension under one order (Marcus, Dan)", () => {
    const r = report({
      highlight: { ref: "order", index: 0 },
      orders: [{ type: "DIPLOMACY_IMPROVE_RELATIONS", label: "Court North Korea", target: "PRK", ok: true, detail: "Carried out", facts: [{ label: "North Korea's view of you", before: -99, after: -94, good: true }] }],
      decisions: [{ title: "Secure line: President Zelensky", choice: "Demand a full withdrawal", kind: "CALL", withCountry: "UKR", attended: true, facts: [{ label: "Global tension", before: 74, after: 75, good: false }, { label: "Approval", before: 63, after: 63.5, good: true }] }],
    } as Partial<TurnReport>);
    const pages = buildPages(r, world);
    const cards = pages.flatMap((p) => p.cards);
    for (const c of cards)
      for (const f of c.facts) {
        // no card carries the month's 33 → 47
        if (/tension/i.test(f.label)) expect([f.before, f.after]).not.toEqual([33, 47]);
        if (isMonthStat(f.label)) expect(f.share).toBe(true);
      }
    const call = cards.find((c) => c.country === "UKR");
    const tension = call?.facts.find((f) => /tension/i.test(f.label));
    // the forecast said tension up; the card shows the call's own +1, as a share
    expect(tension && factTone(tension)).toBe("bad");
    expect(tension && shownDelta(tension.before, tension.after, tension.unit, true)).toBe(1);
  });

  it("a country card leads with the month's view and credits your move only with its own part (Dan, Poland)", () => {
    const r = report({
      orders: [{ type: "DIPLOMACY_IMPROVE_RELATIONS", label: "Court Poland", target: "POL", ok: true, detail: "Carried out", facts: [{ label: "Poland's view of you", before: -80, after: -78, good: true }] }],
      relations: [{ id: "POL", before: -80, after: -92 }],
    } as Partial<TurnReport>);
    const card = buildPages(r, world).flatMap((p) => p.cards).find((c) => c.country === "POL");
    expect(card?.facts[0]).toMatchObject({ before: -80, after: -92 });
    expect(card?.facts[0].label).toMatch(/this month$/);
    const mine = card?.facts.find((f) => f.share);
    expect(mine && factTone(mine)).toBe("good");
  });
});

describe("title screen side (Maya)", () => {
  const fp = { id: "ceasefire-or-collapse", playable: [{ countryId: "UKR" }, { countryId: "RUS" }, { countryId: "USA" }] };
  it("a new crisis selects its first side, not the side kept from the last crisis", () => {
    expect(defaultSide(fp, { flashpointId: "hormuz-convoy", countryId: "USA" })).toBe("UKR");
  });
  it("today's crisis selects today's side", () => {
    expect(defaultSide(fp, { flashpointId: "ceasefire-or-collapse", countryId: "RUS" })).toBe("RUS");
    expect(defaultSide(undefined, null)).toBe("");
  });
});

describe("reveal ranking and share card (Ruth, Noah)", () => {
  const payload = JSON.parse(readFileSync("tests/fixtures/reveal/payload-hormuz-usa.json", "utf-8")) as RevealPayload;
  it("one phrasing for the percentile: never 'better than 34%' beside 'top 66%'", () => {
    const r = { ...payload, ranking: { ...payload.ranking, percentile: 64 } };
    const lines = rankLines(r, []);
    expect(lines).toContain("Better than 64% of simulated leaders");
    expect(lines.join(" ")).not.toMatch(/top \d+%/i);
  });
  it("a failed run's card says what it missed", () => {
    const r: RevealPayload = { ...payload, verdict: { ...payload.verdict, victory: false, classification: "So Close", missedLine: "You missed Israel stays on side by 1 (60 of 61)." } };
    const card = cardData(r, [], null);
    expect(card.subtitle).toContain("So Close");
    expect(card.subtitle).toContain("missed Israel stays on side by 1");
  });
});

describe("reveal leads with the outcome, the percentile is kind (F-02-1, Olivia)", () => {
  const payload = JSON.parse(readFileSync("tests/fixtures/reveal/payload-hormuz-usa.json", "utf-8")) as RevealPayload;
  const bench = { smart: { n: 30 }, random: { n: 30 }, none: { n: 30 } } as unknown as RevealPayload["ranking"]["benchmarks"];
  // Olivia's ending: Mission Complete, then "Better than 9% of simulated competent leaders" as the headline
  const won: RevealPayload = {
    ...payload,
    verdict: { ...payload.verdict, victory: true, label: "MISSION COMPLETE" },
    ranking: { ...payload.ranking, percentile: 9, percentileLabel: "better than 9% of simulated competent leaders", benchmarks: bench },
  };
  it("the ranking headline of a win leads with the outcome and achievements, never the percentile", () => {
    const h = rankHeadline(won, []);
    expect(h.startsWith("Mission complete")).toBe(true);
    expect(h).not.toMatch(/\d+%/);
    expect(h).toContain("Your first run: a ladder of 90 runs to climb");
  });
  it("a first run reads as a ladder to climb; a low percentile stays off the share card", () => {
    expect(kindRank(won, [])).toBe("Your first run: a ladder of 90 runs to climb");
    const lines = rankLines(won, []);
    expect(lines[0]).toBe("Your first run: a ladder of 90 runs to climb");
    expect(lines.join(" ")).not.toMatch(/9%/);
    expect(cardData(won, [], null).rankLines[0]).toBe("Your first run: a ladder of 90 runs to climb");
  });
  it("later runs name the place among your own runs", () => {
    const run = (saveId: string, presidencyScore: number) => ({ ...won.run, saveId, presidencyScore });
    expect(kindRank(won, [run("a", 999), run("b", 1)])).toBe("#2 of your 3 runs on this seat");
    expect(kindRank(won, [run("a", 1)])).toBe("Your best of 2 runs on this seat");
  });
});


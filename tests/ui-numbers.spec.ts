import { describe, expect, it, vi } from "vitest";

// The UI store reads window.location at import; a bare stand-in is enough for these pure helpers
vi.hoisted(() => {
  (globalThis as unknown as { window: unknown }).window ??= { location: { search: "" }, innerWidth: 1440 };
});
import { readFileSync } from "node:fs";
import { buildPages } from "../ui/src/lib/debrief.js";
import { factTone, fmtValue, isMonthStat, shareFacts, shownDelta, splitMonth } from "../ui/src/lib/numbers.js";
import { defaultSide } from "../ui/src/lib/sides.js";
import { missionSummary } from "../ui/src/lib/goals.js";
import { cardData, endScene, kindRank, rankHeadline, rankLines } from "../ui/src/components/reveal/model.js";
import { countText } from "../ui/src/lib/useCountUp.js";
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


// QA3R-2a (F-01-3): "Your view of Iran -75 to -68" on the card while the month ended at -89 and
// the mission strip said -75 to -89. Your own view is what relation goals measure: the month
// total leads, the order's own effect follows as its share. QA3R-2e: the Mission sheet said
// "0 of 0 on track" in a Term; the desk and the sheet share one summary.
describe("your own view of a country and the mission summary (QA3R-2a, 2e)", () => {
  it("a country card leads with your view over the month when your order moved it (Marcus, Iran)", () => {
    const r = report({
      orders: [{ type: "DIPLOMACY_IMPROVE_RELATIONS", label: "Court Iran", target: "IRN", ok: true, detail: "Carried out", facts: [{ label: "Your view of Iran", before: -75, after: -68, good: true }] }],
      yourView: [{ id: "IRN", before: -75, after: -89 }],
    } as Partial<TurnReport>);
    const card = buildPages(r, world).flatMap((p) => p.cards).find((c) => c.country === "IRN");
    expect(card?.facts[0]).toMatchObject({ before: -75, after: -89 });
    expect(card?.facts[0].label).toMatch(/^Your view of .* this month$/);
    const own = card?.facts.find((f) => f.share);
    expect(own).toMatchObject({ before: -75, after: -68, share: true });
  });

  it("with both views, both month totals come before the order's shares", () => {
    const r = report({
      orders: [{ type: "DIPLOMACY_IMPROVE_RELATIONS", label: "Court Iran", target: "IRN", ok: true, detail: "Carried out", facts: [{ label: "Your view of Iran", before: -75, after: -68, good: true }, { label: "Iran's view of you", before: -80, after: -76, good: true }] }],
      relations: [{ id: "IRN", before: -80, after: -90 }],
      yourView: [{ id: "IRN", before: -75, after: -89 }],
    } as Partial<TurnReport>);
    const card = buildPages(r, world).flatMap((p) => p.cards).find((c) => c.country === "IRN");
    const firstShare = card!.facts.findIndex((f) => f.share);
    const totals = card!.facts.filter((f) => /this month$/.test(f.label));
    expect(totals.length).toBe(2);
    expect(firstShare === -1 || firstShare >= 2).toBe(true);
  });

  it("the mission summary never says 0 of 0, on the desk and the Mission sheet", () => {
    expect(missionSummary([], 3, 48)).toBe("Month 4 of 48");
    expect(missionSummary([], 3, 48)).not.toMatch(/0 of 0/);
    const bonusOnly = [{ label: "Score 115+", met: false, bonus: true } as never];
    expect(missionSummary(bonusOnly, 0, 48)).toBe("Month 1 of 48");
    // Every mount point uses the shared summary, none builds its own "of N on track"
    for (const f of ["ui/src/components/Drawers.tsx", "ui/src/components/desk/GoalLine.tsx"]) {
      const src = readFileSync(f, "utf-8");
      expect(src, f).toContain("missionSummary(");
      expect(src, f).not.toMatch(/\{onTrack\} of \{/);
    }
  });
});

// QA3R-3g: "377 seats, majority won" closed a China flashpoint (TERM_COMPLETED mapped to the
// election scene). QA3R-2i: the Presidency Score painted 0 for 1.3 s before counting.
describe("closing scene and score count (QA3R-3g, 2i)", () => {
  const REASONS = ["TERM_COMPLETED", "OBJECTIVE_FAILED", "LOST_ELECTION", "DEPOSED_COUP", "IMPEACHED", "REVOLUTION"];
  it("a flashpoint end or a one-party regime never closes on the election scene", () => {
    for (const reason of REASONS)
      for (const lost of [false, true]) {
        expect(endScene(reason, { flashpointId: "scarborough-line", regime: "COMMUNIST" }, lost), reason).not.toBe("election");
        expect(endScene(reason, { flashpointId: "ceasefire-or-collapse", regime: "DEMOCRACY" }, lost), reason).not.toBe("election");
        for (const regime of ["COMMUNIST", "AUTOCRACY", "MONARCHY", "THEOCRACY", "MILITARY_JUNTA"])
          expect(endScene(reason, { flashpointId: null, regime }, lost), `${reason} ${regime}`).not.toBe("election");
      }
    // A democracy's Term still ends at the ballot box
    expect(endScene("TERM_COMPLETED", { flashpointId: null, regime: "DEMOCRACY" }, false)).toBe("election");
    // Both mount points ask endScene
    for (const f of ["ui/src/components/reveal/stages.tsx", "ui/src/components/EndScreen.tsx"]) {
      const src = readFileSync(f, "utf-8");
      expect(src, f).toContain("endScene(");
      expect(src, f).not.toMatch(/END_SCENE\[/);
    }
  });

  it("the verdict score is never painted 0 while it waits to count", () => {
    expect(countText(562, 0)).not.toBe("0");
    expect(countText(562, 0.2)).toBe("1");
    expect(countText(562, 300.4)).toBe("300");
    expect(countText(562, 562)).toBe("562");
    expect(countText(0, 0)).toBe("0");
    expect(readFileSync("ui/src/components/reveal/stages.tsx", "utf-8")).toMatch(/countText\(p\.total, useCountUp\(/);
  });
});

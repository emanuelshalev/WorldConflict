import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { politicalCapitalIncome } from "../../src/core/costs.js";
import { createDataLoader, monthsUntil } from "../../src/core/data-loader.js";
import { previewAction } from "../../src/core/preview.js";
import { classifyLeadership } from "../../src/core/scoring.js";
import { SeededRandom } from "../../src/core/seed.js";
import {
  ceasefireChance,
  denounceApprovalDelta,
  proposeCeasefire,
  TERMS_COST,
  TERMS_GAIN,
  targetAdvantage,
} from "../../src/core/systems/diplomacy.js";
import { generateLeaderName, runGovernmentDynamics } from "../../src/core/systems/government.js";
import { autoBudgetResponse, threatCeiling } from "../../src/core/systems/economy.js";
import { applyBorderTensions } from "../../src/core/systems/military.js";
import { possessive } from "../../src/core/text.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const engine = new TurnEngine();
const get = (w: WorldState, id: string) => {
  const c = w.countries.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("Denunciations", () => {
  const w = loader.newGame({ scenarioId: "2026", playerCountryId: "TWN", seed: 3, mode: "TERM" });
  const twn = get(w, "TWN");

  it("rallies the public against an adversary, less each time", () => {
    const chn = get(w, "CHN");
    expect(denounceApprovalDelta(twn, chn, 0)).toBe(2);
    expect(denounceApprovalDelta(twn, chn, 1)).toBe(1);
    expect(denounceApprovalDelta(twn, chn, 3)).toBeLessThan(0.5);
  });

  it("costs approval when the target is a partner, and nothing for a bystander", () => {
    const partner = w.countries.find(
      (c) => c.id !== "TWN" && (twn.relations[c.id] ?? 0) >= 25,
    );
    const bystander = w.countries.find(
      (c) =>
        c.id !== "TWN" &&
        Math.abs(twn.relations[c.id] ?? 0) < 20 &&
        !twn.history.historicalRivals.includes(c.id) &&
        !twn.alliances.includes(c.id),
    );
    if (!partner || !bystander) throw new Error("fixture");
    expect(denounceApprovalDelta(twn, partner, 0)).toBe(-2);
    expect(denounceApprovalDelta(twn, bystander, 0)).toBe(0);
  });

  it("is no longer a free monthly approval pump", () => {
    const run = (denounce: boolean) => {
      let s = w;
      for (let t = 0; t < 6; t++) {
        s = engine.executeTurn(
          s,
          denounce ? [{ type: "DIPLOMACY_DENOUNCE", targetCountryId: "CHN" }] : [],
          generateDeterministicIntents(s),
        ).newState;
        if (denounce) {
          const order = s.turnReport?.orders.find((o) => o.label.startsWith("Denounce"));
          expect(order?.detail).toMatch(/approval/i);
        }
      }
      return s;
    };
    const loud = run(true);
    const quiet = run(false);
    expect(loud.director.denounceTurns.length).toBeGreaterThan(0);
    // The old rule was +2 every month: 12 points over six months.
    expect(get(loud, "TWN").approval - get(quiet, "TWN").approval).toBeLessThan(6);
  });

  it("previews the same approval effect the engine applies", () => {
    const p = previewAction(w, { type: "DIPLOMACY_DENOUNCE", targetCountryId: "CHN" });
    const mood = p.effects.find((e) => e.metric === "Approval");
    expect(mood?.delta).toBe("+2");
  });
});

describe("Iran's recovery path", () => {
  it("lets a spy hunt foil most foreign operations for three months", () => {
    let foiled = 0;
    let attempts = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let s = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed, mode: "TERM" });
      s = engine.executeTurn(s, [{ type: "INTEL_COUNTER_INTEL" }], generateDeterministicIntents(s)).newState;
      expect(s.director.counterIntelUntil).toBe(s.turn + 1);
      for (let t = 0; t < 2 && !s.gameOver; t++) {
        const intents = generateDeterministicIntents(s);
        attempts += intents
          .flatMap((i) => i.actions)
          .filter((a) => a.targetCountryId === "IRN" && a.type.startsWith("INTEL_")).length;
        s = engine.executeTurn(s, [], intents).newState;
        const cause = s.turnReport?.causes.find((c) => c.startsWith("Counter-intelligence rolled up"));
        const m = cause?.match(/up (an operation|(\d+) operations)/);
        if (m) foiled += m[2] ? Number(m[2]) : 1;
      }
    }
    expect(attempts).toBeGreaterThan(0);
    expect(foiled / attempts).toBeGreaterThan(0.35);
  });

  it("previews the shield", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const p = previewAction(w, { type: "INTEL_COUNTER_INTEL" });
    expect(p.effects.some((e) => e.metric === "Foreign operations")).toBe(true);
  });

  it("lets a clearly losing side sue for peace on the winner's terms", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const iran = get(w, "IRN");
    const usa = get(w, "USA");
    const war = { attackerId: "USA", frontline: 70, exhaustion: 45 };
    const onTerms = ceasefireChance(war, iran, usa);
    const ahead = ceasefireChance({ ...war, frontline: 60 }, iran, usa);
    expect(onTerms).toBeGreaterThan(ahead * 2);
    expect(targetAdvantage(war, iran)).toBe(70);
    const p = previewAction(
      { ...w, wars: w.wars.map((x) => (x.attackerId === "USA" && x.defenderId === "IRN" ? { ...x, frontline: 70 } : x)) },
      { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "USA" },
    );
    expect(p.summary).toMatch(/terms/);
    expect(p.effects.find((e) => e.metric === "Legitimacy")?.delta).toBe(`-${TERMS_COST.legitimacy}`);
  });

  it("treats Iran's wartime contraction as a shock, not its structural trend", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const iran = get(w, "IRN");
    expect(iran.growthRate).toBeLessThan(0);
    expect(iran.trendGrowth).toBeGreaterThan(0);
    // Countries without an explicit trend keep their override as the trend
    const deu = get(w, "DEU");
    expect(deu.trendGrowth).toBe(deu.growthRate);
  });
});

describe("Text and data fixes", () => {
  it("writes possessives that read naturally", () => {
    expect(possessive("United States")).toBe("United States'");
    expect(possessive("Iran")).toBe("Iran's");
  });

  it("never gives a successor the outgoing leader's surname", () => {
    for (let seed = 1; seed < 60; seed++) {
      const name = generateLeaderName("SDN", new SeededRandom(seed), "Abdel Fattah al-Burhan");
      expect(name.split(" ")).not.toContain("al-Burhan");
    }
  });

  it("dates the 2026 elections from the real calendar", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "PAK", seed: 1, mode: "LEGACY" });
    expect(get(w, "PAK").politicalSystem.nextElectionTurn).toBe(27); // February 2029
    expect(get(w, "USA").politicalSystem.nextElectionTurn).toBe(24); // November 2028
    expect(monthsUntil(2026, 11, "2026-06", 60)).toBe(55); // already held: next cycle
  });

  it("never scripts the player's own missile launches", () => {
    let s = loader.newGame({ scenarioId: "2026", playerCountryId: "PRK", seed: 2, mode: "LEGACY" });
    for (let t = 0; t < 24 && !s.gameOver; t++) {
      s = engine.executeTurn(s, [], generateDeterministicIntents(s)).newState;
      expect(s.timeline.some((e) => e.description.includes("North Korea fires missiles"))).toBe(false);
    }
  });
});

describe("World tension", () => {
  it("does not let standing garrisons add more than 1.5 tension a month", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "TWN", seed: 1, mode: "TERM" });
    const standing = w.countries.reduce(
      (n, c) => n + c.borderDeployments.filter((d) => !c.atWarWith.includes(d.targetCountryId)).length,
      0,
    );
    expect(standing).toBeGreaterThan(10); // the old rule added 0.5 for each one
    const before = w.globalTension;
    applyBorderTensions(w);
    expect(w.globalTension - before).toBeLessThanOrEqual(1.5);
  });

  it("keeps the 2026 world's tension out of the red most of the time", () => {
    let s = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 7, mode: "TERM" });
    const months: number[] = [];
    for (let t = 0; t < 24 && !s.gameOver; t++) {
      s = engine.executeTurn(s, [], generateDeterministicIntents(s)).newState;
      months.push(s.globalTension);
    }
    const hot = months.filter((t) => t >= 80).length / months.length;
    expect(hot).toBeLessThanOrEqual(0.2);
  });

  it("gives the side that dictates a peace some credit at home", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const war = w.wars.find((x) => x.attackerId === "USA" && x.defenderId === "IRN");
    if (!war) throw new Error("fixture");
    war.frontline = 90; // the US has what it wanted
    war.exhaustion = 100;
    const iran = get(w, "IRN");
    const usa = get(w, "USA");
    const [ia, ua] = [iran.approval, usa.approval];
    let accepted = false;
    for (let seed = 1; seed < 40 && !accepted; seed++)
      accepted = proposeCeasefire(w, iran, usa, new SeededRandom(seed));
    expect(accepted).toBe(true);
    expect(iran.approval).toBe(ia - TERMS_COST.approval);
    expect(usa.approval).toBe(Math.min(100, ua + TERMS_GAIN.approval));
  });
});

describe("Elections", () => {
  it("makes a government that served a full term pay a 'time for a change' price", () => {
    const fresh = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 5, mode: "TERM" });
    const tired = structuredClone(fresh);
    for (const w of [fresh, tired]) {
      const deu = get(w, "DEU");
      deu.approval = 49; // just over the line before fatigue
      deu.growthRate = deu.trendGrowth ?? 0.01; // neutral economic mood
      deu.atWarWith = [];
      w.turn = 40;
      deu.politicalSystem.nextElectionTurn = 40;
    }
    get(fresh, "DEU").leader.sinceTurn = 30;
    get(tired, "DEU").leader.sinceTurn = 0;
    let freshLosses = 0;
    let tiredLosses = 0;
    for (let seed = 0; seed < 40; seed++) {
      const a = structuredClone(fresh);
      const b = structuredClone(tired);
      if (runGovernmentDynamics(a, new SeededRandom(seed)).changes.some((c) => c.kind === "ELECTION" && c.countryId === "DEU")) freshLosses++;
      if (runGovernmentDynamics(b, new SeededRandom(seed)).changes.some((c) => c.kind === "ELECTION" && c.countryId === "DEU")) tiredLosses++;
    }
    expect(tiredLosses).toBeGreaterThan(freshLosses);
  });
});

describe("Verdicts", () => {
  it("calls a player who honored a pact a loyal ally, not a warmonger", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "TWN", seed: 1, mode: "TERM" });
    w.director.record = { "DIPLOMACY_DECLARE_WAR:ally": 1, DOMESTIC_REFORM: 3 };
    w.timeline.push({ turn: 3, date: w.date, category: "WAR", description: "WAR: Taiwan attacks North Korea" });
    expect(classifyLeadership(w).classification).toBe("Loyal Ally");
    w.director.record.DIPLOMACY_DECLARE_WAR = 1;
    expect(classifyLeadership(w).classification).toBe("Warmonger");
  });
});

describe("Release-candidate fixes", () => {
  it("never reuses a multi-word surname", () => {
    for (let seed = 1; seed < 200; seed++) {
      expect(generateLeaderName("ZAF", new SeededRandom(seed), "Pieter van Wyk")).not.toMatch(/van Wyk/);
    }
  });

  it("previews two denunciations in one month the way the engine applies them", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    const next = engine.executeTurn(
      w,
      [
        { type: "DIPLOMACY_DENOUNCE", targetCountryId: "IRN" },
        { type: "DIPLOMACY_DENOUNCE", targetCountryId: "PRK" },
      ],
      generateDeterministicIntents(w),
    ).newState;
    const details = (next.turnReport?.orders ?? []).filter((o) => o.label.startsWith("Denounce")).map((o) => o.detail);
    // Only the first denunciation of the month moves voters
    expect(details).toEqual(["Approval +2: the public enjoys strength", "No effect on approval"]);
    expect(next.director.denounceTurns).toEqual([w.turn]);
  });

  it("makes political capital scarce: a calm month brings 2", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 1, mode: "TERM" });
    const deu = get(w, "DEU");
    deu.approval = 50;
    deu.legitimacy = 60;
    expect(politicalCapitalIncome(w, deu)).toBe(2);
  });

  it("caps threat-driven defence spending relative to the peacetime budget", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 1, mode: "TERM" });
    const deu = get(w, "DEU");
    const base = deu.baseMilitaryBudget ?? 0;
    expect(base).toBeGreaterThan(2);
    for (let t = 0; t < 60; t++) autoBudgetResponse(w);
    expect(deu.militaryBudgetPercent).toBeLessThanOrEqual(threatCeiling(deu) + 1e-9);
    expect(threatCeiling(deu)).toBeLessThan(6);
  });

  it("does not fire oil shocks every few months for a war that started years ago", () => {
    let s = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 3, mode: "TERM" });
    let shocks = 0;
    for (let t = 0; t < 36 && !s.gameOver; t++) {
      s = engine.executeTurn(s, [], generateDeterministicIntents(s)).newState;
      if (s.eventQueue.some((e) => e.title.startsWith("OIL SHOCK")) || s.newspaper.some((n) => n.headline.includes("OIL SHOCK"))) shocks++;
    }
    expect(shocks).toBeLessThanOrEqual(3); // the old rule fired 5 times on this seed
  });
});

describe("Exploit guards (persona round 3)", () => {
  it("rejects a duplicate order and caps orders per month", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    w.politicalCapital = 99;
    const spam = Array.from({ length: 20 }, () => ({ type: "DIPLOMACY_DENOUNCE" as const, targetCountryId: "USA" }));
    const next = engine.executeTurn(w, spam, generateDeterministicIntents(w)).newState;
    const orders = next.turnReport?.orders ?? [];
    expect(orders.filter((o) => o.ok)).toHaveLength(1);
    expect(orders.filter((o) => o.detail === "Already ordered this month")).toHaveLength(19);
    expect(get(next, "IRN").approval - get(w, "IRN").approval).toBeLessThan(10);

    const many = ["USA", "ISR", "SAU", "ARE", "GBR", "FRA", "DEU", "JPN"].map((id) => ({
      type: "DIPLOMACY_DENOUNCE" as const,
      targetCountryId: id,
    }));
    const capped = engine.executeTurn(w, many, generateDeterministicIntents(w)).newState;
    expect((capped.turnReport?.orders ?? []).filter((o) => o.detail.startsWith("At most"))).toHaveLength(2);
  });

  it("rejects a negative or absurd weapons purchase instead of minting GDP", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "PRK", seed: 1, mode: "LEGACY" });
    const gdp = get(w, "PRK").gdp;
    const next = engine.executeTurn(w, [{ type: "MILITARY_PROCURE", value: -500000 }], []).newState;
    expect(get(next, "PRK").gdp).toBeLessThan(gdp * 1.1);
    expect(get(next, "PRK").airpower).toBeGreaterThanOrEqual(0);
  });

  it("puts AI pact offers on the player's desk instead of signing them", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "BRA", seed: 1, mode: "TERM" });
    const usa = get(w, "USA");
    usa.relations.BRA = 80;
    get(w, "BRA").relations.USA = 60;
    const next = engine.executeTurn(w, [], [
      { countryId: "USA", actions: [{ type: "DIPLOMACY_PROPOSE_ALLIANCE", targetCountryId: "BRA" }], reasoning: "" },
    ]).newState;
    expect(get(next, "BRA").alliances).not.toContain("USA");
    expect(next.pendingDecisions.some((d) => d.templateId === "pact_offer")).toBe(true);
  });
});

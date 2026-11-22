import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { actionRules } from "../../src/core/availability.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { anachronismsIn, opposingCamps, worldYear } from "../../src/core/era.js";
import { type DecisionChoice, TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

/**
 * F-01-7 (Marcus, 1990 Legacy): "Ukraine and Denmark sign military pact" in a world where
 * Ukraine was a Soviet republic. Over 24 simulated months of the 1960 and 1990 scenarios no
 * world event, crisis, meeting, AI order or pact may involve a country that is not a state
 * at the date, no AI pact may cross the Cold War camps, and no story may name an institution
 * or concept the era did not have.
 */
const loader = createDataLoader();

interface Leak {
  turn: number;
  where: string;
  what: string;
}

function simulate(scenario: string, player: string, seed: number, months: number): Leak[] {
  let world: WorldState = loader.initializeWorldState(scenario, player, seed);
  const leaks: Leak[] = [];
  const engine = new TurnEngine();
  const pairs0 = new Set(
    world.countries.flatMap((c) => c.alliances.map((a) => [c.id, a].sort().join("|"))),
  );
  const isAbsent = (id: string | undefined, w: WorldState) =>
    !!id && id !== w.playerCountryId && !!w.countries.find((c) => c.id === id)?.eraStatus;
  const check = (w: WorldState, where: string, ids: string[], text: string) => {
    for (const id of ids)
      if (isAbsent(id, w)) leaks.push({ turn: w.turn, where, what: `${id}: ${text.slice(0, 90)}` });
    for (const a of anachronismsIn(text, worldYear(w)))
      leaks.push({ turn: w.turn, where, what: `${a}: ${text.slice(0, 90)}` });
  };
  for (let i = 0; i < months; i++) {
    const intents = generateDeterministicIntents(world);
    for (const intent of intents) {
      if (isAbsent(intent.countryId, world) && intent.actions.length)
        leaks.push({ turn: world.turn, where: "ai-actor", what: intent.countryId });
      for (const a of intent.actions)
        if (isAbsent(a.targetCountryId, world))
          leaks.push({
            turn: world.turn,
            where: "ai-target",
            what: `${intent.countryId} ${a.type} ${a.targetCountryId}`,
          });
    }
    // Answer every crisis and meeting with its first option, so their consequences run too
    const choices: DecisionChoice[] = [...world.pendingDecisions, ...world.agenda].map((d) => ({
      decisionId: d.id,
      optionId: d.options[0]?.id ?? "",
    }));
    const res = engine.executeTurn(world, [{ type: "DOMESTIC_PROPAGANDA" }], intents, choices);
    const w = res.newState;
    // Hot-zone stories (hotspots.ts) are about the territory itself: Gaza and the West Bank
    // are not states in any era, and their people are named on purpose
    const hotPeople = new Set(w.hotspots.map((h) => h.people));
    const hotTitles = new Set(res.events.filter((e) => e.id.startsWith("evt_hot_")).map((e) => e.title));
    const ids = (list: string[], hot: boolean) => (hot ? list.filter((id) => !hotPeople.has(id)) : list);
    for (const e of res.events)
      check(w, `event:${e.id}`, ids(e.affectedCountries, e.id.startsWith("evt_hot_")), `${e.title} ${e.description}`);
    for (const n of res.newspaper)
      check(w, "newspaper", ids(n.relatedCountries, hotTitles.has(n.headline)), `${n.headline} ${n.description}`);
    for (const d of w.pendingDecisions)
      check(w, `crisis:${d.templateId}`, d.affectedCountries, `${d.title} ${d.situation} ${d.options.map((o) => `${o.label} ${o.description}`).join(" ")}`);
    for (const m of w.agenda)
      check(w, `meeting:${m.templateId}`, [...m.affectedCountries, ...(m.withCountry ? [m.withCountry] : [])], `${m.title} ${m.situation}`);
    for (const c of w.countries)
      for (const a of c.alliances) {
        const key = [c.id, a].sort().join("|");
        if (pairs0.has(key)) continue;
        if (isAbsent(c.id, w) || isAbsent(a, w))
          leaks.push({ turn: w.turn, where: "pact", what: key });
        if (opposingCamps(w, c.id, a) && c.id !== w.playerCountryId && a !== w.playerCountryId)
          leaks.push({ turn: w.turn, where: "pact-across-camps", what: key });
      }
    world = w;
    if (world.gameOver) break;
  }
  return leaks;
}

describe("Era filter (F-01-7)", () => {
  it("marks the non-states of each era and drops their pacts", () => {
    const w60 = loader.initializeWorldState("1960", "USA", 1);
    const marked = w60.countries.filter((c) => c.eraStatus).map((c) => c.id);
    expect(marked).toEqual(expect.arrayContaining(["UKR", "BLR", "SYR", "ARE", "PSX", "NGA"]));
    expect(w60.countries.find((c) => c.id === "NGA")?.eraUntil).toBe("1960-10");
    const w90 = loader.initializeWorldState("1990", "USA", 1);
    expect(w90.countries.filter((c) => c.eraStatus).map((c) => c.id).sort()).toEqual([
      "BLR",
      "PSX",
      "UKR",
    ]);
    for (const c of w90.countries) if (c.eraStatus) expect(c.alliances).toEqual([]);
    expect(w90.blocs.some((b) => b.id === "WARSAW")).toBe(true);
  });

  it("the player cannot order a non-state about, nor pact across the bloc line", () => {
    const w = loader.initializeWorldState("1990", "USA", 1);
    const usa = w.countries.find((c) => c.id === "USA");
    if (!usa) throw new Error("no USA");
    const ukr = actionRules(w, usa, { type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: "UKR" });
    expect(ukr?.code).toBe("NOT_A_STATE");
    expect(ukr?.reason).toMatch(/not a sovereign state in 1990/);
    const pol = actionRules(w, usa, { type: "DIPLOMACY_PROPOSE_ALLIANCE", targetCountryId: "POL" });
    expect(pol?.code).toBe("PACT_REFUSED");
    const res = new TurnEngine().executeTurn(w, [{ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: "UKR" }], []);
    expect(res.newState.turnReport?.orders[0]).toMatchObject({ ok: false, code: "NOT_A_STATE" });
  });

  it("the 2026 world marks only the West Bank", () => {
    const w = loader.initializeWorldState("2026", "USA", 1);
    expect(w.countries.filter((c) => c.eraStatus).map((c) => c.id)).toEqual(["PSX"]);
  });

  it("Nigeria becomes a state in October 1960", () => {
    let world = loader.initializeWorldState("1960", "USA", 5);
    const engine = new TurnEngine();
    const seen: string[] = [];
    for (let i = 0; i < 11; i++) {
      const res = engine.executeTurn(world, [], generateDeterministicIntents(world));
      seen.push(...res.events.map((e) => e.title));
      world = res.newState;
    }
    expect(world.countries.find((c) => c.id === "NGA")?.eraStatus).toBeUndefined();
    expect(seen.some((t) => /Nigeria.*independent/.test(t))).toBe(true);
  });

  for (const scenario of ["1960", "1990"])
    for (const player of ["USA", "RUS", "DEU"])
      it(`${scenario} as ${player}: 24 months with no non-state, cross-camp pact or anachronism`, () => {
        const leaks = [1, 2].flatMap((seed) => simulate(scenario, player, seed, 24));
        expect(leaks).toEqual([]);
      }, 60_000);
});

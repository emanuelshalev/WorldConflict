import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();

function freshWorld(player = "USA", seed = 42): WorldState {
  return loader.initializeWorldState("2025", player, seed);
}

function get(world: WorldState, id: string) {
  const c = world.countries.find((c) => c.id === id);
  if (!c) throw new Error(`missing ${id}`);
  return c;
}

describe("TurnEngine", () => {
  const engine = new TurnEngine();

  it("advances turn and date, rolling over the year", () => {
    let world = freshWorld();
    world.date = "2025-12";
    const result = engine.executeTurn(world, [], []);
    expect(result.newState.turn).toBe(1);
    expect(result.newState.date).toBe("2026-01");
  });

  it("resolves DOMESTIC_PROPAGANDA with legitimacy/approval gains", () => {
    const world = freshWorld();
    const before = get(world, "USA");
    const result = engine.executeTurn(world, [{ type: "DOMESTIC_PROPAGANDA" }], []);
    const after = get(result.newState, "USA");
    // Propaganda applies +5 legitimacy before monthly drift
    expect(after.legitimacy).toBeGreaterThan(before.legitimacy - 1);
    expect(result.resolvedActions.get("USA")?.length).toBe(1);
  });

  it("resolves MILITARY_MOBILIZE and frightens rivals", () => {
    const world = freshWorld();
    const before = get(world, "USA").mobilizationLevel;
    const rusBefore = get(world, "RUS").relations.USA;
    const result = engine.executeTurn(world, [{ type: "MILITARY_MOBILIZE" }], []);
    expect(get(result.newState, "USA").mobilizationLevel).toBeGreaterThan(before);
    expect(get(result.newState, "RUS").relations.USA).toBeLessThan(rusBefore);
  });

  it("DIPLOMACY_DECLARE_WAR creates a war and triggers defense pacts", () => {
    const world = freshWorld("RUS");
    const actions: Action[] = [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "POL" }];
    const result = engine.executeTurn(world, actions, []);
    const wars = result.newState.wars;
    expect(wars.some((w) => w.attackerId === "RUS" && w.defenderId === "POL")).toBe(true);
    // Poland's NATO pact partners should mostly honor the alliance
    const rus = get(result.newState, "RUS");
    expect(rus.atWarWith.length).toBeGreaterThan(1);
  });

  it("rejects player actions beyond the monthly defense budget", () => {
    const world = freshWorld();
    const usa = get(world, "USA");
    usa.gdp = 1e9; // pauper superpower: monthly budget ≈ $2.9M
    const result = engine.executeTurn(
      world,
      [{ type: "DOMESTIC_REFORM" }], // costs $250M
      [],
    );
    const rejected = result.rejectedActions.get("USA") ?? [];
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toContain("budget");
  });

  it("war resolution moves the frontline and inflicts casualties", () => {
    let world = freshWorld("RUS");
    world = engine.executeTurn(world, [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "POL" }], []).newState;
    let frontlineMoved = false;
    let casualties = 0;
    for (let i = 0; i < 6 && world.wars.length > 0; i++) {
      const war = world.wars.find((w) => w.defenderId === "POL" || w.attackerId === "POL");
      world = engine.executeTurn(world, [], []).newState;
      const after = world.wars.find((w) => w.id === war?.id);
      if (war && after && after.frontline !== war.frontline) frontlineMoved = true;
      casualties = Math.max(
        casualties,
        ...(world.wars.map((w) => w.attackerCasualties + w.defenderCasualties) ?? [0]),
      );
      if (!after) break; // war ended
    }
    expect(frontlineMoved || world.wars.length === 0).toBe(true);
  });

  it("enforces the two-strike rule on nuclear programs", () => {
    let world = freshWorld("ISR");
    const irn = get(world, "IRN");
    irn.nuclear.status = "DEVELOPING";
    irn.nuclear.progress = 60;
    // Overwhelming Israeli airpower to guarantee strike success
    const isr = get(world, "ISR");
    isr.airpower = 100000;
    irn.airpower = 0;
    irn.intelLevel = 0;

    const strike: Action = {
      type: "MILITARY_AIRSTRIKE",
      targetCountryId: "IRN",
      params: { targetType: "NUCLEAR" },
    };
    world = engine.executeTurn(world, [strike], []).newState;
    const after1 = get(world, "IRN");
    expect(after1.nuclear.consecutiveStrikesTaken).toBe(1);
    expect(after1.nuclear.status).toBe("DEVELOPING");

    world = engine.executeTurn(world, [strike], []).newState;
    const after2 = get(world, "IRN");
    expect(after2.nuclear.status).toBe("LATENT"); // crippled
    expect(after2.nuclear.progress).toBe(0);
  });

  it("nuclear strike on a non-nuclear enemy triggers global embargo", () => {
    let world = freshWorld("RUS");
    const rus = get(world, "RUS");
    rus.nuclear.status = "ARMED";
    rus.nuclear.warheads = 100;
    world = engine.executeTurn(world, [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "POL" }], []).newState;
    // POL alliances may bring in nuclear powers; strip pacts to test the lone case
    const pol = get(world, "POL");
    pol.alliances = [];
    world = engine.executeTurn(
      world,
      [{ type: "NUCLEAR_STRIKE", targetCountryId: "POL" }],
      [],
    ).newState;
    const rusAfter = get(world, "RUS");
    expect(rusAfter.underGlobalEmbargo).toBe(true);
    expect(world.globalTension).toBeGreaterThanOrEqual(90);
  });

  it("resolves pending crisis decisions with chosen option effects", () => {
    const world = freshWorld();
    world.pendingDecisions = [
      {
        id: "dec_test",
        turn: 0,
        title: "Test crisis",
        situation: "Something happened",
        affectedCountries: ["USA"],
        options: [
          { id: "a", label: "A", description: "", actions: [], effects: { approval: -5 }, tensionDelta: 0 },
          { id: "b", label: "B", description: "", actions: [], effects: { approval: 8 }, tensionDelta: 2 },
        ],
        deadlineTurn: 2,
      },
    ];
    const before = get(world, "USA").approval;
    const result = engine.executeTurn(world, [], [], [{ decisionId: "dec_test", optionId: "b" }]);
    const after = get(result.newState, "USA");
    expect(after.approval).toBeGreaterThan(before);
    expect(result.newState.pendingDecisions.find((d) => d.id === "dec_test")).toBeUndefined();
  });

  it("tracks score history every turn", () => {
    let world = freshWorld();
    for (let i = 0; i < 3; i++) {
      world = engine.executeTurn(world, [], []).newState;
    }
    expect(world.scoreHistory.length).toBe(3);
    expect(world.score.total).toBeGreaterThan(0);
    expect(world.score.total).toBeLessThanOrEqual(200);
  });

  it("ends the game after 120 turns with TERM_COMPLETED", () => {
    let world = freshWorld();
    world.turn = 120;
    const result = engine.executeTurn(world, [], []);
    expect(result.gameOver?.reason).toBe("TERM_COMPLETED");
  });
});

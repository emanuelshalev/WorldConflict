import { createDataLoader } from "../../../src/core/data-loader.js";
import type { Chronicle, ChronicleSample, WorldState } from "../../../src/core/types.js";

/**
 * The design doc's worked example (design-reveal.md, Hormuz Convoy, United States): approval 44
 * to 61, score 100 to 119, par 107, all five goals held from month 7, both bonuses, 3 stars.
 * Presidency Score by hand: Mission 300 + 2 x 50 = 400, Timing 6/12 = 50,
 * Leadership 1.5 x mean(score) = 1.5 x 1304/12 = 163, Finish 100 x 119/107 = 111: total 724.
 */
export const SCORES = [100, 101, 103, 105, 106, 108, 109, 111, 112, 114, 116, 119];
export const APPROVAL = [44, 46, 47, 45, 48, 50, 53, 55, 57, 58, 60, 61];

export function sample(turn: number, over: Partial<ChronicleSample> = {}): ChronicleSample {
  return {
    turn,
    approval: APPROVAL[turn] ?? 50,
    stability: 62,
    legitimacy: 60,
    realGrowth: 0.021,
    gdp: 31e12,
    tension: 72 - turn * 2,
    score: SCORES[turn] ?? 100,
    parts: [25, 26, 28, 29],
    // War over from month 6, all five goals from month 7 (turn 6), bonuses from month 10
    objectives: [turn >= 5, true, turn >= 6, turn >= 6, turn >= 6, turn >= 9, turn >= 9],
    relations: { IRN: -100 + turn * 4, ARE: 70, ISR: 80 },
    playerWars: turn < 5 ? 1 : 0,
    capital: 3,
    orders: 3,
    ...over,
  };
}

export function fixtureChronicle(): Chronicle {
  return {
    series: SCORES.map((_, t) => sample(t)),
    moments: [
      {
        turn: 5,
        kind: "WAR_END",
        title: "The shooting stops with Iran",
        detail: "Ceasefire",
        tone: "good",
        weight: 15,
        with: "IRN",
      },
      {
        turn: 1,
        kind: "CRISIS",
        title: "The midterm clock",
        detail: "",
        tone: "bad",
        weight: -5,
        choice: "Hit the IRGC navy now",
        staffPick: true,
      },
      {
        turn: 3,
        kind: "CRISIS",
        title: "Tanker hit",
        detail: "",
        tone: "good",
        weight: 9,
        choice: "Full convoy operation",
        staffPick: true,
      },
      {
        turn: 7,
        kind: "CRISIS",
        title: "Isfahan's tunnels",
        detail: "",
        tone: "bad",
        weight: -13,
        choice: "Bunker-busters on Isfahan",
        staffPick: true,
      },
    ],
    firsts: { "cond:0": 5, "cond:1": 0, "cond:2": 6, "cond:3": 6, "cond:4": 6, "war:USA-IRN:end": 5, "ceasefire:IRN": 5 },
    casualties: 230,
    deals: 1,
    covert: { ok: 0, exposed: 0 },
    start: {
      tension: 78,
      worstRival: "IRN",
      nuclear: { IRN: "DEVELOPING" },
      tracked: ["IRN", "ARE", "ISR"],
      relations: { IRN: -100, ARE: 75, ISR: 85 },
      hostile: ["IRN"],
      approval: 44,
      score: 100,
    },
    plots: { IRN: 3 },
    aiTiersUsed: ["ALGORITHMIC"],
  };
}

/** A finished Hormuz USA world carrying the worked example's chronicle and outcome. */
export function fixtureWorld(): WorldState {
  const world = createDataLoader().newGame({
    scenarioId: "2026",
    playerCountryId: "USA",
    seed: 4821,
    flashpointId: "hormuz-convoy",
  });
  const usa = world.countries.find((c) => c.id === "USA");
  if (!usa) throw new Error("no USA");
  usa.approval = 61;
  usa.stability = 62;
  usa.atWarWith = [];
  world.wars = world.wars.filter((w) => w.attackerId !== "USA" && w.defenderId !== "USA");
  world.turn = 12;
  world.score = { economic: 28, security: 29, approval: 30, prestige: 32, total: 119 };
  world.gameOver = { reason: "TERM_COMPLETED", description: "Through the crisis", turn: 11 };
  world.outcome = {
    victory: true,
    stars: 3,
    conditions: [
      { label: "Stay in power", met: true, bonus: false },
      ...(world.objective?.primary ?? []).map((c) => ({ label: c.label, met: true, bonus: false })),
      ...(world.objective?.bonus ?? []).map((c) => ({ label: c.label, met: true, bonus: true })),
    ],
  };
  world.chronicle = fixtureChronicle();
  return world;
}

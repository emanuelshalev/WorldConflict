import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { MEETING_SLOTS } from "../../src/core/meetings.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const step = (w: WorldState, choices: Array<{ decisionId: string; optionId: string }> = []) =>
  new TurnEngine().executeTurn(w, [], generateDeterministicIntents(w), choices).newState;

describe("the leader's calendar", () => {
  it("opens every session with calls, a staff meeting and a visit or an interview", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 5, mode: "TERM" });
    expect(w.agenda.length).toBeGreaterThanOrEqual(3);
    expect(w.agenda.filter((m) => m.kind === "CALL").length).toBe(2);
    expect(w.agenda.some((m) => m.kind === "STAFF")).toBe(true);
    for (const m of w.agenda) expect(m.options.some((o) => o.id === m.defaultOptionId)).toBe(true);
  });

  it("applies the answer you give a leader on the phone", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 5, mode: "TERM" });
    const call = w.agenda.find((m) => m.kind === "CALL");
    if (!call?.withCountry) throw new Error("no call");
    const best = call.options.reduce((a, b) =>
      (b.effects[`relations:${call.withCountry}`] ?? 0) > (a.effects[`relations:${call.withCountry}`] ?? 0) ? b : a,
    );
    const answered = step(w, [{ decisionId: call.id, optionId: best.id }]);
    const ignored = step(w);
    const me = (x: WorldState) => x.countries.find((c) => c.id === "USA");
    expect(me(answered)?.relations[call.withCountry]).toBeGreaterThan(me(ignored)?.relations[call.withCountry] ?? 0);
    expect(answered.turnReport?.decisions.some((d) => d.title === call.title && !/did not attend/.test(d.choice))).toBe(true);
    expect(ignored.turnReport?.decisions.some((d) => d.title === call.title && /did not attend/.test(d.choice))).toBe(true);
  });

  it("lets you attend only a few meetings in person; the rest go to a deputy", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 9, mode: "TERM" });
    const all = w.agenda.map((m) => ({ decisionId: m.id, optionId: m.options[0].id }));
    const next = step(w, all);
    const inPerson = next.turnReport?.decisions.filter((d) => d.templateId?.startsWith("meeting_") && !/did not attend/.test(d.choice)) ?? [];
    expect(inPerson.length).toBe(Math.min(MEETING_SLOTS, w.agenda.length));
    expect(next.agenda.length).toBeGreaterThanOrEqual(3);
    expect(next.agenda[0].turn).toBe(next.turn);
  });

  it("is deterministic", () => {
    const run = () => {
      let w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 3, mode: "TERM" });
      for (let i = 0; i < 4; i++) w = step(w, w.agenda.slice(0, 2).map((m) => ({ decisionId: m.id, optionId: m.options[0].id })));
      return JSON.stringify(w.agenda);
    };
    expect(run()).toBe(run());
  });
});

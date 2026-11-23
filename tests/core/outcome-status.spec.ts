import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { buildAdvice, computeSuggestions } from "../../src/core/advisors.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { buildReveal } from "../../src/core/reveal.js";
import { pressQuotes } from "../../src/core/reveal-text.js";
import { decisionOutcome, orderOutcome } from "../../src/core/status.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";
import { CONTROL_SEEDS, playControl } from "../fixtures/control.js";
import { fixtureWorld } from "../fixtures/reveal/hormuz-usa.js";

const playerAtWar = (w: WorldState, id: string) =>
  w.countries.find((c) => c.id === w.playerCountryId)?.atWarWith.includes(id) ?? false;

/**
 * F-02-2: one outcome vocabulary. The engine gives every resolved item one status (DONE,
 * PARTLY, FAILED, REFUSED, NO_EFFECT) and a reason; the UI shows that status, never a guess
 * from the colour of the numbers. F-02-8: speaker and stance checks on quotes and advice.
 */

const loader = createDataLoader();
const STATUSES = ["DONE", "PARTLY", "FAILED", "REFUSED", "NO_EFFECT"];

describe("status rules", () => {
  it("a staff meeting whose effects applied is DONE at a cost, never FAILED (Dan)", () => {
    const o = decisionOutcome({
      kind: "STAFF",
      attended: true,
      facts: [
        { label: "Mobilization", before: 85, after: 95, unit: "%", good: true },
        { label: "Approval", before: 50, after: 48, unit: "%", good: true },
      ],
    });
    expect(o.status).toBe("DONE");
    expect(o.reason).toMatch(/at a cost: Approval -2/);
  });

  it("a vote cast is DONE even when it costs relations (Marcus)", () => {
    const o = decisionOutcome({
      kind: "CRISIS",
      attended: true,
      facts: [{ label: "Iran's view of you", before: -40, after: -55, good: true }],
    });
    expect(o.status).toBe("DONE");
  });

  it("a crisis answer whose order failed is PARTLY, with the reason", () => {
    const o = decisionOutcome({
      kind: "CRISIS",
      facts: [{ label: "Approval", before: 50, after: 53 }],
      failedAction: { label: "Strike military targets in Iran", reason: "Repelled by air defenses." },
    });
    expect(o.status).toBe("PARTLY");
    expect(o.reason).toMatch(/Repelled by air defenses/);
  });

  it("refusals, chance failures, no effect and exposure each get their own status", () => {
    expect(orderOutcome({ ok: false, code: "NO_CAPITAL", detail: "Not enough capital" }).status).toBe("REFUSED");
    expect(orderOutcome({ ok: false, detail: "Nuclear release is only authorized in wartime" }).status).toBe("REFUSED");
    expect(orderOutcome({ type: "DIPLOMACY_PROPOSE_CEASEFIRE", ok: false, detail: "Russia rejected the ceasefire proposal" }).status).toBe("FAILED");
    expect(
      orderOutcome({ type: "DIPLOMACY_IMPROVE_RELATIONS", ok: true, detail: "", facts: [{ label: "Poland's view of you", before: 40, after: 40 }] }).status,
    ).toBe("NO_EFFECT");
    expect(orderOutcome({ type: "INTEL_SABOTAGE", ok: true, detail: "Success: done", chance: { success: true, exposed: true }, target: "Iran" }).reason).toMatch(/Iran knows/);
    expect(orderOutcome({ type: "DIPLOMACY_MEDIATE", ok: true, detail: "x", chance: { success: true, partial: "Talks stalled" } }).status).toBe("PARTLY");
  });
});

function play(country: string, seed: number, months: number, flashpointId?: string): WorldState[] {
  let w = loader.newGame({
    scenarioId: "2026",
    playerCountryId: country,
    seed,
    mode: flashpointId ? "FLASHPOINT" : "TERM",
    ...(flashpointId ? { flashpointId } : {}),
  });
  const out: WorldState[] = [];
  for (let t = 0; t < months && !w.gameOver; t++) {
    const a = buildAdvice(w);
    const decisions = [
      ...Object.entries(a.cabinetPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
      ...Object.entries(a.meetingPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
    ];
    const orders = [
      ...a.staffOrders.map(({ action: { label: _l, ...x } }) => x as Action),
      { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "RUS" } as Action,
    ];
    w = new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), decisions).newState;
    out.push(w);
  }
  return out;
}

describe("every resolved item carries one status", () => {
  it("orders, decisions and foreign moves all have a status and a reason", () => {
    for (const w of [...play("UKR", 7, 6), ...play("USA", 4, 4, "hormuz-convoy")]) {
      const r = w.turnReport!;
      for (const o of r.orders) {
        expect(STATUSES).toContain(o.status);
        expect(o.reason?.length).toBeGreaterThan(0);
        // ok and status never disagree
        if (o.ok) expect(["DONE", "PARTLY", "NO_EFFECT"]).toContain(o.status);
        else expect(["FAILED", "REFUSED"]).toContain(o.status);
      }
      for (const d of r.decisions) expect(STATUSES).toContain(d.status);
      for (const m of r.world) expect(m.status).toBe("DONE");
    }
  });

  it("'What your choice did' points at the player's own move, never at a front (QA S2-1, Maya)", () => {
    for (const w of play("USA", 4, 6, "hormuz-convoy")) {
      const r = w.turnReport!;
      if (r.decisions.some((d) => d.attended !== false) || r.orders.length) expect(r.yourMove).toBeDefined();
      expect(["decision", "order"]).toContain(r.yourMove?.ref ?? "decision");
    }
  });
});

describe("the reveal's moments agree with their numbers (QA S2-1)", () => {
  it("no improving number under 'went badly', no falling one under 'went well'", () => {
    const r = buildReveal(fixtureWorld());
    const parse = (t: string) => [...t.matchAll(/(approval|stability|tension|score) (\d+)%? to (\d+)/g)];
    for (const m of r.moments.well)
      for (const [, k, a, b] of parse(m.text)) expect(k === "tension" ? +b <= +a : +b >= +a).toBe(true);
    for (const m of r.moments.bad)
      for (const [, k, a, b] of parse(m.text)) expect(k === "tension" ? +b >= +a : +b <= +a).toBe(true);
  });
});

describe("speaker and stance checks (F-02-8)", () => {
  const world = fixtureWorld();
  it("a rival's state TV never says 'they blinked' about its own side", () => {
    const q = pressQuotes(world, {
      country: "Ukraine",
      approvalStart: 56,
      approvalEnd: 73,
      growthEnd: -0.004,
      rival: { name: "Russia", before: -100, after: -60, autocracy: true },
      warsStarted: 0,
      warsEnded: 1,
    });
    const rival = q.find((x) => x.role === "rival");
    expect(rival?.quote).not.toMatch(/blinked/);
    // Approval up 17 points is never "a government that lost the room"
    expect(q.find((x) => x.role === "home")?.quote).not.toMatch(/lost the room|stopped listening/);
  });

  it("reaction quotes signed by a leader are first person, and no leader repeats a line within six months", () => {
    const months = play("UKR", 7, 12);
    const seen = new Map<string, number>();
    for (const w of months) {
      const r = w.turnReport!;
      for (const x of [...r.decisions, ...r.orders]) {
        const re = x.reaction;
        if (!re || /answered within the month/.test(re.line)) continue;
        expect(re.line).not.toMatch(/^(Crowds gather|In the .*foreign ministry calls)/);
        const key = `${re.who}|${re.line}`;
        const prev = seen.get(key);
        if (prev !== undefined && /^(President|Prime Minister|Chancellor|General Secretary|Supreme Leader)/.test(re.who))
          expect(w.turn - prev, key).toBeGreaterThan(6);
        seen.set(key, w.turn);
      }
    }
  });

  it("staff never suggest courting an ally of the enemy (Court Belarus for Ukraine)", () => {
    for (const w of play("UKR", 7, 8, "ceasefire-or-collapse")) {
      const s = computeSuggestions(w, 8);
      expect(s.some((x) => x.label === "Court Belarus")).toBe(false);
    }
  });

  // QA3R-1c (F-02-8 REGRESSED): after the month-5 ceasefire on CO-UKR-MAYA1 Russia's camp came
  // back as courtable. The stance holds through and after a war, on every control seed: an enemy
  // is a country we are at war with, a historical rival, or one we hold below -40.
  it("staff never suggest courting an ally of the enemy, through and after a ceasefire, on the control seeds", () => {
    const maya = playControl("CO-UKR-MAYA1", "staff");
    expect(maya.months.some((m) => !playerAtWar(m.after, "RUS"))).toBe(true);
    const labels = maya.months.flatMap((m) => [
      ...computeSuggestions(m.before, 8).map((s) => s.label),
      ...m.advice.staffOrders.map((s) => s.label),
    ]);
    expect(labels).not.toContain("Court Belarus");
    for (const code of CONTROL_SEEDS)
      for (const m of playControl(code, "staff").months) {
        const w = m.before;
        const me = w.countries.find((c) => c.id === w.playerCountryId)!;
        const rivals = new Set(me.history?.historicalRivals ?? []);
        const enemy = (id: string) =>
          me.atWarWith.includes(id) || rivals.has(id) || (me.relations[id] ?? 0) < -40;
        for (const s of computeSuggestions(w, 8)) {
          if (s.action.type !== "DIPLOMACY_IMPROVE_RELATIONS")
            continue;
          if (/^Mission:/.test(s.why)) continue;
          const t = w.countries.find((c) => c.id === s.action.targetCountryId)!;
          expect(
            t.alliances.filter((a) => a !== me.id && enemy(a)),
            `${code} m${w.turn + 1} ${s.label}`,
          ).toEqual([]);
        }
      }
  });
});

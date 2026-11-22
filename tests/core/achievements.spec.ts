import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  type AchievementContext,
  checkSignature,
  earnedAchievements,
  tierFor,
} from "../../src/core/achievements.js";
import type { Chronicle, WorldState } from "../../src/core/types.js";
import { fixtureWorld, sample } from "../fixtures/reveal/hormuz-usa.js";

/**
 * One earning and one non-earning fixture per seal (acceptance criterion 7). The baseline is
 * the design's worked example: a won Hormuz USA session, 3 stars, a ceasefire with Iran in
 * month 6, the staff followed in all three crises.
 */

type Mut = (w: WorldState, ch: Chronicle, ctx: AchievementContext) => void;

function run(id: string, mut: Mut = () => {}): number | null {
  const world = fixtureWorld();
  const ch = world.chronicle as Chronicle;
  const ctx: AchievementContext = { world, chronicle: ch, seatDifficulty: "TOUGH" };
  mut(world, ch, ctx);
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) throw new Error(`no achievement ${id}`);
  return def.check(ctx);
}

const usa = (w: WorldState) => {
  const c = w.countries.find((x) => x.id === "USA");
  if (!c) throw new Error("no USA");
  return c;
};
const toLegacy = (w: WorldState, ch: Chronicle, approval = 55) => {
  w.mode = "LEGACY";
  w.maxTurns = 120;
  ch.series = Array.from({ length: 120 }, (_, t) => sample(t, { approval }));
};
const toTerm = (w: WorldState) => {
  w.mode = "TERM";
};
const crisis = (turn: number, staffPick: boolean) => ({
  turn,
  kind: "CRISIS" as const,
  title: `Crisis ${turn}`,
  detail: "",
  tone: "neutral" as const,
  weight: 0,
  choice: "x",
  staffPick,
});

const CASES: Array<[id: string, earn: Mut, miss: Mut]> = [
  ["sworn_in", () => {}, (_w, ch) => { ch.series = []; }],
  ["full_term", () => {}, (w, ch) => {
    w.gameOver = { reason: "DEPOSED_COUP", description: "", turn: 5 };
    ch.series = ch.series.slice(0, 6);
  }],
  ["clean_sheet", () => {}, (w) => {
    const c = w.outcome?.conditions.find((x) => x.bonus);
    if (c) c.met = false;
  }],
  ["ahead_of_schedule", (_w, ch) => {
    for (const s of ch.series) if (s.turn >= 3) s.objectives = s.objectives.map(() => true);
  }, () => {}],
  ["photo_finish", (w) => { usa(w).approval = 57; }, () => {}],
  ["peacemaker", () => {}, (_w, ch) => {
    for (const m of ch.moments) if (m.kind === "WAR_END") m.detail = "Victory";
  }],
  ["quick_peace", (_w, ch) => {
    for (const m of ch.moments) if (m.kind === "WAR_END") m.turn = 2;
  }, () => {}],
  ["no_shot_fired", () => {}, (w) => { w.director.record["MILITARY_AIRSTRIKE:tried"] = 1; }],
  ["comeback_kid", (w, ch) => {
    w.director.rallies = 1;
    ch.moments.push({ turn: 4, kind: "COMEBACK", title: "c", detail: "", tone: "good", weight: 12 });
  }, () => {}],
  ["nerves_of_steel", (w) => { w.director.closeCalls = 3; }, (w) => { w.director.closeCalls = 2; }],
  ["iron_approval", () => {}, (_w, ch) => { ch.series[3].approval = 39; }],
  ["landslide", (_w, ch) => { ch.series[11].approval = 66; }, () => {}],
  ["boom_times", (_w, ch) => { ch.series[11].realGrowth = 0.031; }, () => {}],
  ["no_recession", () => {}, (_w, ch) => { ch.series[4].realGrowth = -0.002; }],
  ["steady_state", () => {}, (_w, ch) => { ch.series[4].stability = 49; }],
  ["cooler_heads", () => {}, (_w, ch) => { ch.series[11].tension = 70; }],
  ["world_at_peace", (w) => { w.wars = []; }, (w) => {
    w.wars = [{ id: "war_ISR_IRN", attackerId: "ISR", defenderId: "IRN", frontline: 50, startTurn: 0, exhaustion: 10 } as WorldState["wars"][number]];
  }],
  ["bridge_builder", (_w, ch) => { ch.series[8].relations.IRN = -20; }, () => {}],
  ["coalition", (_w, ch) => {
    ch.moments.push({ turn: 3, kind: "PACT", title: "Pact", detail: "", tone: "good", weight: 8, with: "ARE" });
  }, () => {}],
  ["dealmaker", (_w, ch) => { ch.deals = 3; }, () => {}],
  ["spymaster", (_w, ch) => { ch.covert = { ok: 3, exposed: 0 }; }, (_w, ch) => { ch.covert = { ok: 3, exposed: 1 }; }],
  ["staff_knows_best", () => {}, (_w, ch) => { ch.moments.push(crisis(9, false)); }],
  ["against_advice", (_w, ch) => {
    for (let t = 0; t < 5; t++) ch.moments.push(crisis(t, false));
  }, (w, ch) => {
    for (let t = 0; t < 5; t++) ch.moments.push(crisis(t, false));
    if (w.outcome) w.outcome.victory = false;
  }],
  ["full_desk", (_w, ch) => { ch.series[4].orders = 6; }, () => {}],
  ["first_strike_rival_nuke", (w) => {
    const irn = w.countries.find((c) => c.id === "IRN");
    if (irn) irn.nuclear.status = "LATENT";
  }, (w) => {
    const irn = w.countries.find((c) => c.id === "IRN");
    if (irn) irn.nuclear.status = "DEVELOPING";
  }],
  ["lame_duck", (_w, ch) => { ch.series[2].approval = 25; }, () => {}],
  ["the_hawk", (w, ch) => {
    w.director.record.DIPLOMACY_DECLARE_WAR = 1;
    ch.firsts["war:USA-IRN:start"] = 2;
  }, () => {}],
  ["pariah", (_w, ch) => { ch.firsts.pariah = 4; }, () => {}],
  ["exposed", (_w, ch) => { ch.covert.exposed = 1; ch.firsts["covert:exposed"] = 3; }, () => {}],
  ["deposed", (w) => { w.gameOver = { reason: "LOST_ELECTION", description: "", turn: 11 }; }, () => {}],
  ["mushroom_cloud", (_w, ch) => { ch.firsts["nuke:used"] = 7; }, () => {}],
  ["defused", () => {}, (_w, _ch, ctx) => { ctx.seatDifficulty = "STEADY"; }],
  ["history_rewritten", (_w, _ch, ctx) => {
    ctx.truth = [{ verdict: "BETTER" }, { verdict: "CONTEXT" }, { verdict: "BETTER" }];
  }, (_w, _ch, ctx) => {
    ctx.truth = [{ verdict: "BETTER" }, { verdict: "WORSE" }];
  }],
  ["re_elected", (w, ch) => {
    toTerm(w);
    ch.firsts.election_won = 5;
    ch.series[5].approval = 56;
  }, (w, ch) => {
    toTerm(w);
    ch.firsts.election_won = 5;
    ch.series[5].approval = 50;
  }],
  ["statecraft", (w) => {
    toTerm(w);
    if (w.objective) w.objective.bonus = [{ kind: "RELATION_MIN", targetId: "ARE", min: 0, label: "Mend ties" }];
  }, (w) => {
    toTerm(w);
    if (w.objective) w.objective.bonus = [{ kind: "RELATION_MIN", targetId: "ARE", min: 101, label: "Mend ties" }];
  }],
  ["decade", (w, ch) => { toLegacy(w, ch); }, (w, ch) => {
    toLegacy(w, ch);
    ch.series = ch.series.slice(0, 100);
  }],
  ["dynasty", (w, ch) => { toLegacy(w, ch); }, (w, ch) => {
    toLegacy(w, ch);
    ch.series[110].approval = 45;
  }],
];

describe("achievement catalogue", () => {
  it("has the 37 core seals, unique ids, rule and tier for each", () => {
    expect(ACHIEVEMENTS).toHaveLength(37);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(37);
    for (const a of ACHIEVEMENTS) {
      expect(a.rule.length).toBeGreaterThan(5);
      if (!a.infamy) expect(a.hint.length).toBeGreaterThan(5);
    }
    expect(CASES.map((c) => c[0]).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
  });

  for (const [id, earn, miss] of CASES) {
    it(`${id}: earned by its fixture, not by the other`, () => {
      const earned = run(id, earn);
      expect(earned, `${id} should be earned`).not.toBeNull();
      expect(typeof earned).toBe("number");
      expect(run(id, miss), `${id} should not be earned`).toBeNull();
    });
  }

  it("gates mode-specific seals by mode", () => {
    const world = fixtureWorld();
    const ch = world.chronicle as Chronicle;
    ch.firsts.election_won = 5;
    ch.series[5].approval = 60;
    const ids = earnedAchievements({ world, chronicle: ch }).map((a) => a.id);
    expect(ids).not.toContain("re_elected"); // a flashpoint has no Term election
    expect(ids).toContain("sworn_in");
  });

  it("checks the flashpoint signature from its conditions (and byTurn)", () => {
    const world = fixtureWorld();
    const ch = world.chronicle as Chronicle;
    const signature = {
      id: "hormuz_usa_strait_open",
      name: "Strait Open, Bomb Never",
      rule: "End the war and Iran never passes DEVELOPING",
      conditions: [
        { kind: "WAR_ENDED" as const, targetId: "USA", otherId: "IRN", label: "No war" },
        { kind: "NO_NUCLEAR" as const, targetId: "IRN", maxStatus: "DEVELOPING" as const, label: "No bomb" },
      ],
    };
    const irn = world.countries.find((c) => c.id === "IRN");
    if (irn) irn.nuclear.status = "DEVELOPING";
    expect(checkSignature({ world, chronicle: ch, signature })).toBe(5);
    expect(checkSignature({ world, chronicle: ch, signature: { ...signature, byTurn: 7 } })).toBe(5);
    expect(checkSignature({ world, chronicle: ch, signature: { ...signature, byTurn: 5 } })).toBeNull();
    if (irn) irn.nuclear.status = "TESTED";
    expect(checkSignature({ world, chronicle: ch, signature })).toBeNull();
    expect(checkSignature({ world, chronicle: ch, signature: { ...signature, conditions: [] } })).toBeNull();
  });

  it("maps measured rates to tiers", () => {
    expect(tierFor(0.5)).toBe("COMMON");
    expect(tierFor(0.2)).toBe("UNCOMMON");
    expect(tierFor(0.05)).toBe("RARE");
    expect(tierFor(0.01)).toBe("LEGENDARY");
  });
});

import type { SignatureData } from "./data-loader.js";
import { evaluateCondition, stayedInPower } from "./objectives.js";
import type {
  Chronicle,
  ChronicleSample,
  GameMode,
  ObjectiveCondition,
  WorldState,
} from "./types.js";

/**
 * The achievement catalogue: 37 core seals plus one signature per flashpoint side. Every rule
 * reads only the finished world and its chronicle, and returns the month it was earned
 * (0-based turn) or null. Rarity is measured by the benchmark harness, never guessed
 * (data/benchmarks/achievements.json); infamy seals record what went badly and never cost score.
 */

export type RarityTier = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";

export interface AchievementContext {
  world: WorldState;
  chronicle: Chronicle;
  /** Verdict per truth-table row, when the seat has a reality block. */
  truth?: Array<{ verdict: "BETTER" | "SAME" | "WORSE" | "CONTEXT" | "OPEN" }>;
  /** Flashpoint side difficulty (STEADY / TOUGH / BRUTAL). */
  seatDifficulty?: "STEADY" | "TOUGH" | "BRUTAL";
  signature?: SignatureData;
}

export interface AchievementDef {
  id: string;
  name: string;
  rule: string; // what earns it, shown on the seal
  hint: string; // "within reach next time" line for a locked seal
  infamy: boolean;
  modes: GameMode[] | "ALL";
  expected: RarityTier; // the design's guess, used until benchmarks exist
  check: (ctx: AchievementContext) => number | null;
}

export const DEPOSED_REASONS = [
  "LOST_ELECTION",
  "DEPOSED_COUP",
  "REVOLUTION",
  "ASSASSINATED",
  "IMPEACHED",
  "COUNTRY_COLLAPSED",
];
const NUCLEAR_ORDER = ["NONE", "LATENT", "DEVELOPING", "TESTED", "ARMED"];
const SHOTS = [
  "MILITARY_AIRSTRIKE",
  "DIPLOMACY_DECLARE_WAR",
  "DIPLOMACY_DECLARE_WAR:ally",
  "NUCLEAR_STRIKE",
];

// ---------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------

const series = (c: AchievementContext) => c.chronicle.series;
const lastTurn = (c: AchievementContext) => series(c).at(-1)?.turn ?? c.world.turn;
const player = (w: WorldState) => w.countries.find((x) => x.id === w.playerCountryId);
/** The halfway month as a 0-based turn: month 6 of 12 is turn 5. */
export const halfTurn = (w: WorldState) => Math.ceil(w.maxTurns / 2) - 1;
/** A session long enough for "never" and "all session" seals to mean something. */
const longEnough = (c: AchievementContext) => series(c).length >= Math.ceil(c.world.maxTurns / 2);
const firstWhere = (c: AchievementContext, f: (s: ChronicleSample) => boolean) =>
  series(c).find(f)?.turn ?? null;
const momentTurn = (c: AchievementContext, kind: string, nth = 1) =>
  c.chronicle.moments.filter((m) => m.kind === kind).sort((a, b) => a.turn - b.turn)[nth - 1]
    ?.turn ?? null;
const won = (c: AchievementContext) => !!c.world.outcome?.victory;
const inOffice = (c: AchievementContext) => stayedInPower(c.world);
const record = (c: AchievementContext, key: string) => c.world.director.record?.[key] ?? 0;
const endedNormally = (c: AchievementContext) => inOffice(c) && lastTurn(c) >= c.world.maxTurns - 1;
const playerWarEnds = (c: AchievementContext) =>
  c.chronicle.moments.filter((m) => m.kind === "WAR_END").sort((a, b) => a.turn - b.turn);
const crises = (c: AchievementContext) => c.chronicle.moments.filter((m) => m.kind === "CRISIS");

/** Start of the final unbroken run of samples where `ok` holds, if it holds at the end. */
function heldSince(rows: ChronicleSample[], ok: (s: ChronicleSample) => boolean): number | null {
  let since: number | null = null;
  for (const s of rows) {
    if (ok(s)) since ??= s.turn;
    else since = null;
  }
  return since;
}

function sameCondition(a: ObjectiveCondition, b: ObjectiveCondition): boolean {
  return (
    a.kind === b.kind &&
    (a.targetId ?? "") === (b.targetId ?? "") &&
    (a.otherId ?? "") === (b.otherId ?? "") &&
    (a.stat ?? "") === (b.stat ?? "") &&
    (a.min ?? null) === (b.min ?? null) &&
    (a.maxStatus ?? "") === (b.maxStatus ?? "")
  );
}

/**
 * Is a condition met at the end, and since which month (0-based turn) has it held without a
 * break? Objective conditions read the chronicle's own record; others are rebuilt from the
 * monthly series (stats, score, tracked relations) or the war log.
 */
export function conditionHistory(
  world: WorldState,
  chronicle: Chronicle,
  cond: ObjectiveCondition,
): { met: boolean; firstHeld: number | null } {
  const met = evaluateCondition(world, cond, false).met;
  if (!met) return { met, firstHeld: null };
  const rows = chronicle.series;
  const first = rows[0]?.turn ?? 0;
  const conditions = [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])];
  const index = conditions.findIndex((c) => sameCondition(c, cond));
  if (index >= 0 && chronicle.firsts[`cond:${index}`] !== undefined)
    return { met, firstHeld: chronicle.firsts[`cond:${index}`] };
  switch (cond.kind) {
    case "WAR_ENDED": {
      const a = cond.targetId;
      const b = cond.otherId;
      const end = chronicle.firsts[`war:${a}-${b}:end`] ?? chronicle.firsts[`war:${b}-${a}:end`];
      return { met, firstHeld: end ?? first };
    }
    case "STAT_MIN": {
      const stat = cond.stat ?? "approval";
      return { met, firstHeld: heldSince(rows, (s) => s[stat] >= (cond.min ?? 50)) ?? first };
    }
    case "SCORE_PAR":
      return {
        met,
        firstHeld: heldSince(rows, (s) => s.score >= (cond.min ?? world.objective?.par ?? 100)),
      };
    case "RELATION_MIN": {
      const id = cond.targetId ?? "";
      if (rows.some((s) => s.relations[id] === undefined)) return { met, firstHeld: null };
      return { met, firstHeld: heldSince(rows, (s) => s.relations[id] >= (cond.min ?? 0)) };
    }
    default:
      return { met, firstHeld: first };
  }
}

/** The numeric margin of a met condition (for Photo Finish), or null for yes/no conditions. */
function margin(world: WorldState, cond: ObjectiveCondition): number | null {
  const me = player(world);
  if (!me) return null;
  if (cond.kind === "STAT_MIN") return me[cond.stat ?? "approval"] - (cond.min ?? 50);
  if (cond.kind === "RELATION_MIN")
    return (me.relations[cond.targetId ?? ""] ?? 0) - (cond.min ?? 0);
  if (cond.kind === "SCORE_PAR")
    return world.score.total - (cond.min ?? world.objective?.par ?? 100);
  return null;
}

// ---------------------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------------------

const ALL = "ALL" as const;

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "sworn_in",
    name: "Sworn In",
    rule: "Complete your first month",
    hint: "Finish one month in office",
    infamy: false,
    modes: ALL,
    expected: "COMMON",
    check: (c) => series(c)[0]?.turn ?? null,
  },
  {
    id: "full_term",
    name: "Full Term",
    rule: "Reach the final month in office",
    hint: "Stay in office to the last month",
    infamy: false,
    modes: ALL,
    expected: "COMMON",
    check: (c) => (endedNormally(c) ? lastTurn(c) : null),
  },
  {
    id: "clean_sheet",
    name: "Clean Sheet",
    rule: "Every primary and bonus objective met (3 stars)",
    hint: "Meet every objective, bonuses included",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) =>
      c.world.objective && won(c) && (c.world.outcome?.conditions ?? []).every((x) => x.met)
        ? lastTurn(c)
        : null,
  },
  {
    id: "ahead_of_schedule",
    name: "Ahead of Schedule",
    rule: "All primary conditions met by the halfway month and held to the end",
    hint: "Meet all your goals by the halfway month and hold them",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) => {
      const primary = c.world.objective?.primary.length ?? 0;
      if (!primary || !won(c)) return null;
      const since = heldSince(series(c), (s) => s.objectives.slice(0, primary).every(Boolean));
      return since !== null && since <= halfTurn(c.world) ? since : null;
    },
  },
  {
    id: "photo_finish",
    name: "Photo Finish",
    rule: "Win with a numeric condition met by 2 points or less",
    hint: "Win with a goal cleared by a hair",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => {
      if (!won(c) || !c.world.objective) return null;
      const close = c.world.objective.primary.some((cond) => {
        const m = margin(c.world, cond);
        return m !== null && m >= 0 && m <= 2;
      });
      return close ? lastTurn(c) : null;
    },
  },
  {
    id: "peacemaker",
    name: "Peacemaker",
    rule: "A war you were fighting ends in a ceasefire",
    hint: "Bring one of your wars to a ceasefire",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => playerWarEnds(c).find((m) => m.detail === "Ceasefire")?.turn ?? null,
  },
  {
    id: "quick_peace",
    name: "Quick Peace",
    rule: "A war you were fighting ends before the halfway month",
    hint: "End a war you are fighting before the halfway month",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) => {
      const t = playerWarEnds(c)[0]?.turn;
      return t !== undefined && t < halfTurn(c.world) ? t : null;
    },
  },
  {
    id: "no_shot_fired",
    name: "Never Fired a Shot",
    rule: "No airstrike, invasion or attack order all session",
    hint: "Get through a whole session without an attack order",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) =>
      longEnough(c) && SHOTS.every((k) => record(c, `${k}:tried`) === 0 && record(c, k) === 0)
        ? lastTurn(c)
        : null,
  },
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    rule: "Recover from approval or stability under 30 to over 50",
    hint: "Climb back from under 30% to over 50%",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) =>
      (c.world.director.rallies ?? 0) > 0 ? (momentTurn(c, "COMEBACK") ?? lastTurn(c)) : null,
  },
  {
    id: "nerves_of_steel",
    name: "Nerves of Steel",
    rule: "Survive 3 close calls",
    hint: "Ride out three close calls and stay in office",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) =>
      inOffice(c) && (c.world.director.closeCalls ?? 0) >= 3
        ? (momentTurn(c, "CLOSE_CALL", 3) ?? lastTurn(c))
        : null,
  },
  {
    id: "iron_approval",
    name: "Iron Approval",
    rule: "Approval never below 40%",
    hint: "Keep approval at 40% or more every month",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => (longEnough(c) && series(c).every((s) => s.approval >= 40) ? lastTurn(c) : null),
  },
  {
    id: "landslide",
    name: "Landslide",
    rule: "Approval 65%+ at the end",
    hint: "Finish with approval of 65% or more",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) => ((series(c).at(-1)?.approval ?? 0) >= 65 ? lastTurn(c) : null),
  },
  {
    id: "boom_times",
    name: "Boom Times",
    rule: "Real growth 3%+ at the end",
    hint: "Finish with real growth of 3% or more",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => ((series(c).at(-1)?.realGrowth ?? 0) >= 0.03 ? lastTurn(c) : null),
  },
  {
    id: "no_recession",
    name: "Bulletproof",
    rule: "Real growth never negative",
    hint: "Keep real growth above zero every month",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => (longEnough(c) && series(c).every((s) => s.realGrowth >= 0) ? lastTurn(c) : null),
  },
  {
    id: "steady_state",
    name: "Steady State",
    rule: "Stability never below 50%",
    hint: "Keep stability at 50% or more every month",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => (longEnough(c) && series(c).every((s) => s.stability >= 50) ? lastTurn(c) : null),
  },
  {
    id: "cooler_heads",
    name: "Cooler Heads",
    rule: "World tension 20+ points lower than at the start",
    hint: "Finish with world tension 20 points below where it started",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => {
      const start = c.chronicle.start?.tension;
      const end = series(c).at(-1)?.tension;
      return start !== undefined && end !== undefined && end <= start - 20 ? lastTurn(c) : null;
    },
  },
  {
    id: "world_at_peace",
    name: "World at Peace",
    rule: "No war anywhere in the final month",
    hint: "Finish with no war anywhere in the world",
    infamy: false,
    modes: ALL,
    expected: "LEGENDARY",
    check: (c) => (c.world.wars.length === 0 ? lastTurn(c) : null),
  },
  {
    id: "bridge_builder",
    name: "Bridge Builder",
    rule: "Relations with your worst starting rival up 40+ and no longer hostile (above -30)",
    hint: "Lift relations with your worst rival by 40 points",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) => {
      const id = c.chronicle.start?.worstRival;
      if (!id) return null;
      const start = c.chronicle.start?.relations[id] ?? series(c)[0]?.relations[id];
      if (start === undefined) return null;
      return firstWhere(c, (s) => (s.relations[id] ?? -999) >= Math.max(start + 40, -29));
    },
  },
  {
    id: "coalition",
    name: "Coalition",
    rule: "Sign a defence pact or alliance",
    hint: "Sign a defence pact",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => momentTurn(c, "PACT"),
  },
  {
    id: "dealmaker",
    name: "Dealmaker",
    rule: "3 diplomatic agreements carried out (pacts, ceasefires, mediation)",
    hint: "Close three agreements: pacts, ceasefires or mediation",
    infamy: false,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => (c.chronicle.deals >= 3 ? lastTurn(c) : null),
  },
  {
    id: "spymaster",
    name: "Spymaster",
    rule: "3 successful covert operations, none exposed",
    hint: "Land three covert operations without being caught",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) =>
      c.chronicle.covert.ok >= 3 && c.chronicle.covert.exposed === 0 ? lastTurn(c) : null,
  },
  {
    id: "staff_knows_best",
    name: "By the Book",
    rule: "Follow the staff recommendation in every crisis",
    hint: "Take the staff pick in every crisis",
    infamy: false,
    modes: ALL,
    expected: "COMMON",
    check: (c) => {
      const judged = crises(c).filter((m) => m.staffPick !== undefined);
      return judged.length >= 3 && judged.every((m) => m.staffPick) ? lastTurn(c) : null;
    },
  },
  {
    id: "against_advice",
    name: "Against Advice",
    rule: "Overrule the cabinet in 5 crises and still win",
    hint: "Overrule your staff five times and still win",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) => {
      const overruled = crises(c)
        .filter((m) => m.staffPick === false)
        .sort((a, b) => a.turn - b.turn);
      return won(c) && overruled.length >= 5 ? lastTurn(c) : null;
    },
  },
  {
    id: "full_desk",
    name: "Full Desk",
    rule: "Issue the maximum 6 orders in one month",
    hint: "Issue six orders in a single month",
    infamy: false,
    modes: ALL,
    expected: "COMMON",
    check: (c) => firstWhere(c, (s) => s.orders >= 6),
  },
  {
    id: "first_strike_rival_nuke",
    name: "Counter-Proliferator",
    rule: "A rival's nuclear status is lower at the end than at the start",
    hint: "Roll back a rival's nuclear program",
    infamy: false,
    modes: ALL,
    expected: "RARE",
    check: (c) => {
      const start = c.chronicle.start?.nuclear ?? {};
      const rolledBack = Object.entries(start).some(([id, status]) => {
        const now = c.world.countries.find((x) => x.id === id)?.nuclear.status;
        return now !== undefined && NUCLEAR_ORDER.indexOf(now) < NUCLEAR_ORDER.indexOf(status);
      });
      return rolledBack ? lastTurn(c) : null;
    },
  },
  {
    id: "lame_duck",
    name: "Lame Duck",
    rule: "Approval below 30% at any point",
    hint: "",
    infamy: true,
    modes: ALL,
    expected: "COMMON",
    check: (c) => c.chronicle.firsts.lame_duck ?? firstWhere(c, (s) => s.approval < 30),
  },
  {
    id: "the_hawk",
    name: "The Hawk",
    rule: "You started a war",
    hint: "",
    infamy: true,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => {
      if (record(c, "DIPLOMACY_DECLARE_WAR") === 0) return null;
      const me = c.world.playerCountryId;
      const starts = Object.entries(c.chronicle.firsts)
        .filter(([k]) => k.startsWith(`war:${me}-`) && k.endsWith(":start"))
        .map(([, t]) => t);
      return starts.length ? Math.min(...starts) : lastTurn(c);
    },
  },
  {
    id: "pariah",
    name: "Pariah",
    rule: "Three more countries at -60 or worse with you at once",
    hint: "",
    infamy: true,
    modes: ALL,
    expected: "UNCOMMON",
    check: (c) => c.chronicle.firsts.pariah ?? null,
  },
  {
    id: "exposed",
    name: "Caught Red-Handed",
    rule: "A covert operation is exposed",
    hint: "",
    infamy: true,
    modes: ALL,
    expected: "COMMON",
    check: (c) =>
      c.chronicle.covert.exposed > 0 ? (c.chronicle.firsts["covert:exposed"] ?? lastTurn(c)) : null,
  },
  {
    id: "deposed",
    name: "Shown the Door",
    rule: "Lose office by election, coup, revolution or impeachment",
    hint: "",
    infamy: true,
    modes: ALL,
    expected: "COMMON",
    check: (c) =>
      c.world.gameOver && DEPOSED_REASONS.includes(c.world.gameOver.reason)
        ? c.world.gameOver.turn
        : null,
  },
  {
    id: "mushroom_cloud",
    name: "Midnight",
    rule: "A nuclear weapon is used by anyone",
    hint: "",
    infamy: true,
    modes: ALL,
    expected: "LEGENDARY",
    check: (c) =>
      c.chronicle.firsts["nuke:used"] ??
      (c.world.gameOver?.reason === "NUCLEAR_HOLOCAUST" ? c.world.gameOver.turn : null),
  },
  {
    id: "defused",
    name: "Defused",
    rule: "3 stars on a TOUGH or BRUTAL flashpoint seat",
    hint: "Take three stars on a tough or brutal seat",
    infamy: false,
    modes: ["FLASHPOINT"],
    expected: "RARE",
    check: (c) =>
      (c.seatDifficulty === "TOUGH" || c.seatDifficulty === "BRUTAL") &&
      (c.world.outcome?.stars ?? 0) >= 3
        ? lastTurn(c)
        : null,
  },
  {
    id: "history_rewritten",
    name: "History Rewritten",
    rule: "Better than reality on every row of the truth table",
    hint: "Beat reality on every row of the truth table",
    infamy: false,
    modes: ["FLASHPOINT"],
    expected: "RARE",
    check: (c) => {
      const rows = (c.truth ?? []).filter((r) => r.verdict !== "CONTEXT" && r.verdict !== "OPEN");
      return rows.length > 0 && rows.every((r) => r.verdict === "BETTER") ? lastTurn(c) : null;
    },
  },
  {
    id: "re_elected",
    name: "Four More Years",
    rule: "Win the Term election with approval of 55%+",
    hint: "Win the election with approval of 55% or more",
    infamy: false,
    modes: ["TERM"],
    expected: "UNCOMMON",
    check: (c) => {
      const t = c.chronicle.firsts.election_won;
      if (t === undefined || !inOffice(c)) return null;
      const s = series(c).find((x) => x.turn === t);
      return s && s.approval >= 55 ? t : null;
    },
  },
  {
    id: "statecraft",
    name: "Statecraft",
    rule: "Meet the Term statecraft bonus",
    hint: "Meet the statecraft goal: end the inherited war or mend ties with your worst rival",
    infamy: false,
    modes: ["TERM"],
    expected: "RARE",
    check: (c) => {
      if (!inOffice(c)) return null;
      const goal = c.world.objective?.bonus.find((b) => b.kind !== "SCORE_PAR");
      return goal && evaluateCondition(c.world, goal, true).met ? lastTurn(c) : null;
    },
  },
  {
    id: "decade",
    name: "A Decade in Power",
    rule: "Reach month 120",
    hint: "Stay in office for all 120 months",
    infamy: false,
    modes: ["LEGACY"],
    expected: "RARE",
    check: (c) => (inOffice(c) && lastTurn(c) >= 119 ? lastTurn(c) : null),
  },
  {
    id: "dynasty",
    name: "Dynasty",
    rule: "Approval 50%+ in each of the last 24 months",
    hint: "Hold approval at 50% or more through the last two years",
    infamy: false,
    modes: ["LEGACY"],
    expected: "LEGENDARY",
    check: (c) => {
      const last = series(c).slice(-24);
      return inOffice(c) &&
        endedNormally(c) &&
        last.length === 24 &&
        last.every((s) => s.approval >= 50)
        ? lastTurn(c)
        : null;
    },
  },
];

/** The flashpoint side's own seal: all its conditions met at the end (and held by `byTurn`). */
export function checkSignature(ctx: AchievementContext): number | null {
  const sig = ctx.signature;
  if (!sig || sig.conditions.length === 0) return null;
  let latest = ctx.chronicle.series[0]?.turn ?? 0;
  for (const cond of sig.conditions) {
    const h = conditionHistory(ctx.world, ctx.chronicle, cond);
    if (!h.met) return null;
    const since = h.firstHeld ?? lastTurn(ctx);
    if (sig.byTurn !== undefined && since > sig.byTurn - 1) return null;
    latest = Math.max(latest, since);
  }
  return latest;
}

export function appliesTo(def: Pick<AchievementDef, "modes">, mode: GameMode): boolean {
  return def.modes === "ALL" || def.modes.includes(mode);
}

/** Every earned seal with its month (0-based turn), catalogue order, signature last. */
export function earnedAchievements(ctx: AchievementContext): Array<{ id: string; turn: number }> {
  const out: Array<{ id: string; turn: number }> = [];
  for (const def of ACHIEVEMENTS) {
    if (!appliesTo(def, ctx.world.mode)) continue;
    const turn = def.check(ctx);
    if (turn !== null) out.push({ id: def.id, turn });
  }
  if (ctx.signature) {
    const turn = checkSignature(ctx);
    if (turn !== null) out.push({ id: ctx.signature.id, turn });
  }
  return out;
}

/** Rarity tier from a measured earn rate (0-1). */
export function tierFor(rate: number): RarityTier {
  return rate >= 0.4 ? "COMMON" : rate >= 0.15 ? "UNCOMMON" : rate >= 0.04 ? "RARE" : "LEGENDARY";
}

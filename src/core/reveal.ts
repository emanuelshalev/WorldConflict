import {
  ACHIEVEMENTS,
  type AchievementContext,
  appliesTo,
  conditionHistory,
  DEPOSED_REASONS,
  earnedAchievements,
  type RarityTier,
  tierFor,
} from "./achievements.js";
import { emptyChronicle } from "./chronicle.js";
import type { RealityData, SignatureData } from "./data-loader.js";
import {
  conditionMeasure,
  evaluateCondition,
  STAY_IN_POWER,
  shortLabel,
  stayedInPower,
} from "./objectives.js";
import { judgementLine, type PressQuote, pressQuotes, verdictLabel } from "./reveal-text.js";
import { classifyLeadership } from "./scoring.js";
import { militaryStrength } from "./systems/military.js";
import { possessive } from "./text.js";
import type {
  Chronicle,
  ChronicleMoment,
  ChronicleSample,
  CountryState,
  Difficulty,
  GameMode,
  GameOverReason,
  WorldState,
} from "./types.js";

/**
 * The end-of-session reveal (design-reveal.md): a pure function of the finished world, its
 * chronicle and the benchmark files. It is the only place foreign ground truth crosses to the
 * client (the declassified cards), and only once the game is over.
 */

// ---------------------------------------------------------------------------------------
// Payload types (the UI re-declares these in ui/src/store/gameStore.ts)
// ---------------------------------------------------------------------------------------

export type TruthVerdict = "BETTER" | "SAME" | "WORSE" | "CONTEXT" | "OPEN";

export interface BenchmarkStats {
  p10: number;
  p50: number;
  p90: number;
  max: number;
  n: number;
  q: number[]; // 21 quantiles: 0%, 5%, ..., 100%
}
export interface SeatBenchmark {
  seatKey: string;
  fingerprint: string;
  generatedAt: string;
  games: number;
  difficulty: Difficulty;
  policies: Partial<Record<"none" | "random" | "smart", BenchmarkStats>>;
}
export interface AchievementRarity {
  fingerprint: string;
  generatedAt: string;
  games: Partial<Record<GameMode, number>>;
  rates: Partial<Record<GameMode, Record<string, number>>>; // id -> share of runs (0-1)
}

export interface PresidencyPart {
  id: "mission" | "timing" | "leadership" | "finish";
  label: string;
  value: number;
  max: number;
  detail: string;
}
export interface PresidencyScore {
  total: number; // round(sum of parts x modifier.factor)
  raw: number; // sum of parts before the modifier
  parts: PresidencyPart[];
  modifier: { kind: "NONE" | "DEPOSED" | "NUCLEAR"; factor: number; label: string };
  career: { factor: number; total: number; label: string }; // difficulty-weighted, title screen
}

export interface AchievementView {
  id: string;
  name: string;
  rule: string;
  hint: string;
  infamy: boolean;
  signature: boolean;
  tier: RarityTier;
  rate: number | null; // measured share of simulated leaders who earn it (0-1), null if unmeasured
  turn: number | null; // 0-based turn earned; null when locked
  month: number | null; // 1-based
}

export interface MomentView {
  turn: number;
  month: number;
  kind: ChronicleMoment["kind"];
  title: string;
  consequence: string; // "approval 52 to 58"
  text: string; // "Month 6 · The shooting stops · approval 52 to 58"
  tone: ChronicleMoment["tone"];
  weight: number;
  with?: string;
}

export interface SeriesView {
  id: "approval" | "realGrowth" | "stability" | "tension" | "score" | "gdp";
  label: string;
  unit: string;
  higherIsBetter: boolean;
  months: number[]; // 1-based
  values: number[];
  start: number;
  end: number;
  min: number;
  max: number;
  best: number;
  worst: number;
}

export interface RelationRow {
  id: string;
  name: string;
  before: number;
  after: number;
  label: "Closer" | "Cooler" | "Thaw" | "Rupture" | "Steady";
  objective: boolean;
}

export interface DeclassifiedCard {
  id: "nuclear" | "military" | "plots";
  label: string;
  subject: string; // country id
  believed: number | null; // your last estimate (null: you never knew)
  actual: number;
  unit: string;
  note: string;
}

export interface MissedGoal {
  label: string;
  short: string;
  now: number | null;
  need: number | null;
  gap: number | null; // need - now, in the goal's own units (positive)
  unit: string | null;
}

export interface TruthRow {
  topic: string;
  yours: string;
  real: string;
  verdict: TruthVerdict;
  met: boolean | null;
}

export interface RunRecord {
  seatKey: string;
  seed: number;
  seedCode: string;
  difficulty: Difficulty;
  mode: GameMode;
  scenarioId: string;
  flashpointId: string | null;
  countryId: string;
  presidencyScore: number;
  parts: [number, number, number, number]; // mission, timing, leadership, finish
  grade: string;
  stars: number;
  verdict: string;
  victory: boolean;
  achievements: string[];
  series: { approval: number[]; score: number[] };
  choices: Array<{ turn: number; title: string; choice: string }>;
  aiTier: string;
  saveId?: string;
  date?: string;
}

export interface RevealPayload {
  version: 1;
  reduced: boolean; // true for saves without a chronicle: built from scoreHistory
  seat: {
    seatKey: string;
    mode: GameMode;
    scenarioId: string;
    flashpointId: string | null;
    countryId: string;
    countryName: string;
    leader: string;
    difficulty: Difficulty;
    seatDifficulty: "STEADY" | "TOUGH" | "BRUTAL" | null;
    title: string;
    months: number;
    maxTurns: number;
    finalDate: string;
  };
  verdict: {
    victory: boolean;
    stars: number;
    grade: string;
    reason: GameOverReason | null;
    label: string; // the stamp: MISSION COMPLETE, VOTED OUT...
    description: string;
    classification: string;
    justification: string;
    conditions: Array<{ label: string; met: boolean; bonus: boolean }>;
    /** Primary goals missed at the end, with the gap when the goal has a number. */
    missed: MissedGoal[];
    /** "You missed Israel relations 61+ by 1 (60 of 61)." on a failed session; null on a win. */
    missedLine: string | null;
    score: number; // final 0-200 score
    par: number;
  };
  presidency: PresidencyScore;
  achievements: {
    earned: AchievementView[]; // good seals rarest last, then infamy seals
    locked: AchievementView[]; // two "within reach next time" hints
    catalogue: number;
  };
  moments: {
    months: number;
    best: MomentView | null;
    worst: MomentView | null;
    turningPoint: { turn: number; month: number; from: number; to: number; delta: number } | null;
    well: MomentView[];
    bad: MomentView[];
    timing: Array<{ month: number; text: string }>;
  };
  perception: {
    approval: SeriesView;
    elections: Array<{ turn: number; month: number; won: boolean }>;
    caption: string;
    relations: RelationRow[];
    press: PressQuote[];
    judgement: string;
  };
  numbers: {
    series: SeriesView[]; // approval, realGrowth, stability, tension, score
    counts: {
      wars: number;
      deals: number;
      orders: number;
      crises: number;
      livesLost: number;
      covertOk: number;
      covertExposed: number;
    };
  };
  declassified: DeclassifiedCard[];
  truth: {
    asOf: string;
    rows: TruthRow[];
    fear: string | null;
    sources: string[];
    debrief: string;
  } | null;
  replay: {
    seed: number;
    seedCode: string;
    seatKey: string;
    mode: GameMode;
    scenarioId: string;
    flashpointId: string | null;
    countryId: string;
    difficulty: Difficulty;
    deterministic: boolean;
    aiTiersUsed: string[];
  };
  ranking: {
    seatKey: string;
    benchmarks: SeatBenchmark["policies"] | null;
    ticks: Array<{ id: string; label: string; score: number }>;
    percentile: number | null; // share of competent-staff benchmark runs beaten (0-100)
    percentileLabel: string | null;
    personalBest: number | null;
  };
  beatNext: string;
  run: RunRecord;
}

export interface RevealContext {
  benchmarks?: SeatBenchmark | null;
  rarity?: AchievementRarity | null;
  reality?: RealityData | null;
  signature?: SignatureData | null;
  sources?: string[]; // the flashpoint's source list (reality.sources index into it)
  seatDifficulty?: "STEADY" | "TOUGH" | "BRUTAL" | null;
  personalBest?: number | null;
  saveId?: string;
  date?: string;
}

// ---------------------------------------------------------------------------------------
// Seats and seed codes
// ---------------------------------------------------------------------------------------

export function seatKeyOf(
  world: Pick<WorldState, "flashpointId" | "scenarioId" | "mode" | "playerCountryId">,
): string {
  return world.flashpointId
    ? `${world.flashpointId}:${world.playerCountryId}`
    : `${world.scenarioId}:${world.mode}:${world.playerCountryId}`;
}

/** A seat key as a file name (no colons, for Windows): "hormuz-convoy_USA". */
export function seatFileName(seatKey: string): string {
  return `${seatKey.replace(/:/g, "_")}.json`;
}

/** Two letters per flashpoint: initials of its first two words ("hormuz-convoy" is HC). */
export function flashpointPrefix(id: string): string {
  const words = id.split("-").filter(Boolean);
  return (
    words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? "XX").slice(0, 2)
  ).toUpperCase();
}

/** "HC-USA-1A2B3" for a flashpoint seat; "T2026-USA-1A2B3" for a Term (L: Legacy). */
export function seedCodeOf(
  world: Pick<WorldState, "flashpointId" | "scenarioId" | "mode" | "playerCountryId" | "seed">,
): string {
  const head = world.flashpointId
    ? flashpointPrefix(world.flashpointId)
    : `${world.mode[0]}${world.scenarioId}`;
  return `${head}-${world.playerCountryId}-${(world.seed >>> 0).toString(36).toUpperCase()}`;
}

export interface ParsedSeedCode {
  seed: number;
  playerCountryId: string;
  flashpointId?: string;
  scenarioId?: string;
  mode: GameMode;
}

/** Parse a seed code back to a seat and seed; null when it names no known seat. */
export function parseSeedCode(
  code: string,
  flashpoints: Array<{ id: string; playable: Array<{ countryId: string }> }>,
): ParsedSeedCode | null {
  const m = /^([A-Z0-9]+)-([A-Z]{3})-([0-9A-Z]+)$/.exec(code.trim().toUpperCase());
  if (!m) return null;
  const [, head, country, seedPart] = m;
  const seed = Number.parseInt(seedPart, 36);
  if (!Number.isFinite(seed) || seed > 0xffffffff) return null;
  const modes: Record<string, GameMode> = { T: "TERM", L: "LEGACY", F: "FLASHPOINT" };
  const scenario = /^([TLF])(\d{4})$/.exec(head);
  if (scenario)
    return { seed, playerCountryId: country, scenarioId: scenario[2], mode: modes[scenario[1]] };
  const fp = [...flashpoints]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find(
      (f) => flashpointPrefix(f.id) === head && f.playable.some((p) => p.countryId === country),
    );
  return fp ? { seed, playerCountryId: country, flashpointId: fp.id, mode: "FLASHPOINT" } : null;
}

// ---------------------------------------------------------------------------------------
// Presidency Score
// ---------------------------------------------------------------------------------------

const CAREER_FACTOR: Record<Difficulty, number> = { ANALYST: 0.85, STATESMAN: 1, STRONGMAN: 1.15 };

/** The conditions Timing measures: primary ones, else bonus ones (electoral Terms have none). */
function timingConditions(world: WorldState): { from: number; to: number } | null {
  const primary = world.objective?.primary.length ?? 0;
  const bonus = world.objective?.bonus.length ?? 0;
  if (primary > 0) return { from: 0, to: primary };
  if (bonus > 0) return { from: primary, to: primary + bonus };
  return null;
}

export function presidencyScore(world: WorldState, chronicle: Chronicle): PresidencyScore {
  const outcome = world.outcome;
  const conditions = outcome?.conditions ?? [
    { label: STAY_IN_POWER, met: stayedInPower(world), bonus: false },
  ];
  const primary = conditions.filter((c) => !c.bonus);
  const bonusMet = conditions.filter((c) => c.bonus && c.met).length;
  // The goals the desk counts (GoalLine: objective.primary); staying in power is said apart
  // (QA3R-2b: the verdict said 5 of 5 where the desk had said 4 of 4)
  const survival = primary.find((c) => c.label === STAY_IN_POWER);
  const goals = primary.filter((c) => c !== survival);
  const removed = survival && !survival.met ? ", removed from office" : "";
  const missionDetail = goals.length
    ? `${goals.filter((c) => c.met).length} of ${goals.length} goals met${removed}, ${bonusMet} bonus`
    : `${survival?.met === false ? "Removed from office" : "Stayed in power"}, ${bonusMet} bonus`;
  // The Finish compares with par, the usual score for the seat; when the mission's own score goal
  // is another number, the line names both (QA3R-2c: "missed 120 by 3" beside "par 115")
  const scoreGoal = world.objective?.primary.find((c) => c.kind === "SCORE_PAR")?.min;
  const primaryShare = primary.length ? primary.filter((c) => c.met).length / primary.length : 0;
  const mission = Math.round(300 * primaryShare + Math.min(100, 50 * bonusMet));

  const rows = chronicle.series;
  const months = Math.max(1, world.maxTurns);
  const span = timingConditions(world);
  const metMonths = span
    ? rows.filter((s) => {
        const slice = s.objectives.slice(span.from, span.to);
        return slice.length === span.to - span.from && slice.every(Boolean);
      }).length
    : rows.length;
  const timing = Math.round(Math.min(100, (100 * metMonths) / months));

  const meanScore = rows.length
    ? rows.reduce((s, r) => s + r.score, 0) / rows.length
    : world.score.total;
  const leadership = Math.round(Math.min(300, 1.5 * meanScore));
  const par = world.objective?.par ?? 100;
  const finish = Math.round(
    Math.max(0, Math.min(200, (100 * world.score.total) / Math.max(1, par))),
  );

  const reason = world.gameOver?.reason ?? null;
  const modifier: PresidencyScore["modifier"] =
    reason === "NUCLEAR_HOLOCAUST"
      ? { kind: "NUCLEAR", factor: 0, label: "Nuclear holocaust: nothing survives" }
      : reason && DEPOSED_REASONS.includes(reason)
        ? { kind: "DEPOSED", factor: 0.6, label: "Removed from office: x0.6" }
        : { kind: "NONE", factor: 1, label: "" };
  const raw = mission + timing + leadership + finish;
  const total = Math.round(raw * modifier.factor);
  const careerFactor = CAREER_FACTOR[world.difficulty] ?? 1;
  return {
    total,
    raw,
    modifier,
    career: {
      factor: careerFactor,
      total: Math.round(total * careerFactor),
      label: `Career points (difficulty x${careerFactor})`,
    },
    parts: [
      {
        id: "mission",
        label: "Mission",
        value: mission,
        max: 400,
        detail: missionDetail,
      },
      {
        id: "timing",
        label: "Timing",
        value: timing,
        max: 100,
        detail: span
          ? `All ${span.from === 0 ? "goals" : "bonus goals"} met in ${metMonths} of ${months} months`
          : `In office ${metMonths} of ${months} months`,
      },
      {
        id: "leadership",
        label: "Leadership",
        value: leadership,
        max: 300,
        detail: `Average score ${Math.round(meanScore)} (x1.5)`,
      },
      {
        id: "finish",
        label: "Finish",
        value: finish,
        max: 200,
        detail:
          scoreGoal !== undefined && scoreGoal !== par
            ? `Final score ${world.score.total} against par ${par}, the usual score for this seat (your goal was ${scoreGoal}+)`
            : `Final score ${world.score.total} against par ${par}`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------

function playerOf(world: WorldState): CountryState | undefined {
  return world.countries.find((c) => c.id === world.playerCountryId);
}
function nameOf(world: WorldState, id: string): string {
  return world.countries.find((c) => c.id === id)?.name ?? id;
}

/** Old saves: rebuild a thin series from scoreHistory so the reveal still has numbers. */
function reducedChronicle(world: WorldState): Chronicle {
  const ch = emptyChronicle();
  const me = playerOf(world);
  ch.series = world.scoreHistory.map((h) => ({
    turn: h.turn,
    approval: h.approval,
    stability: h.stability,
    legitimacy: me?.legitimacy ?? 50,
    realGrowth: me?.realGrowth ?? 0,
    gdp: h.gdp,
    tension: h.globalTension,
    score: h.score,
    parts: [world.score.economic, world.score.security, world.score.approval, world.score.prestige],
    objectives: [],
    relations: {},
    playerWars: 0,
    capital: 0,
    orders: 0,
  }));
  return ch;
}

function seriesView(
  rows: ChronicleSample[],
  id: SeriesView["id"],
  label: string,
  unit: string,
  higherIsBetter: boolean,
  read: (s: ChronicleSample) => number,
  start?: number,
): SeriesView {
  const values = rows.map(read);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return {
    id,
    label,
    unit,
    higherIsBetter,
    months: rows.map((s) => s.turn + 1),
    values,
    // The take-office value when the session recorded it, so the chart, the caption and the press
    // all start where the briefing did (not after month 1)
    start: start ?? values[0] ?? 0,
    end: values.at(-1) ?? 0,
    min,
    max,
    best: higherIsBetter ? max : min,
    worst: higherIsBetter ? min : max,
  };
}

/**
 * The biggest measured move of the month a moment happened in ("approval 52 to 58"), only when
 * it agrees with the moment: a moment that went well never cites a falling number, one that went
 * badly never an improving one (QA S2-1). Objective moments carry their own number already.
 */
function consequence(
  rows: ChronicleSample[],
  turn: number,
  fallback: string,
  tone: ChronicleMoment["tone"] = "neutral",
): string {
  const i = rows.findIndex((s) => s.turn === turn);
  if (i < 0) return fallback;
  const now = rows[i];
  const prev = rows[i - 1];
  if (!prev) return fallback;
  const moves = [
    { label: "approval", a: prev.approval, b: now.approval, unit: "%", up: true },
    { label: "stability", a: prev.stability, b: now.stability, unit: "%", up: true },
    { label: "tension", a: prev.tension, b: now.tension, unit: "", up: false },
    { label: "score", a: prev.score, b: now.score, unit: "", up: true },
  ]
    .filter((m) => {
      if (tone === "neutral") return true;
      const better = m.b > m.a === m.up;
      return tone === "good" ? better : !better;
    })
    .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a));
  const top = moves[0];
  if (!top || Math.abs(top.b - top.a) < 1) return fallback;
  const move = `${top.label} ${Math.round(top.a)}${top.unit} to ${Math.round(top.b)}${top.unit}`;
  return fallback ? `${fallback}, ${move}` : move;
}

function momentView(m: ChronicleMoment, rows: ChronicleSample[]): MomentView {
  const detail = m.kind === "CRISIS" ? (m.choice ?? "") : m.detail;
  const short = detail.replace(/[.!?]+$/, "");
  const objective = m.kind === "OBJECTIVE_MET" || m.kind === "OBJECTIVE_LOST";
  // Crises and orders cite their own numbers, never the month's largest move (QA3R-2d)
  const own = m.kind === "ORDER" || m.kind === "CRISIS";
  const lead = short.length <= 60 ? short : "";
  const cons = objective
    ? short
    : own
      ? [lead, m.fact].filter(Boolean).join(", ")
      : consequence(rows, m.turn, lead, m.tone);
  return {
    turn: m.turn,
    month: m.turn + 1,
    kind: m.kind,
    title: m.title,
    consequence: cons,
    text: `Month ${m.turn + 1} · ${m.title}${cons ? ` · ${cons}` : ""}`,
    tone: m.tone,
    weight: m.weight,
    ...(m.with ? { with: m.with } : {}),
  };
}

function topDistinct(moments: ChronicleMoment[], n: number): ChronicleMoment[] {
  const seen = new Set<string>();
  const out: ChronicleMoment[] = [];
  for (const m of moments) {
    if (seen.has(m.title)) continue;
    seen.add(m.title);
    out.push(m);
    if (out.length === n) break;
  }
  return out;
}

function relationLabel(before: number, after: number): RelationRow["label"] {
  const d = after - before;
  if (d <= -20 && after < -30) return "Rupture";
  if (d >= 10 && before < 0) return "Thaw";
  if (d >= 10) return "Closer";
  if (d <= -10) return "Cooler";
  return "Steady";
}

function percentileOf(score: number, q: number[]): number | null {
  if (q.length < 2) return null;
  if (score <= q[0]) return 0;
  if (score >= q[q.length - 1]) return 100;
  const step = 100 / (q.length - 1);
  // The share of runs strictly below: the last quantile under the score, interpolated
  for (let i = q.length - 2; i >= 0; i--) {
    if (score > q[i]) {
      const hi = q[i + 1];
      const frac = hi > q[i] ? Math.min(1, (score - q[i]) / (hi - q[i])) : 1;
      return Math.round(step * i + step * frac);
    }
  }
  return 0;
}

/** A number as the goal line shows it: whole when it is whole, else one decimal. */
function goalNum(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Primary goals missed at the end, in objective order, with the gap for numeric ones. */
export function missedGoals(world: WorldState): MissedGoal[] {
  return (world.objective?.primary ?? [])
    .filter((c) => !evaluateCondition(world, c, false).met)
    .map((c) => {
      const m = conditionMeasure(world, c);
      const now = m ? Math.round(m.now * 10) / 10 : null;
      return {
        label: c.label,
        short: shortLabel(c),
        now,
        need: m ? m.need : null,
        gap: m && now !== null ? Math.max(0.1, Math.round((m.need - now) * 10) / 10) : null,
        unit: m ? m.unit : null,
      };
    });
}

/** "You missed Israel relations 61+ by 1 (60 of 61)." The one line a failed run must answer. */
export function missedSentence(
  missed: MissedGoal[],
  deposed: boolean,
  description?: string,
): string | null {
  if (deposed) return description ? `Removed from office: ${description}` : "Removed from office.";
  if (!missed.length) return null;
  const one = (g: MissedGoal) =>
    g.gap !== null && g.now !== null && g.need !== null
      ? `${g.short} by ${goalNum(g.gap)}${g.unit === "%" ? " points" : ""} (${goalNum(g.now)} of ${goalNum(g.need)})`
      : g.short;
  const [first, ...rest] = missed;
  return rest.length === 0
    ? `You missed ${one(first)}.`
    : `You missed ${one(first)}, and ${rest.length === 1 ? one(rest[0]) : `${rest.length} more goals`}.`;
}

/**
 * The truth table's "No peace by the end" must not contradict a ceasefire the player chose: when
 * the war went on after you offered or signed one, say so (who did not sign, or that it broke).
 */
function missedWarEnd(
  world: WorldState,
  chronicle: Chronicle,
  cond: { kind: string; targetId?: string; otherId?: string },
): string | null {
  if (cond.kind !== "WAR_ENDED") return null;
  const me = world.playerCountryId;
  const sides = [cond.targetId, cond.otherId];
  if (!sides.includes(me)) return null;
  const enemy = sides.find((x) => x && x !== me) ?? "";
  const enemyName = nameOf(world, enemy);
  const ended =
    chronicle.firsts[`war:${me}-${enemy}:end`] ?? chronicle.firsts[`war:${enemy}-${me}:end`];
  if (ended !== undefined)
    return `A ceasefire in month ${ended + 1} did not hold: the war with ${enemyName} was back on by the end.`;
  const offer = chronicle.moments
    .filter((m) => m.kind === "CRISIS" && !!m.choice && /ceasefire|truce|armistice/i.test(m.choice))
    .sort((a, b) => a.turn - b.turn)
    .at(-1);
  const tried = world.director.record?.["DIPLOMACY_PROPOSE_CEASEFIRE:tried"] ?? 0;
  if (offer)
    return `You chose "${offer.choice}" in month ${offer.turn + 1}, but ${enemyName} did not sign: no peace by the end.`;
  if (tried > 0)
    return `You offered a ceasefire${tried > 1 ? ` ${tried} times` : ""}, but ${enemyName} did not sign: no peace by the end.`;
  return null;
}

// ---------------------------------------------------------------------------------------
// The reveal
// ---------------------------------------------------------------------------------------

export function buildReveal(world: WorldState, ctx: RevealContext = {}): RevealPayload {
  const me = playerOf(world);
  const reduced = !world.chronicle || world.chronicle.series.length === 0;
  const chronicle = reduced ? reducedChronicle(world) : (world.chronicle as Chronicle);
  const rows = chronicle.series;
  const seatKey = seatKeyOf(world);
  const seedCode = seedCodeOf(world);
  const assessment = classifyLeadership(world);
  const reason = world.gameOver?.reason ?? null;
  const victory = world.outcome?.victory ?? false;
  const stars = world.outcome?.stars ?? 0;
  const deposed = !!reason && DEPOSED_REASONS.includes(reason);
  const months = rows.length;
  const name = (id: string) => nameOf(world, id);

  // ---- Truth table -----------------------------------------------------------------
  const reality = ctx.reality ?? null;
  let truth: RevealPayload["truth"] = null;
  if (reality || world.objective?.debrief) {
    const truthRows: TruthRow[] = (reality?.rows ?? []).map((row) => {
      if (!row.yours || row.better === "context")
        return {
          topic: row.topic,
          yours: row.yoursText?.met ?? "",
          real: row.real,
          verdict: "CONTEXT",
          met: null,
        };
      const h = conditionHistory(world, chronicle, row.yours);
      const result = h.met ? "met" : "missed";
      const verdict: TruthVerdict =
        row.better === "same"
          ? h.met
            ? "SAME"
            : "WORSE"
          : result === row.better
            ? "BETTER"
            : row.same === result
              ? "SAME"
              : "WORSE";
      const template = row.yoursText
        ? h.met
          ? row.yoursText.met
          : row.yoursText.missed
        : `${h.met ? "Met" : "Missed"}: ${row.yours.label}`;
      const firstMet = (h.firstHeld ?? rows.at(-1)?.turn ?? 0) + 1;
      const honest = h.met ? null : missedWarEnd(world, chronicle, row.yours);
      return {
        topic: row.topic,
        yours: (honest ?? template)
          .replace(/\{firstMet\}/g, String(firstMet))
          .replace(/\{lastMonth\}/g, String(world.maxTurns)),
        real: row.real,
        verdict,
        met: h.met,
      };
    });
    truth = {
      asOf: reality?.asOf ?? "2026-11",
      rows: truthRows,
      fear: reality?.fear ?? null,
      sources: (reality?.sources ?? [])
        .map((i) => ctx.sources?.[i])
        .filter((s): s is string => typeof s === "string"),
      debrief: world.objective?.debrief ?? "",
    };
  }

  // ---- Achievements --------------------------------------------------------------------
  const achCtx: AchievementContext = {
    world,
    chronicle,
    truth: truth?.rows,
    seatDifficulty: ctx.seatDifficulty ?? undefined,
    signature: ctx.signature ?? undefined,
  };
  const earnedIds = earnedAchievements(achCtx);
  const rates = ctx.rarity?.rates?.[world.mode] ?? {};
  const view = (
    def: {
      id: string;
      name: string;
      rule: string;
      hint: string;
      infamy: boolean;
      expected: RarityTier;
    },
    turn: number | null,
    signature = false,
  ): AchievementView => {
    const rate = rates[def.id];
    return {
      id: def.id,
      name: def.name,
      rule: def.rule,
      hint: def.hint,
      infamy: def.infamy,
      signature,
      tier: rate !== undefined ? tierFor(rate) : def.expected,
      rate: rate ?? null,
      turn,
      month: turn === null ? null : turn + 1,
    };
  };
  const sigDef = ctx.signature
    ? {
        id: ctx.signature.id,
        name: ctx.signature.name,
        rule: ctx.signature.rule,
        hint: ctx.signature.rule,
        infamy: false,
        expected: "RARE" as RarityTier,
      }
    : null;
  const tierRank: Record<RarityTier, number> = { COMMON: 0, UNCOMMON: 1, RARE: 2, LEGENDARY: 3 };
  const earned: AchievementView[] = earnedIds.map(({ id, turn }) => {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    return def ? view(def, turn) : view(sigDef as NonNullable<typeof sigDef>, turn, true);
  });
  const scarcity = (a: AchievementView) => a.rate ?? 1 - tierRank[a.tier] * 0.3;
  earned.sort(
    (a, b) =>
      Number(a.infamy) - Number(b.infamy) || scarcity(b) - scarcity(a) || a.id.localeCompare(b.id),
  );
  const earnedSet = new Set(earned.map((a) => a.id));
  const lockedPool: AchievementView[] = [
    ...ACHIEVEMENTS.filter(
      (a) => !a.infamy && appliesTo(a, world.mode) && !earnedSet.has(a.id),
    ).map((a) => view(a, null)),
    ...(sigDef && !earnedSet.has(sigDef.id) ? [view(sigDef, null, true)] : []),
  ];
  // Within reach: the signature first, then the most commonly earned seals you missed
  const locked = lockedPool
    .sort(
      (a, b) =>
        Number(b.signature) - Number(a.signature) ||
        scarcity(b) - scarcity(a) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 2);
  const catalogue = ACHIEVEMENTS.filter((a) => appliesTo(a, world.mode)).length + (sigDef ? 1 : 0);

  // ---- Presidency Score ------------------------------------------------------------
  const presidency = presidencyScore(world, chronicle);

  // ---- Moments ---------------------------------------------------------------------
  const moments = chronicle.moments;
  const byWeight = [...moments].sort((a, b) => b.weight - a.weight || a.turn - b.turn);
  const bestM = byWeight.find((m) => m.weight > 0) ?? null;
  const worstM = [...byWeight].reverse().find((m) => m.weight < 0) ?? null;
  let turningPoint: RevealPayload["moments"]["turningPoint"] = null;
  for (let i = 3; i < rows.length; i++) {
    const delta = rows[i].score - rows[i - 3].score;
    if (!turningPoint || Math.abs(delta) > Math.abs(turningPoint.delta))
      turningPoint = {
        turn: rows[i].turn,
        month: rows[i].turn + 1,
        from: rows[i - 3].score,
        to: rows[i].score,
        delta,
      };
  }
  const well = topDistinct(
    byWeight.filter((m) => m.tone === "good"),
    3,
  ).map((m) => momentView(m, rows));
  const bad = topDistinct(
    [...byWeight].reverse().filter((m) => m.tone === "bad"),
    3,
  ).map((m) => momentView(m, rows));
  const timing: Array<{ month: number; text: string }> = [];
  const conditions = [...(world.objective?.primary ?? [])];
  conditions.forEach((cond, i) => {
    const since = chronicle.firsts[`cond:${i}`];
    if (since === undefined || !rows.at(-1)?.objectives[i]) return;
    timing.push(
      since <= (rows[0]?.turn ?? 0)
        ? { month: since + 1, text: `${cond.label}: all ${months} months` }
        : { month: since + 1, text: `${cond.label}: from month ${since + 1}` },
    );
  });
  for (const m of moments.filter((x) => x.kind === "WAR_END" || x.kind === "WAR_START"))
    timing.push({
      month: m.turn + 1,
      text:
        m.kind === "WAR_END"
          ? `Ended the war with ${name(m.with ?? "")} in month ${m.turn + 1} of ${world.maxTurns}`
          : `War with ${name(m.with ?? "")} began in month ${m.turn + 1}`,
    });
  for (const m of moments.filter((x) => x.kind === "ELECTION"))
    timing.push({ month: m.turn + 1, text: `${m.title} in month ${m.turn + 1}` });
  timing.sort((a, b) => a.month - b.month);

  // ---- Perception ------------------------------------------------------------------
  const start = chronicle.start;
  const rnd = (v: number | undefined) => (v === undefined ? undefined : Math.round(v));
  const approval = seriesView(
    rows,
    "approval",
    "Approval",
    "%",
    true,
    (s) => Math.round(s.approval),
    rnd(start?.approval),
  );
  const elections = moments
    .filter((m) => m.kind === "ELECTION")
    .map((m) => ({ turn: m.turn, month: m.turn + 1, won: m.tone === "good" }));
  const caption = rows.length
    ? `Started at ${approval.start}%, low ${Math.min(approval.min, approval.start)}%, high ${Math.max(approval.max, approval.start)}%, ended at ${approval.end}%`
    : "";
  const tracked = chronicle.start?.tracked ?? Object.keys(rows[0]?.relations ?? {});
  const objectiveIds = new Set(
    [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])]
      .flatMap((c) => [c.targetId, c.otherId])
      .filter(Boolean) as string[],
  );
  const relRows: RelationRow[] = tracked
    .map((id) => {
      const before = chronicle.start?.relations[id] ?? rows[0]?.relations[id] ?? 0;
      const after = rows.at(-1)?.relations[id] ?? Math.round(me?.relations[id] ?? 0);
      return {
        id,
        name: name(id),
        before,
        after,
        label: relationLabel(before, after),
        objective: objectiveIds.has(id),
      };
    })
    .sort(
      (a, b) =>
        Number(b.objective) - Number(a.objective) ||
        Math.abs(b.after - b.before) - Math.abs(a.after - a.before) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
  const allyRow = [...relRows]
    .filter((r) => r.before >= 30 && r.id !== chronicle.start?.worstRival)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))[0];
  const rivalId = chronicle.start?.worstRival;
  const rival = rivalId ? world.countries.find((c) => c.id === rivalId) : undefined;
  const rivalBefore = rivalId ? (chronicle.start?.relations[rivalId] ?? 0) : 0;
  const rivalAfter = rivalId
    ? (rows.at(-1)?.relations[rivalId] ?? Math.round(me?.relations[rivalId] ?? 0))
    : 0;
  const press = pressQuotes(world, {
    country: me?.name ?? world.playerCountryId,
    approvalStart: approval.start,
    approvalEnd: approval.end,
    growthEnd: rows.at(-1)?.realGrowth ?? 0,
    ally: allyRow
      ? { name: allyRow.name, before: allyRow.before, after: allyRow.after }
      : undefined,
    rival: rival
      ? {
          name: rival.name,
          before: rivalBefore,
          after: rivalAfter,
          autocracy: rival.regimeType !== "DEMOCRACY",
        }
      : undefined,
    warsStarted: moments.filter(
      (m) => m.kind === "WAR_START" && m.with === rivalId && m.detail === "You went to war",
    ).length,
    warsEnded: moments.filter((m) => m.kind === "WAR_END" && m.with === rivalId).length,
  });
  const bestSeal = earned.find((a) => !a.infamy && (a.tier === "RARE" || a.tier === "LEGENDARY"));
  const judgement = judgementLine(world, {
    victory,
    deposed,
    classification: assessment.style,
    bestAchievement: bestSeal?.name,
  });

  // ---- Numbers ---------------------------------------------------------------------
  const enemies = new Set<string>([
    ...moments
      .filter((m) => m.kind === "WAR_START" || m.kind === "WAR_END")
      .map((m) => m.with ?? ""),
    ...(me?.atWarWith ?? []),
  ]);
  enemies.delete("");
  const numbers: RevealPayload["numbers"] = {
    series: [
      approval,
      seriesView(
        rows,
        "realGrowth",
        "Real growth",
        "%",
        true,
        (s) => Math.round(s.realGrowth * 1000) / 10,
        start?.realGrowth === undefined ? undefined : Math.round(start.realGrowth * 1000) / 10,
      ),
      seriesView(
        rows,
        "stability",
        "Stability",
        "%",
        true,
        (s) => Math.round(s.stability),
        rnd(start?.stability),
      ),
      seriesView(
        rows,
        "tension",
        "World tension",
        "",
        false,
        (s) => Math.round(s.tension),
        rnd(start?.tension),
      ),
      seriesView(rows, "score", "Score", "", true, (s) => s.score, start?.score),
    ],
    counts: {
      wars: enemies.size,
      deals: chronicle.deals,
      orders: rows.reduce((s, r) => s + r.orders, 0),
      crises: moments.filter((m) => m.kind === "CRISIS").length,
      livesLost: chronicle.casualties,
      covertOk: chronicle.covert.ok,
      covertExposed: chronicle.covert.exposed,
    },
  };

  // ---- Declassified (ground truth, post-game only) ---------------------------------
  const declassified: DeclassifiedCard[] = [];
  const nuclearTarget =
    world.objective?.primary.find((c) => c.kind === "NO_NUCLEAR")?.targetId ?? rivalId;
  const nt = nuclearTarget ? world.countries.find((c) => c.id === nuclearTarget) : undefined;
  const belief = nt ? me?.beliefs[nt.id] : undefined;
  if (nt && (nt.nuclear.status !== "NONE" || (belief?.nuclearProgress ?? 0) > 0))
    declassified.push({
      id: "nuclear",
      label: `${possessive(nt.name)} nuclear program`,
      subject: nt.id,
      believed: belief ? Math.round(belief.nuclearProgress) : null,
      actual: Math.round(nt.nuclear.progress),
      unit: "%",
      note: `Status at the end: ${nt.nuclear.status.toLowerCase()}`,
    });
  const rb = rival ? me?.beliefs[rival.id] : undefined;
  if (rival && rb)
    declassified.push({
      id: "military",
      label: `${possessive(rival.name)} real military strength`,
      subject: rival.id,
      believed: Math.round(rb.militaryStrength),
      actual: Math.round(militaryStrength(rival)),
      unit: "",
      note: `Your estimate was ${Math.round(rb.accuracy)}% confident`,
    });
  const plotter = Object.entries(chronicle.plots).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0];
  if (plotter)
    declassified.push({
      id: "plots",
      label: "Covert operations against you",
      subject: plotter[0],
      believed: null,
      actual: plotter[1],
      unit: "",
      note: `${name(plotter[0])} ran ${plotter[1]} operation${plotter[1] === 1 ? "" : "s"} against you`,
    });

  // ---- Ranking and next time -------------------------------------------------------
  const policies = ctx.benchmarks?.policies ?? null;
  const ticks: RevealPayload["ranking"]["ticks"] = [];
  if (policies) {
    if (policies.none)
      ticks.push({ id: "none", label: "Do-nothing staff", score: policies.none.p50 });
    if (policies.random)
      ticks.push({ id: "random", label: "Random staff", score: policies.random.p50 });
    if (policies.smart) {
      ticks.push({ id: "smart_p50", label: "Competent staff", score: policies.smart.p50 });
      ticks.push({ id: "smart_p90", label: "Competent staff, top 10%", score: policies.smart.p90 });
    }
    const best = Math.max(...Object.values(policies).map((p) => p?.max ?? 0));
    if (best > 0) ticks.push({ id: "best", label: "Best known", score: best });
  }
  const percentile = policies?.smart ? percentileOf(presidency.total, policies.smart.q) : null;

  const statuses = world.outcome?.conditions ?? [];
  const missedBonus = statuses.find((c) => c.bonus && !c.met);
  const missedPrimary = statuses.find((c) => !c.bonus && !c.met);
  const timingPart = presidency.parts.find((p) => p.id === "timing")?.value ?? 100;
  const beatNext = missedPrimary
    ? `Win first: ${missedPrimary.label}`
    : missedBonus
      ? `The next star is ${missedBonus.label}`
      : timingPart < 100
        ? `Meet all goals 2 months earlier for about +${Math.round((200 / Math.max(1, world.maxTurns)) * presidency.modifier.factor)}`
        : locked[0]
          ? `Within reach: ${locked[0].name} (${locked[0].hint})`
          : `Beat ${presidency.total}`;

  const tiers = chronicle.aiTiersUsed;
  const deterministic = tiers.every((t) => t === "ALGORITHMIC");
  const aiTier = tiers.includes("FULL_LLM")
    ? "FULL_LLM"
    : tiers.includes("KEY_DECISIONS")
      ? "KEY_DECISIONS"
      : "ALGORITHMIC";
  const parts = presidency.parts.map((p) => p.value) as [number, number, number, number];
  const label = verdictLabel(world, victory, reason);
  const missed = victory ? [] : missedGoals(world);
  const missedLine = victory ? null : missedSentence(missed, deposed, world.gameOver?.description);

  return {
    version: 1,
    reduced,
    seat: {
      seatKey,
      mode: world.mode,
      scenarioId: world.scenarioId,
      flashpointId: world.flashpointId,
      countryId: world.playerCountryId,
      countryName: me?.name ?? world.playerCountryId,
      leader: me ? `${me.leader.title} ${me.leader.name}` : "",
      difficulty: world.difficulty,
      seatDifficulty: ctx.seatDifficulty ?? null,
      title: world.objective?.title ?? "",
      months,
      maxTurns: world.maxTurns,
      finalDate: world.date,
    },
    verdict: {
      victory,
      stars,
      grade: assessment.grade,
      reason,
      label,
      description: world.gameOver?.description ?? "",
      classification: assessment.classification,
      justification: assessment.justification,
      conditions: statuses,
      missed,
      missedLine,
      score: world.score.total,
      par: world.objective?.par ?? 100,
    },
    presidency,
    achievements: { earned, locked, catalogue },
    moments: {
      months: world.maxTurns,
      best: bestM ? momentView(bestM, rows) : null,
      worst: worstM ? momentView(worstM, rows) : null,
      turningPoint,
      well,
      bad,
      timing: timing.slice(0, 3),
    },
    perception: { approval, elections, caption, relations: relRows, press, judgement },
    numbers,
    declassified: declassified.slice(0, 3),
    truth,
    replay: {
      seed: world.seed,
      seedCode,
      seatKey,
      mode: world.mode,
      scenarioId: world.scenarioId,
      flashpointId: world.flashpointId,
      countryId: world.playerCountryId,
      difficulty: world.difficulty,
      deterministic,
      aiTiersUsed: tiers,
    },
    ranking: {
      seatKey,
      benchmarks: policies,
      ticks,
      percentile,
      percentileLabel:
        percentile === null ? null : `better than ${percentile}% of simulated competent leaders`,
      personalBest: ctx.personalBest ?? null,
    },
    beatNext,
    run: {
      seatKey,
      seed: world.seed,
      seedCode,
      difficulty: world.difficulty,
      mode: world.mode,
      scenarioId: world.scenarioId,
      flashpointId: world.flashpointId,
      countryId: world.playerCountryId,
      presidencyScore: presidency.total,
      parts,
      grade: assessment.grade,
      stars,
      verdict: label,
      victory,
      achievements: earned.map((a) => a.id),
      series: {
        approval: rows.map((s) => Math.round(s.approval)),
        score: rows.map((s) => s.score),
      },
      choices: moments
        .filter((m) => m.kind === "CRISIS")
        .sort((a, b) => a.turn - b.turn)
        .map((m) => ({ turn: m.turn, title: m.title, choice: m.choice ?? "" })),
      aiTier,
      ...(ctx.saveId ? { saveId: ctx.saveId } : {}),
      ...(ctx.date ? { date: ctx.date } : {}),
    },
  };
}

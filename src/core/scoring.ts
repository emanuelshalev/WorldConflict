import { effectiveGrowth } from "./systems/economy.js";
import type { CountryState, ScoreMove, WorldState } from "./types.js";

/**
 * Leadership evaluated on a 0-200 scale: four components of 0-50 each
 * (economic, security, internal approval, world prestige). Scores move
 * incrementally each turn toward the level the current situation deserves.
 *
 * Every target is built as a list of named terms (scoreBreakdown), and updateScore moves the
 * score with the same list, so the "why your score moved" sheet can never disagree with the maths.
 */

export interface ScoreTerm {
  label: string;
  points: number;
}
export type ScoreComponent = "economic" | "security" | "approval" | "prestige";
export const SCORE_COMPONENTS: ScoreComponent[] = ["economic", "security", "approval", "prestige"];

/** Each part drifts this share of the way to its heading every month. */
export const SCORE_DRIFT = 0.15;
/** A situation earns 90% of its raw target: the heading. */
export const SCORE_HEADING = 0.9;

export interface ScorePartBreakdown {
  value: number; // the part now
  raw: number; // the raw target (0-50)
  target: number; // where it is heading: raw x 0.9
  terms: ScoreTerm[]; // in heading points; they sum to target
}
export type ScoreBreakdown = Record<ScoreComponent, ScorePartBreakdown>;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function termsEconomic(player: CountryState): ScoreTerm[] {
  const t: ScoreTerm[] = [{ label: "Base", points: 20 }];
  // Real growth (after war, instability and embargo drags) against the country's own trend:
  // matching your structural trend is par, beating it scores
  const trend = player.trendGrowth ?? player.economyProfile?.growthRate ?? 0.02;
  const real = player.realGrowth ?? effectiveGrowth(player);
  // Growing at your trend scores what it always did (+3% -> +13.5); beating or missing it moves you
  t.push({ label: `Trend growth ${pct(trend)} a year`, points: trend * 450 });
  const gap = Math.max(-0.08, Math.min(0.06, real - trend));
  if (gap !== 0)
    t.push({
      label: `Growth ${pct(real)}, ${gap > 0 ? "above" : "below"} trend`,
      points: gap * 120,
    });
  const debt = Math.max(0, (player.debtGdpRatio - 100) / 10);
  if (debt > 0)
    t.push({ label: `Debt at ${Math.round(player.debtGdpRatio)}% of GDP`, points: -debt });
  if (player.underGlobalEmbargo) t.push({ label: "Global embargo", points: -10 });
  return t;
}

function termsSecurity(world: WorldState, player: CountryState): ScoreTerm[] {
  const t: ScoreTerm[] = [{ label: "Base", points: 26 }];
  const name = (id: string) => world.countries.find((c) => c.id === id)?.name ?? id;
  for (const war of world.wars) {
    if (war.attackerId === player.id)
      t.push({
        label: `At war with ${name(war.defenderId)}`,
        points: war.frontline > 60 ? -2 : -10,
      });
    if (war.defenderId === player.id)
      t.push({
        label: `At war with ${name(war.attackerId)}`,
        points: war.frontline < 40 ? -4 : -12,
      });
  }
  if (player.insurgencyLevel === "REBELLION") t.push({ label: "Armed rebellion", points: -6 });
  if (player.insurgencyLevel === "GUERILLA")
    t.push({ label: "Guerrilla war at home", points: -12 });
  if (player.stability > 65) t.push({ label: "Stability above 65", points: 8 });
  if (player.atWarWith.length === 0 && player.stability > 50)
    t.push({ label: "At peace, stability above 50", points: 6 });
  return t;
}

function termsApproval(player: CountryState): ScoreTerm[] {
  return [{ label: `Approval ${Math.round(player.approval)}%`, points: player.approval / 2 }];
}

function termsPrestige(world: WorldState, player: CountryState): ScoreTerm[] {
  const t: ScoreTerm[] = [{ label: "Base", points: 20 }];
  // Standing with the great powers and the world at large
  const others = world.countries.filter((c) => c.id !== player.id);
  const avgRelation =
    others.reduce((sum, c) => sum + (c.relations[player.id] ?? 0), 0) / Math.max(1, others.length);
  t.push({
    label: `The world's view of you (average ${Math.round(avgRelation)})`,
    points: avgRelation / 4,
  });
  const pacts = player.alliances.length;
  if (pacts > 0)
    t.push({
      label: `${pacts} defence pact${pacts > 1 ? "s" : ""}`,
      points: Math.min(8, pacts * 2),
    });
  if (player.underGlobalEmbargo) t.push({ label: "Global embargo", points: -20 });
  if (player.nuclear.status === "ARMED" || player.nuclear.status === "TESTED")
    t.push({ label: "A seat at the nuclear table", points: 3 });
  return t;
}

function clamp50(v: number): number {
  return Math.max(0, Math.min(50, v));
}

function part(value: number, raw: ScoreTerm[]): ScorePartBreakdown {
  // Summed in authored order, exactly as the score has always been computed
  const sum = raw.reduce((s, x) => s + x.points, 0);
  const clamped = clamp50(sum);
  const target = clamped * SCORE_HEADING;
  const terms = raw
    .filter((x) => x.points !== 0)
    .map((x) => ({ label: x.label, points: x.points * SCORE_HEADING }));
  if (clamped !== sum)
    terms.push({
      label: clamped > sum ? "Floor: a part never goes below 0" : "Ceiling: a part tops out at 50",
      points: (clamped - sum) * SCORE_HEADING,
    });
  return { value, raw: clamped, target, terms };
}

/** What each score part is heading to, and the named terms that make up that heading. */
export function scoreBreakdown(world: WorldState): ScoreBreakdown | null {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  if (!player) return null;
  const s = world.score;
  return {
    economic: part(s.economic, termsEconomic(player)),
    security: part(s.security, termsSecurity(world, player)),
    approval: part(s.approval, termsApproval(player)),
    prestige: part(s.prestige, termsPrestige(world, player)),
  };
}

/** The total the score settles at if nothing changes. */
export function scoreHeading(b: ScoreBreakdown): number {
  return Math.round(SCORE_COMPONENTS.reduce((sum, k) => sum + b[k].target, 0));
}

/** Moves the score one month toward its targets and returns why (before, after, heading, terms). */
export function updateScore(world: WorldState): ScoreMove | undefined {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  const b = scoreBreakdown(world);
  if (!player || !b) return undefined;

  const score = world.score;
  const before = { ...score };
  // Each component drifts 15% toward its target each month: sustained
  // performance matters more than single good months.
  for (const k of SCORE_COMPONENTS) score[k] += (b[k].target - score[k]) * SCORE_DRIFT;
  score.total = Math.round(score.economic + score.security + score.approval + score.prestige);

  world.scoreHistory.push({
    turn: world.turn,
    gdp: player.gdp,
    stability: player.stability,
    approval: player.approval,
    globalTension: world.globalTension,
    score: score.total,
  });

  const round1 = (v: number) => Math.round(v * 10) / 10;
  const comp = (k: ScoreComponent) => ({
    before: round1(before[k]),
    after: round1(score[k]),
    target: round1(b[k].target),
    terms: b[k].terms.map((x) => ({ label: x.label, points: round1(x.points) })),
  });
  return {
    before: before.total,
    after: score.total,
    heading: scoreHeading(b),
    components: {
      economic: comp("economic"),
      security: comp("security"),
      approval: comp("approval"),
      prestige: comp("prestige"),
    },
  };
}

export interface LeadershipAssessment {
  classification: string;
  justification: string;
  grade: string;
}

const COVERT_HARD = ["INTEL_ASSASSINATE", "INTEL_COUP"];
const COVERT_DIRTY = [
  "INTEL_SABOTAGE",
  "INTEL_DESTABILIZE",
  "INTEL_SUPPORT_REBELS",
  "INTEL_MISINFORMATION",
];
const DEPOSED = [
  "LOST_ELECTION",
  "DEPOSED_COUP",
  "REVOLUTION",
  "ASSASSINATED",
  "IMPEACHED",
  "COUNTRY_COLLAPSED",
];

/** Count what the player did: the director's action record, with a timeline fallback for old saves. */
function playerRecord(world: WorldState, player: CountryState) {
  const rec = world.director.record ?? {};
  const n = (type: string) => rec[type] ?? 0;
  const tried = (type: string) => rec[`${type}:tried`] ?? 0;
  const timelineWars = world.timeline.filter(
    (t) =>
      t.category === "WAR" &&
      (t.description.startsWith(`WAR: ${player.name} attacks`) ||
        t.description.includes(`${player.name} declared war`)),
  ).length;
  // The record is authoritative; the timeline is only a fallback for saves made before it existed
  const recorded = Object.keys(rec).length > 0;
  return {
    // Timeline "attacks" include pact wars entered through crises; subtract those
    wars: recorded
      ? Math.max(n("DIPLOMACY_DECLARE_WAR"), timelineWars - n("DIPLOMACY_DECLARE_WAR:ally"))
      : timelineWars,
    allyWars: n("DIPLOMACY_DECLARE_WAR:ally"),
    nukes: n("NUCLEAR_STRIKE"),
    strikes: n("MILITARY_AIRSTRIKE"),
    gambles: COVERT_HARD.reduce((s, t) => s + tried(t), 0),
    dirty: COVERT_DIRTY.reduce((s, t) => s + n(t), 0),
    peace: n("DIPLOMACY_MEDIATE") + n("DIPLOMACY_PROPOSE_CEASEFIRE"),
    courting: n("DIPLOMACY_IMPROVE_RELATIONS") + n("DIPLOMACY_PROPOSE_ALLIANCE"),
    crackdowns: world.director.record?.["DOMESTIC_POLICING:hard"] ?? 0,
    reforms: n("DOMESTIC_REFORM"),
    addresses: n("DOMESTIC_PROPAGANDA"),
    orders: Object.entries(rec)
      .filter(([k]) => !k.includes(":"))
      .reduce((s, [, v]) => s + v, 0),
  };
}

/**
 * Grade follows the verdict first, the score second: a won session is never
 * below C, a failed or deposed one never above D, and an early collapse is F.
 */
function gradeFor(world: WorldState): string {
  const total = world.score.total;
  const par = world.objective?.par ?? 100;
  const ratio = total / Math.max(1, par);
  const outcome = world.outcome;
  const over = world.gameOver;
  if (!over || !outcome) {
    // Mid-game report: score bands
    return total >= 160
      ? "S"
      : total >= 140
        ? "A"
        : total >= 110
          ? "B"
          : total >= 80
            ? "C"
            : total >= 50
              ? "D"
              : "F";
  }
  if (over.reason === "NUCLEAR_HOLOCAUST") return "F";
  const progress = (over.turn + 1) / Math.max(1, world.maxTurns);
  if (!outcome.victory) {
    if (DEPOSED.includes(over.reason) || over.reason === "OBJECTIVE_FAILED") {
      return progress < 0.5 || ratio < 0.6 ? "F" : "D";
    }
    return "D";
  }
  if (outcome.stars >= 3) return ratio >= 1.25 ? "S" : "A";
  if (outcome.stars === 2) return ratio >= 1.15 ? "A" : "B";
  return ratio >= 1.05 ? "B" : "C";
}

export function classifyLeadership(world: WorldState): LeadershipAssessment {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  const score = world.score;
  if (!player) {
    return { classification: "Unknown", justification: "", grade: "F" };
  }

  const r = playerRecord(world, player);
  const months = Math.max(1, Math.min(world.turn, world.maxTurns));

  let classification: string;
  let justification: string;

  if (r.nukes > 0) {
    classification = "The Destroyer";
    justification =
      "History will remember one decision above all others: the day you reached for the nuclear option.";
  } else if (r.wars >= 2 && score.security > 30) {
    classification = "Risk-Taking Expansionist";
    justification = "You treated war as policy by other means, and largely got away with it.";
  } else if (r.wars >= 2) {
    classification = "Reckless Adventurer";
    justification =
      "Repeated military gambles drained the nation's blood and treasure for little gain.";
  } else if (r.wars === 0 && r.allyWars > 0) {
    classification = "Loyal Ally";
    justification =
      "When a friend called for help, you went to war beside them. Whether that was wisdom or entanglement, history will argue.";
  } else if (r.wars === 1) {
    classification = "Warmonger";
    justification =
      "You reached for the sword when other doors were still open, and the world noticed.";
  } else if (r.gambles >= 2 || (r.gambles >= 1 && months <= 12)) {
    classification = "The Gambler";
    justification =
      "Coups and assassinations: you bet the state on operations that rarely go to plan.";
  } else if (r.dirty + r.strikes >= Math.max(4, months / 4)) {
    classification = "Shadow Operator";
    justification =
      "Sabotage, rebels and missiles in the night: your foreign policy ran on deniability.";
  } else if (r.crackdowns >= 3) {
    classification = "Iron Fist";
    justification =
      "Order was kept with batons and curfews. The streets were quiet; the people were not won.";
  } else if (r.peace >= 3) {
    classification = "Peacemaker";
    justification =
      "You spent your capital stopping other people's wars, and the world is calmer for it.";
  } else if (r.courting >= Math.max(5, months / 3) && score.prestige > 28) {
    classification = "Master Diplomat";
    justification =
      "You made your nation respected abroad: alliances, summits, and standing carried your legacy.";
  } else if (score.economic > 35 && score.approval > 30) {
    classification = "Pragmatic Stabilizer";
    justification = "Steady economic stewardship and broad public support defined your tenure.";
  } else if (r.reforms >= Math.max(4, months / 3)) {
    classification = "The Reformer";
    justification =
      "You rebuilt institutions month after month, betting on the long game over applause.";
  } else if (r.addresses >= Math.max(4, months / 3)) {
    classification = "The Showman";
    justification = "Speeches, rallies and the evening news: you governed from the podium.";
  } else if (score.prestige > 35) {
    classification = "Master Diplomat";
    justification =
      "You made your nation respected abroad: alliances, summits, and standing carried your legacy.";
  } else if (score.approval < 15) {
    classification = "The Unloved";
    justification = "Whatever your achievements, your people never forgave you for the costs.";
  } else if (r.orders < months / 2) {
    classification = "Cautious Caretaker";
    justification = "You kept the ship of state afloat without redirecting its course.";
  } else {
    classification = "Steady Hand";
    justification = "Busy, measured and rarely dramatic: you managed crises rather than made them.";
  }

  return { classification, justification, grade: gradeFor(world) };
}

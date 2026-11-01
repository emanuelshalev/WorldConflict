import type { CountryState, Score, WorldState } from "./types.js";

/**
 * Leadership evaluated on a 0-200 scale: four components of 0-50 each
 * (economic, security, internal approval, world prestige). Scores move
 * incrementally each turn toward the level the current situation deserves.
 */

function targetEconomic(player: CountryState): number {
  let target = 20;
  target += player.growthRate * 450; // +3% growth → +13.5
  target -= Math.max(0, (player.debtGdpRatio - 100) / 10);
  if (player.underGlobalEmbargo) target -= 10;
  return clamp50(target);
}

function targetSecurity(world: WorldState, player: CountryState): number {
  let target = 26;
  for (const war of world.wars) {
    if (war.attackerId === player.id) target -= war.frontline > 60 ? 2 : 10;
    if (war.defenderId === player.id) target -= war.frontline < 40 ? 4 : 12;
  }
  if (player.insurgencyLevel === "REBELLION") target -= 6;
  if (player.insurgencyLevel === "GUERILLA") target -= 12;
  target += player.stability > 65 ? 8 : 0;
  if (player.atWarWith.length === 0 && player.stability > 50) target += 6;
  return clamp50(target);
}

function targetApproval(player: CountryState): number {
  return clamp50(player.approval / 2);
}

function targetPrestige(world: WorldState, player: CountryState): number {
  let target = 0;
  // Standing with the great powers and the world at large
  const others = world.countries.filter((c) => c.id !== player.id);
  const avgRelation =
    others.reduce((sum, c) => sum + (c.relations[player.id] ?? 0), 0) / Math.max(1, others.length);
  target += 20 + avgRelation / 4;
  const pacts = player.alliances.length;
  target += Math.min(8, pacts * 2);
  if (player.underGlobalEmbargo) target -= 20;
  if (player.nuclear.status === "ARMED" || player.nuclear.status === "TESTED") target += 3; // a seat at the table
  return clamp50(target);
}

function clamp50(v: number): number {
  return Math.max(0, Math.min(50, v));
}

export function updateScore(world: WorldState): void {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  if (!player) return;

  const score = world.score;
  // Each component drifts 15% toward its target each month: sustained
  // performance matters more than single good months.
  score.economic += (targetEconomic(player) * 0.9 - score.economic) * 0.15;
  score.security += (targetSecurity(world, player) * 0.9 - score.security) * 0.15;
  score.approval += (targetApproval(player) * 0.9 - score.approval) * 0.15;
  score.prestige += (targetPrestige(world, player) * 0.9 - score.prestige) * 0.15;
  score.total = Math.round(score.economic + score.security + score.approval + score.prestige);

  world.scoreHistory.push({
    turn: world.turn,
    gdp: player.gdp,
    stability: player.stability,
    approval: player.approval,
    globalTension: world.globalTension,
    score: score.total,
  });
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
  return {
    wars: Math.max(n("DIPLOMACY_DECLARE_WAR"), timelineWars),
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
    justification = "You treated war as policy by other means — and largely got away with it.";
  } else if (r.wars >= 2) {
    classification = "Reckless Adventurer";
    justification =
      "Repeated military gambles drained the nation's blood and treasure for little gain.";
  } else if (r.wars === 1) {
    classification = "Warmonger";
    justification =
      "You reached for the sword when other doors were still open — and the world noticed.";
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
      "You spent your capital stopping other people's wars — and the world is calmer for it.";
  } else if (r.courting >= Math.max(5, months / 3) && score.prestige > 28) {
    classification = "Master Diplomat";
    justification =
      "You made your nation respected abroad — alliances, summits, and standing carried your legacy.";
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
      "You made your nation respected abroad — alliances, summits, and standing carried your legacy.";
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

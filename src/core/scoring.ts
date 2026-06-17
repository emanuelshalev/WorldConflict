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

export function classifyLeadership(world: WorldState): LeadershipAssessment {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  const score = world.score;
  if (!player) {
    return { classification: "Unknown", justification: "", grade: "F" };
  }

  const warsStarted = world.timeline.filter(
    (t) => t.category === "WAR" && t.description.includes(`${player.name} declared war`),
  ).length;
  const nukeUsed = world.timeline.some(
    (t) =>
      t.category === "NUCLEAR" &&
      t.description.includes(player.name) &&
      t.description.toLowerCase().includes("nuclear weapon"),
  );

  let classification: string;
  let justification: string;

  if (nukeUsed) {
    classification = "The Destroyer";
    justification =
      "History will remember one decision above all others: the day you reached for the nuclear option.";
  } else if (warsStarted >= 2 && score.security > 30) {
    classification = "Risk-Taking Expansionist";
    justification = "You treated war as policy by other means — and largely got away with it.";
  } else if (warsStarted >= 2) {
    classification = "Reckless Adventurer";
    justification =
      "Repeated military gambles drained the nation's blood and treasure for little gain.";
  } else if (score.economic > 35 && score.approval > 30) {
    classification = "Pragmatic Stabilizer";
    justification = "Steady economic stewardship and broad public support defined your tenure.";
  } else if (score.prestige > 35) {
    classification = "Master Diplomat";
    justification =
      "You made your nation respected abroad — alliances, summits, and standing carried your legacy.";
  } else if (score.approval < 15) {
    classification = "The Unloved";
    justification = "Whatever your achievements, your people never forgave you for the costs.";
  } else {
    classification = "Cautious Caretaker";
    justification = "You kept the ship of state afloat without redirecting its course.";
  }

  const total = score.total;
  const grade =
    total >= 160
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

  return { classification, justification, grade };
}

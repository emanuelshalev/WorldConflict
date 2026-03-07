import type { CountryState, WorldState } from "./types.js";

export interface ScoreBreakdown {
  economy: number;
  security: number;
  diplomacy: number;
  stability: number;
  total: number;
}

export interface LeadershipStyle {
  primary: string;
  secondary: string;
  description: string;
}

export interface GameScore {
  breakdown: ScoreBreakdown;
  rank: string;
  leadershipStyle: LeadershipStyle;
  achievements: string[];
  timeline: TurnSnapshot[];
}

export interface TurnSnapshot {
  turn: number;
  date: string;
  score: number;
  gdp: number;
  stability: number;
  allies: number;
  wars: number;
  events: string[];
}

const WEIGHTS = {
  economy: 0.3,
  security: 0.3,
  diplomacy: 0.25,
  stability: 0.15,
};

export function calculateEconomyScore(country: CountryState, initialGdp: number): number {
  const gdpGrowth = (country.gdp - initialGdp) / initialGdp;
  const growthScore = Math.min(100, Math.max(0, 50 + gdpGrowth * 200));

  const debtPenalty = Math.max(0, (country.debtGdpRatio - 0.6) * 50);

  const budgetBalance = country.militaryBudgetPercent <= 6 ? 10 : 0;

  return Math.max(0, Math.min(100, growthScore - debtPenalty + budgetBalance));
}

export function calculateSecurityScore(country: CountryState, world: WorldState): number {
  let score = 50;

  if (country.atWarWith.length === 0) {
    score += 20;
  } else {
    score -= country.atWarWith.length * 15;
  }

  const warsWon = world.wars.filter((w) => {
    const isAttacker = w.attackerId === country.id;
    const isDefender = w.defenderId === country.id;
    if (!isAttacker && !isDefender) return false;

    const progress = isAttacker ? w.attackerProgress : w.defenderProgress;
    return progress >= 100;
  }).length;

  score += warsWon * 10;

  if (country.mobilizationLevel >= 30 && country.mobilizationLevel <= 60) {
    score += 10;
  }

  const militaryStrength = country.manpower / 500000 + country.airpower / 500;
  score += Math.min(20, militaryStrength);

  return Math.max(0, Math.min(100, score));
}

export function calculateDiplomacyScore(country: CountryState, world: WorldState): number {
  let score = 50;

  score += country.alliances.length * 8;

  const positiveRelations = Object.values(country.relations).filter((r) => r > 30).length;
  const negativeRelations = Object.values(country.relations).filter((r) => r < -30).length;

  score += positiveRelations * 3;
  score -= negativeRelations * 2;

  const globalTensionPenalty = Math.max(0, (world.globalTension - 50) * 0.3);
  score -= globalTensionPenalty;

  return Math.max(0, Math.min(100, score));
}

export function calculateStabilityScore(country: CountryState): number {
  const stabilityWeight = 0.6;
  const legitimacyWeight = 0.4;

  return country.stability * stabilityWeight + country.legitimacy * legitimacyWeight;
}

export function calculateTotalScore(breakdown: ScoreBreakdown): number {
  return Math.round(
    breakdown.economy * WEIGHTS.economy +
      breakdown.security * WEIGHTS.security +
      breakdown.diplomacy * WEIGHTS.diplomacy +
      breakdown.stability * WEIGHTS.stability,
  );
}

export function getScoreRank(score: number): string {
  if (score >= 90) return "S - Legendary Leader";
  if (score >= 80) return "A - Outstanding";
  if (score >= 70) return "B - Competent";
  if (score >= 60) return "C - Average";
  if (score >= 50) return "D - Struggling";
  if (score >= 40) return "E - Poor";
  return "F - Failed State";
}

export function determineLeadershipStyle(
  breakdown: ScoreBreakdown,
  country: CountryState,
  world: WorldState,
): LeadershipStyle {
  const styles: Array<{ name: string; score: number; description: string }> = [];

  if (breakdown.economy >= 70) {
    styles.push({
      name: "Economic Visionary",
      score: breakdown.economy,
      description: "Prioritized economic growth and prosperity",
    });
  }

  if (breakdown.security >= 70 && country.atWarWith.length === 0) {
    styles.push({
      name: "Peace Through Strength",
      score: breakdown.security,
      description: "Maintained powerful military deterrence",
    });
  }

  if (country.atWarWith.length > 0 || world.wars.some((w) => w.attackerId === country.id)) {
    styles.push({
      name: "Warmonger",
      score: 60 + country.atWarWith.length * 10,
      description: "Pursued aggressive military expansion",
    });
  }

  if (breakdown.diplomacy >= 70) {
    styles.push({
      name: "Master Diplomat",
      score: breakdown.diplomacy,
      description: "Built strong international relationships",
    });
  }

  if (country.alliances.length >= 5) {
    styles.push({
      name: "Alliance Builder",
      score: 70 + country.alliances.length * 2,
      description: "Created extensive alliance networks",
    });
  }

  if (breakdown.stability >= 80) {
    styles.push({
      name: "Stabilizer",
      score: breakdown.stability,
      description: "Maintained domestic harmony and legitimacy",
    });
  }

  if (country.stability < 40) {
    styles.push({
      name: "Crisis Manager",
      score: 50,
      description: "Struggled with internal instability",
    });
  }

  styles.sort((a, b) => b.score - a.score);

  const primary = styles[0] || {
    name: "Balanced Leader",
    description: "Maintained equilibrium across all domains",
  };
  const secondary = styles[1] || { name: "Pragmatist", description: "Adapted to circumstances" };

  return {
    primary: primary.name,
    secondary: secondary.name,
    description: `${primary.description}. ${secondary.description}.`,
  };
}

export function generateAchievements(
  country: CountryState,
  world: WorldState,
  initialState: CountryState,
): string[] {
  const achievements: string[] = [];

  if (country.gdp > initialState.gdp * 1.5) {
    achievements.push("🏆 Economic Miracle - Grew GDP by 50%+");
  }

  if (country.alliances.length >= 5) {
    achievements.push("🤝 Coalition Builder - Formed 5+ alliances");
  }

  if (country.stability >= 90) {
    achievements.push("🏛️ Pillar of Stability - Achieved 90%+ stability");
  }

  if (country.atWarWith.length === 0 && world.turn >= 12) {
    achievements.push("🕊️ Peacekeeper - Avoided all wars for a year");
  }

  const warsWon = world.wars.filter((w) => {
    const isAttacker = w.attackerId === country.id;
    if (!isAttacker) return false;
    return w.attackerProgress >= 100;
  }).length;

  if (warsWon >= 1) {
    achievements.push("⚔️ Victorious - Won a military conflict");
  }

  if (country.mobilizationLevel <= 20 && country.stability >= 70) {
    achievements.push("🌿 Demilitarized Peace - Low military, high stability");
  }

  if (Object.values(country.relations).every((r) => r >= 0)) {
    achievements.push("🌍 Global Friend - No negative relations");
  }

  return achievements;
}

export function calculateGameScore(
  world: WorldState,
  initialCountryState: CountryState,
  turnSnapshots: TurnSnapshot[],
): GameScore {
  const playerCountry = world.countries.find((c) => c.id === world.playerCountryId);

  if (!playerCountry) {
    throw new Error("Player country not found");
  }

  const breakdown: ScoreBreakdown = {
    economy: calculateEconomyScore(playerCountry, initialCountryState.gdp),
    security: calculateSecurityScore(playerCountry, world),
    diplomacy: calculateDiplomacyScore(playerCountry, world),
    stability: calculateStabilityScore(playerCountry),
    total: 0,
  };

  breakdown.total = calculateTotalScore(breakdown);

  return {
    breakdown,
    rank: getScoreRank(breakdown.total),
    leadershipStyle: determineLeadershipStyle(breakdown, playerCountry, world),
    achievements: generateAchievements(playerCountry, world, initialCountryState),
    timeline: turnSnapshots,
  };
}

export function createTurnSnapshot(world: WorldState, events: string[] = []): TurnSnapshot {
  const playerCountry = world.countries.find((c) => c.id === world.playerCountryId);

  if (!playerCountry) {
    throw new Error("Player country not found");
  }

  const breakdown: ScoreBreakdown = {
    economy: 50,
    security: calculateSecurityScore(playerCountry, world),
    diplomacy: calculateDiplomacyScore(playerCountry, world),
    stability: calculateStabilityScore(playerCountry),
    total: 0,
  };
  breakdown.total = calculateTotalScore(breakdown);

  return {
    turn: world.turn,
    date: world.date,
    score: breakdown.total,
    gdp: playerCountry.gdp,
    stability: playerCountry.stability,
    allies: playerCountry.alliances.length,
    wars: playerCountry.atWarWith.length,
    events,
  };
}

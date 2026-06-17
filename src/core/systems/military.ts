import type { SeededRandom } from "../seed.js";
import type { ActiveWar, CountryState, WorldState } from "../types.js";

export type AirstrikeTarget = "MILITARY" | "INDUSTRIAL" | "NUCLEAR";

export interface AirstrikeOutcome {
  success: boolean;
  description: string;
  crippledNuclearProgram: boolean;
}

export interface WarEndResult {
  war: ActiveWar;
  winnerId: string | null; // null = ceasefire/stalemate
  loserId: string | null;
  description: string;
}

const DOCTRINE_ATTACK: Record<string, number> = {
  OFFENSIVE: 1.15,
  EXPEDITIONARY: 1.1,
  DEFENSIVE: 0.95,
  DETERRENCE: 0.9,
  GUERILLA: 0.85,
};
const DOCTRINE_DEFENSE: Record<string, number> = {
  OFFENSIVE: 1.0,
  EXPEDITIONARY: 0.95,
  DEFENSIVE: 1.2,
  DETERRENCE: 1.05,
  GUERILLA: 1.25,
};

export function militaryStrength(country: CountryState): number {
  const mobilization = 0.25 + 0.75 * (country.mobilizationLevel / 100);
  const manpowerStrength = country.manpower * mobilization;
  const airStrength = country.airpower * 60;
  const budgetQuality = 0.7 + (country.militaryBudgetPercent / 10) * 0.6; // tech/readiness proxy
  return (manpowerStrength + airStrength) * budgetQuality;
}

export function effectiveForce(country: CountryState, attacking: boolean): number {
  const base = militaryStrength(country);
  const cohesion = (0.5 + country.stability / 200) * (0.6 + country.legitimacy / 250);
  const doctrine = attacking
    ? (DOCTRINE_ATTACK[country.doctrine] ?? 1)
    : (DOCTRINE_DEFENSE[country.doctrine] ?? 1);
  return base * cohesion * doctrine;
}

export function monthlyDefenseBudgetM(country: CountryState): number {
  // Monthly defense budget in $M
  return (country.gdp * (country.militaryBudgetPercent / 100)) / 12 / 1_000_000;
}

export function startWar(
  world: WorldState,
  attackerId: string,
  defenderId: string,
): ActiveWar | null {
  const attacker = world.countries.find((c) => c.id === attackerId);
  const defender = world.countries.find((c) => c.id === defenderId);
  if (!attacker || !defender) return null;
  if (attacker.atWarWith.includes(defenderId)) return null;

  attacker.atWarWith.push(defenderId);
  defender.atWarWith.push(attackerId);
  attacker.relations[defenderId] = -100;
  defender.relations[attackerId] = -100;
  // Alliances with the enemy dissolve
  attacker.alliances = attacker.alliances.filter((a) => a !== defenderId);
  defender.alliances = defender.alliances.filter((a) => a !== attackerId);
  attacker.mobilizationLevel = Math.max(attacker.mobilizationLevel, 60);
  defender.mobilizationLevel = Math.max(defender.mobilizationLevel, 50);
  // War footing: budgets surge (hostility indicator)
  attacker.militaryBudgetPercent = Math.min(20, attacker.militaryBudgetPercent * 1.5);
  defender.militaryBudgetPercent = Math.min(20, defender.militaryBudgetPercent * 1.4);

  const war: ActiveWar = {
    id: `war_${attackerId}_${defenderId}_${world.turn}`,
    attackerId,
    defenderId,
    startTurn: world.turn,
    frontline: 50,
    attackerCasualties: 0,
    defenderCasualties: 0,
    exhaustion: 0,
  };
  world.wars.push(war);
  world.globalTension = Math.min(100, world.globalTension + 15);
  return war;
}

/** Defensive pact allies of the defender join the war against the attacker. */
export function activateDefensivePacts(
  world: WorldState,
  war: ActiveWar,
  rng: SeededRandom,
): string[] {
  const defender = world.countries.find((c) => c.id === war.defenderId);
  const joined: string[] = [];
  if (!defender) return joined;
  for (const allyId of defender.alliances) {
    const ally = world.countries.find((c) => c.id === allyId);
    if (!ally || ally.collapsed) continue;
    if (ally.atWarWith.includes(war.attackerId)) continue;
    if (allyId === war.attackerId) continue;
    const loyaltyRoll = rng.next() * 100;
    if (loyaltyRoll < ally.personality.allianceLoyalty) {
      startWar(world, allyId, war.attackerId);
      joined.push(allyId);
    } else {
      // Refused the call: alliance strained
      ally.relations[defender.id] = Math.max(-100, (ally.relations[defender.id] ?? 0) - 25);
      defender.relations[allyId] = Math.max(-100, (defender.relations[allyId] ?? 0) - 25);
      ally.alliances = ally.alliances.filter((a) => a !== defender.id);
      defender.alliances = defender.alliances.filter((a) => a !== allyId);
    }
  }
  return joined;
}

export interface WarMonthSummary {
  war: ActiveWar;
  delta: number;
  attackerCasualties: number;
  defenderCasualties: number;
  ended: WarEndResult | null;
}

export function resolveWarMonth(
  world: WorldState,
  war: ActiveWar,
  rng: SeededRandom,
): WarMonthSummary | null {
  const attacker = world.countries.find((c) => c.id === war.attackerId);
  const defender = world.countries.find((c) => c.id === war.defenderId);
  if (!attacker || !defender) return null;

  const atkForce = effectiveForce(attacker, true);
  const defForce = effectiveForce(defender, false);
  const total = atkForce + defForce;
  if (total <= 0) return null;

  const advantage = atkForce / total - 0.5; // -0.5..0.5
  const fortune = (rng.next() - 0.5) * 4; // battlefield luck
  const delta = advantage * 14 + fortune;
  war.frontline = Math.max(0, Math.min(100, war.frontline + delta));

  // Casualties scale with combat intensity and enemy strength
  const intensity = 0.0015 + Math.abs(delta) * 0.0004;
  const attackerCasualties = Math.floor(attacker.manpower * intensity * (defForce / total) * 2);
  const defenderCasualties = Math.floor(defender.manpower * intensity * (atkForce / total) * 2);
  war.attackerCasualties += attackerCasualties;
  war.defenderCasualties += defenderCasualties;
  attacker.manpower = Math.max(0, attacker.manpower - attackerCasualties);
  defender.manpower = Math.max(0, defender.manpower - defenderCasualties);

  // War weighs on both societies; losing side suffers more
  const attackerLosing = war.frontline < 45;
  const defenderLosing = war.frontline > 55;
  attacker.stability = clamp(attacker.stability - (attackerLosing ? 2.5 : 1));
  defender.stability = clamp(defender.stability - (defenderLosing ? 2.5 : 1));
  attacker.approval = clamp(attacker.approval - (attackerLosing ? 2 : 0.5));
  defender.approval = clamp(defender.approval + (defenderLosing ? -2 : 1)); // rally round the flag while holding

  // Economic damage proportional to how badly the war is going
  attacker.gdp *= attackerLosing ? 0.985 : 0.993;
  defender.gdp *= defenderLosing ? 0.975 : 0.988; // war fought on defender's soil

  war.exhaustion = clamp(war.exhaustion + 2 + (Math.abs(delta) < 2 ? 2 : 0));

  // End conditions
  let ended: WarEndResult | null = null;
  if (war.frontline >= 85) {
    ended = endWar(world, war, war.attackerId, war.defenderId, rng);
  } else if (war.frontline <= 15) {
    ended = endWar(world, war, war.defenderId, war.attackerId, rng);
  } else if (war.exhaustion >= 80 && rng.nextBool(0.35)) {
    ended = endWar(world, war, null, null, rng);
  }

  return { war, delta, attackerCasualties, defenderCasualties, ended };
}

function endWar(
  world: WorldState,
  war: ActiveWar,
  winnerId: string | null,
  loserId: string | null,
  _rng: SeededRandom,
): WarEndResult {
  const attacker = world.countries.find((c) => c.id === war.attackerId);
  const defender = world.countries.find((c) => c.id === war.defenderId);
  world.wars = world.wars.filter((w) => w.id !== war.id);
  if (attacker && defender) {
    attacker.atWarWith = attacker.atWarWith.filter((id) => id !== defender.id);
    defender.atWarWith = defender.atWarWith.filter((id) => id !== attacker.id);
    attacker.relations[defender.id] = -60;
    defender.relations[attacker.id] = -60;
    attacker.mobilizationLevel = Math.max(20, attacker.mobilizationLevel - 30);
    defender.mobilizationLevel = Math.max(20, defender.mobilizationLevel - 30);
  }

  let description: string;
  if (winnerId && loserId && attacker && defender) {
    const winner = winnerId === attacker.id ? attacker : defender;
    const loser = loserId === attacker.id ? attacker : defender;
    // Spoils and humiliation
    const reparations = loser.gdp * 0.05;
    loser.gdp -= reparations;
    winner.gdp += reparations * 0.6;
    loser.stability = clamp(loser.stability - 15);
    loser.legitimacy = clamp(loser.legitimacy - 20);
    loser.approval = clamp(loser.approval - 15);
    winner.approval = clamp(winner.approval + 12);
    winner.legitimacy = clamp(winner.legitimacy + 8);
    loser.insurgencyLevel = loser.insurgencyLevel === "NONE" ? "UNREST" : loser.insurgencyLevel;
    description = `${winner.name} has defeated ${loser.name}. ${loser.name} accepts humiliating terms; its government totters.`;
  } else {
    if (attacker && defender) {
      attacker.approval = clamp(attacker.approval - 5);
      description = `Exhausted and bleeding, ${attacker.name} and ${defender.name} accept a ceasefire along the current lines.`;
    } else {
      description = "A ceasefire has taken hold.";
    }
  }
  world.globalTension = clamp(world.globalTension - 8);
  return { war, winnerId, loserId, description };
}

export function executeAirstrike(
  world: WorldState,
  attacker: CountryState,
  defender: CountryState,
  targetType: AirstrikeTarget,
  rng: SeededRandom,
): AirstrikeOutcome {
  const offensive = attacker.airpower;
  const defensive = defender.airpower * 0.6 + defender.intelLevel * 5;
  const successChance = Math.min(0.9, Math.max(0.25, 0.55 + (offensive - defensive) / 20000));
  const success = rng.next() < successChance;

  // Diplomatic fallout regardless of outcome
  defender.relations[attacker.id] = Math.max(-100, (defender.relations[attacker.id] ?? 0) - 30);
  attacker.relations[defender.id] = Math.max(-100, (attacker.relations[defender.id] ?? 0) - 20);
  world.globalTension = clamp(world.globalTension + 5, 0, 100);

  let crippledNuclearProgram = false;
  let description: string;

  if (!success) {
    if (targetType === "NUCLEAR") defender.nuclear.consecutiveStrikesTaken = 0;
    description = `${attacker.name}'s airstrike against ${defender.name} was repelled by air defenses.`;
    return { success, description, crippledNuclearProgram };
  }

  switch (targetType) {
    case "MILITARY": {
      const loss = Math.floor(defender.manpower * 0.04);
      defender.manpower -= loss;
      defender.airpower = Math.floor(defender.airpower * 0.95);
      description = `${attacker.name} jets struck ${defender.name} military installations, destroying bases and equipment.`;
      break;
    }
    case "INDUSTRIAL": {
      defender.gdp *= 0.985;
      defender.stability = clamp(defender.stability - 4);
      description = `${attacker.name} bombed ${defender.name}'s industrial heartland, crippling factories and power plants.`;
      break;
    }
    case "NUCLEAR": {
      if (defender.nuclear.status === "DEVELOPING") {
        defender.nuclear.consecutiveStrikesTaken += 1;
        defender.nuclear.progress = Math.max(0, defender.nuclear.progress - 25);
        if (defender.nuclear.consecutiveStrikesTaken >= 2) {
          defender.nuclear.status = "LATENT";
          defender.nuclear.progress = 0;
          defender.nuclear.funded = false;
          defender.nuclear.consecutiveStrikesTaken = 0;
          crippledNuclearProgram = true;
          description = `Second consecutive strike on ${defender.name}'s enrichment facilities — the nuclear program is CRIPPLED.`;
        } else {
          description = `${attacker.name} struck ${defender.name}'s nuclear facilities, setting the program back. One more successful strike could cripple it.`;
        }
      } else if (defender.nuclear.status === "TESTED" || defender.nuclear.status === "ARMED") {
        description = `${attacker.name} struck ${defender.name}'s nuclear sites — but the arsenal is dispersed and hardened. No meaningful damage.`;
      } else {
        description = `${attacker.name} struck suspected nuclear sites in ${defender.name}, but found no active program.`;
      }
      break;
    }
  }
  return { success, description, crippledNuclearProgram };
}

export function deployToBorder(country: CountryState, targetId: string, troops: number): void {
  const existing = country.borderDeployments.find((d) => d.targetCountryId === targetId);
  if (existing) existing.troops += troops;
  else country.borderDeployments.push({ targetCountryId: targetId, troops });
}

export function withdrawFromBorder(country: CountryState, targetId: string): void {
  country.borderDeployments = country.borderDeployments.filter(
    (d) => d.targetCountryId !== targetId,
  );
}

/** Border deployments continuously degrade relations (dynamic diplomacy from the original game). */
export function applyBorderTensions(world: WorldState): void {
  for (const country of world.countries) {
    for (const dep of country.borderDeployments) {
      const target = world.countries.find((c) => c.id === dep.targetCountryId);
      if (!target || country.atWarWith.includes(target.id)) continue;
      target.relations[country.id] = Math.max(-100, (target.relations[country.id] ?? 0) - 3);
      world.globalTension = clamp(world.globalTension + 0.5, 0, 100);
      // Threatened countries arm in response (budget as hostility indicator)
      target.militaryBudgetPercent = Math.min(20, target.militaryBudgetPercent + 0.1);
    }
  }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

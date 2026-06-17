import type { SeededRandom } from "../seed.js";
import type { CountryState, GameEvent, WorldState } from "../types.js";

export const NUCLEAR_RESEARCH_COST_M = 20; // $20M/month, from the original game

export interface NuclearStrikeResult {
  holocaust: boolean;
  retaliators: string[];
  description: string;
}

/** Monthly nuclear program progression. Returns events for milestones. */
export function progressNuclearPrograms(world: WorldState, rng: SeededRandom): GameEvent[] {
  const events: GameEvent[] = [];
  for (const country of world.countries) {
    const prog = country.nuclear;
    if (prog.status === "DEVELOPING" && prog.funded) {
      // Wealth & technical base accelerate the program
      const techFactor = 0.5 + country.intelLevel / 100 + Math.min(1, country.gdp / 2e12);
      prog.progress = Math.min(100, prog.progress + rng.nextFloat(1.5, 3.5) * techFactor);
      if (prog.progress >= 100) {
        prog.status = "TESTED";
        prog.consecutiveStrikesTaken = 0;
        world.globalTension = Math.min(100, world.globalTension + 12);
        events.push({
          id: `evt_nuketest_${country.id}_${world.turn}`,
          type: "NUCLEAR",
          title: `☢ ${country.name} TESTS NUCLEAR WEAPON`,
          description: `Seismic stations worldwide confirm it: ${country.name} has detonated a nuclear device. Its program is now invulnerable to conventional strikes. The regional balance of power has changed overnight.`,
          affectedCountries: [country.id],
          turn: world.turn,
          severity: "CRITICAL",
        });
      }
    } else if (prog.status === "TESTED") {
      // Weaponization: builds a small arsenal
      prog.warheads += rng.nextInt(0, 2);
      if (prog.warheads >= 5) {
        prog.status = "ARMED";
        events.push({
          id: `evt_nukearmed_${country.id}_${world.turn}`,
          type: "NUCLEAR",
          title: `${country.name} fields operational nuclear arsenal`,
          description: `Intelligence assesses ${country.name} now possesses deliverable nuclear weapons.`,
          affectedCountries: [country.id],
          turn: world.turn,
          severity: "CRITICAL",
        });
      }
    } else if (prog.status === "ARMED" && prog.funded && prog.warheads < 50) {
      prog.warheads += rng.nextInt(0, 2);
    }
    // Decay the two-strike counter if no strike happened this turn (set elsewhere)
  }
  return events;
}

export function startNuclearProgram(country: CountryState): boolean {
  if (country.nuclear.status === "NONE" || country.nuclear.status === "LATENT") {
    country.nuclear.status = "DEVELOPING";
    country.nuclear.funded = true;
    return true;
  }
  if (country.nuclear.status === "DEVELOPING") {
    country.nuclear.funded = true;
    return true;
  }
  if (country.nuclear.status === "ARMED") {
    country.nuclear.funded = true; // arsenal expansion
    return true;
  }
  return false;
}

export function isNuclearOperational(country: CountryState): boolean {
  return country.nuclear.status === "TESTED" || country.nuclear.status === "ARMED";
}

/**
 * "Attack means disaster": both sides of a potential conflict have operational arsenals.
 */
export function isNuclearStandoff(a: CountryState, b: CountryState): boolean {
  return isNuclearOperational(a) && isNuclearOperational(b);
}

/**
 * Execute a nuclear strike during war. The world changes forever.
 */
export function executeNuclearStrike(
  world: WorldState,
  attacker: CountryState,
  target: CountryState,
  rng: SeededRandom,
): NuclearStrikeResult {
  // Devastation
  const popLoss = 0.5;
  target.manpower = Math.floor(target.manpower * (1 - popLoss));
  target.population = Math.floor(target.population * 0.92);
  target.gdp *= 0.55;
  target.stability = Math.max(0, target.stability - 45);
  target.legitimacy = Math.max(0, target.legitimacy - 20);
  attacker.nuclear.warheads = Math.max(0, attacker.nuclear.warheads - 1);

  // Universal revulsion: global embargo, relations collapse
  attacker.underGlobalEmbargo = true;
  for (const other of world.countries) {
    if (other.id === attacker.id) continue;
    other.relations[attacker.id] = Math.max(-100, (other.relations[attacker.id] ?? 0) - 60);
  }
  world.globalTension = 100;

  // Retaliation chain: target itself, or its nuclear-armed allies
  const retaliators: string[] = [];
  if (isNuclearOperational(target) && target.nuclear.warheads > 0) {
    retaliators.push(target.id);
  }
  for (const allyId of target.alliances) {
    const ally = world.countries.find((c) => c.id === allyId);
    if (
      ally &&
      isNuclearOperational(ally) &&
      rng.nextBool(ally.personality.allianceLoyalty / 120)
    ) {
      retaliators.push(ally.id);
    }
  }

  const holocaust = retaliators.length > 0;
  if (holocaust) {
    // Mutual destruction spiral
    attacker.manpower = Math.floor(attacker.manpower * 0.4);
    attacker.population = Math.floor(attacker.population * 0.85);
    attacker.gdp *= 0.45;
    attacker.stability = Math.max(0, attacker.stability - 50);
  }

  const description = holocaust
    ? `${attacker.name} used nuclear weapons against ${target.name}. Retaliatory launches followed within hours. Mushroom clouds rise over both nations — the world tips into nuclear holocaust.`
    : `${attacker.name} dropped a nuclear weapon on ${target.name}. Hundreds of thousands are dead. The world recoils in horror: a total arms embargo is imposed and ${attacker.name} becomes a pariah state.`;

  return { holocaust, retaliators, description };
}

/** AI/event hook: who is threatened enough to start a program. */
export function shouldSeekNuclearWeapons(world: WorldState, country: CountryState): boolean {
  if (country.nuclear.status !== "NONE" && country.nuclear.status !== "LATENT") return false;
  const rivalArmed = (country.history.historicalRivals ?? []).some((rid) => {
    const rival = world.countries.find((c) => c.id === rid);
    return rival && isNuclearOperational(rival);
  });
  const threatened = country.atWarWith.length > 0 || rivalArmed;
  return threatened && country.personality.riskTolerance > 55 && country.gdp > 2e11;
}

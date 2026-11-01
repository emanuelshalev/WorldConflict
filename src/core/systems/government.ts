import { raiseCrisis } from "../crises.js";
import type { SeededRandom } from "../seed.js";
import { possessive } from "../text.js";
import type {
  CountryState,
  GameEvent,
  GovernmentChangeKind,
  Leader,
  LeaderStyle,
  WorldState,
} from "../types.js";
import { growthMood } from "./economy.js";

export interface GovernmentChange {
  countryId: string;
  kind: GovernmentChangeKind;
  oldLeader: Leader;
  newLeader: Leader;
  description: string;
  isPlayerDeposed: boolean;
}

// Name pools for generated successors, by country
const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  USA: {
    first: ["James", "Sarah", "Michael", "Elizabeth", "Robert"],
    last: ["Walker", "Harrison", "Mitchell", "Bennett", "Carter"],
  },
  CHN: {
    first: ["Wei", "Jun", "Li", "Qiang", "Ming"],
    last: ["Zhang", "Wang", "Chen", "Liu", "Zhao"],
  },
  RUS: {
    first: ["Dmitri", "Sergei", "Mikhail", "Nikolai", "Andrei"],
    last: ["Volkov", "Petrov", "Sokolov", "Orlov", "Lebedev"],
  },
  DEU: {
    first: ["Klaus", "Annalena", "Friedrich", "Ursula", "Stefan"],
    last: ["Weber", "Hoffmann", "Schneider", "Becker", "Krause"],
  },
  IND: {
    first: ["Rajesh", "Priya", "Arun", "Sanjay", "Kavita"],
    last: ["Sharma", "Patel", "Singh", "Reddy", "Iyer"],
  },
  BRA: {
    first: ["Carlos", "Ana", "Paulo", "Mariana", "Eduardo"],
    last: ["Silva", "Santos", "Oliveira", "Costa", "Pereira"],
  },
  CAN: {
    first: ["Andrew", "Marie", "David", "Sophie", "Mark"],
    last: ["MacDonald", "Tremblay", "Campbell", "Fraser", "Leblanc"],
  },
  MEX: {
    first: ["Luis", "Carmen", "Andrés", "Gabriela", "Ricardo"],
    last: ["Hernández", "García", "Martínez", "López", "Ramírez"],
  },
  FRA: {
    first: ["Jean", "Camille", "Philippe", "Élise", "Laurent"],
    last: ["Moreau", "Lefèvre", "Rousseau", "Mercier", "Girard"],
  },
  GBR: {
    first: ["Oliver", "Charlotte", "Henry", "Eleanor", "Thomas"],
    last: ["Whitmore", "Ashford", "Pemberton", "Hartley", "Davies"],
  },
  POL: {
    first: ["Andrzej", "Magdalena", "Piotr", "Agnieszka", "Tomasz"],
    last: ["Kowalski", "Nowak", "Wiśniewski", "Zieliński", "Mazur"],
  },
  TUR: {
    first: ["Mehmet", "Ayşe", "Mustafa", "Elif", "Ahmet"],
    last: ["Yılmaz", "Demir", "Kaya", "Çelik", "Aydın"],
  },
  SAU: {
    first: ["Khalid", "Faisal", "Abdullah", "Salman", "Turki"],
    last: ["Al Saud", "Al Saud", "Al Saud", "Al Saud", "Al Saud"],
  },
  IRN: {
    first: ["Ali", "Hassan", "Reza", "Mohammad", "Ebrahim"],
    last: ["Hosseini", "Ahmadi", "Karimi", "Moradi", "Jafari"],
  },
  ISR: {
    first: ["David", "Tamar", "Yair", "Noa", "Benjamin"],
    last: ["Cohen", "Levi", "Mizrahi", "Peretz", "Avraham"],
  },
  EGY: {
    first: ["Ahmed", "Fatma", "Mohamed", "Omar", "Khaled"],
    last: ["Hassan", "Ibrahim", "Mahmoud", "Said", "Farouk"],
  },
  JPN: {
    first: ["Hiroshi", "Yuki", "Takeshi", "Akiko", "Kenji"],
    last: ["Tanaka", "Sato", "Watanabe", "Kobayashi", "Yamamoto"],
  },
  IDN: {
    first: ["Budi", "Siti", "Agus", "Dewi", "Joko"],
    last: ["Santoso", "Wijaya", "Hartono", "Setiawan", "Kusuma"],
  },
  KOR: {
    first: ["Min-jun", "Seo-yeon", "Ji-ho", "Ha-eun", "Dong-hyun"],
    last: ["Kim", "Lee", "Park", "Choi", "Jung"],
  },
  PRK: { first: ["Kim"], last: ["Jong-chol", "Pyong-il", "Yo-jong", "Sol-song"] },
  AUS: {
    first: ["Jack", "Emma", "Liam", "Grace", "Noah"],
    last: ["Thompson", "Wilson", "Mitchell", "Sullivan", "Reid"],
  },
  PAK: {
    first: ["Tariq", "Ayesha", "Faisal", "Saima", "Usman"],
    last: ["Chaudhry", "Rana", "Malik", "Abbasi", "Butt"],
  },
  NGA: {
    first: ["Chukwu", "Amina", "Olusegun", "Ngozi", "Ibrahim"],
    last: ["Okafor", "Abubakar", "Adeyemi", "Balogun", "Eze"],
  },
  ZAF: {
    first: ["Themba", "Nomvula", "Sipho", "Lindiwe", "Pieter"],
    last: ["Mokoena", "Dlamini", "Nkosi", "Khumalo", "van Wyk"],
  },
  ITA: {
    first: ["Marco", "Giulia", "Alessandro", "Francesca", "Luca"],
    last: ["Rossi", "Conti", "Ricci", "Marino", "Greco"],
  },
  UKR: {
    first: ["Oleksandr", "Olena", "Andriy", "Iryna", "Taras"],
    last: ["Kovalenko", "Shevchenko", "Bondarenko", "Melnyk", "Tkachenko"],
  },
  TWN: {
    first: ["Chia-hao", "Mei-ling", "Wen-chieh", "Hsiu-ying", "Kuo-wei"],
    last: ["Chen", "Lin", "Huang", "Chang", "Wu"],
  },
  BLR: {
    first: ["Alyaksandr", "Sviatlana", "Viktar", "Maryna", "Dzmitry"],
    last: ["Kavalchuk", "Novik", "Sharko", "Zhuk", "Barysau"],
  },
  DNK: {
    first: ["Mette", "Lars", "Anders", "Pia", "Rasmus"],
    last: ["Jensen", "Nielsen", "Hansen", "Pedersen", "Larsen"],
  },
  SYR: {
    first: ["Ahmad", "Rania", "Omar", "Lina", "Khaled"],
    last: ["al-Hasan", "Haddad", "Khoury", "al-Ali", "Saleh"],
  },
  IRQ: {
    first: ["Haider", "Zainab", "Mustafa", "Noor", "Ammar"],
    last: ["al-Abadi", "al-Maliki", "Jabouri", "Hashemi", "Rubaie"],
  },
  PSX: {
    first: ["Mohammad", "Hanan", "Mustafa", "Rawan", "Yousef"],
    last: ["Barghouti", "Shtayyeh", "Abbas", "Nusseibeh", "Masri"],
  },
  LBN: {
    first: ["Nawaf", "Rima", "Joseph", "Maya", "Najib"],
    last: ["Salam", "Aoun", "Hariri", "Gemayel", "Frangieh"],
  },
  YEM: {
    first: ["Abdulmalik", "Tawakkol", "Ahmed", "Amat", "Rashad"],
    last: ["al-Houthi", "al-Alimi", "Saleh", "Hadi", "al-Ahmar"],
  },
  ARE: {
    first: ["Mohamed", "Hamdan", "Mansour", "Saif", "Khaled"],
    last: ["Al Nahyan", "Al Maktoum", "Al Nahyan", "Al Qasimi", "Al Nahyan"],
  },
  AFG: {
    first: ["Hibatullah", "Sirajuddin", "Abdul", "Mohammad", "Amir"],
    last: ["Akhundzada", "Haqqani", "Baradar", "Muttaqi", "Yaqoob"],
  },
  PHL: {
    first: ["Ferdinand", "Sara", "Leni", "Manuel", "Risa"],
    last: ["Santos", "Reyes", "Cruz", "Bautista", "Villanueva"],
  },
  VEN: {
    first: ["Delcy", "María", "Juan", "Edmundo", "Leopoldo"],
    last: ["Rodríguez", "Machado", "González", "López", "Pérez"],
  },
  CUB: {
    first: ["Miguel", "Yamila", "Raúl", "Ernesto", "Lis"],
    last: ["Díaz", "Fernández", "Cruz", "Morales", "Valdés"],
  },
  SDN: {
    first: ["Osman", "Amna", "Khalid", "Fatima", "Yasir"],
    last: ["Idris", "Abdelrahman", "el-Nur", "Babiker", "Elamin"],
  },
  ETH: {
    first: ["Dawit", "Hiwot", "Tesfaye", "Meseret", "Yonas"],
    last: ["Bekele", "Haile", "Tadesse", "Girma", "Alemu"],
  },
};

const STYLES: LeaderStyle[] = ["HAWKISH", "DOVISH", "PRAGMATIC", "REFORMIST", "HARDLINER"];

/**
 * A plausible new leader. Never reuses a word of `avoid` (the outgoing leader's
 * name), so a coup general does not share the surname of the man he deposes.
 */
export function generateLeaderName(countryId: string, rng: SeededRandom, avoid = ""): string {
  const pool = NAME_POOLS[countryId] ?? { first: ["Alex"], last: ["Novak"] };
  const taken = new Set(avoid.toLowerCase().split(/\s+/));
  const free = (names: string[]) => {
    const ok = names.filter(
      (n) =>
        !n
          .toLowerCase()
          .split(/\s+/)
          .some((w) => taken.has(w)),
    );
    return ok.length ? ok : names;
  };
  return `${rng.pick(free(pool.first))} ${rng.pick(free(pool.last))}`;
}

export function pickSuccessorStyle(
  country: CountryState,
  kind: GovernmentChangeKind,
  rng: SeededRandom,
): LeaderStyle {
  // Coups produce hardliners/hawks; elections after bad times produce the opposite of the incumbent
  if (kind === "COUP") return rng.nextBool(0.6) ? "HARDLINER" : "HAWKISH";
  if (kind === "REVOLUTION") return rng.nextBool(0.5) ? "REFORMIST" : "HARDLINER";
  if (kind === "ELECTION") {
    const current = country.leader.style;
    if (current === "HAWKISH" || current === "HARDLINER") {
      return rng.nextBool(0.6) ? "DOVISH" : "PRAGMATIC";
    }
    return rng.nextBool(0.5) ? "HAWKISH" : "PRAGMATIC";
  }
  return rng.pick(STYLES);
}

// Leader style shifts the country's effective behavior
export function applyLeaderStyleModifiers(country: CountryState): void {
  const p = country.personality;
  switch (country.leader.style) {
    case "HAWKISH":
      p.warPropensity = clamp(p.warPropensity + 10);
      p.riskTolerance = clamp(p.riskTolerance + 5);
      break;
    case "HARDLINER":
      p.warPropensity = clamp(p.warPropensity + 15);
      p.ideologicalRigidity = clamp(p.ideologicalRigidity + 15);
      p.diplomaticFlexibility = clamp(p.diplomaticFlexibility - 10);
      break;
    case "DOVISH":
      p.warPropensity = clamp(p.warPropensity - 15);
      p.diplomaticFlexibility = clamp(p.diplomaticFlexibility + 10);
      break;
    case "REFORMIST":
      p.ideologicalRigidity = clamp(p.ideologicalRigidity - 15);
      p.diplomaticFlexibility = clamp(p.diplomaticFlexibility + 10);
      break;
    case "PRAGMATIC":
      break;
  }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

export interface GovernmentTickResult {
  changes: GovernmentChange[];
  events: GameEvent[];
}

/** A wealthy democracy whose army stays out of politics (USA, Germany, Japan...). */
export function isConsolidatedDemocracy(country: CountryState): boolean {
  if (country.regimeType !== "DEMOCRACY") return false;
  if (country.politicalSystem.powerCenters.includes("MILITARY")) return false;
  const perCapita = country.gdp / Math.max(1, country.population);
  return perCapita >= 15000;
}

/**
 * Runs once per turn after wars/metrics: elections, coup risk, revolutions.
 */
export function runGovernmentDynamics(world: WorldState, rng: SeededRandom): GovernmentTickResult {
  const changes: GovernmentChange[] = [];
  const events: GameEvent[] = [];

  for (const country of world.countries) {
    if (country.collapsed) continue;
    const isPlayer = country.id === world.playerCountryId;

    // --- Elections ---
    const sys = country.politicalSystem;
    if (
      sys.electionCycleMonths > 0 &&
      sys.nextElectionTurn !== null &&
      world.turn >= sys.nextElectionTurn
    ) {
      sys.nextElectionTurn = world.turn + sys.electionCycleMonths;
      const change = holdElection(world, country, rng, isPlayer);
      if (change) {
        changes.push(change);
        events.push(governmentEvent(world, change, "GOVERNMENT"));
      } else {
        events.push({
          id: `evt_election_${country.id}_${world.turn}`,
          type: "GOVERNMENT",
          title: `${country.name}: ${country.leader.name} re-elected`,
          description: `${country.leader.title} ${country.leader.name} secured another term in ${possessive(country.name)} elections.`,
          affectedCountries: [country.id],
          turn: world.turn,
          severity: "NOTABLE",
        });
        country.legitimacy = clamp(country.legitimacy + 8);
        country.approval = clamp(country.approval + 3);
      }
      continue; // election year: skip coup checks this turn
    }

    // --- Coup risk (non-democracies, or any state in severe crisis) ---
    const coupProne =
      sys.powerCenters.includes("MILITARY") ||
      country.regimeType === "AUTOCRACY" ||
      country.regimeType === "MILITARY_JUNTA" ||
      country.regimeType === "COMMUNIST";
    const consolidated = isConsolidatedDemocracy(country);
    const crisis = country.legitimacy < 30 || country.stability < 22;
    // Rich, long-standing democracies don't do coups: institutions absorb even deep crises
    const coupPossible = consolidated
      ? country.stability < 8 && country.legitimacy < 15
      : coupProne || country.stability < 15;
    // A consolidated democracy removes a failing leader through its institutions
    if (isPlayer && consolidated && crisis && !coupPossible) {
      const d = world.director;
      const warned = d.coupWarnedTurn !== null && world.turn - d.coupWarnedTurn <= 8;
      if (!warned) {
        const warning = raiseCrisis(world, "ouster_vote", rng);
        if (warning) events.push(warning);
        d.coupWarnedTurn = world.turn;
        continue;
      }
      let risk =
        (30 - Math.min(30, country.legitimacy)) * 0.0022 +
        (25 - Math.min(25, country.stability)) * 0.0022;
      if (world.turn < d.coupShieldUntil) risk *= 0.25;
      if (world.difficulty === "ANALYST") risk *= 0.6;
      if (rng.next() < risk) {
        const change = executeOuster(world, country, rng);
        changes.push(change);
        events.push(governmentEvent(world, change, "GOVERNMENT"));
        continue;
      }
    }
    if (crisis && coupPossible) {
      const losingWar = world.wars.some(
        (w) =>
          (w.attackerId === country.id && w.frontline < 35) ||
          (w.defenderId === country.id && w.frontline > 65),
      );
      let risk =
        (30 - Math.min(30, country.legitimacy)) * 0.0022 +
        (25 - Math.min(25, country.stability)) * 0.0022;
      if (losingWar) risk += 0.04;
      if (country.insurgencyLevel === "REBELLION") risk += 0.012;
      if (country.insurgencyLevel === "GUERILLA") risk += 0.03;
      if (isPlayer) {
        // Telegraph before striking: the player first learns of the plot and
        // gets a chance to act. Only then can the officers move.
        const d = world.director;
        const warned = d.coupWarnedTurn !== null && world.turn - d.coupWarnedTurn <= 8;
        const canSee = world.difficulty !== "STRONGMAN" || country.intelLevel >= 50;
        if (!warned && canSee) {
          const warning = raiseCrisis(world, "coup_plot", rng);
          if (warning) events.push(warning);
          d.coupWarnedTurn = world.turn;
          continue;
        }
        if (world.turn < d.coupShieldUntil) risk *= 0.25;
        if (world.difficulty === "ANALYST") risk *= 0.6;
      }
      if (rng.next() < risk) {
        const change = executeCoup(world, country, rng, isPlayer);
        changes.push(change);
        events.push(governmentEvent(world, change, "GOVERNMENT"));
        continue;
      }
    }

    // --- Revolution ---
    // Consolidated democracies channel anger into elections and courts: a revolution
    // needs an armed insurgency AND a government that has lost almost all legitimacy
    const revolutionary = consolidated
      ? country.stability < 10 && country.insurgencyLevel === "GUERILLA" && country.legitimacy < 20
      : country.stability < 15 &&
        (country.insurgencyLevel === "REBELLION" || country.insurgencyLevel === "GUERILLA");
    if (revolutionary) {
      if (isPlayer) {
        const d = world.director;
        const warned = d.revoltWarnedTurn !== null && world.turn - d.revoltWarnedTurn <= 8;
        if (!warned) {
          const warning = raiseCrisis(world, "streets_boiling", rng);
          if (warning) events.push(warning);
          d.revoltWarnedTurn = world.turn;
          continue;
        }
      }
      if (rng.next() < (isPlayer && world.difficulty === "ANALYST" ? 0.03 : 0.05)) {
        const change = executeRevolution(world, country, rng, isPlayer);
        changes.push(change);
        events.push(governmentEvent(world, change, "GOVERNMENT"));
      }
    }
  }

  return { changes, events };
}

const INCUMBENCY_FATIGUE = 5;

function holdElection(
  world: WorldState,
  country: CountryState,
  rng: SeededRandom,
  isPlayer: boolean,
): GovernmentChange | null {
  // Incumbent score: approval dominates, modified by economy and war fatigue
  let score = country.approval;
  const mood = growthMood(country);
  score += mood > 0 ? 8 : mood < 0 ? -10 : 0;
  const atWar = country.atWarWith.length > 0;
  if (atWar) {
    const losing = world.wars.some(
      (w) =>
        (w.attackerId === country.id && w.frontline < 40) ||
        (w.defenderId === country.id && w.frontline > 60),
    );
    score += losing ? -15 : -5;
  }
  // "Time for a change": a government that has served a full term pays for it
  if (world.turn - country.leader.sinceTurn >= 36) score -= INCUMBENCY_FATIGUE;
  score += rng.nextFloat(-8, 8); // campaign dynamics

  if (score >= 45) return null; // incumbent survives

  const oldLeader = { ...country.leader };
  const style = pickSuccessorStyle(country, "ELECTION", rng);
  const newLeader: Leader = {
    name: isPlayer ? country.leader.name : generateLeaderName(country.id, rng, country.leader.name),
    title: country.politicalSystem.leaderTitle,
    style,
    origin: "ELECTED",
    sinceTurn: world.turn,
  };
  if (!isPlayer) {
    country.leader = newLeader;
    applyLeaderStyleModifiers(country);
    country.legitimacy = clamp(country.legitimacy + 15);
    country.approval = 55; // honeymoon
  }
  return {
    countryId: country.id,
    kind: "ELECTION",
    oldLeader,
    newLeader,
    description: isPlayer
      ? `You were defeated at the polls. ${possessive(country.name)} voters chose change.`
      : `${country.name} voted out ${oldLeader.title} ${oldLeader.name}; ${newLeader.name} takes office on a ${style.toLowerCase()} platform.`,
    isPlayerDeposed: isPlayer,
  };
}

function executeOuster(
  world: WorldState,
  country: CountryState,
  rng: SeededRandom,
): GovernmentChange {
  const oldLeader = { ...country.leader };
  const presidential = country.politicalSystem.type === "PRESIDENTIAL_DEMOCRACY";
  return {
    countryId: country.id,
    kind: "IMPEACHMENT",
    oldLeader,
    newLeader: {
      name: generateLeaderName(country.id, rng, country.leader.name),
      title: country.leader.title,
      style: "PRAGMATIC",
      origin: "ELECTED",
      sinceTurn: world.turn,
    },
    description: presidential
      ? "The votes were there. Impeached and convicted, you leave office in disgrace."
      : "Your own benches voted with the opposition. The government falls, and with it, your premiership.",
    isPlayerDeposed: true,
  };
}

function executeCoup(
  world: WorldState,
  country: CountryState,
  rng: SeededRandom,
  isPlayer: boolean,
): GovernmentChange {
  const oldLeader = { ...country.leader };
  const newLeader: Leader = {
    name: generateLeaderName(country.id, rng, country.leader.name),
    title: "General",
    style: pickSuccessorStyle(country, "COUP", rng),
    origin: "COUP",
    sinceTurn: world.turn,
  };
  if (!isPlayer) {
    country.leader = newLeader;
    country.regimeType = "MILITARY_JUNTA";
    country.politicalSystem.type = "MILITARY_JUNTA";
    country.politicalSystem.powerCenters = ["MILITARY", "SECURITY_SERVICES"];
    country.politicalSystem.electionCycleMonths = 0;
    country.politicalSystem.nextElectionTurn = null;
    country.politicalSystem.leaderTitle = "General";
    applyLeaderStyleModifiers(country);
    country.stability = clamp(country.stability - 10);
    country.legitimacy = 40;
    country.approval = clamp(country.approval - 10);
  }
  return {
    countryId: country.id,
    kind: "COUP",
    oldLeader,
    newLeader,
    description: isPlayer
      ? `Tanks surrounded the palace at dawn. The military has removed you from power.`
      : `Military coup in ${country.name}: ${oldLeader.title} ${oldLeader.name} deposed; General ${newLeader.name} now leads a junta.`,
    isPlayerDeposed: isPlayer,
  };
}

function executeRevolution(
  world: WorldState,
  country: CountryState,
  rng: SeededRandom,
  isPlayer: boolean,
): GovernmentChange {
  const oldLeader = { ...country.leader };
  const becomesDemocracy = country.regimeType !== "DEMOCRACY" && rng.nextBool(0.5);
  const newLeader: Leader = {
    name: generateLeaderName(country.id, rng, country.leader.name),
    title: becomesDemocracy ? "President" : "Chairman of the Revolutionary Council",
    style: pickSuccessorStyle(country, "REVOLUTION", rng),
    origin: "REVOLUTION",
    sinceTurn: world.turn,
  };
  if (!isPlayer) {
    country.leader = newLeader;
    if (becomesDemocracy) {
      country.regimeType = "DEMOCRACY";
      country.politicalSystem.type = "PRESIDENTIAL_DEMOCRACY";
      country.politicalSystem.powerCenters = ["EXECUTIVE", "LEGISLATURE"];
      country.politicalSystem.electionCycleMonths = 48;
      country.politicalSystem.nextElectionTurn = world.turn + 48;
      country.politicalSystem.leaderTitle = "President";
    } else {
      country.regimeType = "AUTOCRACY";
      country.politicalSystem.type = "PERSONALIST_AUTOCRACY";
      country.politicalSystem.powerCenters = ["EXECUTIVE", "SECURITY_SERVICES"];
      country.politicalSystem.electionCycleMonths = 0;
      country.politicalSystem.nextElectionTurn = null;
    }
    applyLeaderStyleModifiers(country);
    country.stability = 35;
    country.legitimacy = 50;
    country.approval = 55;
    country.insurgencyLevel = "UNREST";
  }
  return {
    countryId: country.id,
    kind: "REVOLUTION",
    oldLeader,
    newLeader,
    description: isPlayer
      ? `Crowds stormed the seat of government. The revolution has swept you from power.`
      : `Revolution in ${country.name}! ${oldLeader.title} ${oldLeader.name} has fled; ${newLeader.name} proclaims a new ${becomesDemocracy ? "democratic republic" : "revolutionary government"}.`,
    isPlayerDeposed: isPlayer,
  };
}

export function replaceLeaderAfterAssassination(
  world: WorldState,
  country: CountryState,
  rng: SeededRandom,
): GovernmentChange {
  const oldLeader = { ...country.leader };
  const newLeader: Leader = {
    name: generateLeaderName(country.id, rng, country.leader.name),
    title: country.politicalSystem.leaderTitle,
    style: pickSuccessorStyle(country, "SUCCESSION", rng),
    origin: "SUCCESSION",
    sinceTurn: world.turn,
  };
  const isPlayer = country.id === world.playerCountryId;
  if (!isPlayer) {
    country.leader = newLeader;
    applyLeaderStyleModifiers(country);
  }
  country.stability = clamp(country.stability - 12);
  country.legitimacy = clamp(country.legitimacy - 8);
  return {
    countryId: country.id,
    kind: "ASSASSINATION",
    oldLeader,
    newLeader,
    description: isPlayer
      ? `An assassin's bullet found its mark. Your rule has ended.`
      : `${oldLeader.title} ${oldLeader.name} of ${country.name} has been assassinated. ${newLeader.name} assumes power amid chaos.`,
    isPlayerDeposed: isPlayer,
  };
}

export function installPuppetRegime(
  world: WorldState,
  country: CountryState,
  sponsorId: string,
  rng: SeededRandom,
): GovernmentChange {
  const oldLeader = { ...country.leader };
  const newLeader: Leader = {
    name: generateLeaderName(country.id, rng, country.leader.name),
    title: "President",
    style: "PRAGMATIC",
    origin: "COUP",
    sinceTurn: world.turn,
  };
  const isPlayer = country.id === world.playerCountryId;
  if (!isPlayer) {
    country.leader = newLeader;
    country.relations[sponsorId] = 70;
    country.legitimacy = 35;
    country.stability = clamp(country.stability - 15);
    applyLeaderStyleModifiers(country);
  }
  return {
    countryId: country.id,
    kind: "FOREIGN_IMPOSED",
    oldLeader,
    newLeader,
    description: isPlayer
      ? `A foreign-backed coup has toppled your government.`
      : `Coup in ${country.name}: ${newLeader.name} seizes power — observers note the new government's striking alignment with foreign interests.`,
    isPlayerDeposed: isPlayer,
  };
}

function governmentEvent(
  world: WorldState,
  change: GovernmentChange,
  type: GameEvent["type"],
): GameEvent {
  return {
    id: `evt_gov_${change.countryId}_${world.turn}_${change.kind}`,
    type,
    title: `${
      change.kind === "ELECTION"
        ? "Power changes hands in"
        : change.kind === "COUP"
          ? "Military coup in"
          : change.kind === "REVOLUTION"
            ? "Revolution in"
            : "Government change in"
    } ${world.countries.find((c) => c.id === change.countryId)?.name ?? change.countryId}`,
    description: change.description,
    affectedCountries: [change.countryId],
    turn: world.turn,
    severity: change.kind === "ELECTION" ? "MAJOR" : "CRITICAL",
  };
}

// ============================================================================
// Player onboarding backstory
// ============================================================================

export function generatePlayerBackstory(country: CountryState, rng: SeededRandom): string {
  const templates: Record<string, string[]> = {
    PRESIDENTIAL_DEMOCRACY: [
      `After a snap election triggered by a corruption scandal that consumed your predecessor, your reformist coalition swept to power. The public expects change — and quickly.`,
      `A razor-thin election victory after the sudden death of the incumbent has made you ${country.politicalSystem.leaderTitle} of ${country.name}. Half the country celebrates; the other half doubts your mandate.`,
    ],
    PARLIAMENTARY_DEMOCRACY: [
      `After a snap election triggered by a corruption scandal, your coalition formed a narrow majority. Your government survives at the pleasure of restless coalition partners.`,
      `A vote of no confidence toppled the last government. As the compromise candidate acceptable to all factions, you now lead ${country.name} — for as long as the coalition holds.`,
    ],
    SEMI_PRESIDENTIAL: [
      `Riding a wave of public anger at the political establishment, you won the presidency of ${country.name} as an outsider. The old parties control parliament and want you to fail.`,
    ],
    ONE_PARTY_STATE: [
      `Following the sudden death of the General Secretary, the Politburo selected you as the compromise candidate after three days of closed-door deliberation. Rivals watch for your first mistake.`,
    ],
    MILITARY_JUNTA: [
      `Following internal infighting within the Supreme Council, you emerged as the compromise general to lead ${country.name}. The colonels who elevated you can remove you just as easily.`,
    ],
    ABSOLUTE_MONARCHY: [
      `Your father's passing has placed the crown of ${country.name} on your head. The royal family is vast, ambitious, and not uniformly loyal.`,
    ],
    CONSTITUTIONAL_MONARCHY: [
      `After a snap election, you formed a government in the King's name. The palace expects deference; the voters expect results.`,
    ],
    THEOCRACY: [
      `The Assembly of Experts has elevated you as the new guardian of the revolution after your predecessor's death. The clerical establishment and the security services each believe you owe them.`,
    ],
    PERSONALIST_AUTOCRACY: [
      `Your predecessor was assassinated at a military parade. As the security chief who restored order in the chaotic hours that followed, you now hold supreme power — built on fear and obligation.`,
    ],
  };
  const pool = templates[country.politicalSystem.type] ?? templates.PRESIDENTIAL_DEMOCRACY;
  const intro = rng.pick(pool);
  const context =
    country.stability < 45
      ? ` You inherit a restless nation: unrest simmers in the streets and your security chiefs deliver grim briefings.`
      : country.atWarWith.length > 0
        ? ` You inherit a nation at war.`
        : ` The world is watching to see what kind of leader you will be.`;
  return intro + context;
}

import { areNeighbors, encounterAtSea } from "./crises.js";
import type { SeededRandom } from "./seed.js";
import { getRelation } from "./systems/diplomacy.js";
import type { CountryState, GameEvent, PendingDecision, WorldState } from "./types.js";

/**
 * Historical-pattern event engine. Each template models a class of events that
 * has recurred throughout modern geopolitical history; triggers test the world
 * state so events emerge plausibly from the situation rather than at random.
 */

interface EventContext {
  world: WorldState;
  rng: SeededRandom;
}

interface EventTemplate {
  id: string;
  baseChance: number; // per-turn probability when trigger matches
  trigger: (ctx: EventContext) => CountryState[] | null; // returns affected countries or null
  build: (ctx: EventContext, affected: CountryState[]) => GameEvent | null;
}

function eid(world: WorldState, key: string): string {
  return `evt_${key}_${world.turn}`;
}

function pickUnstable(ctx: EventContext, threshold: number): CountryState[] | null {
  const candidates = ctx.world.countries.filter((c) => !c.collapsed && c.stability < threshold);
  if (candidates.length === 0) return null;
  return [ctx.rng.pick(candidates)];
}

function rivals(ctx: EventContext): [CountryState, CountryState] | null {
  const pairs: [CountryState, CountryState][] = [];
  for (const a of ctx.world.countries) {
    if (a.collapsed || a.id === ctx.world.playerCountryId) continue;
    for (const rid of a.history.historicalRivals ?? []) {
      if (rid === ctx.world.playerCountryId) continue;
      const b = ctx.world.countries.find((c) => c.id === rid && !c.collapsed);
      if (b && getRelation(a, b.id) < -30 && !a.atWarWith.includes(b.id)) {
        pairs.push([a, b]);
      }
    }
  }
  if (pairs.length === 0) return null;
  return ctx.rng.pick(pairs);
}

const TEMPLATES: EventTemplate[] = [
  // --- Border incident between rivals (Gulf of Tonkin, Kargil, countless others) ---
  {
    id: "border_incident",
    baseChance: 0.1,
    trigger: (ctx) => {
      const pair = rivals(ctx);
      return pair ? [pair[0], pair[1]] : null;
    },
    build: (ctx, [a, b]) => {
      a.relations[b.id] = Math.max(-100, (a.relations[b.id] ?? 0) - 8);
      b.relations[a.id] = Math.max(-100, (b.relations[a.id] ?? 0) - 8);
      ctx.world.globalTension = Math.min(100, ctx.world.globalTension + 2);
      const border = areNeighbors(a, b);
      return {
        id: eid(ctx.world, "border"),
        type: "CRISIS",
        title: border
          ? `Border clash between ${a.name} and ${b.name}`
          : `${a.name} and ${b.name} in tense military encounter`,
        description: border
          ? `Patrols exchanged fire along the contested frontier between ${a.name} and ${b.name}. Casualties are reported on both sides; state media in both capitals are demanding retribution.`
          : encounterAtSea(a, b)
            ? `Warships and aircraft from ${a.name} and ${b.name} came dangerously close in international waters. Both sides accuse the other of reckless provocation.`
            : `Military aircraft and drones from ${a.name} and ${b.name} came dangerously close over contested airspace. Both sides accuse the other of reckless provocation.`,
        affectedCountries: [a.id, b.id],
        turn: ctx.world.turn,
        severity: "MAJOR",
      };
    },
  },

  // --- Oil shock (1973, 1979, 1990, 2022) ---
  {
    id: "oil_shock",
    baseChance: 0.15,
    trigger: (ctx) => {
      const exporterAtWar = ctx.world.countries.filter(
        (c) =>
          (c.economyProfile?.keyResources ?? []).includes("oil") &&
          (c.atWarWith.length > 0 || c.stability < 30) &&
          ["SAU", "IRN", "RUS", "NGA"].includes(c.id),
      );
      return exporterAtWar.length > 0 ? exporterAtWar.slice(0, 1) : null;
    },
    build: (ctx, [exporter]) => {
      for (const c of ctx.world.countries) {
        if ((c.economyProfile?.keyResources ?? []).includes("oil")) {
          c.growthRate += 0.004; // windfall
        } else {
          c.growthRate -= 0.006;
          c.approval = Math.max(0, c.approval - 3);
        }
      }
      return {
        id: eid(ctx.world, "oil"),
        type: "ECONOMY",
        title: "OIL SHOCK: Crude prices spiral",
        description: `Turmoil in ${exporter.name} has sent oil markets into panic. Prices at the pump are soaring worldwide; importing nations face inflation and angry motorists, while petrostates enjoy a windfall.`,
        affectedCountries: ctx.world.countries.map((c) => c.id),
        turn: ctx.world.turn,
        severity: "MAJOR",
      };
    },
  },

  // --- Corruption scandal (endemic to all systems) ---
  {
    id: "corruption_scandal",
    baseChance: 0.06,
    trigger: (ctx) => {
      const candidates = ctx.world.countries.filter(
        (c) => !c.collapsed && c.legitimacy > 25 && c.id !== ctx.world.playerCountryId,
      );
      if (candidates.length === 0) return null;
      return [ctx.rng.pick(candidates)];
    },
    build: (ctx, [country]) => {
      country.legitimacy = Math.max(0, country.legitimacy - 8);
      country.approval = Math.max(0, country.approval - 6);
      const event: GameEvent = {
        id: eid(ctx.world, "scandal"),
        type: "STABILITY",
        title: `Corruption scandal rocks ${country.name}`,
        description: `Leaked documents implicate senior officials around ${country.leader.title} ${country.leader.name} in a vast embezzlement scheme. ${
          country.regimeType === "DEMOCRACY"
            ? "Opposition parties demand resignations; the press smells blood."
            : "The story is suppressed at home but circulates abroad — and inside the elite."
        }`,
        affectedCountries: [country.id],
        turn: ctx.world.turn,
        severity: "NOTABLE",
      };
      return event;
    },
  },

  // --- Natural disaster (aid diplomacy openings) ---
  {
    id: "natural_disaster",
    baseChance: 0.07,
    trigger: (ctx) => [ctx.rng.pick(ctx.world.countries.filter((c) => !c.collapsed))],
    build: (ctx, [country]) => {
      const kinds = [
        "an earthquake",
        "catastrophic floods",
        "a devastating typhoon",
        "wildfires",
        "a deadly drought",
      ];
      const kind = ctx.rng.pick(kinds);
      country.stability = Math.max(0, country.stability - 4);
      country.gdp *= 0.997;
      return {
        id: eid(ctx.world, "disaster"),
        type: "RANDOM",
        title: `Disaster: ${kind} strikes ${country.name}`,
        description: `${country.name} reels from ${kind}. Thousands are displaced and infrastructure is wrecked. International aid offers are being weighed — disasters have opened diplomatic doors before.`,
        affectedCountries: [country.id],
        turn: ctx.world.turn,
        severity: "NOTABLE",
      };
    },
  },

  // --- Mass protest wave (1989, Arab Spring, 2019) ---
  {
    id: "protest_wave",
    baseChance: 0.12,
    trigger: (ctx) => pickUnstable(ctx, 40),
    build: (ctx, [country]) => {
      country.stability = Math.max(0, country.stability - 5);
      country.legitimacy = Math.max(0, country.legitimacy - 4);
      return {
        id: eid(ctx.world, "protest"),
        type: "STABILITY",
        title: `Mass protests sweep ${country.name}`,
        description: `Hundreds of thousands fill the squares of ${country.name}, demanding change. Security forces hesitate. ${country.leader.title} ${country.leader.name}'s grip looks shakier by the day.`,
        affectedCountries: [country.id],
        turn: ctx.world.turn,
        severity: "MAJOR",
      };
    },
  },

  // --- Intelligence leak / whistleblower (corrects world's beliefs) ---
  {
    id: "intel_leak",
    baseChance: 0.05,
    trigger: (ctx) => [ctx.rng.pick(ctx.world.countries.filter((c) => !c.collapsed))],
    build: (ctx, [country]) => {
      // The world learns the truth about this country
      for (const observer of ctx.world.countries) {
        if (observer.id === country.id) continue;
        const belief = observer.beliefs[country.id];
        if (belief) {
          belief.gdp = country.gdp;
          belief.stability = country.stability;
          belief.nuclearProgress = country.nuclear.progress;
          belief.accuracy = Math.max(belief.accuracy, 85);
        }
      }
      const hadSecret = country.nuclear.status === "DEVELOPING";
      return {
        id: eid(ctx.world, "leak"),
        type: "COVERT",
        title: `Massive leak exposes ${country.name}'s secrets`,
        description: hadSecret
          ? `A defector from ${country.name} has handed journalists a trove of classified files — including evidence of a clandestine nuclear weapons program. Intelligence agencies worldwide are recalibrating.`
          : `A whistleblower inside ${country.name}'s government has published thousands of classified documents. The country's true economic and military position is now plain for all to see.`,
        affectedCountries: [country.id],
        turn: ctx.world.turn,
        severity: "MAJOR",
      };
    },
  },

  // --- Terror attack (insurgency spillover) ---
  {
    id: "terror_attack",
    baseChance: 0.25,
    trigger: (ctx) => {
      const sources = ctx.world.countries.filter(
        (c) => c.insurgencyLevel === "REBELLION" || c.insurgencyLevel === "GUERILLA",
      );
      return sources.length ? [ctx.rng.pick(sources)] : null;
    },
    build: (ctx, [country]) => {
      country.stability = Math.max(0, country.stability - 6);
      country.approval = Math.max(0, country.approval - 4);
      return {
        id: eid(ctx.world, "terror"),
        type: "STABILITY",
        title: `Terror attack in ${country.name}`,
        description: `A bombing in the heart of ${country.name}'s capital has killed dozens. The insurgency claims responsibility. Public fury demands the government act — softly or savagely.`,
        affectedCountries: [country.id],
        turn: ctx.world.turn,
        severity: "MAJOR",
      };
    },
  },

  // --- Proxy clash between spheres of influence (Cold War pattern) ---
  {
    id: "proxy_clash",
    baseChance: 0.06,
    trigger: (ctx) => {
      if (ctx.world.globalTension < 50) return null;
      const greatPowers = ctx.world.countries.filter(
        (c) => c.gdp > 3e12 && (c.history.sphereOfInfluence ?? []).length > 0,
      );
      if (greatPowers.length < 2) return null;
      const [a, b] = ctx.rng.pickMultiple(greatPowers, 2);
      if (getRelation(a, b.id) > -20) return null;
      return [a, b];
    },
    build: (ctx, [a, b]) => {
      a.relations[b.id] = Math.max(-100, (a.relations[b.id] ?? 0) - 5);
      b.relations[a.id] = Math.max(-100, (b.relations[a.id] ?? 0) - 5);
      ctx.world.globalTension = Math.min(100, ctx.world.globalTension + 5);
      return {
        id: eid(ctx.world, "proxy"),
        type: "DIPLOMACY",
        title: `${a.name} and ${b.name} clash through proxies`,
        description: `Weapons shipments, advisors, and money from ${a.name} and ${b.name} are pouring into opposing sides of a third-country conflict. Neither power will back down; both deny everything.`,
        affectedCountries: [a.id, b.id],
        turn: ctx.world.turn,
        severity: "NOTABLE",
      };
    },
  },

  // --- Financial crisis (1997, 2008) ---
  {
    id: "financial_crisis",
    baseChance: 0.02,
    trigger: (ctx) => {
      const vulnerable = ctx.world.countries.filter((c) => c.debtGdpRatio > 110 && c.gdp > 1e12);
      return vulnerable.length ? [ctx.rng.pick(vulnerable)] : null;
    },
    build: (ctx, [epicenter]) => {
      for (const c of ctx.world.countries) {
        c.growthRate -= c.id === epicenter.id ? 0.02 : 0.008;
        c.approval = Math.max(0, c.approval - 2);
      }
      return {
        id: eid(ctx.world, "fincrisis"),
        type: "ECONOMY",
        title: `Financial crisis erupts in ${epicenter.name}`,
        description: `A banking collapse in ${epicenter.name} is cascading through global markets. Credit is freezing worldwide; every finance ministry is in emergency session. Economists whisper comparisons to 2008.`,
        affectedCountries: ctx.world.countries.map((c) => c.id),
        turn: ctx.world.turn,
        severity: "CRITICAL",
      };
    },
  },

  // --- Missile test brinkmanship (North Korea pattern) ---
  {
    id: "missile_test",
    baseChance: 0.18,
    trigger: (ctx) => {
      const provocateurs = ctx.world.countries.filter(
        (c) =>
          (c.nuclear.status === "ARMED" || c.nuclear.status === "TESTED") &&
          c.personality.isolationism > 60 &&
          c.personality.riskTolerance > 60,
      );
      return provocateurs.length ? [ctx.rng.pick(provocateurs)] : null;
    },
    build: (ctx, [country]) => {
      ctx.world.globalTension = Math.min(100, ctx.world.globalTension + 4);
      const neighbors = (country.history.historicalRivals ?? [])
        .map((id) => ctx.world.countries.find((c) => c.id === id))
        .filter((c): c is CountryState => !!c);
      for (const n of neighbors) {
        n.relations[country.id] = Math.max(-100, (n.relations[country.id] ?? 0) - 4);
      }
      return {
        id: eid(ctx.world, "missile"),
        type: "NUCLEAR",
        title: `${country.name} fires missiles over neighbors' waters`,
        description: `${country.name} launched a salvo of ballistic missiles in a demonstration of force. ${country.leader.title} ${country.leader.name} warns enemies of "merciless consequences." The region holds its breath.`,
        affectedCountries: [country.id, ...neighbors.map((n) => n.id)],
        turn: ctx.world.turn,
        severity: "MAJOR",
      };
    },
  },
];

/**
 * The annual Global Summit (every July): embargo reviews, tension reduction.
 */
function julySummit(world: WorldState, _rng: SeededRandom): GameEvent | null {
  const month = Number(world.date.split("-")[1]);
  if (month !== 7) return null;

  const liftedEmbargoes: string[] = [];
  for (const country of world.countries) {
    if (country.underGlobalEmbargo) {
      // Embargo review: lifted if behavior improved (no wars, no nukes in use)
      const behaved = country.atWarWith.length === 0;
      const avgRelation =
        world.countries
          .filter((c) => c.id !== country.id)
          .reduce((sum, c) => sum + (c.relations[country.id] ?? 0), 0) /
        Math.max(1, world.countries.length - 1);
      if (behaved && avgRelation > -30) {
        country.underGlobalEmbargo = false;
        liftedEmbargoes.push(country.name);
      }
    }
  }
  world.globalTension = Math.max(0, world.globalTension - 5);

  return {
    id: `evt_summit_${world.turn}`,
    type: "SUMMIT",
    title: "Global Summit convenes",
    description:
      liftedEmbargoes.length > 0
        ? `World leaders gathered for the annual Global Summit. After heated debate, the arms embargo on ${liftedEmbargoes.join(", ")} was lifted. Communiqués preach restraint; corridors buzz with deal-making.`
        : `World leaders gathered for the annual Global Summit. Much was said about peace and stability; tensions ease — at least on paper.`,
    affectedCountries: world.countries.map((c) => c.id),
    turn: world.turn,
    severity: "NOTABLE",
  };
}

export class EventEngine {
  generateEvents(world: WorldState, rng: SeededRandom): GameEvent[] {
    const events: GameEvent[] = [];

    const summit = julySummit(world, rng);
    if (summit) events.push(summit);

    // Tension scales event frequency: a tense world is an eventful one
    const tensionMultiplier = 0.7 + (world.globalTension / 100) * 0.8;
    let crisisCount = 0;

    // Don't repeat the same story arc back-to-back: per-template cooldown,
    // checked before building so a skipped event never mutates the world
    for (const template of TEMPLATES) {
      if (crisisCount >= 3) break; // a few world stories per month is plenty
      const key = `world:${template.id}`;
      const last = world.director.lastUsed[key];
      if (last !== undefined && world.turn - last < 4) continue;
      if (rng.next() > template.baseChance * tensionMultiplier) continue;
      const affected = template.trigger({ world, rng });
      if (!affected) continue;
      const event = template.build({ world, rng }, affected);
      if (event) {
        events.push(event);
        world.director.lastUsed[key] = world.turn;
        if (event.severity === "MAJOR" || event.severity === "CRITICAL") crisisCount += 1;
      }
    }

    return events;
  }
}

export function collectPendingDecisions(events: GameEvent[]): PendingDecision[] {
  return events.filter((e) => e.decision).map((e) => e.decision as PendingDecision);
}

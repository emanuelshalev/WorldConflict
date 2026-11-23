/**
 * Era filter: which roster countries are sovereign states at the scenario date, and which
 * blocs divide them. A country marked PART_OF (the Ukrainian SSR in 1990) or NOT_INDEPENDENT
 * (the Trucial States in 1960) keeps its row in the world so the map and the numbers work,
 * but it has no foreign policy: no AI orders, no pacts, no world events, no crisis
 * counterpart, no diplomacy aimed at it. Marked at world creation from the scenario's
 * `eraStatus`; an `until` month (Nigeria, 1 October 1960) turns it into a state on that date.
 *
 * Pure: no RNG, no I/O, no clock.
 */
import type { CountryState, GameEvent, WorldState } from "./types.js";

/** Not a sovereign state this month: no agency, never an event subject or a target. */
export function eraAbsent(c: CountryState | undefined): boolean {
  return !!c?.eraStatus;
}

/** A sovereign, functioning state: may act, be acted on and appear in world stories. */
export function isPresent(c: CountryState | undefined): c is CountryState {
  return !!c && !c.collapsed && !c.eraStatus;
}

/** The countries that are states this month (collapsed ones included: they still exist). */
export function presentCountries(world: WorldState): CountryState[] {
  return world.countries.filter((c) => !c.eraStatus);
}

/** The year of the world's current month. */
export function worldYear(world: Pick<WorldState, "date">): number {
  return Number(world.date.slice(0, 4)) || 2026;
}

type Camp = "WEST" | "EAST";

function campOf(side: string): Camp | null {
  if (side === "WEST" || side === "WEST2") return "WEST";
  if (side === "EAST" || side === "EAST2") return "EAST";
  return null;
}

/** The camp (West or East) a country belongs to through the scenario's blocs, if any. */
export function eraCamp(world: WorldState, id: string): Camp | null {
  for (const b of world.blocs ?? []) {
    if (!b.members.includes(id)) continue;
    const camp = campOf(b.side);
    if (camp) return camp;
  }
  return null;
}

/** True when the two belong to opposing camps (NATO and the Warsaw Pact): no AI pact between them. */
export function opposingCamps(world: WorldState, a: string, b: string): boolean {
  const ca = eraCamp(world, a);
  const cb = eraCamp(world, b);
  return !!ca && !!cb && ca !== cb;
}

/**
 * Countries whose `until` month has come become states: the flag clears and the world reads
 * the news. Runs at the start of the month, before events and the AI.
 */
export function applyEraTransitions(world: WorldState): GameEvent[] {
  const events: GameEvent[] = [];
  for (const c of world.countries) {
    if (!c.eraStatus || !c.eraUntil || world.date < c.eraUntil) continue;
    const wasPartOf = c.eraStatus === "PART_OF";
    c.eraStatus = undefined;
    c.eraUntil = undefined;
    events.push({
      id: `evt_independence_${c.id}_${world.turn}`,
      type: "DIPLOMACY",
      title: wasPartOf ? `${c.name} restores its independence` : `${c.name} becomes independent`,
      description: wasPartOf
        ? `${c.name} leaves the union it had joined and takes back its seat as a sovereign state.`
        : `${c.name} lowers the colonial flag and raises its own. A new state joins the community of nations.`,
      affectedCountries: [c.id],
      turn: world.turn,
      severity: "NOTABLE",
    });
  }
  return events;
}

/**
 * Words and institutions that did not exist before a year: a story set earlier must not
 * use them. Shared by the generators (which pick era wording) and the era test.
 */
export const ANACHRONISMS: Array<{ term: RegExp; from: number; what: string }> = [
  { term: /\bEuropean Union\b|\bthe EU\b|\bEU\b/, from: 1993, what: "European Union (1993)" },
  { term: /\bcyber/i, from: 1995, what: "cyberattacks (mid-1990s)" },
  { term: /\binternet\b|\bonline\b|\bsocial media\b/i, from: 1995, what: "the internet" },
  { term: /\bdrones?\b/i, from: 1995, what: "military drones in the news (1990s)" },
  { term: /\b2008\b/, from: 2009, what: "the 2008 crash" },
  { term: /\bG20\b/, from: 1999, what: "G20 (1999)" },
  { term: /\bWTO\b/, from: 1995, what: "WTO (1995)" },
  { term: /\bPalestinian Authority\b/, from: 1994, what: "Palestinian Authority (1994)" },
  { term: /\bHamas\b/, from: 1988, what: "Hamas (1987)" },
  { term: /\bHezbollah\b/, from: 1983, what: "Hezbollah (1982)" },
  { term: /\bOPEC\b/, from: 1961, what: "OPEC (Sept 1960)" },
  {
    term: /\bvaccine effort\b|\bnovel respiratory virus\b/i,
    from: 2000,
    what: "global vaccine diplomacy (2000s)",
  },
  { term: /\bIAEA\b/, from: 1958, what: "IAEA (1957)" },
];

/** The anachronisms in a text for a given year (empty when the text fits the era). */
export function anachronismsIn(text: string, year: number): string[] {
  return ANACHRONISMS.filter((a) => year < a.from && a.term.test(text)).map((a) => a.what);
}

import type { SeededRandom } from "./seed.js";
import type { GovernmentChange } from "./systems/government.js";
import type { WarMonthSummary } from "./systems/military.js";
import type { GameEvent, NewspaperEntry, WorldState } from "./types.js";

/**
 * Turns the month's happenings into front-page copy. The newspaper is the
 * player's primary window on the world — written with drama, names, and
 * consequence, like the original game's News Phase.
 */

const WAR_VERBS_ADVANCE = [
  "smashes through defenses",
  "makes sweeping gains",
  "advances on all fronts",
  "breaks the stalemate",
];
const WAR_VERBS_STALL = [
  "grinds to a halt",
  "bogs down in attrition",
  "trades trenches at terrible cost",
  "bleeds for every mile",
];

export function generateNewspaper(
  world: WorldState,
  events: GameEvent[],
  warSummaries: WarMonthSummary[],
  governmentChanges: GovernmentChange[],
  rng: SeededRandom,
): NewspaperEntry[] {
  const entries: NewspaperEntry[] = [];
  const turn = world.turn;

  // Government changes are always front-page
  for (const change of governmentChanges) {
    const country = world.countries.find((c) => c.id === change.countryId);
    entries.push({
      headline:
        change.kind === "COUP"
          ? `COUP D'ÉTAT IN ${country?.name.toUpperCase() ?? change.countryId}`
          : change.kind === "REVOLUTION"
            ? `REVOLUTION TOPPLES ${(country?.name ?? change.countryId).toUpperCase()} GOVERNMENT`
            : change.kind === "ASSASSINATION"
              ? `LEADER OF ${(country?.name ?? change.countryId).toUpperCase()} ASSASSINATED`
              : `${(country?.name ?? change.countryId).toUpperCase()} VOTES FOR CHANGE`,
      description: change.description,
      relatedCountries: [change.countryId],
      turn,
      category: "GOVERNMENT",
    });
  }

  // Wars: dramatic frontline reporting
  for (const summary of warSummaries) {
    const attacker = world.countries.find((c) => c.id === summary.war.attackerId);
    const defender = world.countries.find((c) => c.id === summary.war.defenderId);
    if (!attacker || !defender) continue;

    if (summary.ended) {
      entries.push({
        headline: summary.ended.winnerId
          ? `${(summary.ended.winnerId === attacker.id ? attacker : defender).name.toUpperCase()} VICTORIOUS`
          : `GUNS FALL SILENT: CEASEFIRE IN ${attacker.name.toUpperCase()}-${defender.name.toUpperCase()} WAR`,
        description: summary.ended.description,
        relatedCountries: [attacker.id, defender.id],
        turn,
        category: "WAR",
      });
      continue;
    }

    const attackerAdvancing = summary.delta > 1.5;
    const stalemate = Math.abs(summary.delta) <= 1.5;
    const monthCasualties = summary.attackerCasualties + summary.defenderCasualties;
    const verb = stalemate ? rng.pick(WAR_VERBS_STALL) : rng.pick(WAR_VERBS_ADVANCE);
    const leader = attackerAdvancing ? attacker : defender;
    entries.push({
      headline: stalemate
        ? `WAR OF ATTRITION: ${attacker.name} offensive ${verb}`
        : `${leader.name.toUpperCase()} ${verb.toUpperCase()}`,
      description: `Fighting between ${attacker.name} and ${defender.name} claimed an estimated ${monthCasualties.toLocaleString()} casualties this month. ${
        stalemate
          ? "Military analysts see no end in sight."
          : `${leader.name}'s forces hold the initiative; pressure mounts on ${leader.id === attacker.id ? defender.name : attacker.name} to seek terms.`
      }`,
      relatedCountries: [attacker.id, defender.id],
      turn,
      category: "WAR",
    });
  }

  // Events become stories
  for (const event of events) {
    entries.push({
      headline: event.title,
      description: event.description,
      relatedCountries: event.affectedCountries,
      turn,
      category:
        event.type === "NUCLEAR"
          ? "NUCLEAR"
          : event.type === "COVERT"
            ? "COVERT"
            : event.type === "ECONOMY"
              ? "ECONOMY"
              : event.type === "GOVERNMENT"
                ? "GOVERNMENT"
                : event.type === "WAR"
                  ? "WAR"
                  : event.type === "DIPLOMACY" || event.type === "SUMMIT"
                    ? "DIPLOMACY"
                    : "WORLD",
    });
  }

  // World mood piece when quiet
  if (entries.length < 3) {
    const tension = world.globalTension;
    entries.push({
      headline:
        tension > 70
          ? "EDITORIAL: A world holding its breath"
          : tension > 40
            ? "EDITORIAL: Uneasy calm in world affairs"
            : "EDITORIAL: A rare quiet month for diplomacy",
      description:
        tension > 70
          ? "Foreign ministries from Washington to Beijing report crisis staffing. Markets twitch at every communiqué. Historians note that months like these often precede the storm."
          : tension > 40
            ? "No new wars, no fallen governments — yet diplomats privately admit the great questions of our era remain unresolved."
            : "Trade flows, summits conclude amicably, and for one month at least, the world's leaders found more reasons to talk than to fight.",
      relatedCountries: [],
      turn,
      category: "WORLD",
    });
  }

  return entries;
}

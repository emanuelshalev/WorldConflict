import { possessive, withArticle } from "./text.js";
import type { GameOverReason, WorldState } from "./types.js";

/**
 * The reveal's words: verdict stamps, press quotes and history's judgement. Deterministic:
 * every choice is a function of the finished world (variants are picked by the seed), and
 * every outlet is fictional and generic by role, never a real masthead.
 */

export interface PressQuote {
  role: "home" | "ally" | "rival";
  outlet: string;
  quote: string;
  tone: "good" | "bad" | "neutral";
}

/** Pick a variant deterministically from the world seed and a salt. */
function pick<T>(world: WorldState, salt: number, options: T[]): T {
  const i = Math.abs((world.seed * 31 + salt * 17 + world.turn) | 0) % options.length;
  return options[i];
}

export function verdictLabel(
  world: WorldState,
  victory: boolean,
  reason: GameOverReason | null,
): string {
  if (reason === "NUCLEAR_HOLOCAUST") return "MIDNIGHT";
  if (reason === "LOST_ELECTION") return "VOTED OUT";
  if (reason === "DEPOSED_COUP") return "OVERTHROWN";
  if (reason === "REVOLUTION") return "SWEPT AWAY";
  if (reason === "ASSASSINATED") return "ASSASSINATED";
  if (reason === "IMPEACHED") return "IMPEACHED";
  if (reason === "COUNTRY_COLLAPSED") return "STATE COLLAPSED";
  if (!victory) return reason === "OBJECTIVE_FAILED" ? "MISSION FAILED" : "TIME RAN OUT";
  if (world.mode === "FLASHPOINT") return "MISSION COMPLETE";
  if (world.mode === "LEGACY") return "A DECADE IN POWER";
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  return (me?.politicalSystem.electionCycleMonths ?? 0) > 0 ? "FOUR MORE YEARS" : "REVIEW PASSED";
}

export interface PressInput {
  country: string; // the player's country name
  approvalStart: number;
  approvalEnd: number;
  growthEnd: number; // annualised real growth, 0.021 = 2.1%
  ally?: { name: string; before: number; after: number };
  rival?: { name: string; before: number; after: number; autocracy: boolean };
  warsStarted: number;
  warsEnded: number;
}

export function pressQuotes(world: WorldState, p: PressInput): PressQuote[] {
  const out: PressQuote[] = [];
  const up = p.approvalEnd - p.approvalStart;
  const growth = `${(p.growthEnd * 100).toFixed(1)}%`;
  const homeGood = up >= 3 && p.growthEnd >= 0;
  const homeBad = up <= -5 || p.growthEnd < 0;
  out.push({
    role: "home",
    outlet: "The capital's paper",
    tone: homeGood ? "good" : homeBad ? "bad" : "neutral",
    quote: homeGood
      ? pick(world, 1, [
          `Approval from ${Math.round(p.approvalStart)}% to ${Math.round(p.approvalEnd)}%, growth at ${growth}: the country liked what it saw.`,
          `${Math.round(p.approvalEnd)}% approval and an economy growing ${growth}. Few saw that coming.`,
        ])
      : homeBad
        ? pick(world, 2, [
            `Approval slid to ${Math.round(p.approvalEnd)}% with growth at ${growth}. The public stopped listening.`,
            `From ${Math.round(p.approvalStart)}% to ${Math.round(p.approvalEnd)}%: a government that lost the room.`,
          ])
        : pick(world, 3, [
            `Approval at ${Math.round(p.approvalEnd)}%, growth at ${growth}: steady, if never stirring.`,
            `Neither triumph nor disaster: ${Math.round(p.approvalEnd)}% approval and a ${growth} economy.`,
          ]),
  });
  if (p.ally) {
    const d = p.ally.after - p.ally.before;
    out.push({
      role: "ally",
      outlet: `${possessive(p.ally.name)} business daily`,
      tone: d >= 3 ? "good" : d <= -3 ? "bad" : "neutral",
      quote:
        d >= 3
          ? `${withArticle(p.country)} kept its word. Ties are warmer than a year ago (${Math.round(p.ally.before)} to ${Math.round(p.ally.after)}).`
          : d <= -3
            ? `A partner that stopped consulting us. Relations cooled from ${Math.round(p.ally.before)} to ${Math.round(p.ally.after)}.`
            : `Reliable, predictable, unremarkable: ties with ${withArticle(p.country)} held at ${Math.round(p.ally.after)}.`,
    });
  }
  if (p.rival) {
    const d = p.rival.after - p.rival.before;
    const outlet = p.rival.autocracy
      ? `${possessive(p.rival.name)} state television`
      : `${possessive(p.rival.name)} opposition weekly`;
    out.push({
      role: "rival",
      outlet,
      tone: d >= 10 ? "good" : p.warsStarted > 0 || d <= -10 ? "bad" : "neutral",
      quote:
        p.warsStarted > 0
          ? `The aggressor showed its face. History will remember who fired first.`
          : p.warsEnded > 0 && d >= 0
            ? `Even the enemy can count: the guns are quiet, and they blinked first.`
            : d >= 10
              ? `A thaw nobody predicted. Our relations climbed from ${Math.round(p.rival.before)} to ${Math.round(p.rival.after)}.`
              : d <= -10
                ? `Every month a new provocation. Relations sank to ${Math.round(p.rival.after)}.`
                : `The same hostility, the same speeches: nothing changed between us.`,
    });
  }
  return out;
}

const CLASS_PHRASE: Record<string, string> = {
  "The Destroyer": "reached for the nuclear option",
  "Risk-Taking Expansionist": "treated war as policy",
  "Reckless Adventurer": "gambled on war after war",
  "Loyal Ally": "went to war beside a friend",
  Warmonger: "reached for the sword when other doors were open",
  "The Gambler": "bet the state on coups and plots",
  "Shadow Operator": "ran foreign policy on deniability",
  "Iron Fist": "kept order with batons and curfews",
  Peacemaker: "spent capital stopping other people's wars",
  "Master Diplomat": "won respect in foreign capitals",
  "Pragmatic Stabilizer": "chose steady stewardship over drama",
  "The Reformer": "rebuilt institutions month after month",
  "The Showman": "governed from the podium",
  "The Unloved": "never won the public over",
  "Cautious Caretaker": "kept the ship afloat without turning the wheel",
  "Steady Hand": "managed crises rather than made them",
};

/** History's judgement: one line from the verdict, the leadership style and the best seal. */
export function judgementLine(
  world: WorldState,
  input: {
    victory: boolean;
    deposed: boolean;
    classification: string;
    bestAchievement?: string;
  },
): string {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  const title = (me?.leader.title ?? "leader").toLowerCase();
  const article = /^[aeiou]/.test(title) ? "An" : "A";
  const style = CLASS_PHRASE[input.classification] ?? "governed through a hard season";
  if (world.gameOver?.reason === "NUCLEAR_HOLOCAUST")
    return `${article} ${title} who was there when the missiles flew. There is no one left to judge.`;
  const end = input.victory
    ? pick(world, 7, ["and was proved right by the end", "and left the country stronger for it"])
    : input.deposed
      ? pick(world, 8, ["and paid for it with office", "and was gone before the work was done"])
      : pick(world, 9, ["and fell short of the goal", "and ran out of time"]);
  const seal = input.bestAchievement ? `, remembered for "${input.bestAchievement}"` : "";
  return `${article} ${title} who ${style}, ${end}${seal}.`;
}

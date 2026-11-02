/**
 * Player order outcomes: what each order actually changed, told as a short dispatch with
 * before/after numbers, plus a per-order-type ledger so the player can follow how a line of
 * policy evolves over the term. Pure and deterministic: no randomness, phrasing variants are
 * picked from the turn and the running count.
 */
import { possessive } from "./text.js";
import type { Action, CountryState, WorldState } from "./types.js";

export interface OrderFact {
  label: string;
  before: number;
  after: number;
  unit?: string; // "%", "troops", "pts"...
  good?: boolean; // whether a rise is good for the player
}

type Snap = Record<string, number>;

const deployedVs = (c: CountryState, id: string) =>
  c.borderDeployments.filter((d) => d.targetCountryId === id).reduce((s, d) => s + d.troops, 0);

/** The numbers an order can move, read before and right after it resolves. */
export function snapshot(world: WorldState, actor: CountryState, target?: CountryState): Snap {
  const s: Snap = {
    manpower: actor.manpower,
    airpower: actor.airpower,
    mobilization: actor.mobilizationLevel,
    deployedAll: actor.borderDeployments.reduce((n, d) => n + d.troops, 0),
    budget: actor.militaryBudgetPercent,
    approval: actor.approval,
    stability: actor.stability,
    legitimacy: actor.legitimacy,
    trend: (actor.trendGrowth ?? 0) * 100,
    nuclear: actor.nuclear.progress,
    counterIntel: actor.counterIntelLevel,
    alliances: actor.alliances.length,
    tension: world.globalTension,
  };
  if (target) {
    s.deployedVs = deployedVs(actor, target.id);
    s.relFrom = target.relations[actor.id] ?? 0;
    s.relTo = actor.relations[target.id] ?? 0;
    // Damage assessments are reported as estimates of the target's state
    s.tStability = target.stability;
    s.tStrength = target.manpower / 10_000 + target.airpower;
    s.tNuclear = target.nuclear.progress;
    s.intel = actor.beliefs[target.id]?.accuracy ?? 0;
  }
  return s;
}

type FactDef = [key: string, label: string, unit: string, good: boolean, always?: boolean];

/** Which numbers each order reports. `always` facts show even when unchanged. */
function factDefs(type: string, t: string): FactDef[] {
  const view: FactDef = ["relFrom", `${possessive(t)} view of you`, "", true];
  switch (type) {
    case "MILITARY_DEPLOY_BORDER":
    case "MILITARY_WITHDRAW_BORDER":
      return [
        ["deployedVs", `Troops facing ${t}`, "troops", true, true],
        ["deployedAll", "Troops on all borders", "troops", true],
        view,
        ["tension", "Global tension", "", false],
      ];
    case "MILITARY_MOBILIZE":
    case "MILITARY_DEMOBILIZE":
      return [
        ["mobilization", "Mobilization", "%", true, true],
        ["stability", "Stability", "", true],
        ["tension", "Global tension", "", false],
      ];
    case "MILITARY_PROCURE":
      return [
        ["airpower", "Air power", "", true, true],
        ["manpower", "Troops under arms", "troops", true],
        ["approval", "Approval", "", true],
      ];
    case "MILITARY_AIRSTRIKE":
      return [
        ["tStrength", `${possessive(t)} forces (est.)`, "", false, true],
        ["tNuclear", `${possessive(t)} nuclear program (est.)`, "%", false],
        view,
        ["tension", "Global tension", "", false],
      ];
    case "NUCLEAR_FUND_PROGRAM":
      return [
        ["nuclear", "Program progress", "%", true, true],
        ["approval", "Approval", "", true],
        ["tension", "Global tension", "", false],
      ];
    case "NUCLEAR_STRIKE":
      return [
        ["tStrength", `${possessive(t)} forces (est.)`, "", false, true],
        ["tStability", `${possessive(t)} stability (est.)`, "", false],
        ["tension", "Global tension", "", false],
      ];
    case "ECONOMY_ADJUST_MILITARY_BUDGET":
      return [
        ["budget", "Defence budget", "% of GDP", true, true],
        ["approval", "Approval", "", true],
      ];
    case "DIPLOMACY_IMPROVE_RELATIONS":
      return [
        ["relFrom", `${possessive(t)} view of you`, "", true, true],
        ["relTo", `Your view of ${t}`, "", true],
      ];
    case "DIPLOMACY_DENOUNCE":
      return [view, ["approval", "Approval", "", true, true]];
    case "DIPLOMACY_PROPOSE_ALLIANCE":
    case "DIPLOMACY_BREAK_ALLIANCE":
      return [["alliances", "Defence pacts", "", true, true], view];
    case "DIPLOMACY_DECLARE_WAR":
      return [
        ["approval", "Approval", "", true, true],
        ["stability", "Stability", "", true],
        ["mobilization", "Mobilization", "%", true],
        ["tension", "Global tension", "", false],
      ];
    case "DIPLOMACY_PROPOSE_CEASEFIRE":
    case "DIPLOMACY_MEDIATE":
      return [
        ["tension", "Global tension", "", false, true],
        view,
        ["approval", "Approval", "", true],
      ];
    case "INTEL_GATHER":
      return [["intel", `Intelligence on ${t}`, "%", true, true]];
    case "INTEL_COUNTER_INTEL":
      return [["counterIntel", "Counter-intelligence", "", true, true]];
    case "INTEL_SABOTAGE":
      return [
        ["tStrength", `${possessive(t)} forces (est.)`, "", false, true],
        ["tNuclear", `${possessive(t)} nuclear program (est.)`, "%", false],
        view,
      ];
    case "INTEL_DESTABILIZE":
    case "INTEL_SUPPORT_REBELS":
    case "INTEL_MISINFORMATION":
    case "INTEL_PROPAGANDA":
    case "INTEL_ASSASSINATE":
    case "INTEL_COUP":
      return [["tStability", `${possessive(t)} stability (est.)`, "", false, true], view];
    case "DOMESTIC_PROPAGANDA":
      return [
        ["approval", "Approval", "", true, true],
        ["legitimacy", "Legitimacy", "", true],
      ];
    case "DOMESTIC_REFORM":
      return [
        ["trend", "Long-run growth", "%/yr", true, true],
        ["stability", "Stability", "", true],
      ];
    case "DOMESTIC_POLICING":
      return [
        ["stability", "Stability", "", true, true],
        ["approval", "Approval", "", true],
        ["legitimacy", "Legitimacy", "", true],
      ];
    default:
      return [["approval", "Approval", "", true]];
  }
}

const round = (v: number, unit: string) =>
  unit === "%/yr"
    ? Math.round(v * 100) / 100
    : unit === "troops"
      ? Math.round(v / 1000) * 1000
      : Math.round(v * 10) / 10;

export function orderFacts(
  type: string,
  targetName: string,
  before: Snap,
  after: Snap,
): OrderFact[] {
  const out: OrderFact[] = [];
  for (const [key, label, unit, good, always] of factDefs(type, targetName)) {
    if (!(key in before) || !(key in after)) continue;
    const b = round(before[key], unit);
    const a = round(after[key], unit);
    if (!always && Math.abs(a - b) < (unit === "%/yr" ? 0.01 : 0.5)) continue;
    out.push({ label, before: b, after: a, ...(unit ? { unit } : {}), good });
  }
  return out.slice(0, 4);
}

const fmtK = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const pick = <T>(list: T[], seed: number) => list[Math.abs(seed) % list.length];

/** A short dispatch for a successful order, with the numbers that moved. */
export function orderStory(
  action: Action,
  actor: CountryState,
  target: CountryState | undefined,
  before: Snap,
  after: Snap,
  count: number, // how many times the player has now carried this order out
  turn: number,
): string {
  const t = target?.name ?? "";
  const seed = turn + count;
  const nth = count > 1 ? ` It is your ${ordinal(count)} order of this kind.` : "";
  const d = (k: string) => (after[k] ?? 0) - (before[k] ?? 0);
  const view =
    target && d("relFrom") !== 0
      ? ` ${possessive(t)} view of you ${d("relFrom") > 0 ? "warms" : "cools"} to ${Math.round(after.relFrom)}.`
      : "";
  switch (action.type) {
    case "MILITARY_DEPLOY_BORDER": {
      const moved = Math.max(0, d("deployedVs"));
      const brigades = Math.max(1, Math.round(moved / 5000));
      const wings = Math.max(1, Math.round(moved / 40_000));
      return (
        pick(
          [
            `${brigades} brigades and ${wings} air wing${wings > 1 ? "s" : ""} roll up to the ${t} border. ${fmtK(after.deployedVs)} troops now face ${t}.${view}`,
            `Convoys move overnight: ${fmtK(moved)} more troops dig in facing ${t}, ${fmtK(after.deployedVs)} in all, with ${wings} air wing${wings > 1 ? "s" : ""} on standby.${view}`,
            `Satellites will see it by morning: armour and artillery stacked on the ${t} border, ${fmtK(after.deployedVs)} troops strong.${view}`,
          ],
          seed,
        ) + nth
      );
    }
    case "MILITARY_WITHDRAW_BORDER":
      return `Units pull back from the ${t} border; ${fmtK(before.deployedVs)} troops return to barracks.${view}`;
    case "MILITARY_MOBILIZE":
      return (
        pick(
          [
            `Reservists report to depots across ${actor.name}. Mobilization reaches ${Math.round(after.mobilization)}%.`,
            `Call-up papers go out; trains fill with reservists. The armed forces stand at ${Math.round(after.mobilization)}% mobilization.`,
          ],
          seed,
        ) + nth
      );
    case "MILITARY_DEMOBILIZE":
      return `Reservists go home. Mobilization falls to ${Math.round(after.mobilization)}%, and the economy gets its workers back.`;
    case "MILITARY_PROCURE":
      return (
        pick(
          [
            `New airframes and munitions arrive: air power rises to ${fmtK(after.airpower)} (+${Math.round(d("airpower"))}).`,
            `The arms deal closes: air power ${fmtK(after.airpower)}, and ${fmtK(after.manpower)} troops under arms.`,
          ],
          seed,
        ) + nth
      );
    case "NUCLEAR_FUND_PROGRAM":
      return `Centrifuge halls run around the clock. The program stands at ${Math.round(after.nuclear)}% (${d("nuclear") >= 0 ? "+" : ""}${Math.round(d("nuclear"))}).${nth}`;
    case "ECONOMY_ADJUST_MILITARY_BUDGET":
      return `Parliament passes the defence budget: ${after.budget.toFixed(1)}% of GDP, up from ${before.budget.toFixed(1)}%.`;
    case "DIPLOMACY_IMPROVE_RELATIONS":
      return (
        pick(
          [
            `A state visit, a joint statement and a trade mission.${view || ` ${possessive(t)} view of you holds at ${Math.round(after.relFrom ?? 0)}.`}`,
            `Your envoy spends the week in ${t}'s capital.${view || " Polite, but nothing moves yet."}`,
          ],
          seed,
        ) + nth
      );
    case "DIPLOMACY_DENOUNCE":
      return `You condemn ${t} from the podium.${view}${d("approval") > 0.4 ? ` At home it plays well: approval ${Math.round(after.approval)}.` : " At home, few notice."}`;
    case "DIPLOMACY_PROPOSE_ALLIANCE":
      return `The treaty is signed: ${t} and ${actor.name} will defend each other. You now hold ${after.alliances} defence pact${after.alliances === 1 ? "" : "s"}.`;
    case "DIPLOMACY_BREAK_ALLIANCE":
      return `You tear up the pact with ${t}.${view}`;
    case "DIPLOMACY_DECLARE_WAR":
      return `War. Your forces cross into ${t}. Approval ${d("approval") >= 0 ? "rallies" : "slides"} to ${Math.round(after.approval)}; global tension hits ${Math.round(after.tension)}.`;
    case "DIPLOMACY_PROPOSE_CEASEFIRE":
    case "DIPLOMACY_MEDIATE":
      return `The guns fall silent along the front. Global tension eases to ${Math.round(after.tension)}.${view}`;
    case "INTEL_GATHER":
      return `Agents and satellites report in. Confidence in your picture of ${t} rises to ${Math.round(after.intel)}%.${nth}`;
    case "INTEL_COUNTER_INTEL":
      return "A spy hunt sweeps the ministries: for three months most foreign operations against you will be caught.";
    case "DOMESTIC_PROPAGANDA":
      return (
        pick(
          [
            `You address the nation from your desk. Approval ${d("approval") >= 0 ? "climbs" : "slips"} to ${Math.round(after.approval)}.`,
            `Prime time, every channel: your message lands. Approval ${Math.round(after.approval)}, legitimacy ${Math.round(after.legitimacy)}.`,
          ],
          seed,
        ) + nth
      );
    case "DOMESTIC_REFORM":
      return `You sign the reform package. Long-run growth edges up to ${after.trend.toFixed(2)}% a year.${count > 3 ? " Each new reform yields a little less." : ""}`;
    case "DOMESTIC_POLICING":
      return (action.params?.tactic as string) === "HARD"
        ? `Riot police clear the squares. Stability ${Math.round(after.stability)}, but approval ${Math.round(after.approval)}.`
        : `Police step back and open talks with protest leaders. Stability ${Math.round(after.stability)}.`;
    default:
      return "";
  }
}

/** A short dispatch for an order that failed or was refused, built around the engine's reason. */
export function failStory(
  action: Action,
  target: CountryState | undefined,
  reason: string,
  after: Snap,
  turn: number,
): string {
  const t = target?.name ?? "";
  const why = reason.replace(/^(Success|Failed): /, "").replace(/\.$/, "");
  const tension = ` Global tension stands at ${Math.round(after.tension)}.`;
  switch (action.type) {
    case "DIPLOMACY_PROPOSE_CEASEFIRE":
      return (
        pick(
          [
            `${possessive(t)} foreign ministry calls the offer a pause to rearm. The front stays where it was.${tension}`,
            `Your envoy waits two days in a neutral capital; ${t} never sends a delegation. The guns keep firing.${tension}`,
          ],
          turn,
        ) + ` (${why}.)`
      );
    case "DIPLOMACY_MEDIATE":
      return `Both sides take your call, neither takes your plan. The war goes on.${tension} (${why}.)`;
    case "DIPLOMACY_PROPOSE_ALLIANCE":
      return (
        pick(
          [
            `${t} thanks you for the offer and declines to sign. Their parliament is not ready for a treaty with you.`,
            `The draft treaty comes back unsigned. ${t} wants to keep its options open.`,
          ],
          turn,
        ) + ` (${why}.)`
      );
    case "DIPLOMACY_IMPROVE_RELATIONS":
      return `The visit is cordial, the photos are good, and nothing changes. (${why}.)`;
    case "MILITARY_DEPLOY_BORDER":
    case "MILITARY_AIRSTRIKE":
      return `The order stalls in the chain of command: ${why.charAt(0).toLowerCase()}${why.slice(1)}.`;
    case "INTEL_GATHER":
    case "INTEL_SABOTAGE":
    case "INTEL_DESTABILIZE":
    case "INTEL_SUPPORT_REBELS":
    case "INTEL_MISINFORMATION":
    case "INTEL_PROPAGANDA":
    case "INTEL_ASSASSINATE":
    case "INTEL_COUP":
      return pick(
        [
          `The operation in ${t} goes dark. ${why}.`,
          `${possessive(t)} security services were waiting. ${why}.`,
        ],
        turn,
      );
    default:
      return why ? `${why}.` : "";
  }
}

/** The headline number for each order type, tracked per month in director.ledger. */
const LEDGER_KEY: Record<string, string> = {
  MILITARY_DEPLOY_BORDER: "deployedAll",
  MILITARY_WITHDRAW_BORDER: "deployedAll",
  MILITARY_MOBILIZE: "mobilization",
  MILITARY_DEMOBILIZE: "mobilization",
  MILITARY_PROCURE: "airpower",
  NUCLEAR_FUND_PROGRAM: "nuclear",
  ECONOMY_ADJUST_MILITARY_BUDGET: "budget",
  DIPLOMACY_PROPOSE_ALLIANCE: "alliances",
  DIPLOMACY_BREAK_ALLIANCE: "alliances",
  DOMESTIC_PROPAGANDA: "approval",
  DOMESTIC_REFORM: "trend",
  DOMESTIC_POLICING: "stability",
  INTEL_COUNTER_INTEL: "counterIntel",
  INTEL_GATHER: "intel",
  INTEL_SABOTAGE: "tStrength",
};

export function ledgerEntry(type: string, after: Snap): number | null {
  const key =
    LEDGER_KEY[type] ??
    (type.startsWith("DIPLOMACY_") ? "relFrom" : type.startsWith("INTEL_") ? "tStability" : null);
  if (!key || !(key in after)) return null;
  return Math.round(after[key] * 100) / 100;
}

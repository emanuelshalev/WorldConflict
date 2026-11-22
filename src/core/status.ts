/**
 * One outcome vocabulary (F-02-2). The engine gives every item it resolves for the player (an
 * order, a crisis answer, a meeting, a vote, a staff-handled call, a foreign move against us) a
 * single status with a reason, and every surface (debrief stamps, result card, Chronicle, reveal)
 * shows that status instead of guessing one from the colour of the numbers. A cost is not a
 * failure: "Call up more reservists" that raised mobilization 85 to 95 and cost 2 approval is
 * DONE, at a cost.
 *
 * Pure and deterministic: no randomness, no I/O.
 */
import type { OutcomeStatus } from "./types.js";

export interface StatusFact {
  label: string;
  before: number;
  after: number;
  unit?: string;
  good?: boolean;
}

export interface Outcome {
  status: OutcomeStatus;
  reason: string;
}

/** The word each status is shown with, everywhere. */
export const STATUS_WORD: Record<OutcomeStatus, string> = {
  DONE: "Done",
  PARTLY: "Partly done",
  FAILED: "Failed",
  REFUSED: "Refused",
  NO_EFFECT: "No effect",
};

const flat = (f: StatusFact) => Math.abs(f.after - f.before) < (f.unit === "%/yr" ? 0.01 : 0.5);

/** Good or bad for the player: a rise is good unless the fact says otherwise (tension, violence). */
export function factIsBad(f: StatusFact): boolean {
  if (flat(f)) return false;
  const rise = f.after > f.before;
  const riseGood = f.good ?? !/tension|violence|hunger|humanitarian/i.test(f.label);
  return rise !== riseGood;
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n * 10) / 10}`;

/** "at a cost: Approval -2" for the first fact that went against the player, else "". */
function costNote(facts: StatusFact[]): string {
  const bad = facts.find(factIsBad);
  return bad ? `, at a cost: ${bad.label} ${signed(bad.after - bad.before)}` : "";
}

/** Engine refusals: rules that stopped the order before anything was tried. */
const REFUSAL =
  /not found|yourself|collapsed|sovereign|already|only authorized|not allied|ceasefire first|cannot be advanced|bloc line|is not at war|party to this war|^no target|no deliverable|at most|invalid|could not start|insufficient|not enough|desk/i;

/** Orders whose whole point is to move a number: when nothing moved, they had no effect. */
const EXPECT_MOVE = new Set([
  "DIPLOMACY_IMPROVE_RELATIONS",
  "DOMESTIC_PROPAGANDA",
  "DOMESTIC_REFORM",
  "DOMESTIC_POLICING",
  "MILITARY_MOBILIZE",
  "MILITARY_DEMOBILIZE",
  "MILITARY_PROCURE",
  "NUCLEAR_FUND_PROGRAM",
  "INTEL_GATHER",
]);

const clean = (s: string) =>
  s
    .replace(/^(Success|Failed): /, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");

export interface OrderOutcomeInput {
  type?: string;
  ok: boolean;
  code?: string;
  detail: string;
  facts?: StatusFact[];
  /** A roll the order made: covert ops, airstrikes, mediation. */
  chance?: { success: boolean; exposed?: boolean; partial?: string; none?: string };
  target?: string; // the target's name, for reasons
}

/** The status of one player order. */
export function orderOutcome(o: OrderOutcomeInput): Outcome {
  const why = clean(o.detail);
  if (o.code) return { status: "REFUSED", reason: why || "Not allowed this month" };
  if (!o.ok)
    return REFUSAL.test(why)
      ? { status: "REFUSED", reason: why }
      : { status: "FAILED", reason: why || "It did not work" };
  if (o.chance && !o.chance.success) return { status: "FAILED", reason: why || "It did not work" };
  if (o.chance?.none) return { status: "NO_EFFECT", reason: o.chance.none };
  if (o.chance?.partial) return { status: "PARTLY", reason: o.chance.partial };
  if (o.chance?.exposed)
    return {
      status: "PARTLY",
      reason: `Carried out, but ${o.target ?? "the target"} knows it was us`,
    };
  const facts = o.facts ?? [];
  if (o.type && EXPECT_MOVE.has(o.type) && facts.length > 0 && facts.every(flat))
    return { status: "NO_EFFECT", reason: "Carried out, but nothing measurable moved" };
  return { status: "DONE", reason: `Carried out${costNote(facts)}` };
}

export interface DecisionOutcomeInput {
  kind?: string;
  attended?: boolean;
  byDefault?: boolean;
  facts?: StatusFact[];
  /** One of the actions the answer set in motion failed (a strike repelled, a pact declined). */
  failedAction?: { label: string; reason: string };
}

/** The status of a crisis answer or a meeting: the answer always stands; what it set off may not. */
export function decisionOutcome(d: DecisionOutcomeInput): Outcome {
  const facts = d.facts ?? [];
  if (d.failedAction)
    return {
      status: "PARTLY",
      reason: `Your answer stood, but ${d.failedAction.label} failed: ${clean(d.failedAction.reason)}`,
    };
  const staff = d.attended === false && d.kind !== "CRISIS";
  if (facts.length > 0 && facts.every(flat))
    return {
      status: "NO_EFFECT",
      reason: staff ? "Your staff handled it; nothing moved" : "Nothing measurable moved",
    };
  if (staff) return { status: "DONE", reason: `Handled by your staff${costNote(facts)}` };
  if (d.byDefault)
    return {
      status: "DONE",
      reason: `No decision taken: the default answer applied${costNote(facts)}`,
    };
  return { status: "DONE", reason: `Your answer took effect${costNote(facts)}` };
}

import { objectiveStatus, stayedInPower } from "./objectives.js";
import type { WarMonthSummary } from "./systems/military.js";
import type {
  Action,
  Chronicle,
  ChronicleMoment,
  CountryState,
  DecisionOption,
  PendingDecision,
  PlayerTurnReport,
  WorldState,
} from "./types.js";

/**
 * The chronicle: what the reveal at the end of a session reads. Each month the turn engine
 * calls `recordMonth` once, after scoring, the turn report and the game-over check, so the
 * final month is in it. Pure and deterministic: no randomness, no clock, only the world and
 * the month's report. Foreign ground truth in here (`start.nuclear`, `plots`) is stripped
 * from the client until the game is over (publicWorldState).
 */

const NUCLEAR_ORDER = ["NONE", "LATENT", "DEVELOPING", "TESTED", "ARMED"];
const MAX_MOMENTS_PER_MONTH = 6;
/** Moments the reveal and the achievements depend on: never dropped by the monthly cap. */
const ESSENTIAL = new Set<ChronicleMoment["kind"]>([
  "CRISIS",
  "WAR_START",
  "WAR_END",
  "PACT",
  "ELECTION",
  "COMEBACK",
  "CLOSE_CALL",
  "NUCLEAR",
  "COVERT_EXPOSED",
]);
/** Refusals that never reached the desk's outcome: they do not count as orders issued. */
const REFUSED =
  /^(Already ordered|At most \d+ orders|Not enough political capital|Insufficient defense budget|Invalid order value)/;
const DEAL_ORDERS = new Set([
  "DIPLOMACY_PROPOSE_ALLIANCE",
  "DIPLOMACY_PROPOSE_CEASEFIRE",
  "DIPLOMACY_MEDIATE",
]);
const PLOT_TYPES = new Set([
  "INTEL_GATHER",
  "INTEL_SABOTAGE",
  "INTEL_DESTABILIZE",
  "INTEL_SUPPORT_REBELS",
  "INTEL_MISINFORMATION",
  "INTEL_ASSASSINATE",
  "INTEL_COUP",
]);

export function emptyChronicle(): Chronicle {
  return {
    series: [],
    moments: [],
    firsts: {},
    casualties: 0,
    deals: 0,
    covert: { ok: 0, exposed: 0 },
    plots: {},
    aiTiersUsed: [],
  };
}

function playerOf(world: WorldState): CountryState | undefined {
  return world.countries.find((c) => c.id === world.playerCountryId);
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The opening picture, taken once when the session is built: the tension to beat, the worst
 * rival to mend, rivals' nuclear programs, and the relationships worth following.
 */
export function startSnapshot(world: WorldState): Chronicle {
  const chronicle = emptyChronicle();
  const me = playerOf(world);
  if (!me) return chronicle;
  const others = world.countries.filter((c) => c.id !== me.id && !c.collapsed);
  const byRelation = [...others].sort(
    (a, b) => (me.relations[a.id] ?? 0) - (me.relations[b.id] ?? 0) || a.id.localeCompare(b.id),
  );
  const worst = byRelation[0];
  const conditions = [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])];
  const targets = conditions.flatMap((c) => [c.targetId, c.otherId]).filter(Boolean) as string[];
  const tracked: string[] = [];
  const add = (id: string | undefined) => {
    if (id && id !== me.id && !tracked.includes(id) && others.some((c) => c.id === id))
      tracked.push(id);
  };
  for (const id of targets) add(id);
  for (const c of byRelation.slice(0, 3)) add(c.id); // the three worst rivals
  for (const c of [...byRelation].reverse().slice(0, 3)) add(c.id); // the three closest allies
  const rivals = new Set<string>([
    ...(me.history.historicalRivals ?? []),
    ...(worst ? [worst.id] : []),
    ...conditions
      .filter((c) => c.kind === "NO_NUCLEAR" && c.targetId)
      .map((c) => c.targetId as string),
  ]);
  const nuclear: Record<string, string> = {};
  for (const id of rivals) {
    const c = others.find((x) => x.id === id);
    if (c) nuclear[id] = c.nuclear.status;
  }
  chronicle.start = {
    tension: round1(world.globalTension),
    worstRival: worst?.id ?? "",
    nuclear,
    tracked,
    relations: Object.fromEntries(tracked.map((id) => [id, Math.round(me.relations[id] ?? 0)])),
    hostile: others.filter((c) => (me.relations[c.id] ?? 0) <= -60).map((c) => c.id),
    approval: round1(me.approval),
    score: world.score.total,
  };
  return chronicle;
}

/** The option the staff back for a crisis: most advisors, not a war, not the do-nothing default. */
export function engineStaffPick(decision: PendingDecision): DecisionOption | undefined {
  const backers = (o: DecisionOption) => o.backedBy?.length ?? 0;
  const war = (o: DecisionOption) => o.actions.some((a) => a.type === "DIPLOMACY_DECLARE_WAR");
  const ranked = [...decision.options].sort(
    (a, b) =>
      Number(war(a)) - Number(war(b)) ||
      backers(b) - backers(a) ||
      Number(a.id === decision.defaultOptionId) - Number(b.id === decision.defaultOptionId),
  );
  const top = ranked[0];
  return top && backers(top) > 0 ? top : undefined;
}

type Fact = { label: string; before: number; after: number; unit?: string; good?: boolean };

/** A signed weight from measured facts: positive when the month moved the right way. */
export function factWeight(facts: Fact[] | undefined): number {
  let w = 0;
  for (const f of facts ?? []) {
    let d = f.after - f.before;
    if (f.unit === "$B") d = f.before > 0 ? (f.after / f.before - 1) * 300 : 0;
    else if (f.unit === "◆") d *= 3;
    else if (f.unit === undefined) d /= 1.5;
    w += f.good === false ? -d : d;
  }
  return round1(clamp(w, -30, 30));
}

const toneOf = (w: number): ChronicleMoment["tone"] =>
  w >= 1 ? "good" : w <= -1 ? "bad" : "neutral";

function nameOf(world: WorldState, id: string | undefined): string {
  return world.countries.find((c) => c.id === id)?.name ?? id ?? "";
}

export interface RecordContext {
  /** The world as it stood before this month (the engine's input state). */
  before?: WorldState;
  /** This month's war resolution, for casualties and how wars ended. */
  wars?: WarMonthSummary[];
  /** What every country actually did this month (foreign plots against the player). */
  resolved?: Map<string, Action[]>;
}

/**
 * Append this month to `world.chronicle` (creating it for old saves). Called once per month by
 * TurnEngine.executeTurn before the clock advances, so `world.turn` is the month just played.
 */
export function recordMonth(
  world: WorldState,
  report: PlayerTurnReport | null,
  ctx: RecordContext = {},
): void {
  const me = playerOf(world);
  if (!me) return;
  world.chronicle ??= emptyChronicle();
  const ch = world.chronicle;
  const turn = world.turn;
  const before = ctx.before;
  const meBefore = before ? playerOf(before) : undefined;
  const tracked = ch.start?.tracked ?? [];
  const statuses = objectiveStatus(world);
  const prevSample = ch.series.at(-1);
  const moments: ChronicleMoment[] = [];

  // ---- The month's numbers ----------------------------------------------------------
  const orders = (report?.orders ?? []).filter((o) => !REFUSED.test(o.detail));
  ch.series.push({
    turn,
    approval: round1(me.approval),
    stability: round1(me.stability),
    legitimacy: round1(me.legitimacy),
    realGrowth: Math.round((me.realGrowth ?? me.growthRate ?? 0) * 10000) / 10000,
    gdp: Math.round(me.gdp),
    tension: round1(world.globalTension),
    score: world.score.total,
    parts: [
      round1(world.score.economic),
      round1(world.score.security),
      round1(world.score.approval),
      round1(world.score.prestige),
    ],
    objectives: statuses.map((s) => s.met),
    relations: Object.fromEntries(tracked.map((id) => [id, Math.round(me.relations[id] ?? 0)])),
    playerWars: me.atWarWith.length,
    capital: world.politicalCapital,
    orders: orders.length,
  });

  // ---- Objectives: met and lost, first month of the final unbroken run ----------------
  statuses.forEach((s, i) => {
    const key = `cond:${i}`;
    const was = prevSample?.objectives[i];
    if (s.met && (was === false || was === undefined)) ch.firsts[key] = turn;
    if (!s.met) delete ch.firsts[key];
    if (was === undefined) return; // the first month sets the baseline, not a moment
    if (s.met && !was)
      moments.push({
        turn,
        kind: "OBJECTIVE_MET",
        title: s.label,
        detail: "Objective met",
        tone: "good",
        weight: s.bonus ? 3 : 6,
      });
    else if (!s.met && was)
      moments.push({
        turn,
        kind: "OBJECTIVE_LOST",
        title: s.label,
        detail: "Objective slipped",
        tone: "bad",
        weight: s.bonus ? -3 : -6,
      });
  });

  // ---- Crises: what was chosen, and whether the staff would have chosen it ----------
  for (const d of report?.decisions ?? []) {
    if (d.kind && d.kind !== "CRISIS") continue;
    const pending = before?.pendingDecisions.find(
      (p) => p.title === d.title && (!d.templateId || p.templateId === d.templateId),
    );
    const pick = pending ? engineStaffPick(pending) : undefined;
    const weight = factWeight(d.facts);
    moments.push({
      turn,
      kind: "CRISIS",
      title: d.title,
      detail: d.headline ?? d.choice,
      tone: toneOf(weight),
      weight,
      choice: d.choice,
      ...(pick && d.optionId ? { staffPick: pick.id === d.optionId } : {}),
      ...(d.withCountry ? { with: d.withCountry } : {}),
    });
  }

  // ---- Orders: covert results and the orders that moved the most ---------------------
  const orderMoments: ChronicleMoment[] = [];
  let okDeals = 0;
  let okAlliances = 0;
  for (const o of orders) {
    const covert = /^(Success|Failed): /.test(o.detail);
    if (covert && o.type !== "INTEL_GATHER" && o.type !== "INTEL_COUNTER_INTEL") {
      if (o.ok) ch.covert.ok += 1;
      if (o.detail.includes("knows it was us")) {
        ch.covert.exposed += 1;
        ch.firsts["covert:exposed"] ??= turn;
        moments.push({
          turn,
          kind: "COVERT_EXPOSED",
          title: `${o.label}: exposed`,
          detail: o.detail.replace(/^(Success|Failed): /, ""),
          tone: "bad",
          weight: -8,
          ...(o.target ? { with: o.target } : {}),
        });
        continue;
      }
    }
    if (o.ok && o.type && DEAL_ORDERS.has(o.type)) okDeals += 1;
    if (o.ok && o.type === "DIPLOMACY_PROPOSE_ALLIANCE") okAlliances += 1;
    const weight = factWeight(o.facts);
    if (Math.abs(weight) < 2 && !(o.ok && o.type === "DIPLOMACY_DECLARE_WAR")) continue;
    orderMoments.push({
      turn,
      kind: "ORDER",
      title: o.label,
      detail: (o.story || o.detail).split(/(?<=[.!?])\s/)[0] ?? "",
      tone: o.ok ? toneOf(weight) : "bad",
      weight: o.ok ? weight : Math.min(weight, -2),
      ...(o.target ? { with: o.target } : {}),
    });
  }
  orderMoments.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  moments.push(...orderMoments.slice(0, 2));

  // ---- Pacts --------------------------------------------------------------------------
  const newPacts = meBefore ? me.alliances.filter((id) => !meBefore.alliances.includes(id)) : [];
  for (const id of newPacts)
    moments.push({
      turn,
      kind: "PACT",
      title: `Defence pact with ${nameOf(world, id)}`,
      detail: "A new alliance",
      tone: "good",
      weight: 8,
      with: id,
    });
  ch.deals += okDeals + Math.max(0, newPacts.length - okAlliances);

  // ---- Wars: who started and ended what (public), the player's own fronts -----------
  if (before) {
    const prevIds = new Set(before.wars.map((w) => w.id));
    const nowIds = new Set(world.wars.map((w) => w.id));
    for (const w of world.wars) {
      if (prevIds.has(w.id)) continue;
      ch.firsts[`war:${w.attackerId}-${w.defenderId}:start`] ??= turn;
      if (w.attackerId !== me.id && w.defenderId !== me.id) continue;
      const enemy = w.attackerId === me.id ? w.defenderId : w.attackerId;
      const ours = w.attackerId === me.id;
      moments.push({
        turn,
        kind: "WAR_START",
        title: ours ? `War on ${nameOf(world, enemy)}` : `${nameOf(world, enemy)} attacks`,
        detail: ours ? "You went to war" : "You are at war",
        tone: "bad",
        weight: -12,
        with: enemy,
      });
    }
    for (const w of before.wars) {
      if (nowIds.has(w.id)) continue;
      ch.firsts[`war:${w.attackerId}-${w.defenderId}:end`] ??= turn;
      if (w.attackerId !== me.id && w.defenderId !== me.id) continue;
      const enemy = w.attackerId === me.id ? w.defenderId : w.attackerId;
      const ended = ctx.wars?.find((s) => s.war.id === w.id)?.ended;
      const winner = ended?.winnerId ?? null;
      if (!winner) ch.firsts[`ceasefire:${enemy}`] ??= turn;
      const won = winner === me.id;
      moments.push({
        turn,
        kind: "WAR_END",
        title: !winner
          ? `The shooting stops with ${nameOf(world, enemy)}`
          : won
            ? `Victory over ${nameOf(world, enemy)}`
            : `Defeat by ${nameOf(world, enemy)}`,
        detail: !winner ? "Ceasefire" : won ? "Victory" : "Defeat",
        tone: winner && !won ? "bad" : "good",
        weight: !winner ? 15 : won ? 18 : -18,
        with: enemy,
      });
    }
  }
  for (const s of ctx.wars ?? []) {
    if (s.war.attackerId === me.id) ch.casualties += Math.round(s.attackerCasualties);
    else if (s.war.defenderId === me.id) ch.casualties += Math.round(s.defenderCasualties);
  }

  // ---- Nuclear: any first use, any new bomb ----------------------------------------
  const struck = world.director.shocks.find((x) => x.kind === "NUCLEAR_STRIKE" && x.turn === turn);
  if (struck && ch.firsts["nuke:used"] === undefined) {
    ch.firsts["nuke:used"] = turn;
    moments.push({
      turn,
      kind: "NUCLEAR",
      title: "A nuclear weapon is used",
      detail: struck?.by ? `${nameOf(world, struck.by)} struck first` : "The taboo is broken",
      tone: "bad",
      weight: -25,
      ...(struck?.by ? { with: struck.by } : {}),
    });
  }
  if (before) {
    for (const c of world.countries) {
      const was = before.countries.find((x) => x.id === c.id)?.nuclear.status;
      if (!was || c.id === me.id) continue;
      const rank = NUCLEAR_ORDER.indexOf(c.nuclear.status);
      // Only tests are public: a hidden program's progress never reaches the chronicle
      if (rank >= 3 && NUCLEAR_ORDER.indexOf(was) < 3)
        moments.push({
          turn,
          kind: "NUCLEAR",
          title: `${nameOf(world, c.id)} tests a bomb`,
          detail: "A new nuclear power",
          tone: "bad",
          weight: -12,
          with: c.id,
        });
    }
  }

  // ---- The director's milestones: close calls, comebacks --------------------------
  const stamps = report?.moments ?? [];
  if (stamps.includes("CLOSE CALL") || stamps.includes("TRAILING IN THE POLLS"))
    moments.push({
      turn,
      kind: "CLOSE_CALL",
      title: stamps.includes("CLOSE CALL") ? "A close call" : "Trailing in the polls",
      detail: "Your hold on office wavered",
      tone: "bad",
      weight: -6,
    });
  if (stamps.includes("COMEBACK"))
    moments.push({
      turn,
      kind: "COMEBACK",
      title: "The comeback",
      detail: "From the brink back to solid ground",
      tone: "good",
      weight: 12,
    });

  // ---- Elections: the player's own vote ----------------------------------------------
  const due = meBefore?.politicalSystem.nextElectionTurn;
  if (meBefore && due !== null && due !== undefined && due <= turn) {
    const lost = world.gameOver?.reason === "LOST_ELECTION";
    moments.push({
      turn,
      kind: "ELECTION",
      title: lost ? "Voted out" : "Re-elected",
      detail: `Approval ${Math.round(me.approval)}% on election day`,
      tone: lost ? "bad" : "good",
      weight: lost ? -20 : 14,
    });
    if (!lost) ch.firsts.election_won ??= turn;
  }

  // ---- Records and infamy markers --------------------------------------------------
  const bestBefore = ch.series.slice(0, -1).reduce((m, s) => Math.max(m, s.score), -Infinity);
  if (ch.series.length >= 3 && world.score.total >= bestBefore + 3)
    moments.push({
      turn,
      kind: "RECORD",
      title: `Leadership score at a new high: ${world.score.total}`,
      detail: "Your best month yet",
      tone: "good",
      weight: 2,
    });
  // Pariah: three governments you turned against you (old enemies at the start do not count)
  const hostile = new Set(ch.start?.hostile ?? []);
  const enemies = Object.entries(me.relations).filter(
    ([id, v]) => v <= -60 && id !== me.id && !hostile.has(id),
  );
  if (enemies.length >= 3) ch.firsts.pariah ??= turn;
  if (me.approval < 30) ch.firsts.lame_duck ??= turn;

  // ---- Foreign plots against the player (ground truth, revealed only after the end) ----
  for (const [actor, actions] of ctx.resolved ?? []) {
    if (actor === me.id) continue;
    const n = actions.filter((a) => a.targetCountryId === me.id && PLOT_TYPES.has(a.type)).length;
    if (n > 0) ch.plots[actor] = (ch.plots[actor] ?? 0) + n;
  }

  // Story beats are always kept; the rest fill the month up to the cap, biggest first
  // (sort is stable on ties, so the record is deterministic)
  const kept = moments.filter((m) => ESSENTIAL.has(m.kind));
  const rest = moments
    .filter((m) => !ESSENTIAL.has(m.kind))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, Math.max(0, MAX_MOMENTS_PER_MONTH - kept.length));
  ch.moments.push(...[...kept, ...rest].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)));
  if (!stayedInPower(world)) ch.firsts.fell ??= turn;
}

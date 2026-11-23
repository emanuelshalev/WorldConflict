/**
 * Balance band check (opt-in: `npm run verify -- --balance` or
 * `npx vitest run -c vitest.balance.config.ts`). Runs a reduced headless harness
 * (scripts/simulate.ts, 12 games per seat by default, BALANCE_GAMES overrides) on representative
 * seats and asserts the CLAUDE.md bands:
 *   smart 70-95% pooled, no seat below 65%; none <= 20% per seat; random 15-45% pooled;
 *   tension median 45-70 with <= 20% of months at 80+.
 * D-84 "Your call" bands run on every flashpoint seat (21 seats) with the Accept all family:
 *   staff (Accept all, every call skipped) <= 30% pooled and >= none, no seat above 60%;
 *   guided (Accept all + the Guide me line) 65-90% pooled; callpush and callhold (always the
 *   mission card / always the calm card) within 8 points pooled; guided at the capital cap in
 *   <= 45% of months. The control-seed guards (staff <= 2 of 7, guided cap <= 30 of 84 months) are
 *   in tests/core/your-call.spec.ts.
 * Known gaps are read from tests/balance/exemptions.json: an exempt check is measured and printed
 * but does not fail.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FLASHPOINT_CONTROL, playControl } from "../fixtures/control.js";

const run = promisify(execFile);
const root = path.resolve(__dirname, "../..");
const GAMES = Number(process.env.BALANCE_GAMES ?? 12);
const POLICIES = "smart,none,random";
/** The Accept all family on every flashpoint seat (D-84), with none for the staff floor. */
const CALL_POLICIES = "staff,guided,callpush,callhold,none";
const FLASHPOINTS: { id: string; scenarioId: string; playable: { countryId: string }[] }[] = fs
  .readdirSync(path.join(root, "data/flashpoints"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, "data/flashpoints", f), "utf8")));

/** Representative seats: the Term core five plus Iran (exempt), and three flashpoint seats. */
const RUNS: { label: string; args: string[]; countries: string[] }[] = [
  // One process per Term seat so the runs go in parallel
  ...["USA", "UKR", "ISR", "TWN", "DEU", "IRN"].map((c) => ({ label: `TERM:${c}`, args: ["--mode", "TERM", "--scenario", "2026"], countries: [c] })),
  { label: "FLASHPOINT:hormuz-convoy", args: ["--flashpoint", "hormuz-convoy", "--scenario", "2026"], countries: ["USA"] },
  { label: "FLASHPOINT:water-war", args: ["--flashpoint", "water-war", "--scenario", "2026"], countries: ["PAK"] },
  { label: "FLASHPOINT:ceasefire-or-collapse", args: ["--flashpoint", "ceasefire-or-collapse", "--scenario", "2026"], countries: ["UKR"] },
];

interface Row {
  policy: string;
  country: string;
  mode: string;
  win: string;
  tensionMedian: number;
  tension80: string;
  pcCapped: string;
}
interface Exemption {
  check: string;
  seat?: string;
  note: string;
}

const exemptions: Exemption[] = JSON.parse(fs.readFileSync(path.join(__dirname, "exemptions.json"), "utf8")).exemptions;
const exempt = (check: string, seat?: string) => exemptions.find((e) => e.check === check && (e.seat === undefined || e.seat === seat));
const pct = (s: string) => Number(s.replace("%", ""));
const seatOf = (r: Row) => `${r.mode.startsWith("FLASHPOINT") ? r.mode : "TERM"}:${r.country}`;

let rows: Row[] = [];
let callRows: Row[] = [];
const report: string[] = [];

/** Assert, unless exempt: an exempt failure is reported, not thrown. */
function band(check: string, ok: boolean, msg: string, seat?: string) {
  const e = exempt(check, seat);
  report.push(`${ok ? "ok    " : e ? "EXEMPT" : "FAIL  "} ${msg}${!ok && e ? ` (${e.note})` : ""}`);
  if (!e) expect(ok, msg).toBe(true);
}

beforeAll(async () => {
  const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs"); // .bin shims do not spawn on Windows
  const outs = await Promise.all(
    RUNS.map((r) =>
      run(process.execPath, [tsx, "scripts/simulate.ts", ...r.args, "--countries", r.countries.join(","), "--games", String(GAMES), "--policy", POLICIES, "--json", "1"], {
        cwd: root,
        maxBuffer: 32 << 20,
      }),
    ),
  );
  rows = outs.flatMap((o) => JSON.parse(o.stdout.slice(o.stdout.indexOf("["))) as Row[]);
  const calls = await Promise.all(
    FLASHPOINTS.map((f) =>
      run(tsx, ["scripts/simulate.ts", "--flashpoint", f.id, "--scenario", f.scenarioId, "--countries", f.playable.map((p) => p.countryId).join(","), "--games", String(GAMES), "--policy", CALL_POLICIES, "--json", "1"], {
        cwd: root,
        maxBuffer: 32 << 20,
      }),
    ),
  );
  callRows = calls.flatMap((o) => JSON.parse(o.stdout.slice(o.stdout.indexOf("["))) as Row[]);
});

const pooledOf = (rs: Row[]) => rs.reduce((s, r) => s + pct(r.win), 0) / Math.max(1, rs.length);

describe(`balance bands (${GAMES} games per seat)`, () => {
  afterAllPrint();

  it("smart: every seat at 65%+, pooled 70-95%", () => {
    const smart = rows.filter((r) => r.policy === "smart");
    for (const r of smart) band("smart-seat", pct(r.win) >= 65, `smart ${seatOf(r)} ${r.win} (floor 65%)`, seatOf(r));
    const pooledRows = smart.filter((r) => !exempt("smart-seat", seatOf(r)));
    const pooled = pooledRows.reduce((s, r) => s + pct(r.win), 0) / pooledRows.length;
    band("smart-pooled-min", pooled >= 70, `smart pooled ${pooled.toFixed(1)}% (min 70%)`);
    band("smart-pooled-max", pooled <= 95, `smart pooled ${pooled.toFixed(1)}% (max 95%)`);
  });

  it("none: every seat at 20% or less", () => {
    for (const r of rows.filter((x) => x.policy === "none")) band("none-seat", pct(r.win) <= 20, `none ${seatOf(r)} ${r.win} (max 20%)`, seatOf(r));
  });

  it("random: pooled 15-45%", () => {
    const rnd = rows.filter((r) => r.policy === "random" && !exempt("smart-seat", seatOf(r)));
    const pooled = rnd.reduce((s, r) => s + pct(r.win), 0) / rnd.length;
    const seats = rnd.map((r) => `${seatOf(r)} ${r.win}`).join(", ");
    band("random-pooled", pooled >= 15 && pooled <= 45, `random pooled ${pooled.toFixed(1)}% (band 15-45%; ${seats})`);
  });

  it("tension: median 45-70, at most 20% of months at 80+", () => {
    const meds = rows.map((r) => r.tensionMedian).sort((a, b) => a - b);
    const med = meds[Math.floor(meds.length / 2)];
    band("tension-median", med >= 45 && med <= 70, `tension median of seat medians ${med} (band 45-70)`);
    const hot = rows.reduce((s, r) => s + pct(r.tension80), 0) / rows.length;
    band("tension-80", hot <= 20, `months at 80+ ${hot.toFixed(1)}% (max 20%)`);
  });

  it("D-84 staff (Accept all, calls skipped): pooled <= 30% and >= none, no seat above 60%", () => {
    const staff = callRows.filter((r) => r.policy === "staff");
    const pooled = pooledOf(staff);
    const none = pooledOf(callRows.filter((r) => r.policy === "none"));
    band("staff-pooled", pooled <= 30 && pooled >= none, `staff pooled ${pooled.toFixed(1)}% (max 30%, at least none ${none.toFixed(1)}%)`);
    for (const r of staff) band("staff-seat", pct(r.win) <= 60, `staff ${seatOf(r)} ${r.win} (max 60%)`, seatOf(r));
  });

  it("D-84 guided (Accept all + the Guide me line): pooled 65-90%, capital at the cap in <= 45% of months", () => {
    const guided = callRows.filter((r) => r.policy === "guided");
    const pooled = pooledOf(guided);
    band("guided-pooled", pooled >= 65 && pooled <= 90, `guided pooled ${pooled.toFixed(1)}% (band 65-90%)`);
    const capped = guided.reduce((s, r) => s + pct(r.pcCapped), 0) / Math.max(1, guided.length);
    band("guided-capped", capped <= 45, `guided capital at the cap ${capped.toFixed(1)}% of months (max 45%)`);
  });

  it("D-84 call balance: always the mission card and always the calm card within 8 points pooled", () => {
    const push = pooledOf(callRows.filter((r) => r.policy === "callpush"));
    const hold = pooledOf(callRows.filter((r) => r.policy === "callhold"));
    const gap = Math.abs(push - hold);
    band("call-gap", gap <= 8, `call gap ${gap.toFixed(1)} points (callpush ${push.toFixed(1)}% against callhold ${hold.toFixed(1)}%, max 8)`);
  });

  it("D-84 real decisions: at least 1.0 a month (guided, flashpoint control seeds, months 2-12)", () => {
    // A real decision is a call whose cards hold a trade (criterion c, advisors.ts isTrade), decided
    // by the player; the play pass (D-81) confirms it by hand
    let months = 0;
    let real = 0;
    let withOne = 0;
    for (const code of FLASHPOINT_CONTROL)
      for (const m of playControl(code, "guided").months) {
        if (m.before.turn < 1) continue;
        const n = m.advice.calls.filter((c) => c.trade).length;
        months++;
        real += n;
        if (n) withOne++;
      }
    const perMonth = real / Math.max(1, months);
    band("real-decisions", perMonth >= 1, `real decisions per month ${perMonth.toFixed(2)} (min 1.0; at least one in ${Math.round((100 * withOne) / Math.max(1, months))}% of months 2-12, control seeds)`);
  });
});

function afterAllPrint() {
  // vitest prints console output per test file; one block at the end reads best
  afterAll(() => {
    console.log(`\nBalance bands, ${GAMES} games per seat:\n${report.join("\n")}\n`);
  });
}

/**
 * Balance band check (opt-in: `npm run verify -- --balance` or
 * `npx vitest run -c vitest.balance.config.ts`). Runs a reduced headless harness
 * (scripts/simulate.ts, 12 games per seat by default, BALANCE_GAMES overrides) on representative
 * seats and asserts the CLAUDE.md bands:
 *   smart 70-95% pooled, no seat below 65%; none <= 20% per seat; random 15-45% pooled;
 *   tension median 45-70 with <= 20% of months at 80+.
 * Known gaps are read from tests/balance/exemptions.json: an exempt check is measured and printed
 * but does not fail.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);
const root = path.resolve(__dirname, "../..");
const GAMES = Number(process.env.BALANCE_GAMES ?? 12);
const POLICIES = "smart,none,random";

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
const report: string[] = [];

/** Assert, unless exempt: an exempt failure is reported, not thrown. */
function band(check: string, ok: boolean, msg: string, seat?: string) {
  const e = exempt(check, seat);
  report.push(`${ok ? "ok    " : e ? "EXEMPT" : "FAIL  "} ${msg}${!ok && e ? ` (${e.note})` : ""}`);
  if (!e) expect(ok, msg).toBe(true);
}

beforeAll(async () => {
  const tsx = path.join(root, "node_modules", ".bin", "tsx");
  const outs = await Promise.all(
    RUNS.map((r) =>
      run(tsx, ["scripts/simulate.ts", ...r.args, "--countries", r.countries.join(","), "--games", String(GAMES), "--policy", POLICIES, "--json", "1"], {
        cwd: root,
        maxBuffer: 32 << 20,
      }),
    ),
  );
  rows = outs.flatMap((o) => JSON.parse(o.stdout.slice(o.stdout.indexOf("["))) as Row[]);
});

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
});

function afterAllPrint() {
  // vitest prints console output per test file; one block at the end reads best
  afterAll(() => {
    console.log(`\nBalance bands, ${GAMES} games per seat:\n${report.join("\n")}\n`);
  });
}

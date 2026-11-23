/**
 * Per-seat harness (D-84 call balance): runs every flashpoint seat with the given policies and
 * prints pooled numbers per policy plus a per-seat win table, as Markdown.
 *
 *   node scripts/seats.mjs [games=12] [policies] [out.md] [out.json]
 *   node scripts/seats.mjs 36 staff,guided,callpush,callhold,smart,none runs/x.md runs/x.json
 *
 * One process per flashpoint, run in parallel. tsx is started by its package entry (the
 * node_modules/.bin shims do not spawn from execFile on Windows).
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [games = "12", policies = "staff,guided,callpush,callhold,smart,none", outMd, outJson] = process.argv.slice(2);
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const dir = path.join(root, "data/flashpoints");
const fps = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const jobs = fps.map((f) =>
  run(
    process.execPath,
    [tsx, "scripts/simulate.ts", "--flashpoint", f.id, "--scenario", f.scenarioId, "--countries", f.playable.map((p) => p.countryId).join(","), "--games", games, "--policy", policies, "--json", "1"],
    { cwd: root, maxBuffer: 64 << 20 },
  ).then((o) => JSON.parse(o.stdout.slice(o.stdout.indexOf("[")))),
);
const rows = (await Promise.all(jobs)).flat();
if (outJson) fs.writeFileSync(outJson, `${JSON.stringify(rows, null, 1)}\n`);

const pct = (s) => Number(String(s).replace("%", ""));
const pols = policies.split(",");
const seatOf = (x) => `${x.mode.replace("FLASHPOINT:", "")}:${x.country}`;
const seats = [...new Set(rows.map(seatOf))];
const lines = [];
lines.push(`${seats.length} flashpoint seats, ${games} games per seat and policy.`, "");
lines.push("| policy | pooled win | stars | months at the cap | call months |", "|---|---|---|---|---|");
for (const p of pols) {
  const r = rows.filter((x) => x.policy === p);
  const avg = (k) => (r.reduce((s, x) => s + pct(x[k]), 0) / r.length).toFixed(1);
  lines.push(`| ${p} | ${avg("win")}% | ${(r.reduce((s, x) => s + Number(x.stars), 0) / r.length).toFixed(2)} | ${avg("pcCapped")}% | ${avg("callMonths")}% |`);
}
lines.push("", `| seat | ${pols.join(" | ")} |`, `|---|${pols.map(() => "---").join("|")}|`);
for (const s of seats) lines.push(`| ${s} | ${pols.map((p) => rows.find((x) => x.policy === p && seatOf(x) === s)?.win ?? "-").join(" | ")} |`);
const text = `${lines.join("\n")}\n`;
if (outMd) fs.writeFileSync(outMd, text);
console.log(text);

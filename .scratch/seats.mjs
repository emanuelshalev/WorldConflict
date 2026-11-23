// Runs every flashpoint seat with the given policies and games; prints per-seat and pooled numbers.
// usage: node seats.mjs <repo> <games> <policies> [out.json]
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
const run = promisify(execFile);
const [repo, games = "12", policies = "staff,guided,callpush,callhold,smart,none,random", out] = process.argv.slice(2);
const dir = path.join(repo, "data/flashpoints");
const fps = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const jobs = fps.map((f) =>
  run("npx", ["tsx", "scripts/simulate.ts", "--flashpoint", f.id, "--scenario", f.scenarioId, "--countries", f.playable.map((p) => p.countryId).join(","), "--games", games, "--policy", policies, "--json", "1"], { cwd: repo, maxBuffer: 64 << 20 }).then((o) => JSON.parse(o.stdout.slice(o.stdout.indexOf("[")))),
);
const rows = (await Promise.all(jobs)).flat();
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const pct = (s) => Number(String(s).replace("%", ""));
const pols = policies.split(",");
console.log("policy pooled stars capped callMonths");
for (const p of pols) {
  const r = rows.filter((x) => x.policy === p);
  const avg = (k) => (r.reduce((s, x) => s + pct(x[k]), 0) / r.length).toFixed(1);
  console.log(p, avg("win"), (r.reduce((s, x) => s + Number(x.stars), 0) / r.length).toFixed(2), avg("pcCapped"), avg("callMonths"));
}
console.log("\nseat " + pols.join(" "));
const seats = [...new Set(rows.map((x) => `${x.mode.replace("FLASHPOINT:", "")}:${x.country}`))];
for (const s of seats) console.log(s, pols.map((p) => rows.find((x) => x.policy === p && `${x.mode.replace("FLASHPOINT:", "")}:${x.country}` === s)?.win).join(" "));

// node analyze.mjs <file.jsonl> : the play-pass tables from calls.ts output
import fs from "node:fs";

const rows = fs.readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => JSON.parse(l));
const months = rows.filter((r) => !r.end);
const ends = rows.filter((r) => r.end);
const pc = (n, d) => (d ? ((100 * n) / d).toFixed(1) : "-");
const fpIds = [...new Set(months.map((r) => r.fp))];
const pols = [...new Set(months.map((r) => r.policy))];

for (const policy of pols) {
  console.log(`\n## policy ${policy}`);
  console.log("| flashpoint | seats | months 2-12 | with a real decision | with an engine trade | with any call | month 1 real |");
  let T = { m: 0, real: 0, trade: 0, any: 0, m1: 0, m1r: 0 };
  for (const fp of [...fpIds, "DEFAULT SEATS"]) {
    const ms = months.filter((r) => r.policy === policy && (fp === "DEFAULT SEATS" ? r.def : r.fp === fp));
    const late = ms.filter((r) => r.month >= 2);
    const real = late.filter((r) => r.calls.some((c) => c.real)).length;
    const trade = late.filter((r) => r.calls.some((c) => c.trade)).length;
    const any = late.filter((r) => r.calls.length).length;
    const m1 = ms.filter((r) => r.month === 1);
    const m1r = m1.filter((r) => r.calls.some((c) => c.real)).length;
    if (fp !== "DEFAULT SEATS") T = { m: T.m + late.length, real: T.real + real, trade: T.trade + trade, any: T.any + any, m1: T.m1 + m1.length, m1r: T.m1r + m1r };
    console.log(`| ${fp} | ${[...new Set(ms.map((r) => r.seat))].join(",")} | ${late.length} | ${pc(real, late.length)}% | ${pc(trade, late.length)}% | ${pc(any, late.length)}% | ${m1r}/${m1.length} |`);
  }
  console.log(`| POOLED | | ${T.m} | ${pc(T.real, T.m)}% | ${pc(T.trade, T.m)}% | ${pc(T.any, T.m)}% | ${T.m1r}/${T.m1} |`);
  // months with none, grouped by seat and month
  const none = months.filter((r) => r.policy === policy && r.month >= 2 && !r.calls.some((c) => c.real));
  const bySeatMonth = {};
  for (const r of none) {
    const k = `${r.fp}:${r.seat} m${r.month}`;
    const why = r.calls.length ? r.calls.map((c) => `${c.kind === "move" ? "move" : c.title}: ${c.reasons.join("; ")}`).join(" / ") : `no call (pending: ${r.pending.join(", ") || "none"})`;
    (bySeatMonth[k] ??= new Map()).set(why, ((bySeatMonth[k] ?? new Map()).get(why) ?? 0) + 1);
  }
  console.log(`\nmonths 2-12 with no real decision (${none.length}):`);
  for (const [k, m] of Object.entries(bySeatMonth)) console.log(`- ${k}: ${[...m].map(([w, n]) => `${n}x ${w}`).join(" | ")}`);
  // calls failing, by reason kind
  const fails = {};
  let calls = 0;
  for (const r of months.filter((r) => r.policy === policy && r.month >= 2))
    for (const c of r.calls) {
      calls++;
      if (c.real) continue;
      const kind = c.reasons[0].split(":")[0];
      fails[kind] = (fails[kind] ?? 0) + 1;
    }
  console.log(`calls months 2-12: ${calls}; failing by reason: ${JSON.stringify(fails)}`);
  const free = months.filter((r) => r.policy === policy).flatMap((r) => r.calls.filter((c) => c.kind === "crisis").map((c) => ({ m: r.month, free: c.free })));
  console.log(`crisis calls free to leave: month 1 ${free.filter((x) => x.m === 1 && x.free).length}/${free.filter((x) => x.m === 1).length}, months 2-12 ${free.filter((x) => x.m > 1 && x.free).length}/${free.filter((x) => x.m > 1).length}`);
  const calls1 = months.filter((r) => r.policy === policy).map((r) => r.calls.length);
  console.log(`calls per month: ${(calls1.reduce((a, b) => a + b, 0) / calls1.length).toFixed(2)}; crisis calls agree: ${months.filter((r) => r.policy === policy).flatMap((r) => r.calls).filter((c) => c.kind === "crisis" && c.agree).length}`);
}

console.log("\n## wins by seat and policy");
const seats = [...new Set(ends.map((e) => `${e.fp}:${e.seat}`))];
const epols = [...new Set(ends.map((e) => e.policy))];
console.log(`| seat | ${epols.join(" | ")} |`);
for (const s of seats) console.log(`| ${s} | ${epols.map((p) => { const g = ends.filter((e) => `${e.fp}:${e.seat}` === s && e.policy === p); return `${pc(g.filter((e) => e.victory).length, g.length)}% (${(g.reduce((a, e) => a + e.stars, 0) / g.length).toFixed(2)}*)`; }).join(" | ")} |`);
console.log(`| POOLED | ${epols.map((p) => { const g = ends.filter((e) => e.policy === p); return `${pc(g.filter((e) => e.victory).length, g.length)}% (${(g.reduce((a, e) => a + e.stars, 0) / g.length).toFixed(2)}*)`; }).join(" | ")} |`);

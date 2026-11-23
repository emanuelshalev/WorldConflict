// Token consumption ledger for an agentic development loop (Claude Code transcripts).
// Reads the orchestrator session transcript and every subagent transcript, de-duplicates
// API responses, and attributes usage to role, persona, development stage and iteration
// using a registry of rules. Output feeds the status page "Consumption" tab.
//
//   node devloop/kit/usage-ledger.mjs <registry.json> [--inject <page.html> USAGE] [--json] [--bucket <minutes>]
//
// Registry (see devloop/templates/usage-registry.json):
// {
//   "projectDir": "~/.claude/projects/<project-slug>",
//   "sessions": ["<session-id>"],
//   "loopStart": "ISO time", // usage before this is "Before the loop"
//   "orchestrator": { "role": "Group Manager", "windowsFrom": ["../progress/stages.jsonl", "../loop/events.jsonl"],
//                     "windows": [{ "from": "ISO", "iteration": 0, "stage": "Plan" }] }, // windows: hand fallback
//   "iterationWindows": [{ "from": "ISO", "iteration": 1 }], // optional fallback for "iteration": "auto" (the
//                                    // orchestrator windowsFrom stage log is used first where it covers the time)
//   "prices": { "<model id>": { "input": 4, "cacheWrite5m": 5, "cacheWrite1h": 8, "cacheRead": 0.2, "output": 20 } },
//                                    // USD per million tokens (list prices, see the template)
//   "rules": [{ "desc": "^Customer (\\w+) iter-(\\d+)", "role": "Customer", "group": "Customers",
//               "persona": "$1", "iteration": "$2", "stage": "Use",
//               "workPackage": "$label" }]  // optional: "$label" is the label without its "Build: " style prefix
// }
//
// Cost: every request is priced at its own model (prices map; a dated id such as claude-opus-5-5-20261101 matches
// its prefix). `usd` is the real cost, `cost` splits it by token type. `weighted` is kept for continuity: input
// equivalent tokens, each request weighted by its own model's price ratios (so a cache read is 0.05 of an input
// token on a model that charges 5%, not a flat 0.1; before D-82 one flat table was used). Items with a
// workPackage also feed `byPackage` (per package: models, tokens, usd, wall minutes) and `trial` (packages
// grouped by model, to compare models on equal work).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const reg = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const projectDir = reg.projectDir.replace(/^~/, os.homedir());

const KINDS = ['input', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead', 'output'];
// Fallback weights for a model without a price entry (old flat table, cache read corrected to 0.05).
const WEIGHTS = { input: 1, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.05, output: 5 };
const PRICES = reg.prices ?? {};
const unpriced = new Set();
// Exact model id, else the longest price key that is a prefix of it (dated ids).
function priceOf(model) {
  if (!model) return null;
  if (PRICES[model] && typeof PRICES[model] === 'object') return PRICES[model];
  const key = Object.keys(PRICES)
    .filter((k) => !k.startsWith('_') && model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : null;
}
// Cost of one request by token type in USD, and its input-equivalent weight.
function priced(r) {
  const p = priceOf(r.model);
  if (!p) {
    if (KINDS.some((k) => r[k] > 0)) unpriced.add(r.model ?? 'unknown');
    return { cost: Object.fromEntries(KINDS.map((k) => [k, 0])), weighted: KINDS.reduce((a, k) => a + WEIGHTS[k] * r[k], 0) };
  }
  const cost = Object.fromEntries(KINDS.map((k) => [k, (r[k] * p[k]) / 1e6]));
  const weighted = KINDS.reduce((a, k) => a + (p.input > 0 ? p[k] / p.input : WEIGHTS[k]) * r[k], 0);
  return { cost, weighted };
}

function readTranscript(file) {
  const byId = new Map();
  let tools = 0;
  let first = null;
  let last = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.timestamp) {
      first = first && first < d.timestamp ? first : d.timestamp;
      last = last && last > d.timestamp ? last : d.timestamp;
    }
    if (d.type !== 'assistant' || !d.message?.usage) continue;
    const m = d.message;
    for (const c of m.content ?? []) if (c.type === 'tool_use') tools++;
    const id = m.id ?? d.requestId ?? d.uuid;
    const u = m.usage;
    const cw1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const cwAll = u.cache_creation_input_tokens ?? 0;
    const rec = {
      t: d.timestamp,
      model: m.model,
      input: u.input_tokens ?? 0,
      cacheWrite5m: Math.max(0, cwAll - cw1h),
      cacheWrite1h: cw1h,
      cacheRead: u.cache_read_input_tokens ?? 0,
      output: u.output_tokens ?? 0,
    };
    const prev = byId.get(id);
    // Streaming repeats the same usage per content block; keep the most complete one.
    if (!prev || rec.output >= prev.output) byId.set(id, rec);
  }
  return { records: [...byId.values()], tools, first, last };
}

const round2 = (n) => Math.round(n * 100) / 100;
const sum = (recs) => {
  const o = { requests: recs.length, input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0 };
  const cost = Object.fromEntries(KINDS.map((k) => [k, 0]));
  let weighted = 0;
  for (const r of recs) {
    for (const k of KINDS) o[k] += r[k];
    const p = priced(r);
    weighted += p.weighted;
    for (const k of KINDS) cost[k] += p.cost[k];
  }
  o.total = KINDS.reduce((a, k) => a + o[k], 0);
  o.weighted = Math.round(weighted);
  o.usd = round2(KINDS.reduce((a, k) => a + cost[k], 0));
  o.cost = Object.fromEntries(KINDS.map((k) => [k, round2(cost[k])]));
  return o;
};

// "Build: month UI" and "Build WP1+WP3: glossary" both give the package name after the prefix.
const packageName = (label) => (label.includes(':') ? label.replace(/^[^:]*:\s*/, '') : label.replace(/^\S+\s+/, ''));
const fill = (tpl, m, label = '') =>
  typeof tpl === 'string'
    ? tpl.replace(/\$label|\$(\d)/g, (x, i) => (x === '$label' ? packageName(label) : (m[Number(i)] ?? '')))
    : tpl;
// "iteration": "auto" takes the iteration from the stage-log windows when the log covers the time, else from
// the hand-kept iterationWindows (optional fallback).
let derivedWindows;
const iterationAt = (t) => {
  derivedWindows ??= orchestratorWindows(true);
  const pick = (ws) => [...ws].sort((a, b) => a.from.localeCompare(b.from)).filter((x) => t >= x.from).pop();
  const w = pick(derivedWindows) ?? pick(reg.iterationWindows ?? []);
  return w ? w.iteration : null;
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

// Orchestrator windows (iteration and stage over time). "windowsFrom" (a path or list of paths, relative to the
// registry file) names stage logs: progress.mjs events (start/end/skip) and loop controller events
// (init/transition). Stages of different iterations can overlap; the window is the active stage that started
// last (a later line wins a tie). Hand-kept "windows" are the fallback when no log yields any.
function orchestratorWindows(logOnly = false) {
  const events = [];
  for (const f of [reg.orchestrator.windowsFrom].flat().filter(Boolean)) {
    const file = path.resolve(path.dirname(path.resolve(args[0])), f);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      try {
        const e = JSON.parse(line);
        if (e.t) events.push({ ...e, n: events.length });
      } catch {
        // blank or partial line
      }
    }
  }
  events.sort((a, b) => Date.parse(a.t) - Date.parse(b.t) || a.n - b.n);
  const active = new Map();
  const out = [];
  for (const e of events) {
    const stage = e.kind === 'transition' ? e.to : e.stage;
    if (stage == null || e.iteration == null) continue;
    const key = `${e.iteration}|${stage}`;
    if (e.kind === 'start' || e.kind === 'init' || e.kind === 'transition') active.set(key, e.n);
    else if (e.kind === 'end' || e.kind === 'skip') active.delete(key);
    else continue;
    const cur = [...active.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!cur) continue;
    const [iteration, st] = cur[0].split('|');
    const last = out[out.length - 1];
    if (!last || last.iteration !== Number(iteration) || last.stage !== st) out.push({ from: e.t, iteration: Number(iteration), stage: st });
  }
  if (logOnly) return out;
  return (out.length ? out : [...(reg.orchestrator.windows ?? [])]).sort((a, b) => a.from.localeCompare(b.from));
}

const items = []; // each: { kind, label, role, group, persona, stage, iteration, model, tools, first, last, records }
for (const sid of reg.sessions) {
  const main = path.join(projectDir, `${sid}.jsonl`);
  if (fs.existsSync(main)) {
    const t = readTranscript(main);
    const windows = orchestratorWindows();
    // Split orchestrator usage by time window.
    const buckets = new Map();
    for (const r of t.records) {
      let key = 'pre';
      if (r.t >= reg.loopStart) {
        const w = windows.filter((x) => r.t >= x.from).pop();
        key = w ? `${w.iteration}|${w.stage}` : 'pre';
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(r);
    }
    for (const [key, recs] of buckets) {
      const [iteration, stage] = key === 'pre' ? [null, 'Before the loop'] : key.split('|');
      items.push({
        kind: 'orchestrator',
        label: key === 'pre' ? 'Orchestration before the loop' : `Orchestration · iter ${iteration} · ${stage}`,
        role: key === 'pre' ? 'Before the loop' : reg.orchestrator.role,
        group: key === 'pre' ? 'Before the loop' : 'Orchestration',
        stage,
        iteration: iteration == null ? null : Number(iteration),
        model: recs[0]?.model,
        records: recs,
        tools: null,
      });
    }
  }
  const subDir = path.join(projectDir, sid, 'subagents');
  if (!fs.existsSync(subDir)) continue;
  // Subagent transcripts, including those launched by workflows (subagents/workflows/<run>/).
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (e.name.endsWith('.jsonl')) files.push(path.join(dir, e.name));
    }
  };
  walk(subDir);
  for (const full of files) {
    const f = path.basename(full);
    const metaFile = full.replace(/\.jsonl$/, '.meta.json');
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
    const desc = meta.description ?? f;
    const t = readTranscript(full);
    let cls = { role: 'Before the loop', group: 'Before the loop', stage: 'Before the loop', iteration: null };
    if (t.first && t.first >= reg.loopStart) {
      cls = { role: 'Unclassified', group: 'Unclassified', stage: 'Unclassified', iteration: null };
      for (const rule of reg.rules) {
        const m = new RegExp(rule.desc, 'i').exec(desc);
        if (!m) continue;
        cls = {
          role: fill(rule.role, m),
          group: fill(rule.group ?? rule.role, m),
          persona: rule.persona ? cap(fill(rule.persona, m)) : undefined,
          stage: fill(rule.stage, m),
          iteration: rule.iteration == null ? null : rule.iteration === 'auto' ? iterationAt(t.first) : Number(fill(String(rule.iteration), m)),
          workstream: rule.workstream ? fill(rule.workstream, m) : undefined,
          workPackage: rule.workPackage ? fill(rule.workPackage, m, desc).trim() : undefined,
        };
        break;
      }
    }
    items.push({ kind: 'agent', label: desc, ...cls, model: t.records[0]?.model ?? meta.model, tools: t.tools, first: t.first, last: t.last, records: t.records });
  }
}

const agg = (keyFn) => {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(...it.records);
  }
  return [...m.entries()].map(([k, recs]) => ({ key: k, ...sum(recs) })).sort((a, b) => b.weighted - a.weighted);
};
const inLoop = (it) => it.group !== 'Before the loop';
const allRecs = items.flatMap((i) => i.records);
const loopRecs = items.filter(inLoop).flatMap((i) => i.records);

// Timeline by group (loop only), 15-minute buckets by default (--bucket <minutes>, 1 to 60)
const bx = args.indexOf('--bucket');
const BUCKET = bx >= 0 ? Math.max(1, Math.min(60, Number(args[bx + 1]) || 15)) : 15;
const timeline = {};
for (const it of items.filter(inLoop))
  for (const r of it.records) {
    const mm = String(Math.floor(Number(r.t.slice(14, 16)) / BUCKET) * BUCKET).padStart(2, '0');
    const h = `${r.t.slice(0, 13)}:${mm}Z`;
    timeline[h] ??= {};
    timeline[h][it.group] = (timeline[h][it.group] ?? 0) + sum([r]).weighted;
  }

// Work packages: agents with a workPackage capture, summed per package, then grouped by model.
const median = (a) => {
  const v = [...a].sort((x, y) => x - y);
  return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : 0;
};
const minutesOf = (i) => (i.first && i.last ? Math.round((Date.parse(i.last) - Date.parse(i.first)) / 60000) : 0);
const pkgItems = items.filter((i) => i.kind === 'agent' && inLoop(i) && i.workPackage);
const byPackage = [...new Set(pkgItems.map((i) => i.workPackage))]
  .map((name) => {
    const its = pkgItems.filter((i) => i.workPackage === name);
    const models = [...new Set(its.map((i) => i.model ?? 'unknown'))].sort();
    const minutes = its.reduce((a, i) => a + minutesOf(i), 0);
    return { key: name, model: models.join(' + '), models, agents: its.length, minutes, iteration: its[0].iteration, ...sum(its.flatMap((i) => i.records)) };
  })
  .sort((a, b) => b.usd - a.usd);
const trial = [...new Set(byPackage.map((p) => p.model))]
  .map((model) => {
    const ps = byPackage.filter((p) => p.model === model);
    const total = (f) => ps.reduce((a, p) => a + p[f], 0);
    return {
      key: model,
      packages: ps.length,
      requests: total('requests'),
      total: total('total'),
      weighted: total('weighted'),
      output: total('output'),
      usd: round2(total('usd')),
      usdPerPackage: round2(total('usd') / ps.length),
      medianUsd: round2(median(ps.map((p) => p.usd))),
      minutes: total('minutes'),
      minutesPerPackage: Math.round(total('minutes') / ps.length),
      medianMinutes: median(ps.map((p) => p.minutes)),
    };
  })
  .sort((a, b) => b.usd - a.usd);

const trendIters = [...new Set(items.filter((i) => inLoop(i) && i.iteration != null).map((i) => i.iteration))].sort((a, b) => a - b);
const iterationTrend = trendIters.map((n) => {
  const its = items.filter((i) => inLoop(i) && i.iteration === n);
  const pk = byPackage.filter((p) => p.iteration === n);
  const pkgUsd = pk.reduce((a, p) => a + p.usd, 0);
  return {
    iteration: n,
    ...sum(its.flatMap((i) => i.records)),
    orchestrationUsd: round2(sum(its.filter((i) => i.kind === 'orchestrator').flatMap((i) => i.records)).usd),
    packages: pk.length,
    packageUsd: round2(pkgUsd),
    usdPerPackage: pk.length ? round2(pkgUsd / pk.length) : null,
  };
});

const out = {
  generated: new Date().toISOString(),
  weights: WEIGHTS,
  prices: PRICES,
  unpricedModels: [...unpriced],
  bucketMinutes: BUCKET,
  total: sum(allRecs),
  loop: sum(loopRecs),
  beforeLoop: sum(items.filter((i) => !inLoop(i)).flatMap((i) => i.records)),
  byIteration: agg((i) => (inLoop(i) ? (i.iteration == null ? 'n/a' : `Iteration ${i.iteration}`) : null)),
  byGroup: agg((i) => (inLoop(i) ? i.group : null)),
  byRole: agg((i) => (inLoop(i) ? i.role : null)),
  byStage: agg((i) => (inLoop(i) ? i.stage : null)),
  byPersona: agg((i) => (inLoop(i) && i.persona ? i.persona : null)),
  byModel: agg((i) => (inLoop(i) ? (i.model ?? 'unknown') : null)),
  byIterationStage: agg((i) => (inLoop(i) && i.iteration != null ? `${i.iteration}|${i.stage}` : null)),
  iterationTrend,
  priceDate: PRICES._asOf ?? null,
  byIterationModel: agg((i) => (inLoop(i) && i.iteration != null ? `${i.iteration}|${i.model ?? 'unknown'}` : null)),
  byIterationGroup: agg((i) => (inLoop(i) && i.iteration != null ? `${i.iteration}|${i.group}` : null)),
  byPackage,
  trial,
  timeline: Object.entries(timeline).sort(([a], [b]) => a.localeCompare(b)).map(([hour, groups]) => ({ hour, groups })),
  agents: items
    .filter((i) => i.kind === 'agent' && inLoop(i))
    .map((i) => ({ label: i.label, role: i.role, group: i.group, persona: i.persona, stage: i.stage, iteration: i.iteration, model: i.model, workPackage: i.workPackage, tools: i.tools, first: i.first, minutes: i.first && i.last ? Math.round((Date.parse(i.last) - Date.parse(i.first)) / 60000) : null, ...sum(i.records) }))
    .sort((a, b) => b.weighted - a.weighted),
};

const ix = args.indexOf('--inject');
if (ix >= 0) {
  const [html, marker] = args.slice(ix + 1);
  const src = fs.readFileSync(html, 'utf8');
  const re = new RegExp(`/\\*${marker}:START\\*/[\\s\\S]*?/\\*${marker}:END\\*/`);
  if (!re.test(src)) throw new Error(`markers /*${marker}:START*/ ... /*${marker}:END*/ not found`);
  fs.writeFileSync(html, src.replace(re, () => `/*${marker}:START*/\nconst ${marker} = ${JSON.stringify(out)};\n/*${marker}:END*/`));
  console.log(`injected ${marker}: loop USD ${out.loop.usd.toLocaleString()}, weighted ${out.loop.weighted.toLocaleString()}, ${out.agents.length} agents`);
} else if (args.includes('--json')) {
  console.log(JSON.stringify(out, null, 1));
} else {
  const f = (n) => n.toLocaleString();
  console.log(`Total processed ${f(out.total.total)} tokens (weighted ${f(out.total.weighted)}, USD ${f(out.total.usd)}); loop ${f(out.loop.weighted)} weighted, USD ${f(out.loop.usd)}`);
  if (out.unpricedModels.length) console.log(`No price for: ${out.unpricedModels.join(', ')} (usd counts 0)`);
  for (const [name, rows] of [['Iteration', out.byIteration], ['Group', out.byGroup], ['Stage', out.byStage], ['Persona', out.byPersona]]) {
    console.log(`\n${name}`);
    for (const r of rows) console.log(`  ${String(r.key).padEnd(28)} weighted ${f(r.weighted).padStart(12)}  USD ${f(r.usd).padStart(8)}  out ${f(r.output).padStart(9)}  req ${r.requests}`);
  }
}

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
//   "sources": [{ "projectDir": "~/.claude/projects/<slug on another machine>", "sessions": ["<id>"] }],
//                                    // optional: more transcript folders (one per machine); projectDir + sessions
//                                    // above is the first source
//   "archiveDir": "archive",         // optional, relative to the registry: every run writes what it read to
//                                    // <archiveDir>/<session>.json and reads it back, merged by request id, so
//                                    // usage survives a move to another machine or a cleaned transcript folder.
//                                    // Commit the folder.
//   "baselines": [{ "file": "baseline.json", "sessions": ["<id>"], "note": "..." }],
//                                    // optional: a saved ledger output (--json) added to the totals when none of
//                                    // its sessions has transcripts or an archive here (data from a machine that
//                                    // can no longer be read)
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
//
// Never lose usage: a session with no transcripts, no archive and no baseline fails the run, and --inject
// refuses to replace a page whose ledger holds more loop requests than the new one (--allow-shrink overrides).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const reg = JSON.parse(fs.readFileSync(args[0], 'utf8'));

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
      id,
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

const regDir = path.dirname(path.resolve(args[0]));
const sources = [
  ...(reg.projectDir && reg.sessions ? [{ projectDir: reg.projectDir, sessions: reg.sessions }] : []),
  ...(reg.sources ?? []),
];
const archiveDir = reg.archiveDir && !args.includes('--no-archive') ? path.resolve(regDir, reg.archiveDir) : null;

// What this machine's transcripts hold for one session: the orchestrator file and every subagent file.
function liveSession(dir, sid) {
  const files = {};
  const main = path.join(dir, `${sid}.jsonl`);
  if (fs.existsSync(main)) {
    const t = readTranscript(main);
    files.main = { kind: 'main', tools: t.tools, first: t.first, last: t.last, records: t.records };
  }
  const subDir = path.join(dir, sid, 'subagents');
  if (fs.existsSync(subDir)) {
    // Subagent transcripts, including those launched by workflows (subagents/workflows/<run>/).
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.jsonl')) {
          const metaFile = full.replace(/\.jsonl$/, '.meta.json');
          const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
          const t = readTranscript(full);
          const key = path.relative(subDir, full).split(path.sep).join('/');
          files[key] = { kind: 'agent', desc: meta.description ?? e.name, metaModel: meta.model, tools: t.tools, first: t.first, last: t.last, records: t.records };
        }
      }
    };
    walk(subDir);
  }
  return files;
}

// Archive file: { session, files: { <key>: { kind, desc, metaModel, tools, first, last, models: [...],
// records: [[id, t, modelIndex, input, cacheWrite5m, cacheWrite1h, cacheRead, output], ...] } } }
function readArchive(sid) {
  const f = archiveDir && path.join(archiveDir, `${sid}.json`);
  if (!f || !fs.existsSync(f)) return {};
  const a = JSON.parse(fs.readFileSync(f, 'utf8'));
  const files = {};
  for (const [key, v] of Object.entries(a.files ?? {}))
    files[key] = {
      ...v,
      models: undefined,
      records: v.records.map(([id, t, mi, input, cacheWrite5m, cacheWrite1h, cacheRead, output]) => ({ id, t, model: v.models[mi] ?? undefined, input, cacheWrite5m, cacheWrite1h, cacheRead, output })),
    };
  return files;
}
function writeArchive(sid, files) {
  if (!archiveDir) return;
  fs.mkdirSync(archiveDir, { recursive: true });
  const out = { session: sid, files: {} };
  for (const key of Object.keys(files).sort()) {
    const v = files[key];
    const models = [...new Set(v.records.map((r) => r.model ?? null))];
    out.files[key] = {
      kind: v.kind,
      desc: v.desc,
      metaModel: v.metaModel,
      tools: v.tools,
      first: v.first,
      last: v.last,
      models,
      records: [...v.records]
        .sort((a, b) => String(a.t).localeCompare(String(b.t)) || String(a.id).localeCompare(String(b.id)))
        .map((r) => [r.id, r.t, models.indexOf(r.model ?? null), r.input, r.cacheWrite5m, r.cacheWrite1h, r.cacheRead, r.output]),
    };
  }
  const text = `${JSON.stringify(out)}\n`;
  const f = path.join(archiveDir, `${sid}.json`);
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== text) fs.writeFileSync(f, text);
}
// Union by request id; the more complete record wins. Nothing the archive holds is ever dropped.
function mergeFiles(archived, live) {
  const out = { ...archived };
  for (const [key, v] of Object.entries(live)) {
    const a = out[key];
    if (!a) {
      out[key] = v;
      continue;
    }
    const byId = new Map(a.records.map((r) => [r.id, r]));
    for (const r of v.records) {
      const prev = byId.get(r.id);
      if (!prev || r.output >= prev.output) byId.set(r.id, r);
    }
    const min = (x, y) => (x && y ? (x < y ? x : y) : (x ?? y));
    const max = (x, y) => (x && y ? (x > y ? x : y) : (x ?? y));
    out[key] = { ...a, ...v, tools: Math.max(a.tools ?? 0, v.tools ?? 0), first: min(a.first, v.first), last: max(a.last, v.last), records: [...byId.values()] };
  }
  return out;
}

const items = []; // each: { kind, label, role, group, persona, stage, iteration, model, tools, first, last, records }
const sessionsWithData = new Set();
const sessionsMissing = [];
for (const src of sources) {
  const dir = src.projectDir.replace(/^~/, os.homedir());
  for (const sid of src.sessions) {
    const files = mergeFiles(readArchive(sid), liveSession(dir, sid));
    if (!Object.keys(files).length) {
      sessionsMissing.push(sid);
      continue;
    }
    sessionsWithData.add(sid);
    writeArchive(sid, files);
    if (files.main) {
      const windows = orchestratorWindows();
      // Split orchestrator usage by time window.
      const buckets = new Map();
      for (const r of files.main.records) {
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
    for (const [key, t] of Object.entries(files)) {
      if (t.kind !== 'agent') continue;
      const desc = t.desc ?? key;
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
      items.push({ kind: 'agent', label: desc, ...cls, model: t.records[0]?.model ?? t.metaModel, tools: t.tools, first: t.first, last: t.last, records: t.records });
    }
  }
}
// A baseline stands in for sessions this machine cannot read at all.
const baselines = (reg.baselines ?? []).filter((b) => !(b.sessions ?? []).some((sid) => sessionsWithData.has(sid)));
const covered = new Set(baselines.flatMap((b) => b.sessions ?? []));
const lost = sessionsMissing.filter((sid) => !covered.has(sid));
if (lost.length && !args.includes('--allow-missing')) {
  console.error(`usage-ledger: no transcripts, archive or baseline for session(s) ${lost.join(', ')}. Run the ledger on the machine that has them (it writes the archive), add a baseline, or pass --allow-missing.`);
  process.exit(1);
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
const trialOf = (byPackage) => [...new Set(byPackage.map((p) => p.model))]
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
const trial = trialOf(byPackage);

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

// Baselines: saved ledger outputs, added to every total and table.
const SKIP = new Set(['key', 'iteration', 'model', 'models', 'usdPerPackage', 'hour', 'label', 'role', 'group', 'persona', 'stage', 'workPackage', 'first']);
const USD = new Set(['usd', 'orchestrationUsd', 'packageUsd']);
function addInto(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (SKIP.has(k)) continue;
    if (typeof v === 'number') a[k] = USD.has(k) ? round2((a[k] ?? 0) + v) : (a[k] ?? 0) + v;
    else if (k === 'cost' && v) {
      a.cost ??= {};
      for (const [c, n] of Object.entries(v)) a.cost[c] = round2((a.cost[c] ?? 0) + n);
    }
  }
  return a;
}
function mergeKeyed(mine, theirs, keyOf = (x) => x.key, onNew = (x) => structuredClone(x)) {
  const m = new Map(mine.map((x) => [keyOf(x), x]));
  for (const t of theirs ?? []) {
    const cur = m.get(keyOf(t));
    if (cur) addInto(cur, t);
    else m.set(keyOf(t), onNew(t));
  }
  return [...m.values()];
}
const byWeight = (a, b) => b.weighted - a.weighted;
for (const b of baselines) {
  const base = JSON.parse(fs.readFileSync(path.resolve(regDir, b.file), 'utf8'));
  for (const k of ['total', 'loop', 'beforeLoop']) addInto(out[k], base[k] ?? {});
  for (const k of ['byIteration', 'byGroup', 'byRole', 'byStage', 'byPersona', 'byModel', 'byIterationStage', 'byIterationModel', 'byIterationGroup'])
    out[k] = mergeKeyed(out[k], base[k]).sort(byWeight);
  out.byPackage = mergeKeyed(out.byPackage, base.byPackage).sort((x, y) => y.usd - x.usd);
  for (const p of out.byPackage) {
    const theirs = (base.byPackage ?? []).find((x) => x.key === p.key);
    if (theirs && theirs !== p) {
      p.models = [...new Set([...(p.models ?? []), ...(theirs.models ?? [])])].sort();
      p.model = p.models.join(' + ');
    }
  }
  out.trial = trialOf(out.byPackage);
  out.iterationTrend = mergeKeyed(out.iterationTrend, base.iterationTrend, (x) => x.iteration).sort((x, y) => x.iteration - y.iteration);
  for (const t of out.iterationTrend) t.usdPerPackage = t.packages ? round2(t.packageUsd / t.packages) : null;
  const tl = new Map(out.timeline.map((x) => [x.hour, x]));
  for (const t of base.timeline ?? []) {
    const cur = tl.get(t.hour) ?? { hour: t.hour, groups: {} };
    for (const [g, n] of Object.entries(t.groups)) cur.groups[g] = (cur.groups[g] ?? 0) + n;
    tl.set(t.hour, cur);
  }
  out.timeline = [...tl.values()].sort((x, y) => x.hour.localeCompare(y.hour));
  out.agents = [...out.agents, ...(base.agents ?? [])].sort(byWeight);
  out.unpricedModels = [...new Set([...out.unpricedModels, ...(base.unpricedModels ?? [])])];
}
out.sources = {
  sessions: [...sessionsWithData],
  baselines: baselines.map((b) => ({ file: b.file, sessions: b.sessions ?? [], note: b.note ?? null })),
  missing: lost,
};

const ix = args.indexOf('--inject');
if (ix >= 0) {
  const [html, marker] = args.slice(ix + 1);
  const src = fs.readFileSync(html, 'utf8');
  const re = new RegExp(`/\\*${marker}:START\\*/[\\s\\S]*?/\\*${marker}:END\\*/`);
  if (!re.test(src)) throw new Error(`markers /*${marker}:START*/ ... /*${marker}:END*/ not found`);
  // Never replace a fuller ledger with a thinner one (a machine that cannot read the transcripts).
  const before = /"loop":\{"requests":(\d+)/.exec(re.exec(src)[0]);
  if (before && Number(before[1]) > out.loop.requests && !args.includes('--allow-shrink')) {
    console.error(`usage-ledger: refusing to inject: the page holds ${before[1]} loop requests, this run found ${out.loop.requests}. Usage data would be lost. Check the registry sources, archive and baselines, or pass --allow-shrink.`);
    process.exit(1);
  }
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

// Token consumption ledger for an agentic development loop (Claude Code transcripts).
// Reads the orchestrator session transcript and every subagent transcript, de-duplicates
// API responses, and attributes usage to role, persona, development stage and iteration
// using a registry of rules. Output feeds the status page "Consumption" tab.
//
//   node devloop/kit/usage-ledger.mjs <registry.json> [--inject <page.html> USAGE] [--json]
//
// Registry (see devloop/templates/usage-registry.json):
// {
//   "projectDir": "~/.claude/projects/<project-slug>",
//   "sessions": ["<session-id>"],
//   "loopStart": "ISO time", // usage before this is "Before the loop"
//   "orchestrator": { "role": "Group Manager", "windows": [{ "from": "ISO", "iteration": 0, "stage": "Plan" }] },
//   "rules": [{ "desc": "^Customer (\\w+) iter-(\\d+)", "role": "Customer", "group": "Customers",
//               "persona": "$1", "iteration": "$2", "stage": "Use" }]
// }
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const reg = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const projectDir = reg.projectDir.replace(/^~/, os.homedir());

// Input-equivalent weights (standard price ratios: cache read 0.1x, 5 min cache write 1.25x,
// 1 h cache write 2x, output 5x). A single comparable number without assuming a price list.
const WEIGHTS = { input: 1, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1, output: 5 };

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

const sum = (recs) => {
  const o = { requests: recs.length, input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0 };
  for (const r of recs) for (const k of ['input', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead', 'output']) o[k] += r[k];
  o.total = o.input + o.cacheWrite5m + o.cacheWrite1h + o.cacheRead + o.output;
  o.weighted = Math.round(Object.entries(WEIGHTS).reduce((a, [k, w]) => a + w * o[k], 0));
  return o;
};

const fill = (tpl, m) => (typeof tpl === 'string' ? tpl.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '') : tpl);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

const items = []; // each: { kind, label, role, group, persona, stage, iteration, model, tools, first, last, records }
for (const sid of reg.sessions) {
  const main = path.join(projectDir, `${sid}.jsonl`);
  if (fs.existsSync(main)) {
    const t = readTranscript(main);
    const windows = [...(reg.orchestrator.windows ?? [])].sort((a, b) => a.from.localeCompare(b.from));
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
          iteration: rule.iteration == null ? null : Number(fill(String(rule.iteration), m)),
          workstream: rule.workstream ? fill(rule.workstream, m) : undefined,
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

// 15-minute timeline by group (loop only)
const timeline = {};
for (const it of items.filter(inLoop))
  for (const r of it.records) {
    const mm = String(Math.floor(Number(r.t.slice(14, 16)) / 15) * 15).padStart(2, '0');
    const h = `${r.t.slice(0, 13)}:${mm}Z`;
    timeline[h] ??= {};
    timeline[h][it.group] = (timeline[h][it.group] ?? 0) + sum([r]).weighted;
  }

const out = {
  generated: new Date().toISOString(),
  weights: WEIGHTS,
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
  byIterationGroup: agg((i) => (inLoop(i) && i.iteration != null ? `${i.iteration}|${i.group}` : null)),
  timeline: Object.entries(timeline).sort(([a], [b]) => a.localeCompare(b)).map(([hour, groups]) => ({ hour, groups })),
  agents: items
    .filter((i) => i.kind === 'agent' && inLoop(i))
    .map((i) => ({ label: i.label, role: i.role, group: i.group, persona: i.persona, stage: i.stage, iteration: i.iteration, model: i.model, tools: i.tools, minutes: i.first && i.last ? Math.round((Date.parse(i.last) - Date.parse(i.first)) / 60000) : null, ...sum(i.records) }))
    .sort((a, b) => b.weighted - a.weighted),
};

const ix = args.indexOf('--inject');
if (ix >= 0) {
  const [html, marker] = args.slice(ix + 1);
  const src = fs.readFileSync(html, 'utf8');
  const re = new RegExp(`/\\*${marker}:START\\*/[\\s\\S]*?/\\*${marker}:END\\*/`);
  if (!re.test(src)) throw new Error(`markers /*${marker}:START*/ ... /*${marker}:END*/ not found`);
  fs.writeFileSync(html, src.replace(re, () => `/*${marker}:START*/\nconst ${marker} = ${JSON.stringify(out)};\n/*${marker}:END*/`));
  console.log(`injected ${marker}: loop weighted ${out.loop.weighted.toLocaleString()}, ${out.agents.length} agents`);
} else if (args.includes('--json')) {
  console.log(JSON.stringify(out, null, 1));
} else {
  const f = (n) => n.toLocaleString();
  console.log(`Total processed ${f(out.total.total)} tokens (weighted ${f(out.total.weighted)}); loop ${f(out.loop.weighted)} weighted`);
  for (const [name, rows] of [['Iteration', out.byIteration], ['Group', out.byGroup], ['Stage', out.byStage], ['Persona', out.byPersona]]) {
    console.log(`\n${name}`);
    for (const r of rows) console.log(`  ${String(r.key).padEnd(28)} weighted ${f(r.weighted).padStart(12)}  out ${f(r.output).padStart(9)}  req ${r.requests}`);
  }
}

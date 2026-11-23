#!/usr/bin/env node
// Status page refresh by tier (method/status-page.md): runs the injectors of every section in the
// requested tier and below, generates the sections that used to be hand-kept copies (decisions,
// goals, journal, KPI cards, stability, blockers, tasks, loop state, how we work), stamps each
// refreshed section with an as-of time and commit, lists the hand-written fields that are owed,
// runs the page check and, when nothing is owed, records `status-refresh` with the loop controller.
// Product-agnostic: the page, the sections and their sources are in the instance protocol file.
//
//   node devloop/kit/status-refresh.mjs <instance>/status-protocol.json --tier T0..T4
//        [--hand id,id]   the Group Manager has just written these hand sections: stamp them
//        [--no-check]     skip the browser page check    [--no-record]  do not record with the loop
//        [--dry-run]      print what would run, change nothing
//   node devloop/kit/status-refresh.mjs <protocol> --freshness   print the freshness table (exit 1 if stale)
//
// Protocol (instance file; paths in sections are relative to the protocol's folder, `page` to the
// repository root):
// { "page": "dev_plan/status.html", "tabSelector": "#tabs button", "loopConfig": "loop/config.json",
//   "tierEvents": { "T0": [{ "loop": ["init", "transition", "progress"] }],
//                   "T1": [{ "loop": ["merge", "publish"] }, { "gitMerges": true }],
//                   "T2": [{ "loopTransitionFrom": ["Use", "Triage"] }, { "gitPaths": ["real-signals"] }],
//                   "T3": [{ "loopTransitionFrom": ["Gate"] }], "T4": [] },
//   "sections": [ { "id": "decisions", "tier": "T1", "source": "generated", "el": "decisionlist",
//                   "gen": { "kind": "ledger", "from": "ledger.md" } },
//                 { "id": "progress", "tier": "T0", "source": "generated", "el": "progressbox",
//                   "run": ["node", "devloop/kit/progress.mjs", "...", "--inject", "{page}", "PROGRESS"] },
//                 { "id": "heat", "tier": "T2", "source": "generated", "derivedFrom": "feedback" },
//                 { "id": "now", "tier": "T1", "source": "hand", "el": "nowbox", "fields": ["LOOP.now"] },
//                 { "id": "how", "tier": "T4", ..., "events": [{ "gitPaths": ["../../HOW_WE_WORK.md"] }] } ] }
//
// The page gets two injected blocks: /*GEN:START*/ const GEN = {...}; /*GEN:END*/ (generated data,
// keyed by section id, read by the page's renderers) and /*STAMPS:START*/ const STAMPS = {...};
// /*STAMPS:END*/ ({ id: { t, commit, tier, source, el } }). A section is fresh when its stamp is not
// older than the last event of its tier (or of its own `events`). Generated sections without `gen`,
// `run` or `derivedFrom` count as hand-kept until they get an injector.
// Generators (`gen.kind`): ledger, goals, journal, stability, tasks, blockers, loop, bullets, how,
// quality (kit/evaluate.mjs scorecard and trend), kpis.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseYaml } from './regressions.mjs';

const KIT = path.dirname(fileURLToPath(import.meta.url));
const tierNum = (t) => Number(String(t).replace(/^T/, ''));

// ---------------------------------------------------------------- small parsers
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const mdInline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<i>$2</i>');
const plain = (s) => String(s).replace(/\*\*/g, '').replace(/`/g, '').trim();

/** Markdown tables: [{ heading, header: [..], rows: [[..]] }], cells trimmed. */
export function mdTables(src) {
  const out = [];
  let heading = '';
  let cur = null;
  for (const line of src.split('\n')) {
    if (/^#{1,6}\s/.test(line)) heading = line.replace(/^#+\s*/, '');
    if (line.trim().startsWith('|')) {
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (!cur) cur = { heading, header: cells, rows: [] };
      else if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      else cur.rows.push(cells);
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const firstSentence = (s, n = 110) => {
  const t = plain(s);
  const m = /^(.+?[.:;])(\s|$)/.exec(t);
  let f = m && m[1].length <= n ? m[1].replace(/[.:;]$/, '') : t;
  if (f.length > n) f = `${f.slice(0, f.lastIndexOf(' ', n - 3))}...`;
  return f;
};

// ---------------------------------------------------------------- generators
export const generators = {
  /** Decision ledger rows, newest first: { id, date, type, title, text, outcome, open }. */
  ledger(g, c) {
    const t = mdTables(read(c, g.from)).find((x) => x.header.map((h) => h.toLowerCase()).includes('decision'));
    if (!t) return [];
    const col = Object.fromEntries(t.header.map((h, i) => [h.toLowerCase(), i]));
    const openWord = new RegExp(`^(${(g.open ?? ['Open', 'Draft']).join('|')})`, 'i');
    return t.rows
      .filter((r) => /^D-\d+/.test(r[col.id] ?? ''))
      .map((r) => {
        const decision = r[col.decision] ?? '';
        const outcome = r[col.outcome] ?? '';
        return {
          id: r[col.id],
          date: r[col.date] ?? '',
          type: r[col.type] ?? '',
          title: mdInline(firstSentence(decision)),
          text: `${mdInline(decision)}${r[col.evidence] ? `<br><span class="muted">Evidence: ${mdInline(r[col.evidence])}</span>` : ''}${r[col.reversal] && r[col.reversal] !== 'n/a' ? `<br><span class="muted">Reversal: ${mdInline(r[col.reversal])}</span>` : ''}`,
          outcome: plain(outcome).split(/[\s:]/)[0] || 'Open',
          open: openWord.test(plain(outcome)) || !outcome,
        };
      })
      .sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2)));
  },

  /** Goal tables (ID, Goal, Source, Status): [[id, track, goal, source, status]]. */
  goals(g, c) {
    const rows = [];
    for (const t of mdTables(read(c, g.from))) {
      const h = t.header.map((x) => x.toLowerCase());
      if (!h.includes('id') || !h.includes('goal')) continue;
      const track = /Track\s+([A-Z])/.exec(t.heading)?.[1] ?? '';
      const ix = (k) => h.indexOf(k);
      for (const r of t.rows) rows.push([r[ix('id')], track, mdInline(plain(r[ix('goal')])), mdInline(r[ix('source')] ?? ''), (r[ix('status')] || 'planned').toLowerCase()]);
    }
    return rows;
  },

  /** Journal entries "## date · Iteration N · title" with bullet items: [{ date, iter, title, items }]. */
  journal(g, c) {
    const entries = [];
    let cur = null;
    for (const line of read(c, g.from).split('\n')) {
      const h = /^##\s+(\S+)\s+·\s+Iteration\s+(\d+)\s+·\s+(.+)$/.exec(line);
      if (h) {
        cur = { date: h[1], iter: Number(h[2]), title: mdInline(h[3]), items: [] };
        entries.push(cur);
      } else if (/^#{1,2}\s/.test(line)) cur = null;
      else if (cur && /^[-*]\s+/.test(line)) cur.items.push(line.replace(/^[-*]\s+/, ''));
      else if (cur && line.trim() && cur.items.length) cur.items[cur.items.length - 1] += ` ${line.trim()}`;
    }
    for (const e of entries) e.items = e.items.map(mdInline);
    return entries;
  },

  /** Guarded findings and the latest verify result: { findings, guards, verify }. */
  stability(g, c) {
    const reg = parseYaml(read(c, g.registry));
    const findings = reg.findings ?? [];
    const last = (c.state?.records ?? []).filter((r) => r.gate === 'verify').at(-1);
    let summary = null;
    const sumFile = g.summary ? path.resolve(c.root, g.summary) : null;
    if (sumFile && fs.existsSync(sumFile)) {
      try {
        const s = JSON.parse(fs.readFileSync(sumFile, 'utf8'));
        summary = { ok: s.ok, commit: s.commit ?? null, failed: (s.results ?? []).filter((r) => !r.ok).map((r) => r.id), t: fs.statSync(sumFile).mtime.toISOString() };
      } catch {}
    }
    return {
      findings: findings.length,
      guards: findings.reduce((a, f) => a + (f.guards?.length ?? 0), 0),
      verify: last ? { result: last.result, commit: last.commit.slice(0, 9), t: last.t, iteration: last.iteration } : null,
      lastRun: summary,
    };
  },

  /** Current iteration's work packages (runs/iter-NN/<file>) in the task table shape. */
  tasks(g, c) {
    const n = c.state?.iteration;
    if (n == null) return [];
    const file = path.join(c.instDir, (g.from ?? 'runs/iter-{NN}/work-packages.json').replace('{NN}', String(n).padStart(2, '0')).replace('{N}', String(n)));
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8')).map((w) => ({ id: w.id, t: mdInline(w.title), d: mdInline(w.detail ?? ''), m: `Iter ${n}${w.goal ? ` · ${w.goal}` : ''}`, p: w.priority ?? 'P1', s: w.status ?? 'planned' }));
  },

  /** Loop blockers (loop block) and open S1/S2 patterns of the latest triage, in the blocker table shape. */
  blockers(g, c) {
    const out = (c.state?.blocked ?? []).map((b) => ({ id: b.id, b: mdInline(b.what), r: mdInline(b.resolution ?? b.needs ?? ''), s: b.status === 'resolved' ? 'resolved' : 'open' }));
    const runs = path.join(c.instDir, 'runs');
    const iters = fs.existsSync(runs) ? fs.readdirSync(runs).filter((d) => /^iter-\d+$/.test(d) && fs.existsSync(path.join(runs, d, 'patterns.json'))).sort() : [];
    if (iters.length) {
      const p = JSON.parse(fs.readFileSync(path.join(runs, iters.at(-1), 'patterns.json'), 'utf8'));
      for (const x of p.patterns ?? []) if (/^S[12]$/.test(x.severity ?? '') && !/fixed|done/i.test(x.status ?? '')) out.push({ id: x.id, b: mdInline(x.title), r: mdInline(x.status ?? 'open finding'), s: 'open' });
    }
    return out;
  },

  /** Loop state for the header: { updated, iteration, stage, stageIndex, phase, lastPublish }. */
  loop(g, c) {
    const st = c.state ?? {};
    const stages = c.loop?.cfg.stages ?? [];
    const pub = (st.publishes ?? []).at(-1);
    return {
      updated: c.now.toISOString().slice(0, 16).replace('T', ' '),
      iteration: st.iteration ?? null,
      stage: st.stage ?? null,
      stageIndex: st.stage ? stages.indexOf(st.stage) + 1 : 0,
      stageSince: st.stageSince ?? null,
      phase: st.stage ? `Iteration ${st.iteration} · ${st.stage}` : '',
      lastPublish: pub ? { tag: pub.tag, commit: pub.commit.slice(0, 9), t: pub.t } : null,
    };
  },

  /** Top-level bullet items of a markdown file (a release gate list): [html]. */
  bullets(g, c) {
    return read(c, g.from)
      .split('\n')
      .filter((l) => /^[-*]\s+/.test(l))
      .map((l) => mdInline(l.replace(/^[-*]\s+/, '')));
  },

  /**
   * Quality scorecard (kit/evaluate.mjs, method/quality.md): the latest iteration with customer
   * measurements in full, the current iteration's verdict, and the per-dimension trend.
   * gen: { kind: "quality", spec: "quality.json" }.
   */
  async quality(g, c) {
    const ev = await import('./evaluate.mjs');
    const spec = path.resolve(c.instDir, g.spec ?? 'quality.json');
    const current = await ev.evaluate(spec, { iteration: c.state?.iteration ?? undefined, now: c.now.toISOString() });
    // show the latest iteration in which at least half of the blocking metrics were measured
    const mostlyMeasured = (card) => {
      const b = card.dimensions.flatMap((d) => d.metrics.filter((m) => m.blocking));
      return b.length > 0 && b.filter((m) => m.status !== 'not-measured').length * 2 >= b.length;
    };
    let shown = current;
    if (!mostlyMeasured(current)) {
      for (const n of [...(current.trend?.iterations ?? [])].reverse()) {
        if (n === current.iteration) continue;
        const card = await ev.evaluate(spec, { iteration: n, now: c.now.toISOString(), trend: false });
        if (mostlyMeasured(card)) {
          shown = card;
          break;
        }
      }
    }
    const slim = (card) => ({
      iteration: card.iteration,
      commit: card.commit ? card.commit.slice(0, 9) : null,
      verdict: card.verdict,
      reasons: card.reasons,
      counts: card.counts,
      dimensions: card.dimensions.map((d) => ({
        id: d.id,
        label: d.label,
        metrics: d.metrics.map((m) => ({ id: m.id, label: m.label, status: m.status, value: m.value, threshold: m.threshold, band: m.band, direction: m.direction, format: m.format ?? null, cadence: m.cadence, blocking: m.blocking, veto: m.veto, gate: m.gate ?? null, measured: m.measured ? { commit: m.measured.commit, iteration: m.measured.iteration, ageHours: m.measured.ageHours } : null, note: m.reason ?? m.detail ?? null, noise: m.noise ?? null })),
      })),
    });
    return {
      evaluatedAt: current.evaluatedAt,
      spec: current.spec,
      current: { iteration: current.iteration, commit: current.commit ? current.commit.slice(0, 9) : null, verdict: current.verdict, counts: current.counts, reasons: current.reasons.slice(0, 8) },
      shown: slim(shown),
      trend: current.trend ? { iterations: current.trend.iterations, verdicts: current.trend.verdicts.map((v) => ({ iteration: v.iteration, verdict: v.verdict })), dimensions: current.trend.dimensions } : null,
    };
  },

  /** Principles and version of a How-we-work file: { version, principles: [[title, html]] }. */
  how(g, c) {
    const src = read(c, g.from);
    const principles = [];
    for (const line of src.split('\n')) {
      const m = /^\d+\.\s+\*\*(.+?)\*\*[:.]?\s*(.*)$/.exec(line);
      if (m) principles.push([mdInline(m[1].replace(/[.:]$/, '')), mdInline(m[2])]);
    }
    return { version: /Version\s+([\d.]+)/.exec(src)?.[1] ?? null, principles };
  },
};

/** KPI cards from the other generated sections, the page's FEEDBACK data and instance files. */
function kpis(g, c, gen) {
  const cards = [];
  for (const it of g.items ?? []) {
    let v = '';
    if (it.kind === 'iteration') {
      const l = gen.loop ?? generators.loop({}, c);
      v = `${l.iteration ?? '?'}${l.lastPublish ? ` <small>${l.lastPublish.tag} on main</small>` : ''}`;
    } else if (it.kind === 'count') {
      const dir = path.join(c.instDir, it.dir);
      const n = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => new RegExp(it.match ?? '.').test(f) && !(it.exclude && new RegExp(it.exclude).test(f))).length : 0;
      v = `${n}${it.small ? ` <small>${it.small}</small>` : ''}`;
    } else if (it.kind === 'feedback') {
      const fb = feedbackFromPage(c.pageSrc);
      const vals = Object.keys(fb).sort((a, b) => a - b).map((k) => fb[k]?.weighted?.[it.field ?? 'recommend']).filter((x) => x != null);
      v = vals.length ? `${vals.at(-1)} <small>${vals.join(' · ')}</small>` : '?';
    } else if (it.kind === 'ledger-last') {
      v = (gen.decisions ?? generators.ledger({ from: it.from }, c))[0]?.id ?? '?';
    } else if (it.kind === 'quality') {
      const q = gen.quality;
      const word = { met: 'met', 'not-met': 'not met', undecided: 'undecided' };
      const col = { met: 'var(--done)', 'not-met': 'var(--brand)', undecided: 'var(--doing)' };
      v = q?.shown ? `<span style='color:${col[q.shown.verdict]}'>${word[q.shown.verdict]}</span> <small>iteration ${q.shown.iteration} scorecard</small>` : (it.value ?? '?');
    } else if (it.kind === 'stability') {
      const s = gen.stability;
      v = s ? `${s.findings} <small>${s.guards} guards${s.verify ? ` · verify ${s.verify.result} ${s.verify.commit}` : ''}</small>` : '?';
    } else v = it.value ?? '';
    cards.push([it.label, v]);
  }
  return cards;
}

/** FEEDBACK[n] = {...}; lines injected by feedback-digest.mjs. */
export function feedbackFromPage(src) {
  const out = {};
  const block = /\/\*FEEDBACK:START\*\/([\s\S]*?)\/\*FEEDBACK:END\*\//.exec(src ?? '')?.[1] ?? '';
  for (const m of block.matchAll(/^FEEDBACK\[(\d+)\]\s*=\s*(\{.*\});\s*$/gm)) {
    try {
      out[m[1]] = JSON.parse(m[2]);
    } catch {}
  }
  return out;
}

function read(c, rel) {
  return fs.readFileSync(path.resolve(c.instDir, rel), 'utf8');
}

// ---------------------------------------------------------------- page blocks
export function readBlock(src, marker) {
  const m = new RegExp(`/\\*${marker}:START\\*/\\s*const ${marker} = ([\\s\\S]*?);\\s*/\\*${marker}:END\\*/`).exec(src);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function writeBlock(src, marker, value) {
  const re = new RegExp(`/\\*${marker}:START\\*/[\\s\\S]*?/\\*${marker}:END\\*/`);
  if (!re.test(src)) throw new Error(`markers /*${marker}:START*/ ... /*${marker}:END*/ not found in the page`);
  return src.replace(re, () => `/*${marker}:START*/\nconst ${marker} = ${JSON.stringify(value)};\n/*${marker}:END*/`);
}

// ---------------------------------------------------------------- context, events, freshness
export async function loadProtocol(file, { now } = {}) {
  const protoPath = path.resolve(file);
  const proto = JSON.parse(fs.readFileSync(protoPath, 'utf8'));
  const instDir = path.resolve(path.dirname(protoPath), proto.instance ?? '.');
  const root = git(instDir, ['rev-parse', '--show-toplevel']);
  const page = path.resolve(root, proto.page);
  let loop = null;
  let lp = null;
  try {
    lp = await import('./loop.mjs');
    loop = lp.loadLoop({ cwd: root, config: proto.loopConfig ? path.resolve(instDir, proto.loopConfig) : undefined });
  } catch {
    loop = null;
  }
  const state = loop ? lp.readState(loop) : null;
  const events = loop ? lp.readEvents(loop) : [];
  return { proto, protoPath, instDir, root, page, loop, lp, state, events, now: now ? new Date(now) : loop ? loop.now() : new Date() };
}

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Time (ms) of the last event matching any of `matchers`, or null. */
export function lastEvent(c, matchers) {
  let best = null;
  const take = (t) => {
    const v = typeof t === 'number' ? t : Date.parse(t);
    if (!Number.isNaN(v) && (best == null || v > best)) best = v;
  };
  for (const m of matchers ?? []) {
    if (m.loop) for (const e of c.events) if (m.loop.includes(e.kind)) take(e.t);
    if (m.loopTransitionFrom) for (const e of c.events) if (e.kind === 'transition' && m.loopTransitionFrom.includes(e.from)) take(e.t);
    if (m.gitMerges) {
      const branch = c.loop?.cfg.sharedBranch;
      const t = branch && git(c.root, ['log', '-1', '--merges', '--first-parent', '--format=%cI', `refs/heads/${branch}`]);
      if (t) take(t);
    }
    if (m.gitPaths) {
      const paths = m.gitPaths.map((p) => path.relative(c.root, path.resolve(c.instDir, p)));
      const t = git(c.root, ['log', '-1', '--format=%cI', 'HEAD', '--', ...paths]);
      if (t) take(t);
    }
  }
  return best;
}

const isHandKept = (s) => s.source === 'hand' || (!s.gen && !s.run && !s.derivedFrom);

/** Freshness of every section: [{ id, tier, hand, stamp, last, stale, missing }]. */
export function freshness(c, stamps) {
  return c.proto.sections.map((s) => {
    const last = lastEvent(c, s.events ?? c.proto.tierEvents?.[s.tier] ?? []);
    const st = stamps?.[s.id];
    const missing = !st;
    const stale = missing || (last != null && Date.parse(st.t) < last);
    return { id: s.id, tier: s.tier, hand: isHandKept(s), fields: s.fields, stamp: st?.t ?? null, last: last ? new Date(last).toISOString() : null, stale, missing };
  });
}

export const selectSections = (proto, tier) => proto.sections.filter((s) => tierNum(s.tier) <= tierNum(tier));

// ---------------------------------------------------------------- refresh
export async function refresh(file, { tier, hand = [], check = true, record = true, dryRun = false, now, log = console.log } = {}) {
  if (!/^T[0-4]$/.test(tier ?? '')) throw new Error('--tier T0..T4 is required');
  const c = await loadProtocol(file, { now });
  const sections = selectSections(c.proto, tier);
  const unknown = hand.filter((h) => !c.proto.sections.some((s) => s.id === h));
  if (unknown.length) throw new Error(`unknown section(s) for --hand: ${unknown.join(', ')}`);
  const commit = git(c.root, ['rev-parse', '--short', 'HEAD']);
  const notes = [];

  // 1. external injectors (progress, feedback, usage ...), in protocol order
  for (const s of sections.filter((x) => x.run)) {
    const cmd = s.run.map((a) => a.replace('{page}', c.page).replace('{instance}', c.instDir));
    log(`${dryRun ? '[dry run] ' : ''}${s.id}: ${cmd.join(' ')}`);
    if (dryRun) continue;
    const r = spawnSync(cmd[0] === 'node' ? process.execPath : cmd[0], cmd.slice(1), { cwd: c.root, encoding: 'utf8' });
    if (r.status !== 0) notes.push(`${s.id}: injector failed: ${(r.stderr || r.stdout).trim().split('\n').at(-1)}`);
  }

  // 2. built-in generators into GEN
  let src = fs.readFileSync(c.page, 'utf8');
  c.pageSrc = src;
  const gen = readBlock(src, 'GEN') ?? {};
  const ok = new Set(sections.filter((s) => s.run).map((s) => s.id).filter((id) => !notes.some((n) => n.startsWith(`${id}:`))));
  const builtins = sections.filter((s) => s.gen && s.gen.kind !== 'kpis');
  for (const s of builtins) {
    const fn = generators[s.gen.kind];
    if (!fn) throw new Error(`section ${s.id}: unknown generator ${s.gen.kind}`);
    try {
      gen[s.id] = await fn(s.gen, c);
      ok.add(s.id);
    } catch (e) {
      notes.push(`${s.id}: ${e.message}`);
    }
  }
  for (const s of sections.filter((x) => x.gen?.kind === 'kpis')) {
    gen[s.id] = kpis(s.gen, c, gen);
    ok.add(s.id);
  }
  // sections the page builds from another section's data are as fresh as that section
  for (const s of sections.filter((x) => x.derivedFrom && ok.has(x.derivedFrom))) ok.add(s.id);

  // 3. stamps: refreshed generated sections, and hand sections the Group Manager just wrote
  const stamps = readBlock(src, 'STAMPS') ?? {};
  const t = c.now.toISOString();
  for (const s of c.proto.sections) {
    const generated = ok.has(s.id) && !isHandKept(s);
    if (generated || hand.includes(s.id)) stamps[s.id] = { t, commit, tier: s.tier, source: isHandKept(s) ? 'hand' : 'generated', el: s.el ?? null };
  }
  if (!dryRun) {
    src = writeBlock(src, 'GEN', gen);
    src = writeBlock(src, 'STAMPS', stamps);
    fs.writeFileSync(c.page, src);
  }

  // 4. owed hand fields in the refreshed tiers
  const fresh = freshness(c, stamps);
  const owed = fresh.filter((f) => f.hand && f.stale && tierNum(f.tier) <= tierNum(tier));
  for (const o of owed) log(`owed (hand): ${o.id} [${o.tier}]${o.fields ? ` ${o.fields.join(', ')}` : ''}${o.missing ? ' (never stamped)' : ` (stamp ${o.stamp}, last ${o.tier} event ${o.last})`}`);
  for (const n of notes) log(`warning: ${n}`);

  // 5. page check
  let checked = null;
  if (check && !dryRun) {
    const r = spawnSync(process.execPath, [path.join(KIT, 'page-check.mjs'), c.page, c.proto.tabSelector ?? '#tabs button'], { cwd: c.root, encoding: 'utf8' });
    checked = r.status === 0;
    log((r.stdout || r.stderr).trim());
  }

  // 6. record with the controller when the tier is complete
  let recorded = null;
  const complete = owed.length === 0 && notes.length === 0 && checked !== false;
  if (record && !dryRun && complete && c.loop && c.lp) {
    try {
      recorded = c.lp.record(c.loop, { gate: 'status-refresh', result: 'pass', commit: 'HEAD', evidence: c.page, note: `status-refresh ${tier}`, extra: { tier } });
      log(`loop: recorded status-refresh ${tier}`);
    } catch (e) {
      log(`loop: not recorded: ${e.message}`);
    }
  } else if (record && !dryRun && c.loop) log(`loop: status-refresh ${tier} not recorded (${owed.length} hand section(s) owed${notes.length ? `, ${notes.length} problem(s)` : ''}${checked === false ? ', page check failed' : ''})`);
  return { tier, sections: sections.map((s) => s.id), refreshed: [...ok], owed: owed.map((o) => o.id), notes, checked, recorded, stamps };
}

/** Run the owed tier after a merge or publish (needs `statusProtocol` in the loop config). */
export async function autoRefresh(ctx, tier, log = console.log) {
  if (!ctx.paths.protocol || !fs.existsSync(ctx.paths.protocol)) {
    log(`status refresh ${tier} owed: no statusProtocol in the loop config, refresh the page by hand`);
    return null;
  }
  try {
    const r = await refresh(ctx.paths.protocol, { tier, log });
    if (r.owed.length) log(`status refresh ${tier}: write ${r.owed.join(', ')}, then run status-refresh --tier ${tier} --hand ${r.owed.join(',')}`);
    return r;
  } catch (e) {
    log(`status refresh ${tier} failed: ${e.message}`);
    return null;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const opt = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const file = argv[0];
  try {
    if (!file || file.startsWith('--')) throw new Error('usage: status-refresh.mjs <status-protocol.json> --tier T0..T4 [--hand ids] [--no-check] [--no-record] [--dry-run] | --freshness');
    if (argv.includes('--freshness')) {
      const c = await loadProtocol(file);
      const rows = freshness(c, readBlock(fs.readFileSync(c.page, 'utf8'), 'STAMPS'));
      for (const r of rows) console.log(`${r.stale ? (r.hand ? 'OWED ' : 'STALE') : 'ok   '} ${r.id.padEnd(14)} ${r.tier}  stamp ${r.stamp ?? '-'}  last event ${r.last ?? '-'}`);
      process.exitCode = rows.some((r) => r.stale && !(r.hand && r.missing)) ? 1 : 0;
    } else {
      const r = await refresh(file, { tier: opt('tier'), hand: (opt('hand') ?? '').split(',').filter(Boolean), check: !argv.includes('--no-check'), record: !argv.includes('--no-record'), dryRun: argv.includes('--dry-run') });
      process.exitCode = r.checked === false || r.notes.length ? 1 : 0;
    }
  } catch (e) {
    console.error(`status-refresh: ${e.message}`);
    process.exitCode = 2;
  }
}

#!/usr/bin/env node
// Quality evaluation (method/quality.md): turns outputs that already exist (verify records and
// logs, the regression registry, triage and repro tables, customer session reports, real signals,
// perf logs, visual baselines) into a scorecard: every metric is pass, fail, within noise or not
// measured, and the release gate verdict is met, not met or undecided. Product-agnostic: the
// dimensions, metrics, thresholds, noise bands and cadences come from the instance spec
// (`<instance>/quality.json`, schema in method/quality.schema.json); product-specific adapters
// live in the instance (`adapters` in the spec).
//
//   node devloop/kit/evaluate.mjs <instance>/quality.json [--iteration N] [--commit <ref>]
//        [--json]        print the scorecard JSON (with the trend) instead of the table
//        [--out <file>]  also write the scorecard JSON there
//        [--record]      write runs/iter-NN/quality-scorecard.json and record the verdict with the
//                        loop controller (`quality` gate: pass when the gate is met, else fail)
//        [--no-trend]    skip the trend across earlier iterations
//
// Exit code: 0 when the gate is met, 1 when not met or undecided, 2 on an error.
//
// Rules (tests/devloop/quality.spec.ts):
// - status: `higher` passes when value >= threshold, `lower` when value <= threshold, `bool` when
//   value === threshold (default true). Inside the noise band (|value - threshold| < band) a metric
//   is "noise": neither pass nor fail. Veto metrics ignore the band.
// - freshness: per-commit needs a measurement on the evaluated commit (or the same code tree, when
//   the spec names a loop config); per-iteration a measurement of the evaluated iteration (by its
//   folder, its commit or, failing both, its time between iteration tags); per-release one since
//   the last release tag. A stale or missing measurement is "not measured", never a pass.
// - verdict: a failing veto or blocking metric means "not met"; a blocking metric not measured
//   means "not met" (spec `verdict.notMeasured` may say "undecided"); a blocking metric within
//   noise means "undecided"; otherwise "met". Informative metrics never change the verdict.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { iterations as feedbackIterations, panelWeights, runDirOf, sessionsOf } from './feedback-digest.mjs';
import { parseYaml } from './regressions.mjs';

// ---------------------------------------------------------------- small helpers
function git(cwd, args, { raw = false } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) return null;
  return raw ? r.stdout : r.stdout.trim();
}

const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
const round = (v, n = 2) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10 ** n) / 10 ** n : v);
const pad2 = (n) => String(n).padStart(2, '0');
const fill = (p, n) => String(p).replace('{NN}', pad2(n)).replace('{N}', String(n));
const hasIterPlaceholder = (p) => /\{NN?\}/.test(String(p));

/** Markdown tables: [{ heading, header: [..], rows: [[..]] }], cells trimmed (same as status-refresh). */
export function mdTables(src) {
  const out = [];
  let heading = '';
  let cur = null;
  for (const line of String(src).split('\n')) {
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

const plainCell = (s) => String(s ?? '').replace(/\*\*/g, '').replace(/`/g, '').trim();
const firstNumber = (s) => {
  const m = /-?\d+(?:\.\d+)?/.exec(plainCell(s));
  return m ? Number(m[0]) : null;
};

// ---------------------------------------------------------------- judging (pure)
/** pass | fail | noise for a value against a metric and a band (half-width). */
export function classify(value, metric, band = 0) {
  const dir = metric.direction ?? 'higher';
  if (dir === 'bool') return value === (typeof metric.threshold === 'boolean' ? metric.threshold : true) ? 'pass' : 'fail';
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'fail';
  const t = Number(metric.threshold);
  const d = round(dir === 'lower' ? t - value : value - t, 9);
  if (band > 0 && Math.abs(d) < band) return 'noise';
  return d >= 0 ? 'pass' : 'fail';
}

/** The noise band (half-width) of a metric for one measurement: { band, note }. */
export function noiseBand(metric, m = {}) {
  const n = metric.noise ?? { kind: 'none' };
  if (metric.veto) return { band: 0, note: 'veto: noise ignored' };
  if (n.kind === 'fixed') return { band: Number(n.band ?? 0), note: n.why ?? null };
  if (n.kind === 'derived') {
    if (typeof m.se !== 'number') return { band: 0, note: 'derived band: the source gave no standard error' };
    return { band: round((n.k ?? 1) * m.se, 3), note: `${n.k ?? 1} x se ${round(m.se, 3)}${m.seNote ? ` (${m.seNote})` : ''}` };
  }
  return { band: 0, note: n.why ?? null };
}

/**
 * Is a measurement fresh for the metric's cadence? ctx: { iteration, commit, sameCode(a, b),
 * iterationAt(t), releaseSince (ms or null) }. Returns { fresh, reason }.
 */
export function freshnessOf(metric, m, ctx) {
  const cadence = metric.cadence ?? 'per-iteration';
  const onCommit = m.commit && ctx.commit && ctx.sameCode(m.commit, ctx.commit);
  const iterOf = m.iteration ?? (m.at ? ctx.iterationAt(m.at) : null);
  const where = `${m.commit ? `commit ${String(m.commit).slice(0, 9)}` : 'no commit'}, iteration ${iterOf ?? '?'}`;
  if (cadence === 'per-commit') {
    if (onCommit) return { fresh: true };
    return { fresh: false, reason: `stale: measured on ${where}; per-commit needs ${ctx.commit ? String(ctx.commit).slice(0, 9) : 'a commit'}` };
  }
  if (cadence === 'per-iteration') {
    if (onCommit || iterOf === ctx.iteration) return { fresh: true };
    return { fresh: false, reason: `stale: measured on ${where}; per-iteration needs iteration ${ctx.iteration}` };
  }
  if (cadence === 'per-release') {
    if (onCommit) return { fresh: true };
    if (iterOf != null && iterOf > ctx.iteration) return { fresh: false, reason: `stale: measured on ${where}, after iteration ${ctx.iteration}` };
    if (ctx.releaseSince != null && m.at && Date.parse(m.at) < ctx.releaseSince) return { fresh: false, reason: `stale: measured ${m.at}, before the last release` };
    return { fresh: true };
  }
  throw new Error(`metric ${metric.id}: unknown cadence ${cadence}`);
}

/** One metric's result from its measurement (or the reason it has none). */
export function judge(metric, m, ctx) {
  const base = {
    id: metric.id,
    label: metric.label ?? metric.id,
    direction: metric.direction ?? 'higher',
    threshold: metric.threshold ?? (metric.direction === 'bool' ? true : null),
    cadence: metric.cadence ?? 'per-iteration',
    blocking: !!(metric.blocking || metric.veto),
    veto: !!metric.veto,
    format: metric.format,
    gate: metric.gate,
  };
  if (!m || m.missing) return { ...base, status: 'not-measured', value: null, band: null, reason: m?.missing ?? 'no measurement', detail: m?.detail ?? null };
  const fresh = freshnessOf(metric, m, ctx);
  const iterOf = m.iteration ?? (m.at ? ctx.iterationAt(m.at) : null);
  const measured = {
    at: m.at ?? null,
    commit: m.commit ? String(m.commit).slice(0, 9) : null,
    iteration: iterOf,
    ageHours: m.at ? round((ctx.now - Date.parse(m.at)) / 36e5, 1) : null,
    iterationsBehind: iterOf != null ? ctx.iteration - iterOf : null,
    evidence: m.evidence ?? null,
  };
  const { band, note } = noiseBand(metric, m);
  if (!fresh.fresh) return { ...base, status: 'not-measured', value: round(m.value, 3), band, reason: fresh.reason, measured, detail: m.detail ?? null };
  return { ...base, status: classify(m.value, metric, band), value: round(m.value, 3), band, noise: note, measured, detail: m.detail ?? null };
}

/** The gate verdict from metric results: { verdict, reasons }. */
export function verdictOf(results, { notMeasured = 'not-met' } = {}) {
  const reasons = [];
  const blocking = results.filter((r) => r.blocking);
  const say = (r, what) => `${r.veto ? 'veto ' : ''}${r.id} ${what}${r.value != null ? ` (${r.value}${r.threshold != null ? ` vs ${r.direction === 'lower' ? '<=' : r.direction === 'bool' ? '=' : '>='} ${r.threshold}` : ''}${r.band ? ` +/- ${r.band}` : ''})` : ''}${r.reason ? `: ${r.reason}` : ''}`;
  const vetoes = blocking.filter((r) => r.veto && r.status === 'fail');
  const fails = blocking.filter((r) => !r.veto && r.status === 'fail');
  const unmeasured = blocking.filter((r) => r.status === 'not-measured');
  const noisy = blocking.filter((r) => r.status === 'noise');
  for (const r of vetoes) reasons.push(say(r, 'failed'));
  for (const r of fails) reasons.push(say(r, 'failed'));
  for (const r of unmeasured) reasons.push(say(r, 'not measured'));
  for (const r of noisy) reasons.push(say(r, 'within noise'));
  let verdict = 'met';
  if (vetoes.length || fails.length) verdict = 'not-met';
  else if (unmeasured.length) verdict = notMeasured === 'undecided' ? 'undecided' : 'not-met';
  else if (noisy.length) verdict = 'undecided';
  return { verdict, reasons };
}

/** Per-dimension and per-metric trend from scorecards of several iterations. */
export function trendOf(cards) {
  const sorted = [...cards].sort((a, b) => a.iteration - b.iteration);
  const dims = {};
  const metrics = {};
  for (const c of sorted) {
    for (const d of c.dimensions) {
      const count = { iteration: c.iteration, pass: 0, fail: 0, noise: 0, notMeasured: 0, total: d.metrics.length };
      for (const r of d.metrics) {
        count[r.status === 'not-measured' ? 'notMeasured' : r.status]++;
        (metrics[r.id] ??= []).push({ iteration: c.iteration, value: r.value, status: r.status });
      }
      (dims[d.id] ??= { label: d.label, points: [] }).points.push(count);
    }
  }
  return { iterations: sorted.map((c) => c.iteration), verdicts: sorted.map((c) => ({ iteration: c.iteration, verdict: c.verdict, commit: c.commit })), dimensions: dims, metrics };
}

// ---------------------------------------------------------------- context
async function loadLoopSafe(root, file) {
  try {
    const lp = await import('./loop.mjs');
    const ctx = lp.loadLoop({ cwd: root, config: file });
    return { lp, ctx, state: lp.readState(ctx) };
  } catch {
    return null;
  }
}

/** Tags `<prefix>N` -> { n, sha, t } (t: committer time of the tagged commit, ms). */
function iterationTags(root, prefix) {
  const out = {};
  const list = git(root, ['tag', '-l', `${prefix}*`]);
  for (const tag of (list ?? '').split('\n').filter(Boolean)) {
    const n = /^\d+$/.test(tag.slice(prefix.length)) ? Number(tag.slice(prefix.length)) : null;
    if (n == null) continue;
    const sha = git(root, ['rev-parse', '--verify', `${tag}^{commit}`]);
    const t = sha && git(root, ['log', '-1', '--format=%cI', sha]);
    if (sha && t) out[n] = { n, sha, t: Date.parse(t) };
  }
  return out;
}

export async function loadSpec(specPath, { now } = {}) {
  const file = path.resolve(specPath);
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const instDir = path.dirname(file);
  const root = git(instDir, ['rev-parse', '--show-toplevel']) ?? instDir;
  const wt = git(root, ['worktree', 'list', '--porcelain']);
  const mainRoot = wt?.split('\n').find((l) => l.startsWith('worktree '))?.slice('worktree '.length) ?? root;
  const loop = spec.loopConfig ? await loadLoopSafe(root, path.resolve(instDir, spec.loopConfig)) : null;
  const tagPrefix = spec.tagPrefix ?? loop?.ctx.cfg.tagPrefix ?? 'iter-';
  const tags = iterationTags(root, tagPrefix);
  const adapters = { ...builtinAdapters };
  for (const mod of [].concat(spec.adapters ?? [])) {
    const m = await import(pathToFileURL(path.resolve(instDir, mod)).href);
    Object.assign(adapters, m.adapters ?? {});
  }
  const nowMs = now != null ? (typeof now === 'number' ? now : Date.parse(now)) : loop ? loop.ctx.now().getTime() : Date.now();
  return { spec, file, instDir, root, mainRoot, loop, tagPrefix, tags, adapters, now: nowMs };
}

function makeCtx(base, iteration, commitOverride) {
  const { root, loop, tags } = base;
  let commit = null;
  if (commitOverride) commit = git(root, ['rev-parse', '--verify', `${commitOverride}^{commit}`]);
  else if (tags[iteration]) commit = tags[iteration].sha;
  else if (iteration === currentIteration(base)) {
    try {
      commit = loop ? loop.lp.loopTarget(loop.ctx) : git(root, ['rev-parse', 'HEAD']);
    } catch {
      commit = git(root, ['rev-parse', 'HEAD']);
    }
  }
  const trees = new Map();
  const treeOf = (sha) => {
    if (!trees.has(sha)) {
      let t = null;
      try {
        t = loop ? loop.lp.codeTreeOf(loop.ctx, sha) : null;
      } catch {}
      trees.set(sha, t);
    }
    return trees.get(sha);
  };
  const full = (sha) => (sha ? git(root, ['rev-parse', '--verify', '--quiet', `${sha}^{commit}`]) : null);
  const sameCode = (a, b) => {
    const fa = full(a);
    const fb = full(b);
    if (!fa || !fb) return false;
    if (fa === fb) return true;
    const ta = treeOf(fa);
    return ta != null && ta === treeOf(fb);
  };
  const sortedTags = Object.values(tags).sort((a, b) => a.n - b.n);
  const iterationAt = (t) => {
    const ms = typeof t === 'number' ? t : Date.parse(t);
    for (const tg of sortedTags) if (ms <= tg.t) return tg.n;
    return sortedTags.length ? sortedTags.at(-1).n + 1 : null;
  };
  let releaseSince = null;
  const pat = base.spec.release?.tagPattern;
  if (pat && commit) {
    const commitT = Date.parse(git(root, ['log', '-1', '--format=%cI', commit]) ?? '');
    for (const tag of (git(root, ['tag', '-l', pat]) ?? '').split('\n').filter(Boolean)) {
      const t = Date.parse(git(root, ['log', '-1', '--format=%cI', `${tag}^{commit}`]) ?? '');
      if (!Number.isNaN(t) && t <= commitT && (releaseSince == null || t > releaseSince)) releaseSince = t;
    }
  }
  return {
    ...base,
    iteration,
    commit,
    sameCode,
    iterationAt,
    releaseSince,
    state: loop?.state ?? null,
    git: (args, opts) => git(root, args, opts),
    commitTime: (sha) => git(root, ['log', '-1', '--format=%cI', sha]),
    runDir: (n = iteration) => runDirOf(base.instDir, n),
    fileTime: (abs) => fileTime(abs),
    artifact: (rel, opts) => artifact(base, rel, opts),
    cache: base.cache ?? (base.cache = new Map()),
  };
}

const currentIteration = (base) => base.loop?.state?.iteration ?? Math.max(0, ...feedbackIterations(base.instDir));

/** Last commit time of a tracked, unmodified file; else its mtime (ISO). */
function fileTime(abs) {
  const dir = path.dirname(abs);
  const rel = path.basename(abs);
  const dirty = git(dir, ['status', '--porcelain', '--', rel]);
  const logT = git(dir, ['log', '-1', '--format=%cI', '--', rel]);
  if (!dirty && logT) return new Date(logT).toISOString();
  return fs.statSync(abs).mtime.toISOString();
}

/**
 * A verify artifact (log or summary) by path relative to the repository root, looked up in this
 * checkout and the main worktree (the newest wins). The commit comes from the run's summary.json
 * when that summary was written by the same run (within 2 hours after the file).
 */
function artifact(base, rel, { summary = 'summary.json' } = {}) {
  const found = [...new Set([base.root, base.mainRoot])]
    .map((r) => path.resolve(r, rel))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ path: p, mtime: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  if (!found) return null;
  let commit = null;
  const sum = path.join(path.dirname(found.path), summary);
  if (fs.existsSync(sum)) {
    try {
      const s = JSON.parse(fs.readFileSync(sum, 'utf8'));
      const dt = fs.statSync(sum).mtimeMs - found.mtime;
      if (s.commit && dt >= 0 && dt < 2 * 36e5) commit = s.commit;
    } catch {}
  }
  return { path: found.path, at: new Date(found.mtime).toISOString(), commit, text: () => fs.readFileSync(found.path, 'utf8') };
}

const relTo = (root, p) => path.relative(root, p).split(path.sep).join('/');

// ---------------------------------------------------------------- built-in adapters
// An adapter is (args, ctx) => measurement: { value, at, commit, iteration, evidence, detail,
// se, seNote } or { missing: "reason" }. ctx.metric is the metric being measured.

/** Latest record of a controller gate relevant to the evaluated code (same code first). */
function latestRecord(ctx, gate) {
  const recs = (ctx.state?.records ?? []).filter((r) => r.gate === gate).sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  if (!recs.length) return null;
  const same = ctx.commit ? recs.filter((r) => ctx.sameCode(r.commit, ctx.commit)) : [];
  if (same.length) return same.at(-1);
  const before = recs.filter((r) => (r.iteration ?? ctx.iterationAt(r.t)) <= ctx.iteration);
  return before.at(-1) ?? recs.at(-1);
}

export const builtinAdapters = {
  /** Verify gate: the controller's verify record and, for one step, the run's summary.json. */
  verify(args, ctx) {
    const rec = latestRecord(ctx, args.gate ?? 'verify');
    const sum = ctx.artifact(path.join(args.dir ?? '.verify', 'summary.json'));
    let summary = null;
    if (sum) {
      try {
        summary = JSON.parse(sum.text());
      } catch {}
    }
    const fromRecord = (detail) =>
      rec
        ? { value: rec.result === 'pass', at: rec.t, commit: rec.commit, iteration: rec.iteration ?? null, evidence: rec.evidence ?? null, detail: [detail, rec.note].filter(Boolean).join('; ') }
        : null;
    if (!args.step) return fromRecord(`verify ${rec?.result}`) ?? { missing: 'no verify record with the loop controller' };
    const step = summary?.results?.find((r) => r.id === args.step);
    const summaryUsable = step && (!rec || !summary.commit || summary.commit === rec.commit || ctx.sameCode(summary.commit, rec.commit));
    if (summaryUsable && (summary.commit || !rec)) {
      return { value: !!step.ok, at: sum.at, commit: summary.commit ?? null, evidence: relTo(ctx.root, sum.path), detail: `${step.label ?? step.id}: ${step.note || (step.ok ? 'ok' : 'failed')}` };
    }
    if (rec?.steps) {
      if (!rec.steps.includes(args.step)) return { missing: `the latest verify record did not run step ${args.step}` };
      return fromRecord(`step ${args.step} in a ${rec.result} run`);
    }
    if (rec) return fromRecord(`record has no step list (backfilled): the full-run result stands for step ${args.step}`);
    return { missing: `no verify record and no summary with step ${args.step}` };
  },

  /** Regression registry at the evaluated commit: findings, guards, unguarded findings. */
  registry(args, ctx) {
    if (!ctx.commit) return { missing: `no commit for iteration ${ctx.iteration}` };
    const rel = relTo(ctx.root, path.resolve(ctx.instDir, args.file ?? 'regressions.yaml'));
    const src = ctx.git(['show', `${ctx.commit}:${rel}`], { raw: true });
    if (src == null) return { missing: `${rel} does not exist at ${ctx.commit.slice(0, 9)}` };
    const findings = parseYaml(src).findings ?? [];
    const guards = findings.reduce((a, f) => a + (f.guards?.length ?? 0), 0);
    const unguarded = findings.filter((f) => !f.guards?.length).map((f) => f.id);
    const value = { findings: findings.length, guards, unguarded: unguarded.length }[args.metric ?? 'findings'];
    if (value === undefined) return { missing: `unknown registry metric ${args.metric}` };
    return { value, at: ctx.commitTime(ctx.commit), commit: ctx.commit, iteration: ctx.iteration, evidence: rel, detail: `${findings.length} findings, ${guards} guards${unguarded.length ? `, unguarded: ${unguarded.join(', ')}` : ''}` };
  },

  /**
   * A markdown table in an instance file (triage, QA repro, any report): count, share, cell or sum
   * of rows. args: file ("runs/iter-{NN}/triage.md"), heading (regex), header (column names the
   * table must have), where ({ column: regex }), agg (count | share | cell | sum), column, of
   * ({ column: regex } for the share's denominator, default all rows), at ("commit": read the file
   * as it is at the evaluated commit, so a status file such as goals.md is judged as it was then).
   * agg "match" gives true when any row matches `where`.
   */
  table(args, ctx) {
    const abs = path.resolve(ctx.instDir, fill(args.file, ctx.iteration));
    const atCommit = args.at === 'commit';
    let src;
    if (atCommit) {
      if (!ctx.commit) return { missing: `no commit for iteration ${ctx.iteration}` };
      src = ctx.git(['show', `${ctx.commit}:${relTo(ctx.root, abs)}`], { raw: true });
      if (src == null) return { missing: `${relTo(ctx.root, abs)} does not exist at ${ctx.commit.slice(0, 9)}` };
    } else {
      if (!fs.existsSync(abs)) return { missing: `${relTo(ctx.root, abs)} does not exist` };
      src = fs.readFileSync(abs, 'utf8');
    }
    const want = [].concat(args.header ?? []).map((h) => h.toLowerCase());
    const head = args.heading ? new RegExp(args.heading, 'i') : null;
    const t = mdTables(src).filter((x) => (!head || head.test(x.heading)) && want.every((w) => x.header.some((h) => plainCell(h).toLowerCase().includes(w))))[args.index ?? 0];
    if (!t) return { missing: `no table${args.heading ? ` under "${args.heading}"` : ''} with columns ${want.join(', ')} in ${relTo(ctx.root, abs)}` };
    const col = (name) => {
      const n = name.toLowerCase();
      const hs = t.header.map((h) => plainCell(h).toLowerCase());
      const i = hs.indexOf(n);
      return i >= 0 ? i : hs.findIndex((h) => h.includes(n));
    };
    const filt = (rows, where) =>
      rows.filter((r) =>
        Object.entries(where ?? {}).every(([c, re]) => {
          const i = col(c);
          return i >= 0 && new RegExp(re, 'i').test(plainCell(r[i]));
        }),
      );
    const rows = filt(t.rows, args.where);
    const ids = rows.map((r) => plainCell(r[0]).slice(0, 40));
    let value;
    let detail;
    const agg = args.agg ?? 'count';
    if (agg === 'count') {
      value = rows.length;
      detail = `${rows.length} row(s)${ids.length ? `: ${ids.slice(0, 12).join(', ')}${ids.length > 12 ? ', ...' : ''}` : ''}`;
    } else if (agg === 'share') {
      const all = filt(t.rows, args.of);
      if (!all.length) return { missing: 'the share has no rows to divide by' };
      value = rows.length / all.length;
      detail = `${rows.length} of ${all.length}: ${ids.join(', ')}`;
    } else if (agg === 'cell' || agg === 'sum') {
      const i = col(args.column ?? '');
      if (i < 0) return { missing: `no column ${args.column}` };
      const nums = rows.map((r) => firstNumber(r[i])).filter((x) => x != null);
      if (!nums.length) return { missing: `no number in column ${args.column}${args.where ? ` where ${JSON.stringify(args.where)}` : ''}` };
      value = agg === 'cell' ? nums[0] : nums.reduce((a, b) => a + b, 0);
      detail = `${args.column}${args.where ? ` where ${Object.entries(args.where).map(([k, v]) => `${k} ~ ${v}`).join(', ')}` : ''}: ${value}`;
    } else if (agg === 'match') {
      value = rows.length > 0;
      detail = rows.length ? `matched: ${ids.join(', ')}` : `no row where ${Object.entries(args.where ?? {}).map(([k, v]) => `${k} ~ ${v}`).join(', ')}`;
    } else return { missing: `unknown table agg ${agg}` };
    if (atCommit) return { value, at: ctx.commitTime(ctx.commit), commit: ctx.commit, iteration: ctx.iteration, evidence: relTo(ctx.root, abs), detail };
    return { value, at: fileTime(abs), commit: null, iteration: hasIterPlaceholder(args.file) ? ctx.iteration : null, evidence: relTo(ctx.root, abs), detail };
  },

  /**
   * Customer sessions (method/report.schema.json) of the evaluated iteration, weighted by the
   * panel: weighted mean, persona minimum, quitters, completion, task completion, friction count.
   */
  feedback(args, ctx) {
    const all = sessionsOf(ctx.instDir, ctx.iteration);
    if (!all.length) return { missing: `no session reports for iteration ${ctx.iteration}` };
    const weights = panelWeights(ctx.instDir);
    const sessions = args.personas ? all.filter((s) => args.personas.includes(String(s.persona).toLowerCase())) : all;
    const sessDir = path.join(ctx.runDir(), 'sessions');
    const at = fs
      .readdirSync(sessDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => fileTime(path.join(sessDir, f)))
      .sort()
      .at(-1);
    const builds = [...new Set(all.map((s) => s.build).filter(Boolean))];
    const base = { at, commit: null, iteration: ctx.iteration, evidence: relTo(ctx.root, sessDir) };
    const id = (s) => String(s.persona).toLowerCase();
    const score = (s, k) => {
      const v = s.scores?.[k];
      return typeof v === 'object' && v ? v.value : v;
    };
    const metric = args.metric ?? 'weighted';
    if (metric === 'weighted' || metric === 'min') {
      const k = args.key ?? 'recommend';
      const scored = sessions.filter((s) => typeof score(s, k) === 'number');
      if (!scored.length) return { missing: `no session scores ${k}` };
      if (metric === 'min') {
        const lo = Math.min(...scored.map((s) => score(s, k)));
        return { ...base, value: lo, detail: `lowest ${k}: ${scored.filter((s) => score(s, k) === lo).map(id).join(', ')} at ${lo}${builds.length ? `; build ${builds.join(', ')}` : ''}` };
      }
      const w = scored.map((s) => weights[id(s)] ?? 0);
      const useW = w.some((x) => x > 0) ? w : w.map(() => 1);
      const wsum = useW.reduce((a, b) => a + b, 0);
      const value = scored.reduce((a, s, i) => a + useW[i] * score(s, k), 0) / wsum;
      const out = { ...base, value: round(value, 3), detail: `weighted ${k} ${round(value, 2)} over ${scored.length} sessions${builds.length ? `; build ${builds.join(', ')}` : ''}` };
      const noise = ctx.metric?.noise;
      if (noise?.kind === 'derived') {
        const spread = noise.personaSd != null ? { sd: Number(noise.personaSd), note: 'persona sd given in the spec' } : personaRetestSd(ctx, k, noise);
        if (spread) {
          const effective = Math.sqrt(useW.reduce((a, x) => a + x * x, 0)) / wsum;
          out.se = spread.sd * effective;
          out.seNote = `persona sd ${round(spread.sd, 2)} ${spread.note}, sqrt(sum w^2) ${round(effective, 3)}`;
        }
      }
      return out;
    }
    if (metric === 'quitters') {
      const q = sessions.filter(quitOf);
      return { ...base, value: q.length, detail: q.length ? `would quit: ${q.map(id).join(', ')}` : 'nobody would quit' };
    }
    if (metric === 'completed') {
      const who = args.personas ?? [];
      const lines = [];
      let ok = true;
      for (const p of who) {
        const s = all.find((x) => id(x) === p);
        if (!s) return { missing: `no session report for ${p} in iteration ${ctx.iteration}` };
        const end = s.tasks?.end_reached ?? (s.scenarios ?? []).some((x) => x.outcome !== 'abandoned');
        const done = !quitOf(s) && !!end;
        ok &&= done;
        lines.push(`${p} ${done ? 'completed' : quitOf(s) ? 'would quit' : 'did not finish'}`);
      }
      return { ...base, value: ok, detail: lines.join(', ') };
    }
    if (metric === 'task') {
      const name = args.task;
      const withTask = sessions.filter((s) => s.tasks && typeof s.tasks[name] === 'boolean');
      if (!withTask.length) return { missing: `no session report carries tasks.${name}` };
      const yes = withTask.filter((s) => s.tasks[name]);
      return { ...base, value: yes.length / withTask.length, detail: `${yes.length} of ${withTask.length}: ${yes.map(id).join(', ')}` };
    }
    if (metric === 'friction') {
      const kinds = [].concat(args.kind ?? []);
      const rows = sessions.flatMap((s) => (s.friction ?? []).filter((f) => !kinds.length || kinds.includes(f.kind)).map(() => id(s)));
      const per = {};
      for (const p of rows) per[p] = (per[p] ?? 0) + 1;
      return { ...base, value: rows.length, detail: `${rows.length} ${kinds.join('/') || 'friction'} rows: ${Object.entries(per).map(([p, n]) => `${p} ${n}`).join(', ')}` };
    }
    return { missing: `unknown feedback metric ${metric}` };
  },

  /**
   * Real signals (owner and real players) at the evaluated commit: open ones at or above a
   * severity. A signal file says "Severity: S1..S4" and "Status: open|addressed|closed"; a file
   * without a status, or open without a severity, is unclassified and the metric is not measured.
   */
  'real-signals'(args, ctx) {
    if (!ctx.commit) return { missing: `no commit for iteration ${ctx.iteration}` };
    const dirRel = relTo(ctx.root, path.resolve(ctx.instDir, args.dir ?? 'real-signals'));
    const names = (ctx.git(['ls-tree', '-r', '--name-only', ctx.commit, '--', dirRel]) ?? '').split('\n').filter((f) => /\/RS-\d+[^/]*\.md$/.test(f) && !/RS-0+-template/.test(f));
    if (!names.length) return { value: 0, at: ctx.commitTime(ctx.commit), commit: ctx.commit, iteration: ctx.iteration, evidence: dirRel, detail: 'no real signals' };
    const max = Number(String(args.minSeverity ?? 'S2').slice(1));
    const closed = new RegExp(`^(${(args.closed ?? ['addressed', 'closed', 'fixed', 'resolved', 'done', 'held']).join('|')})`, 'i');
    const open = [];
    const unclassified = [];
    for (const f of names) {
      const src = ctx.git(['show', `${ctx.commit}:${f}`], { raw: true }) ?? '';
      const id = /RS-\d+/.exec(path.basename(f))[0];
      const sev = /^[\s>*_-]*severity[*_\s]*:[*_\s]*(S[1-4])/im.exec(src)?.[1];
      const status = /^[\s>*_-]*status[*_\s]*:[*_\s]*([a-z-]+)/im.exec(src)?.[1];
      if (status && closed.test(status)) continue;
      if (!status || !sev) {
        unclassified.push(id);
        continue;
      }
      if (Number(sev.slice(1)) <= max) open.push(`${id} ${sev}`);
    }
    if (unclassified.length) return { missing: `${unclassified.length} real signal(s) unclassified at ${ctx.commit.slice(0, 9)} (${unclassified.join(', ')}): add "Severity: S1-S4" and "Status: open|addressed" lines`, detail: open.length ? `open: ${open.join(', ')}` : null };
    return { value: open.length, at: ctx.commitTime(ctx.commit), commit: ctx.commit, iteration: ctx.iteration, evidence: dirRel, detail: open.length ? `open at ${args.minSeverity ?? 'S2'} or worse: ${open.join(', ')}` : `none open at ${args.minSeverity ?? 'S2'} or worse (${names.length} signals)` };
  },

  /** A vitest log (e.g. the perf run in .verify/test.log): failed or passed tests, timings in the detail. */
  'vitest-log'(args, ctx) {
    const art = ctx.artifact(args.log ?? '.verify/test.log');
    if (!art) return { missing: `${args.log ?? '.verify/test.log'} not found (run the verify gate)` };
    const text = stripAnsi(art.text());
    const runs = text.split(/^\s*RUN\s+v\d[^\n]*$/m).slice(1);
    const run = args.file ? runs.find((r) => r.includes(args.file)) : runs.at(-1);
    if (!run) return { missing: `no vitest run${args.file ? ` with ${args.file}` : ''} in ${relTo(ctx.root, art.path)}` };
    const m = /Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(?:(\d+)\s+passed)?/.exec(run);
    const failed = Number(m?.[1] ?? 0);
    const passed = Number(m?.[2] ?? 0);
    const timings = [...run.matchAll(/^([^\n|>]+?):\s+([\d.]+)\s*ms\s*$/gm)].map((x) => `${x[1].trim()} ${x[2]} ms`);
    const value = (args.metric ?? 'failed') === 'passed' ? passed : failed;
    return { value, at: art.at, commit: art.commit, iteration: null, evidence: relTo(ctx.root, art.path), detail: `${passed} passed, ${failed} failed${timings.length ? `; ${timings.join('; ')}` : ''}${art.commit ? '' : '; commit unknown (no summary from the same run)'}` };
  },

  /** Visual regression: baseline count at the evaluated commit, or failures of the last run. */
  visual(args, ctx) {
    const dir = args.dir ?? 'tests/visual/__screenshots__';
    if ((args.metric ?? 'baselines') === 'baselines') {
      if (!ctx.commit) return { missing: `no commit for iteration ${ctx.iteration}` };
      const files = (ctx.git(['ls-tree', '-r', '--name-only', ctx.commit, '--', dir]) ?? '').split('\n').filter((f) => /\.png$/i.test(f));
      return { value: files.length, at: ctx.commitTime(ctx.commit), commit: ctx.commit, iteration: ctx.iteration, evidence: dir, detail: `${files.length} baselines in ${dir}` };
    }
    const sum = ctx.artifact(path.join(args.verifyDir ?? '.verify', 'summary.json'));
    let step = null;
    try {
      step = sum ? JSON.parse(sum.text()).results?.find((r) => r.id === (args.step ?? 'visual')) : null;
    } catch {}
    const log = ctx.artifact(path.join(args.verifyDir ?? '.verify', 'visual.log'));
    const src = step ? step.note ?? '' : log ? stripAnsi(log.text()) : null;
    if (src == null) return { missing: 'no visual run found (.verify summary or visual.log)' };
    const failed = Number(/(\d+)\s+failed/.exec(src)?.[1] ?? (step && !step.ok ? 1 : 0));
    const art = step ? sum : log;
    return { value: failed, at: art.at, commit: art.commit, iteration: null, evidence: relTo(ctx.root, art.path), detail: String(src).split('\n').filter((l) => /passed|failed|flaky/.test(l)).slice(-3).join('; ') || src.slice(0, 120) };
  },
};

function quitOf(s) {
  return !!(s.quit_point && !/^\s*(none|null|n\/a|no)\b/i.test(s.quit_point));
}

/**
 * Persona-level score noise from retests: the spread of each persona's score change between
 * consecutive iterations (sd of the changes / sqrt 2). Real change inflates it, so it errs wide.
 * noise: { since, until } bound the iterations used (default: all up to the evaluated one).
 */
export function personaRetestSd(ctx, key, noise = {}) {
  const its = feedbackIterations(ctx.instDir).filter((n) => n >= (noise.since ?? 0) && n <= (noise.until ?? ctx.iteration));
  const byIter = its.map((n) => {
    const m = {};
    for (const s of sessionsOf(ctx.instDir, n)) {
      const v = s.scores?.[key];
      const x = typeof v === 'object' && v ? v.value : v;
      if (typeof x === 'number') m[String(s.persona).toLowerCase()] = x;
    }
    return m;
  });
  const diffs = [];
  for (let i = 1; i < byIter.length; i++) for (const p of Object.keys(byIter[i])) if (p in byIter[i - 1]) diffs.push(byIter[i][p] - byIter[i - 1][p]);
  if (diffs.length < 3) return null;
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / (diffs.length - 1));
  return { sd: sd / Math.SQRT2, note: `from ${diffs.length} retest pairs (iterations ${its[0]}-${its.at(-1)})` };
}

// ---------------------------------------------------------------- evaluation
/** The scorecard of one iteration (no trend). */
export async function scorecard(base, { iteration, commit } = {}) {
  const n = iteration ?? currentIteration(base);
  const ctx = makeCtx(base, n, commit);
  const dimensions = [];
  for (const d of base.spec.dimensions ?? []) {
    const metrics = [];
    for (const metric of d.metrics ?? []) {
      const src = metric.source ?? {};
      const fn = base.adapters[src.adapter];
      let m;
      if (!fn) m = { missing: `unknown adapter ${src.adapter}` };
      else {
        try {
          m = await fn(src.args ?? {}, { ...ctx, metric });
        } catch (e) {
          m = { missing: `adapter ${src.adapter} failed: ${e.message}` };
        }
      }
      metrics.push(judge(metric, m, ctx));
    }
    dimensions.push({ id: d.id, label: d.label ?? d.id, metrics });
  }
  const results = dimensions.flatMap((d) => d.metrics);
  const { verdict, reasons } = verdictOf(results, base.spec.verdict ?? {});
  const count = (st) => results.filter((r) => r.status === st).length;
  return {
    product: base.spec.product ?? null,
    spec: relTo(base.root, base.file),
    iteration: n,
    commit: ctx.commit,
    evaluatedAt: new Date(base.now).toISOString(),
    verdict,
    reasons,
    counts: { pass: count('pass'), fail: count('fail'), noise: count('noise'), notMeasured: count('not-measured'), blocking: results.filter((r) => r.blocking).length, total: results.length },
    dimensions,
  };
}

/** Scorecard of one iteration plus the trend over earlier ones. */
export async function evaluate(specPath, { iteration, commit, now, trend = true, from } = {}) {
  const base = await loadSpec(specPath, { now });
  const card = await scorecard(base, { iteration, commit });
  if (trend) {
    const start = from ?? base.spec.trend?.from ?? 0;
    const cards = [];
    for (let n = start; n < card.iteration; n++) cards.push(await scorecard(base, { iteration: n }));
    cards.push(card);
    card.trend = trendOf(cards);
  }
  return card;
}

/** Store the verdict with the loop controller (gate `quality` by default). */
export async function recordVerdict(specPath, card, { out, force = false } = {}) {
  const base = await loadSpec(specPath);
  if (!base.loop) throw new Error('--record needs `loopConfig` in the quality spec');
  const loopIter = base.loop.state.iteration;
  if (!force && loopIter != null && card.iteration !== loopIter) throw new Error(`the scorecard is for iteration ${card.iteration} but the loop is in iteration ${loopIter} (pass --force to record anyway)`);
  const file = out ?? path.join(runDirOf(base.instDir, card.iteration), 'quality-scorecard.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(card, null, 2)}\n`);
  const rec = base.loop.lp.record(base.loop.ctx, {
    gate: base.spec.gate ?? 'quality',
    result: card.verdict === 'met' ? 'pass' : 'fail',
    commit: card.commit ?? 'HEAD',
    evidence: file,
    note: `quality ${card.verdict} (iteration ${card.iteration}): ${card.counts.pass} pass, ${card.counts.fail} fail, ${card.counts.noise} within noise, ${card.counts.notMeasured} not measured`,
    extra: { verdict: card.verdict, reasons: card.reasons.slice(0, 20), scoredIteration: card.iteration },
  });
  return { file, rec };
}

// ---------------------------------------------------------------- output
const show = (r) => {
  if (r.value == null) return '-';
  if (typeof r.value === 'boolean') return r.value ? 'yes' : 'no';
  if (r.format === 'percent') return `${Math.round(r.value * 100)}%`;
  return String(round(r.value, 2));
};
const showThreshold = (r) => {
  if (r.direction === 'bool') return `= ${r.threshold === false ? 'no' : 'yes'}`;
  const t = r.format === 'percent' ? `${Math.round(r.threshold * 100)}%` : r.threshold;
  return `${r.direction === 'lower' ? '<=' : '>='} ${t}${r.band ? ` +/- ${r.format === 'percent' ? `${Math.round(r.band * 100)}%` : r.band}` : ''}`;
};
const STATUS = { pass: 'pass ', fail: 'FAIL ', noise: 'noise', 'not-measured': 'n/m  ' };

export function formatCard(card) {
  const lines = [];
  lines.push(`${card.product ?? 'Quality'} scorecard, iteration ${card.iteration} at ${card.commit ? card.commit.slice(0, 9) : '(no commit)'} (${card.evaluatedAt})`);
  lines.push(`Verdict: ${card.verdict.toUpperCase().replace('-', ' ')}  (${card.counts.pass} pass, ${card.counts.fail} fail, ${card.counts.noise} within noise, ${card.counts.notMeasured} not measured; ${card.counts.blocking} blocking of ${card.counts.total})`);
  for (const r of card.reasons) lines.push(`  - ${r}`);
  for (const d of card.dimensions) {
    lines.push('', d.label);
    for (const r of d.metrics) {
      const tag = r.veto ? 'veto ' : r.blocking ? 'block' : 'info ';
      const when = r.measured ? `${r.measured.commit ?? `it ${r.measured.iteration ?? '?'}`}${r.measured.ageHours != null ? ` ${r.measured.ageHours}h` : ''}` : '';
      lines.push(`  ${STATUS[r.status]} ${tag} ${r.label.padEnd(44).slice(0, 44)} ${show(r).padStart(6)}  ${showThreshold(r).padEnd(16)} ${r.cadence.padEnd(13)} ${when}`);
      const why = r.reason ?? r.detail;
      if (why) lines.push(`         ${String(why).slice(0, 160)}`);
    }
  }
  if (card.trend) {
    lines.push('', `Trend (pass/fail/noise/not measured), iterations ${card.trend.iterations.join(', ')}`);
    lines.push(`  ${'verdict'.padEnd(26)} ${card.trend.verdicts.map((v) => v.verdict.padEnd(12)).join(' ')}`);
    for (const d of Object.values(card.trend.dimensions)) lines.push(`  ${d.label.padEnd(26).slice(0, 26)} ${d.points.map((p) => `${p.pass}/${p.fail}/${p.noise}/${p.notMeasured}`.padEnd(12)).join(' ')}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------- CLI
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const opt = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    const spec = argv[0];
    if (!spec || spec.startsWith('--')) throw new Error('usage: evaluate.mjs <instance>/quality.json [--iteration N] [--commit ref] [--json] [--out file] [--record] [--no-trend]');
    const card = await evaluate(spec, { iteration: opt('iteration') != null ? Number(opt('iteration')) : undefined, commit: opt('commit'), trend: !argv.includes('--no-trend') });
    if (opt('out')) fs.writeFileSync(opt('out'), `${JSON.stringify(card, null, 2)}\n`);
    console.log(argv.includes('--json') ? JSON.stringify(card, null, 2) : formatCard(card));
    if (argv.includes('--record')) {
      const { file, rec } = await recordVerdict(spec, card, { force: argv.includes('--force') });
      console.error(`loop: recorded ${rec.gate} ${rec.result} (${card.verdict}) on ${rec.commit.slice(0, 9)}, evidence ${path.relative(process.cwd(), file)}`);
    }
    process.exitCode = card.verdict === 'met' ? 0 : 1;
  } catch (e) {
    console.error(`evaluate: ${e.message}`);
    process.exitCode = 2;
  }
}

// Stage progress, ETA and consumption estimates for an iterative development loop, learned
// from the loop's own history. Product-agnostic: everything specific lives in the instance
// config and its stage log.
//
//   node devloop/kit/progress.mjs <instance>/progress/config.json [event] [options]
//
// Events (append one line to the stage log, then estimate):
//   --start <Stage> [--iteration N] [--size F]   start a stage (closes any open stage of that iteration);
//                                                 iteration defaults to the current one, or the next one for the first stage
//   --end [Stage]                                end the open stage (default: the current one)
//   --skip <Stage>                               the stage is not run in this iteration
//   --total N [--stage S]                        declare N units of work for the current (or named) stage
//   --done N [--stage S] --note "..."             N more units are finished
//   --pause / --resume                            the whole loop is idle (machine off, usage limit, waiting)
//   --event '<json>'                              append a raw event
//   common: --at <ISO time> (backdate), --note "...", --iteration N
// Output:
//   (none)                       print the estimate
//   --json                       print the estimate as JSON
//   --inject <page.html> MARKER  write `const MARKER = {...}` between /*MARKER:START*/ and /*MARKER:END*/
//   --no-record                  do not append this estimate to estimates.jsonl
//   --no-usage                   skip token consumption (faster)
//
// Config (see devloop/templates/progress-config.json):
// { "stages": ["Plan", ...], "log": "stages.jsonl", "estimates": "estimates.jsonl",
//   "usageRegistry": "../usage/registry.json",
//   "plan": { "<iteration>": { "<Stage>": { "units": 9, "size": 1, "skip": false, "note": "..." } } } }
//
// Stage log lines: {t, iteration, stage, kind: start|end|skip|unit-total|unit-done|pause|resume, units?, size?, note?}
// Durations are active time: global pause..resume intervals are subtracted.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const cfgPath = path.resolve(args[0] ?? '');
if (!args[0] || !fs.existsSync(cfgPath)) {
  console.error('usage: node devloop/kit/progress.mjs <instance>/progress/config.json [--start S|--end|--total N|--done N|...]');
  process.exit(2);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const dir = path.dirname(cfgPath);
const STAGES = cfg.stages;
const logPath = path.join(dir, cfg.log ?? 'stages.jsonl');
const estPath = path.join(dir, cfg.estimates ?? 'estimates.jsonl');
const CAP = cfg.progressCap ?? 0.95;
const BLEND_K = cfg.blendUnits ?? 2; // weight of observed rate = done / (done + K)
const ERR_FLOOR = cfg.errorFloorMinutes ?? 5; // very short stages (a 1-minute gate) would dominate a percentage error
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(name);

const readJsonl = (file) =>
  fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
    : [];
const ms = (t) => Date.parse(t);
const MIN = 60000;

// ---------------------------------------------------------------- state from the log
function build(events, nowT) {
  const evs = [...events].sort((a, b) => ms(a.t) - ms(b.t));
  const pauses = [];
  let open = null;
  for (const e of evs) {
    if (e.kind === 'pause' && !open) open = ms(e.t);
    if (e.kind === 'resume' && open != null) {
      pauses.push([open, ms(e.t)]);
      open = null;
    }
  }
  if (open != null) pauses.push([open, nowT]);
  const active = (a, b) => {
    let d = b - a;
    for (const [p, q] of pauses) d -= Math.max(0, Math.min(b, q) - Math.max(a, p));
    return Math.max(0, d);
  };
  const runs = new Map(); // "iter|stage" -> run
  const key = (i, s) => `${i}|${s}`;
  const get = (i, s) => {
    const k = key(i, s);
    if (!runs.has(k)) runs.set(k, { iteration: i, stage: s, start: null, end: null, skip: false, total: null, done: 0, size: null, notes: [] });
    return runs.get(k);
  };
  for (const e of evs) {
    if (e.kind === 'pause' || e.kind === 'resume') continue;
    const r = get(Number(e.iteration), e.stage);
    if (e.kind === 'start') {
      r.start = ms(e.t);
      if (e.size != null) r.size = e.size;
    } else if (e.kind === 'end') r.end = ms(e.t);
    else if (e.kind === 'skip') r.skip = true;
    else if (e.kind === 'unit-total') r.total = e.units;
    else if (e.kind === 'unit-done') r.done += e.units ?? 1;
    if (e.note && e.note !== 'backfilled') r.notes.push(e.note);
    if (e.note === 'backfilled') r.backfilled = true;
  }
  for (const r of runs.values()) {
    if (r.start != null) r.activeMin = active(r.start, r.end ?? nowT) / MIN;
  }
  return { runs, pauses, active, paused: open != null };
}

const quantile = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const p = (s.length - 1) * q;
  const lo = Math.floor(p);
  const hi = Math.ceil(p);
  return s[lo] + (s[hi] - s[lo]) * (p - lo);
};
const median = (xs) => quantile(xs, 0.5);

// History of one stage, optionally only from iterations before `before`.
function stageHistory(runs, stage, before = Infinity) {
  const done = [...runs.values()].filter((r) => r.stage === stage && !r.skip && r.start != null && r.end != null && r.iteration < before);
  const mins = done.map((r) => r.activeMin);
  const units = done.filter((r) => r.total).map((r) => r.total);
  const toks = done.filter((r) => r.tokens != null).map((r) => r.tokens);
  return {
    n: mins.length,
    median: median(mins),
    p25: quantile(mins, 0.25),
    p75: quantile(mins, 0.75),
    units: median(units),
    tokens: median(toks),
    tokensP25: quantile(toks, 0.25),
    tokensP75: quantile(toks, 0.75),
  };
}

// Spread when history is thin: p25..p75 needs at least 3 points to mean something.
function range(h, value) {
  if (value == null) return [null, null];
  if (h.n >= 3 && h.median > 0) return [value * (h.p25 / h.median), value * (h.p75 / h.median)];
  return [value * 0.6, value * 1.6];
}

// ---------------------------------------------------------------- tokens by time window
function attachTokens(runs, nowT) {
  if (has('--no-usage') || !cfg.usageRegistry) return null;
  const reg = path.resolve(dir, cfg.usageRegistry);
  if (!fs.existsSync(reg)) return null;
  const ledger = path.join(path.dirname(fileURLToPath(import.meta.url)), 'usage-ledger.mjs');
  let usage;
  try {
    usage = JSON.parse(execFileSync(process.execPath, [ledger, reg, '--json', '--bucket', '1'], { maxBuffer: 1 << 28 }).toString());
  } catch (e) {
    console.error(`usage ledger failed, continuing without tokens: ${e.message.split('\n')[0]}`);
    return null;
  }
  const windows = [...runs.values()].filter((r) => r.start != null && !r.skip);
  for (const r of windows) r.tokens = 0;
  let unassigned = 0;
  for (const b of usage.timeline) {
    const t = ms(b.hour);
    const w = Object.values(b.groups).reduce((a, c) => a + c, 0);
    const hit = windows.filter((r) => t >= Math.floor(r.start / MIN) * MIN && t < (r.end ?? nowT + MIN));
    if (!hit.length) unassigned += w;
    for (const r of hit) r.tokens += w / hit.length;
  }
  for (const r of windows) r.tokens = Math.round(r.tokens);
  return { loopWeighted: usage.loop.weighted, unassigned: Math.round(unassigned) };
}

// ---------------------------------------------------------------- estimator
function estimate(runs, nowT, focusIter) {
  const plan = cfg.plan?.[String(focusIter)] ?? {};
  const rows = [];
  let remaining = 0;
  let low = 0;
  let high = 0;
  let expTokens = 0;
  let current = null;
  for (const stage of STAGES) {
    const r = runs.get(`${focusIter}|${stage}`);
    const h = stageHistory(runs, stage, focusIter);
    const p = plan[stage] ?? {};
    const row = { stage, n: h.n, histMin: h.median, note: [...(r?.notes ?? []), p.note].filter(Boolean).join('; ') || undefined };
    if (r?.skip || p.skip) {
      rows.push({ ...row, status: 'skipped' });
      continue;
    }
    if (r?.start != null && r.end != null) {
      rows.push({ ...row, status: 'done', actualMin: r.activeMin, tokens: r.tokens, startT: new Date(r.start).toISOString(), endT: new Date(r.end).toISOString(), units: r.total ? { done: r.done, total: r.total } : undefined });
      continue;
    }
    // size factor: declared on start or in the plan, else planned units vs typical units
    const units = r?.total ?? p.units ?? null;
    const size = r?.size ?? p.size ?? (units && h.units ? units / h.units : 1);
    const typical = h.median != null ? h.median * size : null;
    if (r?.start != null) {
      // the current stage
      const elapsed = r.activeMin;
      let progress;
      let eta;
      let basis;
      if (r.total) {
        const left = Math.max(0, r.total - r.done);
        progress = Math.min(1, r.done / r.total);
        // a stage already longer than usual is assumed to be a larger one: scale by the time spent
        const histLeft = typical != null ? Math.max(typical, elapsed) * (left / r.total) : null;
        const w = r.done / (r.done + BLEND_K);
        const rateLeft = r.done > 0 ? left * (elapsed / r.done) : null;
        if (rateLeft != null && histLeft != null) eta = w * rateLeft + (1 - w) * histLeft;
        else eta = rateLeft ?? histLeft;
        basis = r.done > 0 ? (histLeft != null ? 'units + history' : 'units') : histLeft != null ? 'history (no unit done yet)' : 'none';
        if (left === 0) eta = 0;
      } else if (typical != null) {
        progress = Math.min(CAP, elapsed / typical);
        const p75 = (h.p75 ?? typical) * size;
        eta = Math.max(typical - elapsed, p75 - elapsed, 0.1 * elapsed);
        basis = 'elapsed vs history';
      } else {
        progress = null;
        eta = null;
        basis = 'none';
      }
      const [lo, hi] = range(h, eta);
      const tokLeft = h.tokens != null ? h.tokens * size * (1 - (progress ?? 0)) : null;
      current = stage;
      rows.push({ ...row, status: 'now', startT: new Date(r.start).toISOString(), elapsedMin: elapsed, progress, etaMin: eta, lowMin: lo, highMin: hi, basis, size, units: r.total ? { done: r.done, total: r.total } : units ? { done: 0, total: units } : undefined, tokens: r.tokens, expTokens: tokLeft == null ? null : Math.round(tokLeft) });
      remaining += eta ?? 0;
      low += lo ?? 0;
      high += hi ?? 0;
      expTokens += tokLeft ?? 0;
      continue;
    }
    // a later stage
    const [lo, hi] = h.n ? [(h.n >= 3 ? h.p25 : h.median * 0.6) * size, (h.n >= 3 ? h.p75 : h.median * 1.6) * size] : [null, null];
    const tok = h.tokens != null ? h.tokens * size : null;
    rows.push({ ...row, status: 'next', etaMin: typical, lowMin: lo, highMin: hi, size, units: units ? { done: 0, total: units } : undefined, expTokens: tok == null ? null : Math.round(tok), expTokensLow: h.tokensP25 != null ? Math.round(h.tokensP25 * size) : null, expTokensHigh: h.tokensP75 != null ? Math.round(h.tokensP75 * size) : null });
    remaining += typical ?? 0;
    low += lo ?? 0;
    high += hi ?? 0;
    expTokens += tok ?? 0;
  }
  // cumulative ETA (finish time of each stage)
  let acc = 0;
  let accLo = 0;
  let accHi = 0;
  for (const row of rows) {
    if (row.status !== 'now' && row.status !== 'next') continue;
    acc += row.etaMin ?? 0;
    accLo += row.lowMin ?? 0;
    accHi += row.highMin ?? 0;
    row.finishT = new Date(nowT + acc * MIN).toISOString();
    row.finishLowT = new Date(nowT + accLo * MIN).toISOString();
    row.finishHighT = new Date(nowT + accHi * MIN).toISOString();
  }
  return { rows, current, iteration: { min: remaining, low, high, finishT: new Date(nowT + remaining * MIN).toISOString(), finishLowT: new Date(nowT + low * MIN).toISOString(), finishHighT: new Date(nowT + high * MIN).toISOString(), expTokens: Math.round(expTokens) } };
}

// Whole-iteration durations, to estimate the next iteration.
function iterationTotals(runs) {
  const by = new Map();
  for (const r of runs.values()) {
    if (r.start == null || r.end == null || r.skip) continue;
    by.set(r.iteration, (by.get(r.iteration) ?? 0) + r.activeMin);
  }
  return by;
}

// ---------------------------------------------------------------- accuracy
// Every finished stage is compared with the first estimate made for it: a live snapshot from
// estimates.jsonl when one exists, else a backtest (what the estimator would have said from the
// iterations before it). Error = |estimated - actual| / actual.
function accuracy(runs, snapshots) {
  const rows = [];
  const done = [...runs.values()].filter((r) => !r.skip && r.start != null && r.end != null).sort((a, b) => a.iteration - b.iteration || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
  for (const r of done) {
    let est = null;
    let source = null;
    let at = null;
    for (const s of snapshots) {
      if (s.iteration !== r.iteration) continue;
      const row = s.rows?.find((x) => x.stage === r.stage);
      if (!row || row.etaMin == null) continue;
      if (row.status === 'next') est = row.etaMin;
      else if (row.status === 'now') est = (row.elapsedMin ?? 0) + row.etaMin;
      else continue;
      source = 'live';
      at = s.t;
      break;
    }
    if (est == null) {
      const h = stageHistory(runs, r.stage, r.iteration);
      if (h.median != null) {
        const p = cfg.plan?.[String(r.iteration)]?.[r.stage] ?? {};
        const size = r.size ?? p.size ?? (r.total && h.units ? r.total / h.units : 1);
        est = h.median * size;
        source = 'backtest';
      }
    }
    if (est == null || !(r.activeMin > 0)) continue;
    rows.push({ iteration: r.iteration, stage: r.stage, estMin: est, actualMin: r.activeMin, errPct: (100 * Math.abs(est - r.activeMin)) / Math.max(r.activeMin, ERR_FLOOR), source, at });
  }
  const group = (keyFn) => {
    const m = new Map();
    for (const x of rows) {
      const k = keyFn(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x.errPct);
    }
    return [...m.entries()].map(([k, errs]) => ({ key: k, mdape: median(errs), n: errs.length }));
  };
  return { rows, byStage: group((x) => x.stage).sort((a, b) => STAGES.indexOf(a.key) - STAGES.indexOf(b.key)), byIteration: group((x) => x.iteration).sort((a, b) => a.key - b.key), overall: median(rows.map((x) => x.errPct)) };
}

// ---------------------------------------------------------------- events
const nowArg = opt('--at');
const eventT = nowArg ? new Date(nowArg).toISOString() : new Date().toISOString();
const events = readJsonl(logPath);
const pre = build(events, Date.now());
const openRuns = () => [...pre.runs.values()].filter((r) => r.start != null && r.end == null && !r.skip).sort((a, b) => a.start - b.start);
const maxIter = Math.max(-1, ...[...pre.runs.values()].map((r) => r.iteration));
const focus = () => {
  const o = openRuns();
  if (o.length) return Math.min(...o.map((r) => r.iteration));
  return maxIter;
};
const toAppend = [];
const note = opt('--note');
const withNote = (e) => (note ? { ...e, note } : e);
const stageArg = (s) => {
  const hit = STAGES.find((x) => x.toLowerCase() === String(s).toLowerCase());
  if (!hit) throw new Error(`unknown stage "${s}"; stages: ${STAGES.join(', ')}`);
  return hit;
};
const iterArg = opt('--iteration');
const currentOf = (iter) => openRuns().filter((r) => r.iteration === iter).pop();

if (has('--start')) {
  const stage = stageArg(opt('--start'));
  const iteration = iterArg != null ? Number(iterArg) : stage === STAGES[0] ? maxIter + 1 : focus();
  for (const r of openRuns().filter((x) => x.iteration === iteration)) toAppend.push({ t: eventT, iteration, stage: r.stage, kind: 'end' });
  const e = { t: eventT, iteration, stage, kind: 'start' };
  if (opt('--size')) e.size = Number(opt('--size'));
  toAppend.push(withNote(e));
  if (opt('--total')) toAppend.push({ t: eventT, iteration, stage, kind: 'unit-total', units: Number(opt('--total')) });
} else if (has('--end')) {
  const v = opt('--end');
  const iteration = iterArg != null ? Number(iterArg) : focus();
  const stage = v && !v.startsWith('--') ? stageArg(v) : currentOf(iteration)?.stage;
  if (!stage) throw new Error('no open stage to end');
  toAppend.push(withNote({ t: eventT, iteration, stage, kind: 'end' }));
} else if (has('--skip')) {
  const iteration = iterArg != null ? Number(iterArg) : focus();
  toAppend.push(withNote({ t: eventT, iteration, stage: stageArg(opt('--skip')), kind: 'skip' }));
} else if (has('--total') || has('--done')) {
  const iteration = iterArg != null ? Number(iterArg) : focus();
  const stage = opt('--stage') ? stageArg(opt('--stage')) : currentOf(iteration)?.stage;
  if (!stage) throw new Error('no open stage; pass --stage');
  if (has('--total')) toAppend.push(withNote({ t: eventT, iteration, stage, kind: 'unit-total', units: Number(opt('--total')) }));
  if (has('--done')) toAppend.push(withNote({ t: eventT, iteration, stage, kind: 'unit-done', units: Number(opt('--done') ?? 1) }));
} else if (has('--pause')) toAppend.push(withNote({ t: eventT, kind: 'pause' }));
else if (has('--resume')) toAppend.push(withNote({ t: eventT, kind: 'resume' }));
else if (has('--event')) toAppend.push({ t: eventT, ...JSON.parse(opt('--event')) });

if (toAppend.length) {
  fs.appendFileSync(logPath, toAppend.map((e) => JSON.stringify(e)).join('\n') + '\n');
  for (const e of toAppend) console.log(`logged ${e.kind}${e.stage ? ` ${e.stage}` : ''}${e.iteration != null ? ` (iteration ${e.iteration})` : ''}${e.units != null ? ` units ${e.units}` : ''}`);
}

// ---------------------------------------------------------------- estimate
const nowT = Date.now();
const all = readJsonl(logPath);
const st = build(all, nowT);
const usage = attachTokens(st.runs, nowT);
const iterOpen = [...st.runs.values()].filter((r) => r.start != null && r.end == null && !r.skip);
const focusIter = iterOpen.length ? Math.min(...iterOpen.map((r) => r.iteration)) : Math.max(...[...st.runs.values()].map((r) => r.iteration));
const est = estimate(st.runs, nowT, focusIter);
const totals = iterationTotals(st.runs);
const pastTotals = [...totals.entries()].filter(([i]) => i < focusIter && i > 0).map(([, v]) => v); // iteration 0 is a baseline, not a full iteration
const snapshots = readJsonl(estPath);
const acc = accuracy(st.runs, snapshots);

const history = [...st.runs.values()]
  .filter((r) => r.start != null || r.skip)
  .sort((a, b) => a.iteration - b.iteration || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage))
  .map((r) => ({ iteration: r.iteration, stage: r.stage, skip: r.skip || undefined, min: r.end != null ? Math.round(r.activeMin) : null, tokens: r.tokens, units: r.total ?? undefined, backfilled: r.backfilled || undefined }));

const out = {
  generated: new Date(nowT).toISOString(),
  stages: STAGES,
  iteration: focusIter,
  current: est.current,
  paused: st.paused,
  rows: est.rows,
  iterationEta: est.iteration,
  nextIteration: pastTotals.length ? { min: median(pastTotals), low: quantile(pastTotals, 0.25), high: quantile(pastTotals, 0.75), n: pastTotals.length } : null,
  history,
  accuracy: acc,
  usage,
  snapshots: snapshots.length,
};

if (!has('--no-record')) {
  const snap = { t: out.generated, iteration: focusIter, stage: est.current, rows: est.rows.filter((r) => r.status === 'now' || r.status === 'next').map((r) => ({ stage: r.stage, status: r.status, elapsedMin: r.elapsedMin, progress: r.progress, etaMin: r.etaMin, lowMin: r.lowMin, highMin: r.highMin, expTokens: r.expTokens })), iterationEtaMin: est.iteration.min };
  fs.appendFileSync(estPath, JSON.stringify(snap) + '\n');
}

const ix = args.indexOf('--inject');
const fmtMin = (m) => {
  if (m == null) return '?';
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}h ${String(r % 60).padStart(2, '0')}m` : `${r}m`;
};
const fmtTok = (n) => (n == null ? '?' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}k`);
if (ix >= 0) {
  const [html, marker] = args.slice(ix + 1);
  const src = fs.readFileSync(html, 'utf8');
  const re = new RegExp(`/\\*${marker}:START\\*/[\\s\\S]*?/\\*${marker}:END\\*/`);
  if (!re.test(src)) throw new Error(`markers /*${marker}:START*/ ... /*${marker}:END*/ not found`);
  fs.writeFileSync(html, src.replace(re, () => `/*${marker}:START*/\nconst ${marker} = ${JSON.stringify(out)};\n/*${marker}:END*/`));
  console.log(`injected ${marker}: iteration ${focusIter}, ${est.current ?? 'no open stage'}, iteration ETA ${fmtMin(est.iteration.min)}`);
} else if (has('--json')) {
  console.log(JSON.stringify(out, null, 1));
} else {
  console.log(`Iteration ${focusIter}${st.paused ? ' (paused)' : ''}`);
  for (const r of est.rows) {
    const u = r.units ? ` units ${r.units.done}/${r.units.total}` : '';
    if (r.status === 'done') console.log(`  ${r.stage.padEnd(8)} done      ${fmtMin(r.actualMin).padStart(7)}  tokens ${fmtTok(r.tokens)}${u}`);
    else if (r.status === 'skipped') console.log(`  ${r.stage.padEnd(8)} skipped`);
    else if (r.status === 'now') console.log(`  ${r.stage.padEnd(8)} now ${r.progress == null ? '  ?' : `${Math.round(100 * r.progress)}%`.padStart(4)}  elapsed ${fmtMin(r.elapsedMin)}, left ~${fmtMin(r.etaMin)} (${fmtMin(r.lowMin)} to ${fmtMin(r.highMin)}) [${r.basis}]  tokens ${fmtTok(r.tokens)} + ~${fmtTok(r.expTokens)}${u}`);
    else console.log(`  ${r.stage.padEnd(8)} next      ~${fmtMin(r.etaMin)} (${fmtMin(r.lowMin)} to ${fmtMin(r.highMin)}, n=${r.n})  ~${fmtTok(r.expTokens)} tokens${u}`);
  }
  const I = est.iteration;
  console.log(`  Iteration left ~${fmtMin(I.min)} (${fmtMin(I.low)} to ${fmtMin(I.high)}), finish ${new Date(I.finishT).toLocaleString()}, ~${fmtTok(I.expTokens)} weighted tokens`);
  if (out.nextIteration) console.log(`  Next iteration ~${fmtMin(out.nextIteration.min)} (${fmtMin(out.nextIteration.low)} to ${fmtMin(out.nextIteration.high)})`);
  console.log(`Accuracy (median abs % error): overall ${acc.overall == null ? '?' : Math.round(acc.overall) + '%'}; ${acc.byStage.map((s) => `${s.key} ${Math.round(s.mdape)}% (n=${s.n})`).join(', ')}`);
}

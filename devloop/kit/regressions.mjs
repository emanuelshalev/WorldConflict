#!/usr/bin/env node
// Findings regression registry: every finding a fix addressed keeps at least one automated guard,
// so a later fix cannot silently undo it. Product-agnostic; the registry lives in the instance.
//
//   node devloop/kit/regressions.mjs <registry.yaml> check            # meta-check, no tests run
//   node devloop/kit/regressions.mjs <registry.yaml> run [--ids a,b]  # run every guard, per-finding table
//   node devloop/kit/regressions.mjs <registry.yaml> changed [--base ref] [--dry]
//                                    # files changed since base -> suites and guards that cover them
//
// Options: --out <dir> (artifacts, default .verify/regressions), --root <dir> (default cwd),
// --jobs <n> (script guards run at once, default DEVLOOP_GUARD_JOBS or 1).
// Script guards get DEVLOOP_BASE_URL / DEVLOOP_API_URL from the environment (the verify runner
// sets them) and are called as `node <script> <outDir> <baseUrl> <apiUrl>`; exit code 0 = pass,
// 5 minutes at most each. With --jobs above 1 they share the servers at the same time, so each must
// make its own game and browser profile and write only under its <outDir>; a guard that cannot
// (or is timing-sensitive under load) carries `serial: true`. A line is printed as each one ends;
// the per-finding table and the summary line follow in registry order, whatever the concurrency.
//
// Registry format (a small YAML subset: maps, block lists, [flow, lists], quoted or bare scalars):
//
//   backlog:                     # optional: every row whose status starts with Done must be listed
//     - file: runs/iter-01/backlog.md      # relative to the registry file
//   findings:
//     - id: F-00-1
//       title: Refused orders always show a reason on the card
//       source: iter-00 triage
//       covers: [ui/src/components/orders/**, src/core/costs.ts]   # repo globs this guards
//       guards:
//         - vitest: tests/ui-orders-parity.spec.ts                  # whole file
//           name: refused order carries a reason                   # optional: test name substring
//         - script: devloop/instances/x/scenarios-qa/regressions/F-00-1.mjs
//           serial: true         # optional: this script guard runs alone, never beside another
//       note: optional free text
//       status: open             # optional: an open finding (not fixed yet) whose guard is expected
//                                # to fail. Its guards run and are reported (OPEN), but never fail
//                                # the gate; when they pass, the table says so and the fixing build
//                                # removes `status: open`, which makes it a normal guard.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------------------------
// Minimal YAML subset parser
// ---------------------------------------------------------------------------------------------

function scalar(raw) {
  const s = raw.trim();
  if (s === '') return null;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.startsWith('"') ? JSON.parse(s) : s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let cur = '';
    let q = null;
    for (const ch of inner) {
      if (q) {
        cur += ch;
        if (ch === q) q = null;
      } else if (ch === '"' || ch === "'") {
        q = ch;
        cur += ch;
      } else if (ch === ',') {
        items.push(scalar(cur));
        cur = '';
      } else cur += ch;
    }
    items.push(scalar(cur));
    return items;
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/** Strip a trailing comment that is not inside quotes. */
function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

export function parseYaml(text) {
  const lines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const l = stripComment(raw).replace(/\s+$/, '');
    if (l.trim()) lines.push({ indent: l.length - l.trimStart().length, text: l.trim(), n: i + 1 });
  });
  let i = 0;
  const err = (msg) => {
    throw new Error(`YAML line ${lines[Math.min(i, lines.length - 1)]?.n}: ${msg}`);
  };
  function block(indent) {
    if (i >= lines.length) return null;
    return lines[i].text.startsWith('- ') || lines[i].text === '-' ? list(lines[i].indent) : map(indent);
  }
  function map(indent, first = null) {
    const obj = {};
    if (first) Object.assign(obj, first);
    while (i < lines.length && lines[i].indent === indent && !lines[i].text.startsWith('- ')) {
      const m = /^([^:]+?):(?:\s+(.*))?$/.exec(lines[i].text);
      if (!m) err(`expected "key: value", got "${lines[i].text}"`);
      i++;
      if (m[2] !== undefined && m[2] !== '') obj[m[1]] = scalar(m[2]);
      else if (i < lines.length && lines[i].indent > indent) obj[m[1]] = block(lines[i].indent);
      else if (i < lines.length && lines[i].indent === indent && lines[i].text.startsWith('- ')) obj[m[1]] = list(indent);
      else obj[m[1]] = null;
    }
    return obj;
  }
  function list(indent) {
    const arr = [];
    while (i < lines.length && lines[i].indent === indent && (lines[i].text.startsWith('- ') || lines[i].text === '-')) {
      const rest = lines[i].text.slice(1).trimStart();
      const n = lines[i].n;
      i++;
      if (!rest) {
        arr.push(i < lines.length && lines[i].indent > indent ? block(lines[i].indent) : null);
        continue;
      }
      const m = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(rest);
      if (!m || rest.startsWith('"') || rest.startsWith("'")) {
        arr.push(scalar(rest));
        continue;
      }
      // "- key: value" opens a map whose further keys sit at indent + 2
      const childIndent = indent + 2;
      const first = {};
      if (m[2] !== undefined && m[2] !== '') first[m[1]] = scalar(m[2]);
      else if (i < lines.length && lines[i].indent > childIndent) first[m[1]] = block(lines[i].indent);
      else if (i < lines.length && lines[i].indent === childIndent && lines[i].text.startsWith('- ')) first[m[1]] = list(childIndent);
      else first[m[1]] = null;
      if (i < lines.length && lines[i].indent > indent && lines[i].indent !== childIndent) {
        throw new Error(`YAML line ${lines[i].n}: map keys under "- " (line ${n}) must be indented by ${childIndent}`);
      }
      arr.push(i < lines.length && lines[i].indent === childIndent ? map(childIndent, first) : first);
    }
    return arr;
  }
  const out = block(0);
  if (i < lines.length) err(`unexpected indentation at "${lines[i].text}"`);
  return out ?? {};
}

// ---------------------------------------------------------------------------------------------
// Globs (**, *, ?) without dependencies
// ---------------------------------------------------------------------------------------------

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const matches = (file, globs) => (globs ?? []).some((g) => globToRegExp(g).test(file) || file === g);

// ---------------------------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------------------------

export function loadRegistry(file) {
  const doc = parseYaml(fs.readFileSync(file, 'utf8'));
  const findings = (doc.findings ?? []).map((f) => ({ ...f, guards: f.guards ?? [], covers: f.covers ?? [] }));
  return { file, dir: path.dirname(file), backlog: doc.backlog ?? [], findings };
}

/** Row IDs whose status column starts with "Done" in a markdown table (first column = ID). */
export function doneBacklogIds(mdFile) {
  const ids = [];
  for (const line of fs.readFileSync(mdFile, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 4 || !/^[A-Z][\w-]*\d$/.test(cells[1] ?? '')) continue;
    const status = cells[cells.length - 2] ?? '';
    if (/^Done\b/i.test(status) || /^Mostly done\b/i.test(status)) ids.push(cells[1]);
  }
  return ids;
}

/** Problems that make the registry untrustworthy (empty array = healthy). */
export function checkRegistry(reg, root = process.cwd()) {
  const problems = [];
  const seen = new Set();
  for (const f of reg.findings) {
    if (!f.id) problems.push(`an entry has no id (title: ${f.title ?? '?'})`);
    if (seen.has(f.id)) problems.push(`${f.id}: duplicate id`);
    seen.add(f.id);
    if (!f.title) problems.push(`${f.id}: no title`);
    if (!f.source) problems.push(`${f.id}: no source`);
    if (!f.guards.length) problems.push(`${f.id}: no guard`);
    if (f.status != null && f.status !== 'open') problems.push(`${f.id}: status must be "open" or absent (got "${f.status}")`);
    for (const g of f.guards) {
      const file = g.vitest ?? g.script;
      if (!file) {
        problems.push(`${f.id}: a guard has neither vitest nor script`);
        continue;
      }
      const abs = path.resolve(root, file);
      if (!fs.existsSync(abs)) {
        problems.push(`${f.id}: guard file ${file} does not exist`);
        continue;
      }
      if (g.serial != null && g.serial !== true && g.serial !== false) problems.push(`${f.id}: serial must be true or false (got "${g.serial}")`);
      if (g.serial != null && !g.script) problems.push(`${f.id}: serial applies to script guards only`);
      if (g.vitest && g.name) {
        const names = testNames(fs.readFileSync(abs, 'utf8'));
        const want = String(g.name);
        if (!names.some((n) => n.includes(want))) problems.push(`${f.id}: no test named like "${want}" in ${file}`);
      }
    }
  }
  for (const b of reg.backlog) {
    const md = path.resolve(reg.dir, b.file);
    if (!fs.existsSync(md)) {
      problems.push(`backlog ${b.file} does not exist`);
      continue;
    }
    for (const id of doneBacklogIds(md)) if (!seen.has(id)) problems.push(`${id}: Done in ${b.file} but missing from the registry`);
  }
  return problems;
}

/** Literal names passed to it/test/describe in a test file (template literals included). */
export function testNames(src) {
  const names = [];
  const re = /\b(?:it|test|describe)(?:\.(?:each\([^)]*\)|skip|only|concurrent|sequential))*\s*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (let m = re.exec(src); m; m = re.exec(src)) names.push(m[2]);
  return names;
}

// ---------------------------------------------------------------------------------------------
// Running guards
// ---------------------------------------------------------------------------------------------

const ensure = (d) => (fs.mkdirSync(d, { recursive: true }), d);

/** Run vitest once over the files, return Map(file -> [{ fullName, status }]). */
function runVitest(files, out, root) {
  const report = path.join(ensure(out), 'vitest-guards.json');
  fs.rmSync(report, { force: true });
  const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs'); // the package entry: .bin shims do not spawn on Windows
  const r = spawnSync(process.execPath, [vitest, 'run', ...files, '--reporter=json', `--outputFile=${report}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  fs.writeFileSync(path.join(out, 'vitest-guards.log'), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  const byFile = new Map();
  if (!fs.existsSync(report)) return { byFile, error: (r.stderr || r.stdout || 'vitest produced no report').slice(-2000) };
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  for (const tf of json.testResults ?? []) {
    const rel = path.relative(root, tf.name).split(path.sep).join('/');
    byFile.set(rel, {
      tests: (tf.assertionResults ?? []).map((a) => ({ fullName: a.fullName ?? [...(a.ancestorTitles ?? []), a.title].join(' '), status: a.status })),
      fileError: tf.status === 'failed' && !(tf.assertionResults ?? []).length ? tf.message || 'file failed to load' : null,
    });
  }
  return { byFile };
}

/** Stop a guard and whatever it started (browsers): on Windows a plain kill leaves the children. */
function killTree(child) {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else child.kill('SIGKILL');
}

/** Run one script guard as `node <file> <dir> <base> <api>`; resolves { ok, detail, ms }, never rejects. */
export function runScript(file, out, root, env, timeoutMs = GUARD_TIMEOUT_MS) {
  const dir = ensure(path.join(out, path.basename(file, '.mjs')));
  const base = env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/';
  const api = env.DEVLOOP_API_URL ?? 'http://localhost:8080/api';
  const t0 = Date.now();
  return new Promise((resolve) => {
    let text = '';
    let timedOut = false;
    let spawnError = null;
    let settled = false;
    const child = spawn(process.execPath, [file, dir, base, api], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    // stdout and stderr in one log, as they arrive (the guard's own order)
    const add = (d) => {
      if (text.length < 64 << 20) text += d;
    };
    child.stdout.setEncoding('utf8').on('data', add);
    child.stderr.setEncoding('utf8').on('data', add);
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);
    const done = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.writeFileSync(path.join(dir, 'guard.log'), `${text}${timedOut ? `\n[regressions] timed out after ${Math.round(timeoutMs / 1000)} s\n` : ''}`);
      const lastLine = text.trim().split('\n').filter(Boolean).slice(-1)[0] ?? '';
      const ok = code === 0 && !timedOut && !spawnError;
      const detail = ok ? '' : timedOut ? `timed out after ${Math.round(timeoutMs / 1000)} s` : spawnError ? spawnError.message : lastLine.trim().slice(0, 160);
      resolve({ ok, detail, ms: Date.now() - t0 });
    };
    child.on('error', (e) => {
      spawnError = e;
      done(null);
    });
    child.on('close', (code) => done(code));
  });
}

/**
 * Run `run(item, i)` over the items with at most `jobs` at a time and resolve the results in input
 * order. An item for which `isSerial(item)` is true runs alone: it waits for the running ones to end
 * and nothing else starts until it ends. `onDone(result, item, i, finishedCount)` is called as each
 * one ends. A throw in `run` becomes the result { ok: false, detail }.
 */
export function runPool(items, { jobs = 1, isSerial = () => false, run, onDone = () => {} }) {
  const limit = Math.max(1, Math.floor(Number(jobs)) || 1);
  const results = new Array(items.length);
  let next = 0;
  let running = 0;
  let alone = false;
  let finished = 0;
  return new Promise((resolve) => {
    const pump = () => {
      if (finished === items.length) return resolve(results);
      while (next < items.length && !alone && running < limit) {
        const i = next;
        const serial = !!isSerial(items[i]);
        if (serial && running > 0) break; // let the pool drain first
        next++;
        running++;
        if (serial) alone = true;
        Promise.resolve()
          .then(() => run(items[i], i))
          .then(
            (r) => (results[i] = r),
            (e) => (results[i] = { ok: false, detail: String(e?.message ?? e).slice(0, 160) }),
          )
          .then(() => {
            running--;
            if (serial) alone = false;
            finished++;
            try {
              onDone(results[i], items[i], i, finished);
            } catch {}
            pump();
          });
      }
    };
    pump();
  });
}

/** Per-guard timeout (ms). */
export const GUARD_TIMEOUT_MS = 300_000;

/** Concurrency: the option, else DEVLOOP_GUARD_JOBS, else 1 (one guard after another). */
export function guardJobs(value = null, env = process.env) {
  const n = Math.floor(Number(value ?? env.DEVLOOP_GUARD_JOBS ?? 1));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const fmtSec = (ms) => `${(ms / 1000).toFixed(1)} s`;

/**
 * The order script guards start in. One at a time: registry order. In parallel: the slowest of the
 * last run first (times kept in node_modules/.cache/devloop/guard-times.json, which outlives the
 * gate's output folder; new guards count as slowest), so a long guard does
 * not start last and hold up the end, and guards marked serial at the end, where they run alone.
 */
export function scriptOrder(scripts, serial, jobs, times) {
  if (jobs <= 1) return scripts;
  const t = (s) => times[s] ?? Number.POSITIVE_INFINITY;
  return [...scripts].sort((a, b) => Number(serial.has(a)) - Number(serial.has(b)) || t(b) - t(a));
}

/**
 * Run the guards of the given findings; resolves rows { id, guard, ok, detail } in registry order.
 * Script guards run `jobs` at a time (a guard with `serial: true` runs alone); each prints a line as
 * it ends. Vitest guards run first, in one vitest call.
 */
export async function runGuards(reg, { root = process.cwd(), out = '.verify/regressions', ids = null, env = process.env, jobs = 1, timeoutMs = GUARD_TIMEOUT_MS, times: timesFile = path.join(root, 'node_modules', '.cache', 'devloop', 'guard-times.json'), log = console.log } = {}) {
  const findings = reg.findings.filter((f) => !ids || ids.has(f.id));
  const outAbs = path.resolve(root, out);
  const vitestFiles = [...new Set(findings.flatMap((f) => f.guards.filter((g) => g.vitest).map((g) => g.vitest)))];
  const vt = vitestFiles.length ? runVitest(vitestFiles, outAbs, root) : { byFile: new Map() };
  const scripts = [...new Set(findings.flatMap((f) => f.guards.filter((g) => g.script).map((g) => g.script)))];
  const serial = new Set(findings.flatMap((f) => f.guards.filter((g) => g.script && g.serial === true).map((g) => g.script)));
  let times = {};
  try {
    times = JSON.parse(fs.readFileSync(timesFile, 'utf8'));
  } catch {}
  const order = scriptOrder(scripts, serial, jobs, times);
  if (order.length) log(`running ${order.length} script guard${order.length > 1 ? 's' : ''}, ${jobs} at a time${serial.size ? ` (${serial.size} alone)` : ''}`);
  const t0 = Date.now();
  const results = await runPool(order, {
    jobs,
    isSerial: (s) => serial.has(s),
    run: (s) => runScript(s, outAbs, root, env, timeoutMs),
    onDone: (r, s, _i, n) => log(`[${String(n).padStart(String(order.length).length)}/${order.length}] ${r.ok ? 'PASS' : 'FAIL'}  ${fmtSec(r.ms ?? 0).padStart(7)}  ${s}${r.ok ? '' : `  ${r.detail}`}`),
  });
  if (order.length) {
    log(`script guards took ${fmtSec(Date.now() - t0)}\n`);
    order.forEach((s, i) => {
      if (results[i]?.ms != null) times[s] = results[i].ms;
    });
    try {
      fs.mkdirSync(path.dirname(timesFile), { recursive: true });
      fs.writeFileSync(timesFile, `${JSON.stringify(times, null, 2)}\n`);
    } catch {}
  }
  const scriptCache = new Map(order.map((s, i) => [s, results[i]]));
  const rows = [];
  for (const f of findings) {
    // An open finding's rows carry `open`: reported, never a regression
    const add = (r) => rows.push(f.status === 'open' ? { ...r, open: true } : r);
    for (const g of f.guards) {
      if (g.vitest) {
        const label = `${g.vitest}${g.name ? ` :: ${g.name}` : ''}`;
        const res = vt.byFile.get(g.vitest);
        if (!res) {
          add({ id: f.id, guard: label, ok: false, detail: vt.error ? 'vitest failed to run' : 'file not run' });
          continue;
        }
        if (res.fileError) {
          add({ id: f.id, guard: label, ok: false, detail: String(res.fileError).split('\n')[0].slice(0, 160) });
          continue;
        }
        const tests = g.name ? res.tests.filter((t) => t.fullName.includes(String(g.name))) : res.tests;
        const bad = tests.filter((t) => t.status === 'failed');
        const ran = tests.filter((t) => t.status === 'passed');
        if (!tests.length) add({ id: f.id, guard: label, ok: false, detail: 'no matching test ran' });
        else if (bad.length) add({ id: f.id, guard: label, ok: false, detail: `failed: ${bad[0].fullName}`.slice(0, 160) });
        else if (!ran.length) add({ id: f.id, guard: label, ok: false, detail: 'matching tests were skipped' });
        else add({ id: f.id, guard: label, ok: true, detail: `${ran.length} test${ran.length > 1 ? 's' : ''}` });
      } else if (g.script) {
        const r = scriptCache.get(g.script);
        add({ id: f.id, guard: g.script, ok: r.ok, detail: r.detail });
      }
    }
  }
  return rows;
}

export function printTable(rows) {
  const wi = Math.max(4, ...rows.map((r) => r.id.length));
  const wg = Math.min(90, Math.max(5, ...rows.map((r) => r.guard.length)));
  const result = (r) => (r.open ? (r.ok ? 'OPEN-PASS' : 'OPEN') : r.ok ? 'PASS' : 'FAIL');
  console.log(`${'ID'.padEnd(wi)}  ${'Guard'.padEnd(wg)}  Result     Detail`);
  console.log('-'.repeat(wi + wg + 28));
  for (const r of rows) {
    const g = r.guard.length > wg ? `...${r.guard.slice(-(wg - 3))}` : r.guard;
    console.log(`${r.id.padEnd(wi)}  ${g.padEnd(wg)}  ${result(r).padEnd(9)}  ${r.detail ?? ''}`);
  }
  // Open findings (status: open) are reported, never counted as regressions
  const closed = rows.filter((r) => !r.open);
  const failedIds = [...new Set(closed.filter((r) => !r.ok).map((r) => r.id))];
  const ids = new Set(closed.map((r) => r.id));
  console.log(`\n${ids.size - failedIds.length}/${ids.size} findings guarded and passing${failedIds.length ? `; REGRESSED: ${failedIds.join(', ')}` : ''}`);
  const openIds = [...new Set(rows.filter((r) => r.open).map((r) => r.id))];
  if (openIds.length) {
    const nowPassing = openIds.filter((id) => rows.filter((r) => r.id === id).every((r) => r.ok));
    const still = openIds.filter((id) => !nowPassing.includes(id));
    console.log(`open findings (reported, not gating): ${still.length ? `${still.join(', ')} still failing as expected` : 'none failing'}${nowPassing.length ? `; NOW PASSING: ${nowPassing.join(', ')}: remove \`status: open\` to make the guard gate` : ''}`);
  }
  return failedIds;
}

// ---------------------------------------------------------------------------------------------
// Smart selection: changed files -> covering suites and guards
// ---------------------------------------------------------------------------------------------

export function changedFiles(base, root = process.cwd()) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const set = new Set([...git(['diff', '--name-only', `${base}...HEAD`]), ...git(['diff', '--name-only', 'HEAD']), ...git(['ls-files', '--others', '--exclude-standard'])]);
  return [...set].sort();
}

function walk(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc);
    else if (pred(p)) acc.push(p);
  }
  return acc;
}

/** Test files (default: tests/**.spec|test.ts) that import, directly or one hop through a local
 *  module, any of the changed files. Import specifiers are resolved relative to each file. */
export function testsImporting(changed, { root = process.cwd(), testDir = 'tests', testPattern = /\.(spec|test)\.[cm]?[jt]sx?$/ } = {}) {
  const want = new Set(changed.map((f) => f.replace(/\.(ts|tsx|js|mjs|jsx)$/, '')));
  const imports = (abs) => {
    const src = fs.readFileSync(abs, 'utf8');
    const out = [];
    const re = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+)["']/g;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      const target = path.relative(root, path.resolve(path.dirname(abs), m[1])).split(path.sep).join('/');
      out.push(target.replace(/\.(ts|tsx|js|mjs|jsx|json)$/, (x) => (x === '.json' ? x : '')));
    }
    return out;
  };
  const hits = [];
  for (const abs of walk(path.resolve(root, testDir), (p) => testPattern.test(p))) {
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (want.has(rel.replace(/\.(ts|tsx|js|mjs)$/, ''))) {
      hits.push(rel);
      continue;
    }
    const direct = imports(abs);
    let hit = direct.some((t) => want.has(t) || want.has(t.replace(/\.json$/, '')) || changed.includes(t));
    if (!hit) {
      for (const t of direct) {
        const cand = ['.ts', '.tsx', '.js', '.mjs'].map((x) => path.resolve(root, t + x)).find((p) => fs.existsSync(p));
        if (cand && imports(cand).some((u) => want.has(u))) {
          hit = true;
          break;
        }
      }
    }
    if (hit) hits.push(rel);
  }
  return hits.sort();
}

/** Findings whose covers globs or guard files match a changed file. */
export function findingsFor(reg, changed) {
  return reg.findings.filter((f) => changed.some((c) => matches(c, f.covers) || f.guards.some((g) => (g.vitest ?? g.script) === c)));
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function opt(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [file, cmd = 'check'] = process.argv.slice(2);
  if (!file) {
    console.error('usage: node devloop/kit/regressions.mjs <registry.yaml> check|run|changed [--ids a,b] [--jobs n] [--base ref] [--out dir] [--dry]');
    process.exit(2);
  }
  const root = path.resolve(opt('root', process.cwd()));
  const out = opt('out', '.verify/regressions');
  const jobs = guardJobs(opt('jobs'));
  const reg = loadRegistry(path.resolve(file));
  const problems = checkRegistry(reg, root);
  if (cmd === 'check') {
    for (const p of problems) console.log(`PROBLEM ${p}`);
    console.log(`${reg.findings.length} findings, ${reg.findings.reduce((s, f) => s + f.guards.length, 0)} guards, ${problems.length} problems`);
    process.exitCode = problems.length ? 1 : 0;
  } else if (cmd === 'run') {
    const ids = opt('ids') ? new Set(opt('ids').split(',')) : null;
    const rows = await runGuards(reg, { root, out, ids, jobs });
    const failed = printTable(rows);
    for (const p of problems) console.log(`PROBLEM ${p}`);
    process.exitCode = failed.length || problems.length ? 1 : 0;
  } else if (cmd === 'changed') {
    const base = opt('base', 'origin/main');
    const changed = changedFiles(base, root);
    const findings = findingsFor(reg, changed);
    const suites = testsImporting(changed, { root });
    console.log(`${changed.length} files changed since ${base}`);
    console.log(`suites importing them (${suites.length}): ${suites.join(', ') || '-'}`);
    console.log(`findings covering them (${findings.length}): ${findings.map((f) => f.id).join(', ') || '-'}`);
    if (process.argv.includes('--dry')) process.exit(0);
    let failed = false;
    if (suites.length) {
      const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs'); // the package entry: .bin shims do not spawn on Windows
      const r = spawnSync(process.execPath, [vitest, 'run', ...suites], { cwd: root, stdio: 'inherit' });
      failed ||= r.status !== 0;
    }
    if (findings.length) {
      const rows = await runGuards(reg, { root, out, ids: new Set(findings.map((f) => f.id)), jobs });
      failed ||= printTable(rows).length > 0;
    }
    if (!suites.length && !findings.length) console.log('nothing maps to the changed files; run the full gate before merging');
    process.exitCode = failed ? 1 : 0;
  } else {
    console.error(`unknown command ${cmd}`);
    process.exitCode = 2;
  }
}

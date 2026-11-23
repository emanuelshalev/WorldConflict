#!/usr/bin/env node
// Findings regression registry: every finding a fix addressed keeps at least one automated guard,
// so a later fix cannot silently undo it. Product-agnostic; the registry lives in the instance.
//
//   node devloop/kit/regressions.mjs <registry.yaml> check            # meta-check, no tests run
//   node devloop/kit/regressions.mjs <registry.yaml> run [--ids a,b]  # run every guard, per-finding table
//   node devloop/kit/regressions.mjs <registry.yaml> changed [--base ref] [--dry]
//                                    # files changed since base -> suites and guards that cover them
//
// Options: --out <dir> (artifacts, default .verify/regressions), --root <dir> (default cwd).
// Script guards get DEVLOOP_BASE_URL / DEVLOOP_API_URL from the environment (the verify runner
// sets them) and are called as `node <script> <outDir> <baseUrl> <apiUrl>`; exit code 0 = pass.
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
//       note: optional free text
//       status: open             # optional: an open finding (not fixed yet) whose guard is expected
//                                # to fail. Its guards run and are reported (OPEN), but never fail
//                                # the gate; when they pass, the table says so and the fixing build
//                                # removes `status: open`, which makes it a normal guard.
import { execFileSync, spawnSync } from 'node:child_process';
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

function runScript(file, out, root, env) {
  const dir = ensure(path.join(out, path.basename(file, '.mjs')));
  const base = env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/';
  const api = env.DEVLOOP_API_URL ?? 'http://localhost:8080/api';
  const r = spawnSync(process.execPath, [file, dir, base, api], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 300_000, maxBuffer: 64 << 20 });
  fs.writeFileSync(path.join(dir, 'guard.log'), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  const lastLine = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim().split('\n').filter(Boolean).slice(-1)[0] ?? '';
  return { ok: r.status === 0, detail: r.status === 0 ? '' : r.error ? r.error.message : lastLine.slice(0, 160) };
}

/** Run the guards of the given findings; returns rows { id, guard, ok, detail }. */
export function runGuards(reg, { root = process.cwd(), out = '.verify/regressions', ids = null, env = process.env } = {}) {
  const findings = reg.findings.filter((f) => !ids || ids.has(f.id));
  const vitestFiles = [...new Set(findings.flatMap((f) => f.guards.filter((g) => g.vitest).map((g) => g.vitest)))];
  const vt = vitestFiles.length ? runVitest(vitestFiles, path.resolve(root, out), root) : { byFile: new Map() };
  const scriptCache = new Map();
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
        if (!scriptCache.has(g.script)) scriptCache.set(g.script, runScript(g.script, path.resolve(root, out), root, env));
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
    console.error('usage: node devloop/kit/regressions.mjs <registry.yaml> check|run|changed [--ids a,b] [--base ref] [--out dir] [--dry]');
    process.exit(2);
  }
  const root = path.resolve(opt('root', process.cwd()));
  const out = opt('out', '.verify/regressions');
  const reg = loadRegistry(path.resolve(file));
  const problems = checkRegistry(reg, root);
  if (cmd === 'check') {
    for (const p of problems) console.log(`PROBLEM ${p}`);
    console.log(`${reg.findings.length} findings, ${reg.findings.reduce((s, f) => s + f.guards.length, 0)} guards, ${problems.length} problems`);
    process.exitCode = problems.length ? 1 : 0;
  } else if (cmd === 'run') {
    const ids = opt('ids') ? new Set(opt('ids').split(',')) : null;
    const rows = runGuards(reg, { root, out, ids });
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
      const rows = runGuards(reg, { root, out, ids: new Set(findings.map((f) => f.id)) });
      failed ||= printTable(rows).length > 0;
    }
    if (!suites.length && !findings.length) console.log('nothing maps to the changed files; run the full gate before merging');
    process.exitCode = failed ? 1 : 0;
  } else {
    console.error(`unknown command ${cmd}`);
    process.exitCode = 2;
  }
}

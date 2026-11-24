#!/usr/bin/env node
// Verify gate: one command that runs every check a merge must pass, starts and stops the servers
// the browser checks need, prints a summary table and exits non-zero on any failure.
// Product-agnostic: everything specific lives in an instance config module.
//
//   node devloop/kit/verify-runner.mjs <config.mjs> [--<mode> ...] [--only a,b] [--skip a,b]
//                                      [--bail] [--serve] [--list] [--out dir]
//
// Config module (default export):
//   {
//     name: 'My product',
//     root: '/abs/repo/root',                    // cwd for steps (default: process.cwd())
//     out: '.verify',                            // logs and artifacts, wiped per run
//     modes: { default: ['test', ...], quick: [...], full: [...] },   // flag -> step ids
//     flags: { 'update-visual': { steps: ['visual'] } },             // extra flags (ctx.flags)
//     servers: {
//       api: { cmd: 'npx', args: (ctx) => [...], cwd: 'sub/dir', env: (ctx) => ({}),
//              port: 8600, ready: (ctx) => 'http://localhost:8600/health' },
//     },
//     steps: [
//       { id: 'test', label: 'Unit tests', cmd: 'npm', args: ['test'] | (ctx) => [...],
//         cwd?, env?: (ctx) => ({}), needs?: ['api'], timeoutMs? },
//     ],
//   }
// ctx = { root, out, ports: { api: 8601 }, urls: { api: 'http://localhost:8601' }, flags: Set }
//
// Modes are flags (--quick, --full ...). Several modes run the union of their steps, in config
// order; no mode flag runs `default`. --serve only starts the servers (for manual runs);
// --out changes the run folder (wiped per run) so parallel runs do not collide.
// A flag in `flags` adds its steps and is visible to the
// step functions as ctx.flags.has(name). Steps keep going after a failure unless --bail.
//
// Loop controller (optional): when a loop config is found (config.loop.config, $DEVLOOP_LOOP_CONFIG,
// or the only devloop/instances/*/loop/config.json), a full gate run records its result with
// `kit/loop.mjs record verify` on the commit and code tree it ran on. Only runs of a recording mode
// count (config.loop.recordModes, default ['default', 'full']; a run of config.loop.quickModes, default
// ['quick'], records the lighter `verify-quick` gate when the loop config has it) without --only, --skip or extra flags,
// and only when HEAD did not move and no code file had uncommitted changes. `loop: false` turns it
// off; without a loop config the runner works exactly as before.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const fmtTime = (ms) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60_000)}m${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}s`);

/** First free TCP port at or above `base` (checked on all interfaces, like the servers bind). */
export async function freePort(base, taken = new Set()) {
  for (let p = base; p < base + 200; p++) {
    if (taken.has(p)) continue;
    const ok = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once('error', () => resolve(false));
      srv.listen(p, () => srv.close(() => resolve(true)));
    });
    if (ok) return p;
  }
  throw new Error(`no free port near ${base}`);
}

function parseArgs(argv, config) {
  const modes = new Set();
  const flags = new Set();
  const opts = { only: null, skip: new Set(), bail: false, serve: false, list: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const key = a.slice(2);
    if (key === 'only') opts.only = new Set(argv[++i].split(','));
    else if (key === 'skip') for (const s of argv[++i].split(',')) opts.skip.add(s);
    else if (key === 'bail') opts.bail = true;
    else if (key === 'out') opts.out = argv[++i];
    else if (key === 'serve') opts.serve = true;
    else if (key === 'list') opts.list = true;
    else if (config.modes[key]) modes.add(key);
    else if (config.flags?.[key]) flags.add(key);
    else throw new Error(`unknown option ${a} (modes: ${Object.keys(config.modes).join(', ')}; flags: ${Object.keys(config.flags ?? {}).join(', ')})`);
  }
  return { modes, flags, opts };
}

function selectSteps(config, { modes, flags, opts }) {
  const ids = new Set();
  if (opts.only) for (const id of opts.only) ids.add(id);
  else {
    if (modes.size === 0 && flags.size === 0) modes.add('default');
    for (const m of modes) for (const id of config.modes[m]) ids.add(id);
    for (const f of flags) for (const id of config.flags[f].steps ?? []) ids.add(id);
  }
  for (const id of ids) if (!config.steps.some((s) => s.id === id)) throw new Error(`unknown step ${id}`);
  return config.steps.filter((s) => ids.has(s.id) && !opts.skip.has(s.id));
}

const resolve = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

function run(cmd, args, { cwd, env, logFile, timeoutMs, detached = false }) {
  const log = fs.openSync(logFile, 'a');
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '0', ...env }, stdio: ['ignore', log, log], detached });
  fs.closeSync(log);
  const done = new Promise((res) => {
    let timer = null;
    if (timeoutMs) {
      timer = setTimeout(() => {
        fs.appendFileSync(logFile, `\n[verify] timed out after ${fmtTime(timeoutMs)}\n`);
        killTree(child);
      }, timeoutMs);
    }
    child.on('exit', (code, signal) => {
      if (timer) clearTimeout(timer);
      res(code ?? (signal ? 1 : 0));
    });
    child.on('error', (e) => {
      fs.appendFileSync(logFile, `\n[verify] ${e.message}\n`);
      res(1);
    });
  });
  return { child, done };
}

function killTree(child, signal = 'SIGTERM') {
  if (process.platform === 'win32') {
    // No process groups on Windows: a signal stops only the wrapper and leaves the server on its port
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {}
    return;
  }
  try {
    process.kill(-child.pid, signal); // the whole process group (npx -> tsx -> node)
  } catch {
    try {
      child.kill(signal);
    } catch {}
  }
}

async function waitReady(url, ms, proc) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (proc.exited) return false;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const stripAnsi = (t) => t.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
const tail = (file, n = 25) => {
  try {
    return stripAnsi(fs.readFileSync(file, 'utf8')).trimEnd().split('\n').slice(-n).join('\n');
  } catch {
    return '';
  }
};

export async function runVerify(config, argv = process.argv.slice(3)) {
  const parsed = parseArgs(argv, config);
  const root = config.root ?? process.cwd();
  const out = path.resolve(root, parsed.opts.out ?? config.out ?? '.verify');
  if (parsed.opts.list) {
    for (const [m, ids] of Object.entries(config.modes)) console.log(`--${m.padEnd(14)} ${ids.join(', ')}`);
    for (const [f, d] of Object.entries(config.flags ?? {})) console.log(`--${f.padEnd(14)} ${(d.steps ?? []).join(', ')}  ${d.note ?? ''}`);
    for (const s of config.steps) console.log(`  ${s.id.padEnd(12)} ${s.label}${s.needs?.length ? ` (servers: ${s.needs.join(', ')})` : ''}`);
    return 0;
  }
  const steps = parsed.opts.serve ? [] : selectSteps(config, parsed);
  const headAtStart = gitHead(root);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const ctx = { root, out, ports: {}, urls: {}, flags: parsed.flags };
  const needed = new Set(parsed.opts.serve ? Object.keys(config.servers ?? {}) : steps.flatMap((s) => s.needs ?? []));
  const taken = new Set();
  for (const name of Object.keys(config.servers ?? {})) {
    if (!needed.has(name)) continue;
    const p = await freePort(config.servers[name].port, taken);
    taken.add(p);
    ctx.ports[name] = p;
    ctx.urls[name] = `http://localhost:${p}`;
  }

  console.log(`\n${config.name} verify: ${steps.map((s) => s.id).join(', ') || '(servers only)'}`);
  if (Object.keys(ctx.ports).length) console.log(`servers: ${Object.entries(ctx.urls).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`logs: ${path.relative(process.cwd(), out) || out}/\n`);

  const servers = [];
  const stopServers = () => {
    for (const s of servers) if (!s.proc.exited) killTree(s.proc.child);
  };
  const onSignal = () => {
    stopServers();
    process.exit(130);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const results = [];
  const record = (id, label, ok, ms, note = '') => {
    results.push({ id, label, ok, ms, note });
    if (process.stdout.isTTY) process.stdout.write('\x1b[2K\r');
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(12)} ${fmtTime(ms).padStart(7)}  ${note}`);
  };

  // Servers, in config order (a later server may read an earlier one's url from ctx)
  const startServer = async (name) => {
    const def = config.servers[name];
    const t0 = Date.now();
    const logFile = path.join(out, `server-${name}.log`);
    const proc = run(def.cmd, resolve(def.args, ctx), { cwd: path.resolve(root, def.cwd ?? '.'), env: resolve(def.env, ctx) ?? {}, logFile, detached: true });
    proc.done.then(() => {
      proc.exited = true;
    });
    const entry = servers.find((s) => s.name === name);
    if (entry) entry.proc = proc;
    else servers.push({ name, proc });
    const ready = await waitReady(resolve(def.ready, ctx), def.readyTimeoutMs ?? 90_000, proc);
    if (!ready) {
      record(`server:${name}`, `${name} server`, false, Date.now() - t0, `not ready, see ${path.relative(root, logFile)}`);
      console.log(tail(logFile));
      return false;
    }
    console.log(`up    ${`server:${name}`.padEnd(12)} ${fmtTime(Date.now() - t0).padStart(7)}  ${ctx.urls[name]}`);
    return true;
  };
  let serversOk = true;
  for (const name of Object.keys(config.servers ?? {})) {
    if (!needed.has(name)) continue;
    if (!(await startServer(name))) {
      serversOk = false;
      break;
    }
  }

  if (parsed.opts.serve) {
    if (!serversOk) {
      stopServers();
      return 1;
    }
    console.log('\nServers are up; Ctrl+C stops them.');
    await new Promise(() => {});
  }

  const t0 = Date.now();
  for (const step of steps) {
    if ((step.needs ?? []).length && !serversOk) {
      record(step.id, step.label, false, 0, 'skipped: servers did not start');
      continue;
    }
    // A server that died during an earlier step (crash, or killed from outside) is restarted and
    // the death is reported, so one step's damage does not fail every later step
    for (const name of step.needs ?? []) {
      const s = servers.find((x) => x.name === name);
      if (s?.proc.exited) {
        fs.appendFileSync(path.join(out, `server-${name}.log`), `\n[verify] server exited before ${step.id}; restarting\n`);
        console.log(`WARN  server:${name} had exited before ${step.id}; restarting`);
        if (!(await startServer(name))) serversOk = false;
      }
    }
    if ((step.needs ?? []).length && !serversOk) {
      record(step.id, step.label, false, 0, 'skipped: a server did not restart');
      continue;
    }
    const logFile = path.join(out, `${step.id}.log`);
    const started = Date.now();
    if (process.stdout.isTTY) process.stdout.write(`....  ${step.id.padEnd(12)} ${step.label}\r`);
    const proc = run(step.cmd, resolve(step.args, ctx), {
      cwd: path.resolve(root, step.cwd ?? '.'),
      env: resolve(step.env, ctx) ?? {},
      logFile,
      timeoutMs: step.timeoutMs,
      detached: true,
    });
    const code = await proc.done;
    const ok = code === 0;
    const summary = step.summarize ? step.summarize(stripAnsi(fs.readFileSync(logFile, 'utf8')), ok) : '';
    record(step.id, step.label, ok, Date.now() - started, summary || (ok ? '' : `exit ${code}, ${path.relative(root, logFile)}`));
    if (!ok) {
      console.log(tail(logFile).replace(/^/gm, '      | '));
      if (parsed.opts.bail) break;
    }
  }
  stopServers();
  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);

  const failed = results.filter((r) => !r.ok);
  const w = Math.max(8, ...results.map((r) => r.label.length));
  console.log(`\n${'Step'.padEnd(14)}${'Check'.padEnd(w + 2)}Result  ${'Time'.padStart(7)}  Note`);
  console.log('-'.repeat(14 + w + 2 + 8 + 9 + 20));
  for (const r of results) console.log(`${r.id.padEnd(14)}${r.label.padEnd(w + 2)}${(r.ok ? 'PASS' : 'FAIL').padEnd(8)}${fmtTime(r.ms).padStart(7)}  ${r.note}`);
  console.log(`\n${failed.length ? `FAILED: ${failed.map((r) => r.id).join(', ')}` : 'ALL PASSED'} in ${fmtTime(Date.now() - t0)} (logs in ${path.relative(process.cwd(), out) || out}/)`);
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ name: config.name, commit: headAtStart, results, ok: failed.length === 0 }, null, 2));
  await recordInLoop(config, parsed, { root, ok: failed.length === 0, evidence: path.join(out, 'summary.json'), headAtStart, steps: results.map((r) => r.id) });
  return failed.length ? 1 : 0;
}

function gitHead(cwd) {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Record the gate result with the loop controller, when there is one (see the header). */
export async function recordInLoop(config, parsed, { root, ok, evidence, headAtStart, steps }) {
  if (config.loop === false || !headAtStart) return null;
  const recordModes = config.loop?.recordModes ?? ['default', 'full'];
  const quickModes = config.loop?.quickModes ?? ['quick'];
  const whole = !parsed.opts.only && parsed.opts.skip.size === 0 && parsed.flags.size === 0 && !parsed.opts.serve;
  const counted = whole && [...parsed.modes].some((m) => recordModes.includes(m));
  // A quick run (tests, lints, build) is its own gate, `verify-quick`: enough for a merge that only
  // touches tooling (rule with "when.outside" in the loop config), never for a product change
  const quick = whole && !counted && [...parsed.modes].some((m) => quickModes.includes(m));
  if (!counted && !quick) return null;
  let loop;
  let ctx;
  try {
    loop = await import('./loop.mjs');
    ctx = loop.loadLoop({ cwd: root, config: config.loop?.config });
  } catch {
    return null; // no controller config: nothing to record
  }
  try {
    const head = loop.resolveCommit(root, 'HEAD');
    if (head !== headAtStart) {
      console.log(`loop: HEAD moved during the run (${headAtStart.slice(0, 9)} -> ${head.slice(0, 9)}); result not recorded`);
      return null;
    }
    const dirty = loop.dirtyCodeFiles(root, ctx.cfg.code, ctx.loopRel ? [`${ctx.loopRel}/**`] : []);
    if (dirty.length) {
      console.log(`loop: ${dirty.length} code file(s) had uncommitted changes (${dirty.slice(0, 3).join(', ')}${dirty.length > 3 ? ', ...' : ''}); result not recorded`);
      return null;
    }
    const hasQuick = (ctx.cfg.gates ?? []).includes('verify-quick');
    const note = `modes ${[...parsed.modes].join(',')}`;
    const result = ok ? 'pass' : 'fail';
    if (quick) {
      if (!hasQuick) return null;
      const q = loop.record(ctx, { gate: 'verify-quick', result, commit: head, evidence, note, extra: { steps } });
      console.log(`loop: recorded verify-quick ${q.result} on ${q.commit.slice(0, 9)} (code tree ${q.codeTree})`);
      return q;
    }
    const rec = loop.record(ctx, { gate: 'verify', result, commit: head, evidence, note, extra: { steps } });
    // the full gate contains the quick one
    if (hasQuick) loop.record(ctx, { gate: 'verify-quick', result, commit: head, evidence, note: `${note} (full run)`, extra: { steps } });
    console.log(`loop: recorded verify ${rec.result} on ${rec.commit.slice(0, 9)} (code tree ${rec.codeTree})`);
    return rec;
  } catch (e) {
    console.log(`loop: could not record the result: ${e.message}`);
    return null;
  }
}

// CLI: node verify-runner.mjs <config.mjs> [options]
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node devloop/kit/verify-runner.mjs <config.mjs> [--<mode>] [--only ids] [--skip ids] [--bail] [--serve] [--list]');
    process.exit(2);
  }
  const config = (await import(pathToFileURL(path.resolve(file)).href)).default;
  try {
    process.exitCode = await runVerify(config, process.argv.slice(3));
  } catch (e) {
    console.error(`verify: ${e.message}`);
    process.exitCode = 2;
  }
}

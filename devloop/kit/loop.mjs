#!/usr/bin/env node
// Loop controller: a deterministic state machine for an iterative development loop. It owns stage
// transitions, preconditions and mandatory gates; the AI Group Manager makes the judgments inside
// it (priorities, severity, design trade-offs, what feedback means). Product-agnostic: stages,
// gates, rules and code paths come from the instance config (`<instance>/loop/config.json`).
//
//   node devloop/kit/loop.mjs [--config <instance>/loop/config.json] <command> [options]
//
// Commands:
//   status                                  where the loop is, what the current code has passed, what is owed
//   init --iteration N --stage S [--since ISO]  create the state file (once, when adopting the controller)
//   start <Stage>                           enter a stage (same rules as advance --to)
//   advance [--to Stage]                    move to the next legal stage; refuses when a precondition fails
//   record <gate> --result pass|fail [--commit <sha>] [--evidence <path>] [--note "..."] [--verdict v]
//                                           record a gate result on a commit (and its code tree)
//   check <action> [--commit <sha>] [--tree <tree-ish>] [--base <ref>]
//                                           exit 0 when every rule for the action holds, else 1 with reasons
//                                           (actions: publish, merge, enter:<Stage>, or any `on` in the rules)
//   override <rule> --reason "..." [--ttl minutes]
//                                           let one rule pass for a while (default 60 min); logged as an event
//                                           and as a draft row in the instance ledger
//   block <id> --what "..." [--needs "..."] / unblock <id> --resolution "..."
//                                           track what blocks the loop (the status page shows it)
//   progress <progress.mjs options>         pass a progress event through (--total N, --done N --note, --pause)
//   log [--n 20]                            the last events
//
// The config path defaults to $DEVLOOP_LOOP_CONFIG, else the only devloop/instances/*/loop/config.json.
//
// Config (see devloop/templates/loop-config.json):
// {
//   "stages": ["Plan", "Design", ...],
//   "transitions": { "Plan": ["Design", "Build"], ... },   // legal next stages (default: the next one);
//                                                          // stages jumped over are logged as skipped;
//                                                          // entering the first stage starts a new iteration
//   "gates": ["verify", "qa", "triage", "status-refresh"],
//   "rules": { "<id>": { "on": "enter:Use" | ["publish", ...], "gate": "qa",
//                        "match": "code" | "commit" | "iteration" | "stage" | "after-merge" | "owed",
//                        "minTier": "T3", "accept": ["pass"], "why": "...",
//                        "when": { "paths": ["ui/", "data/codex/**"] } } },  // "on" may end in ":*" (every enter:);
//                                                          // "accept": the results that satisfy the rule (default pass);
//                                                          // "when.outside": the rule applies only when the change
//                                                          // touches a code file outside those paths (a full gate
//                                                          // for product changes, a quick one for tooling)
//                                                          // "when.paths": the rule applies only when the change
//                                                          // touches those paths (merge: the merge result against the
//                                                          // shared branch; check: base...commit), else it is skipped
//   "owes": { "merge": "T1", "publish": "T1", "exit:Use": "T2" },   // status refreshes owed by events
//   "statusProtocol": "../status-protocol.json",                    // for merge/publish auto refresh
//   "code": { "include": ["src/**", ...], "exclude": ["**/*.md"] },  // what counts as code for "code" matches
//   "sharedBranch": "dev/main-loop", "publishBranch": "main", "remote": "origin", "tagPrefix": "iter-",
//   "sharedState": true,               // state lives in the main worktree, so every worktree records to one place
//   "state": "state.json", "events": "events.jsonl", "ledger": "../ledger.md",   // relative to the config
//   "progress": { "config": "../progress/config.json",
//                 "inject": { "page": "../../../../dev_plan/status.html", "marker": "PROGRESS", "args": [] } }
// }
//
// Matches: "commit" needs the record on that exact commit (a descendant that only changes the
// controller's own files counts as the same commit); "code" needs it on the same code tree (a hash
// of the files matched by `code`, so commits to docs or the loop do not invalidate a pass);
// "iteration" needs a pass in the current iteration; "stage" a pass since the current stage started
// (with "minTier", a status-refresh of that tier or higher); "after-merge" a pass recorded after the
// last merge into the shared branch (none needed when nothing was merged); "owed" that no status
// refresh is owed (owed by the events in "owes", cleared by `record status-refresh --tier T` of that
// tier or higher, which kit/status-refresh.mjs writes). The latest record wins: a fail after a pass
// on the same code blocks again. The `quality` gate is recorded by kit/evaluate.mjs --record (pass
// when the scorecard says the release gate is met; the record carries the verdict and reasons).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { globToRegExp } from './regressions.mjs';

const KIT = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- git helpers
export function git(cwd, args, { allowFail = false, raw = false } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) {
    if (allowFail) return null;
    throw new Error(`git ${args.join(' ')}: ${(r.stderr || r.stdout || '').trim()}`);
  }
  return raw ? r.stdout : r.stdout.trim();
}

export const repoRoot = (cwd) => git(cwd, ['rev-parse', '--show-toplevel']);

/** Root of the main worktree (the shared checkout), from any worktree of the repository. */
export function mainWorktree(cwd) {
  const out = git(cwd, ['worktree', 'list', '--porcelain'], { allowFail: true });
  const first = out?.split('\n').find((l) => l.startsWith('worktree '));
  return first ? first.slice('worktree '.length) : repoRoot(cwd);
}

export const resolveCommit = (cwd, ref) => git(cwd, ['rev-parse', '--verify', `${ref}^{commit}`]);

/** sha256 (16 hex) over the files of a commit or tree that the `code` globs select. */
export function codeTree(cwd, treeish, code = {}, extraExclude = []) {
  const inc = (code.include ?? ['**']).map(globToRegExp);
  const exc = [...(code.exclude ?? []), ...extraExclude].map(globToRegExp);
  const out = git(cwd, ['ls-tree', '-r', '-z', '--full-tree', treeish], { raw: true });
  const lines = out
    .split('\0')
    .filter(Boolean)
    .filter((l) => {
      const p = l.slice(l.indexOf('\t') + 1);
      return inc.some((r) => r.test(p)) && !exc.some((r) => r.test(p));
    })
    .sort();
  return crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
}

/** Files with uncommitted changes (tracked or untracked) that the `code` globs select. */
export function dirtyCodeFiles(cwd, code = {}, extraExclude = []) {
  const inc = (code.include ?? ['**']).map(globToRegExp);
  const exc = [...(code.exclude ?? []), ...extraExclude].map(globToRegExp);
  const out = git(cwd, ['status', '--porcelain', '-z', '--untracked-files=all'], { raw: true });
  const files = [];
  const parts = out.split('\0').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const st = parts[i].slice(0, 2);
    files.push(parts[i].slice(3));
    if (st[0] === 'R' || st[0] === 'C') i++; // rename source follows
  }
  return files.filter((p) => inc.some((r) => r.test(p)) && !exc.some((r) => r.test(p)));
}

// ---------------------------------------------------------------- config and state
export function findConfig(cwd, explicit) {
  if (explicit) return path.resolve(cwd, explicit);
  if (process.env.DEVLOOP_LOOP_CONFIG) return path.resolve(cwd, process.env.DEVLOOP_LOOP_CONFIG);
  let root;
  try {
    root = repoRoot(cwd);
  } catch {
    return null;
  }
  const inst = path.join(root, 'devloop', 'instances');
  if (!fs.existsSync(inst)) return null;
  const found = fs
    .readdirSync(inst)
    .map((d) => path.join(inst, d, 'loop', 'config.json'))
    .filter((f) => fs.existsSync(f));
  return found.length === 1 ? found[0] : null;
}

/** Everything a command needs: config, where state lives, a clock. */
export function loadLoop({ cwd = process.cwd(), config } = {}) {
  const cfgPath = findConfig(cwd, config);
  if (!cfgPath || !fs.existsSync(cfgPath)) throw new Error('no loop config (pass --config or set DEVLOOP_LOOP_CONFIG)');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const cfgDir = path.dirname(cfgPath);
  const repo = repoRoot(cfgDir);
  const rel = path.relative(repo, cfgDir);
  const stateRoot = cfg.sharedState === false ? repo : mainWorktree(repo);
  // The config's folder, seen from the checkout that holds the state
  const dir = rel.startsWith('..') ? cfgDir : path.join(stateRoot, rel);
  // Before the loop folder reaches the main worktree, the current checkout's state is the state
  const stateFile = cfg.state ?? 'state.json';
  const useDir = dir !== cfgDir && !fs.existsSync(path.resolve(dir, stateFile)) && fs.existsSync(path.resolve(cfgDir, stateFile)) ? cfgDir : dir;
  const at = (p) => (p ? path.resolve(useDir, p) : null);
  return {
    cfg,
    cfgPath,
    repo,
    stateRoot: useDir === cfgDir ? repo : stateRoot,
    dir: useDir,
    loopRel: rel.startsWith('..') ? null : rel.split(path.sep).join('/'),
    paths: {
      state: at(cfg.state ?? 'state.json'),
      events: at(cfg.events ?? 'events.jsonl'),
      ledger: at(cfg.ledger),
      progress: at(cfg.progress?.config),
      page: at(cfg.progress?.inject?.page),
      protocol: cfg.statusProtocol ? path.resolve(cfgDir, cfg.statusProtocol) : null,
    },
    now: () => (process.env.DEVLOOP_NOW ? new Date(process.env.DEVLOOP_NOW) : new Date()),
  };
}

const emptyState = () => ({ version: 1, iteration: null, stage: null, stageSince: null, records: [], merges: [], overrides: [], publishes: [], owed: [], blocked: [] });

export function readState(ctx) {
  if (!fs.existsSync(ctx.paths.state)) return emptyState();
  return { ...emptyState(), ...JSON.parse(fs.readFileSync(ctx.paths.state, 'utf8')) };
}

export function writeState(ctx, state) {
  fs.mkdirSync(path.dirname(ctx.paths.state), { recursive: true });
  const tmp = `${ctx.paths.state}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(tmp, ctx.paths.state);
}

export function appendEvent(ctx, ev) {
  fs.mkdirSync(path.dirname(ctx.paths.events), { recursive: true });
  const line = { t: ctx.now().toISOString(), ...ev };
  fs.appendFileSync(ctx.paths.events, `${JSON.stringify(line)}\n`);
  return line;
}

export function readEvents(ctx) {
  if (!fs.existsSync(ctx.paths.events)) return [];
  return fs
    .readFileSync(ctx.paths.events, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

const loopExclude = (ctx) => (ctx.loopRel ? [`${ctx.loopRel}/**`] : []);
export const codeTreeOf = (ctx, treeish) => codeTree(ctx.repo, treeish, ctx.cfg.code, loopExclude(ctx));

/** The commit the loop is about: the shared branch tip when it exists, else HEAD. */
export function loopTarget(ctx) {
  const b = ctx.cfg.sharedBranch;
  if (b && git(ctx.repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${b}`], { allowFail: true })) return resolveCommit(ctx.repo, `refs/heads/${b}`);
  return resolveCommit(ctx.repo, 'HEAD');
}

// ---------------------------------------------------------------- rules
const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
export const rulesFor = (cfg, action) =>
  Object.entries(cfg.rules ?? {}).filter(([, r]) => asList(r.on).some((on) => on === action || (on.endsWith(':*') && action.startsWith(on.slice(0, -1)))));

// ---------------------------------------------------------------- status refresh tiers (method/status-page.md)
const tierNum = (t) => (t == null ? -1 : Number(String(t).replace(/^T/, '')));

/** Mark a status page refresh of `tier` as owed (cleared by a status-refresh pass of that tier or higher). */
export function owe(ctx, tier, because, state = readState(ctx), { save = true } = {}) {
  const entry = { tier, because, t: ctx.now().toISOString() };
  state.owed = [...(state.owed ?? []), entry];
  if (save) writeState(ctx, state);
  appendEvent(ctx, { kind: 'owed', ...entry });
  return entry;
}

/** The refreshes still owed: entries not cleared by a later status-refresh pass of a high enough tier. */
export function owedNow(state) {
  const passes = state.records.filter((r) => r.gate === 'status-refresh' && r.result === 'pass');
  return (state.owed ?? []).filter((o) => !passes.some((p) => Date.parse(p.t) >= Date.parse(o.t) && tierNum(p.tier) >= tierNum(o.tier)));
}

/** A descendant of `a` that changes only the controller's own files is the same commit for "commit" matches. */
function sameCommit(ctx, a, b) {
  if (a === b) return true;
  if (!ctx.loopRel) return false;
  if (git(ctx.repo, ['merge-base', '--is-ancestor', a, b], { allowFail: true }) === null) return false;
  const changed = git(ctx.repo, ['diff', '--name-only', a, b]).split('\n').filter(Boolean);
  return changed.every((f) => f.startsWith(`${ctx.loopRel}/`));
}

export function activeOverride(ctx, state, rule) {
  const now = ctx.now().getTime();
  return [...state.overrides].reverse().find((o) => o.rule === rule && Date.parse(o.until) > now) ?? null;
}

/** Does a repo path match a `when.paths` entry? "ui/" (or "ui") is a folder prefix; globs use *, ** and ?. */
export function pathMatches(file, patterns) {
  return patterns.some((p) => {
    if (/[*?]/.test(p)) return globToRegExp(p).test(file);
    const dir = p.replace(/\/+$/, '');
    return file === dir || file.startsWith(`${dir}/`);
  });
}

/**
 * The paths a change touches, for rules with `when.paths`: against `base` (default the shared
 * branch, else HEAD) either the given tree-ish (a merge result: exact) or the commit's changes
 * since the merge base (base...commit, what merging it would bring).
 */
export function changedPathsOf(ctx, { base, tree, commit }) {
  const b = base ?? (ctx.cfg.sharedBranch && git(ctx.repo, ['rev-parse', '--verify', '--quiet', ctx.cfg.sharedBranch], { allowFail: true }) ? ctx.cfg.sharedBranch : 'HEAD');
  const args = tree ? ['diff', '--name-only', b, tree] : ['diff', '--name-only', `${b}...${commit}`];
  return (git(ctx.repo, args, { allowFail: true }) ?? '').split('\n').filter(Boolean);
}

/**
 * Evaluate every rule that applies to `action`. opts: commit (sha or ref), tree (tree-ish for
 * code matches, e.g. a merge result), codeTree (precomputed hash), paths (the changed paths, for
 * rules with `when.paths`; computed from base/tree/commit when not given), base (default: sharedBranch).
 */
export function evaluate(ctx, action, opts = {}, state = readState(ctx)) {
  const results = [];
  let commit = null;
  let ct = opts.codeTree ?? null;
  const target = () => {
    if (!commit) commit = opts.commit ? resolveCommit(ctx.repo, opts.commit) : loopTarget(ctx);
    return commit;
  };
  const tree = () => {
    if (!ct) ct = codeTreeOf(ctx, opts.tree ?? target());
    return ct;
  };
  let changed = opts.paths ?? null;
  const changedPaths = () => {
    if (!changed) changed = changedPathsOf(ctx, { base: opts.base, tree: opts.tree, commit: target() });
    return changed;
  };
  for (const [id, rule] of rulesFor(ctx.cfg, action)) {
    // "when": { "paths": [...] }: the rule applies only when the change touches one of these paths
    // "when": { "outside": [...] }: the rule applies only when the change touches a code file
    // (config "code") outside these paths; with both keys, either one makes the rule apply
    if (rule.when?.paths || rule.when?.outside) {
      const files = changedPaths();
      const hits = rule.when.paths ? files.filter((f) => pathMatches(f, asList(rule.when.paths))) : [];
      const code = asList(ctx.cfg.code?.include ?? []);
      const beyond = rule.when.outside ? files.filter((f) => (!code.length || pathMatches(f, code)) && !pathMatches(f, asList(rule.when.outside))) : [];
      if (!hits.length && !beyond.length) {
        const parts = [];
        if (rule.when.paths) parts.push(`the change touches none of ${asList(rule.when.paths).join(', ')}`);
        if (rule.when.outside) parts.push(`every code file it touches is within ${asList(rule.when.outside).join(', ')}`);
        results.push({ rule: id, ok: true, why: rule.why, detail: `not applicable: ${parts.join('; ')}`, skipped: true });
        continue;
      }
    }
    const recs = state.records.filter((r) => r.gate === rule.gate && (rule.minTier == null || tierNum(r.tier) >= tierNum(rule.minTier)));
    let pool;
    let what;
    const match = rule.match ?? 'code';
    if (match === 'commit') {
      pool = recs.filter((r) => sameCommit(ctx, r.commit, target()));
      what = `commit ${target().slice(0, 9)}`;
    } else if (match === 'code') {
      pool = recs.filter((r) => r.codeTree === tree());
      what = `code tree ${tree()}${opts.tree ? ` (of ${String(opts.tree).slice(0, 12)})` : ` (commit ${target().slice(0, 9)})`}`;
    } else if (match === 'iteration') {
      pool = recs.filter((r) => r.iteration === state.iteration);
      what = `iteration ${state.iteration}`;
    } else if (match === 'owed') {
      const owed = owedNow(state);
      let ok = owed.length === 0;
      let detail = ok ? 'no status refresh owed' : `status refresh owed: ${owed.map((o) => `${o.tier} (${o.because}, ${o.t})`).join('; ')}`;
      let overridden = null;
      if (!ok) {
        overridden = activeOverride(ctx, state, id);
        if (overridden) {
          ok = true;
          detail += `; overridden until ${overridden.until}: ${overridden.reason}`;
        }
      }
      results.push({ rule: id, ok, why: rule.why, detail, overridden: overridden ? overridden.t : undefined });
      continue;
    } else if (match === 'stage') {
      pool = recs.filter((r) => state.stageSince && Date.parse(r.t) >= Date.parse(state.stageSince));
      what = `since ${state.stage} started (${state.stageSince})${rule.minTier ? `, tier ${rule.minTier} or higher` : ''}`;
    } else if (match === 'after-merge') {
      const last = state.merges.at(-1);
      if (!last) {
        results.push({ rule: id, ok: true, why: rule.why, detail: 'no merge recorded' });
        continue;
      }
      pool = recs.filter((r) => Date.parse(r.t) > Date.parse(last.t));
      what = `after the merge of ${last.branch} at ${last.t}`;
    } else throw new Error(`rule ${id}: unknown match ${match}`);
    const latest = pool.sort((a, b) => Date.parse(a.t) - Date.parse(b.t)).at(-1);
    let ok = latest != null && asList(rule.accept ?? 'pass').includes(latest.result);
    let detail = latest ? `${rule.gate} ${latest.result}${latest.verdict ? ` (${latest.verdict})` : ''} on ${what} at ${latest.t}` : `no ${rule.gate} record on ${what}`;
    let overridden = null;
    if (!ok) {
      overridden = activeOverride(ctx, state, id);
      if (overridden) {
        ok = true;
        detail += `; overridden until ${overridden.until}: ${overridden.reason}`;
      }
    }
    results.push({ rule: id, ok, why: rule.why, detail, overridden: overridden ? overridden.t : undefined });
  }
  return { action, ok: results.every((r) => r.ok), results, commit, codeTree: ct };
}

export function legalNext(cfg, stage) {
  if (stage == null) return [cfg.stages[0]];
  const t = cfg.transitions?.[stage];
  if (t) return t;
  const i = cfg.stages.indexOf(stage);
  return [cfg.stages[(i + 1) % cfg.stages.length]];
}

// ---------------------------------------------------------------- progress (devloop/kit/progress.mjs)
export function progress(ctx, args, { inject = true } = {}) {
  if (!ctx.paths.progress) return [];
  const script = path.join(KIT, 'progress.mjs');
  const notes = [];
  const run = (a) => {
    const r = spawnSync(process.execPath, [script, ctx.paths.progress, ...a], { cwd: ctx.stateRoot, encoding: 'utf8' });
    if (r.status !== 0) {
      const err = (r.stderr || r.stdout || r.error?.message || '').trim();
      const lines = err.split('\n').filter((l) => !/^\s*at |^Node\.js v|^\s*$|^\s*\^+\s*$/.test(l));
      const why = lines.find((l) => /Error/.test(l)) ?? lines.at(-1) ?? 'no output';
      notes.push(`progress ${a.join(' ')} failed: ${why}${err && lines.length > 1 ? `\n${err}` : ''}`);
    }
    return r.status === 0;
  };
  if (args) run([...args, '--no-usage', '--no-record']);
  const inj = ctx.cfg.progress?.inject;
  if (inject && inj && ctx.paths.page && fs.existsSync(ctx.paths.page)) run(['--inject', ctx.paths.page, inj.marker ?? 'PROGRESS', ...(inj.args ?? [])]);
  for (const n of notes) console.error(`warning: ${n}`);
  return notes;
}

// ---------------------------------------------------------------- commands
export function init(ctx, { iteration, stage, since }) {
  const state = readState(ctx);
  if (state.stage) throw new Error(`state already exists (iteration ${state.iteration}, ${state.stage})`);
  if (!ctx.cfg.stages.includes(stage)) throw new Error(`unknown stage ${stage}`);
  const now = ctx.now().toISOString();
  if (!Number.isInteger(Number(iteration)) || iteration === undefined) throw new Error('init needs --iteration N');
  Object.assign(state, { iteration: Number(iteration), stage, stageSince: since ? new Date(since).toISOString() : now });
  writeState(ctx, state);
  appendEvent(ctx, { kind: 'init', iteration: state.iteration, stage, since: state.stageSince });
  return state;
}

export function advance(ctx, to) {
  const state = readState(ctx);
  if (!state.stage) throw new Error('no state yet: run `loop init --iteration N --stage S` first');
  const { stages } = ctx.cfg;
  const from = state.stage;
  const legal = legalNext(ctx.cfg, from);
  const dest = to ?? legal[0];
  if (!stages.includes(dest)) throw new Error(`unknown stage ${dest} (stages: ${stages.join(', ')})`);
  const transRule = `transition:${from}->${dest}`;
  let viaOverride = null;
  if (!legal.includes(dest)) {
    viaOverride = activeOverride(ctx, state, transRule);
    if (!viaOverride) throw new Error(`${from} -> ${dest} is not a legal transition (legal: ${legal.join(', ')}); override rule "${transRule}" with a reason if this is a deliberate call`);
  }
  const check = evaluate(ctx, `enter:${dest}`, {}, state);
  if (!check.ok) {
    const e = new Error(`cannot enter ${dest}:\n${formatResults(check)}`);
    e.check = check;
    throw e;
  }
  const newIteration = dest === stages[0] && from !== null;
  const iteration = newIteration ? state.iteration + 1 : state.iteration;
  const fi = stages.indexOf(from);
  const di = stages.indexOf(dest);
  const skipped = !newIteration && di > fi ? stages.slice(fi + 1, di) : [];
  const now = ctx.now().toISOString();
  Object.assign(state, { iteration, stage: dest, stageSince: now });
  writeState(ctx, state);
  // Leaving some stages owes a status refresh (config "owes": { "exit:Use": "T2", ... })
  const owes = ctx.cfg.owes?.[`exit:${from}`];
  if (owes) owe(ctx, owes, `${from} done`, state);
  const ev = appendEvent(ctx, {
    kind: 'transition',
    from,
    to: dest,
    iteration,
    skipped: skipped.length ? skipped : undefined,
    overrides: [viaOverride?.t, ...check.results.filter((r) => r.overridden).map((r) => r.overridden)].filter(Boolean),
  });
  if (newIteration) progress(ctx, ['--end-all', '--iteration', String(iteration - 1), '--note', `closed when iteration ${iteration} started`, '--at', now], { inject: false });
  for (const s of skipped) progress(ctx, ['--skip', s, '--iteration', String(iteration), '--at', now], { inject: false });
  progress(ctx, ['--start', dest, '--iteration', String(iteration), '--at', now]);
  return { state, event: ev, check };
}

export function record(ctx, { gate, result, commit = 'HEAD', evidence, note, codeTree: given, extra }) {
  const gates = ctx.cfg.gates ?? [];
  if (!gates.includes(gate)) throw new Error(`unknown gate ${gate} (gates: ${gates.join(', ')})`);
  if (result !== 'pass' && result !== 'fail') throw new Error('--result must be pass or fail');
  if (result === 'pass' && !evidence) throw new Error('a pass needs --evidence <path>');
  if (evidence && !fs.existsSync(path.resolve(evidence))) throw new Error(`evidence ${evidence} does not exist`);
  const state = readState(ctx);
  const sha = resolveCommit(ctx.repo, commit);
  const rec = {
    gate,
    result,
    commit: sha,
    codeTree: given ?? codeTreeOf(ctx, sha),
    evidence: evidence ? path.relative(ctx.repo, path.resolve(evidence)).split(path.sep).join('/') : undefined,
    note,
    t: ctx.now().toISOString(),
    iteration: state.iteration,
    stage: state.stage,
    ...extra,
  };
  state.records.push(rec);
  writeState(ctx, state);
  appendEvent(ctx, { kind: 'record', ...rec });
  return rec;
}

/** Track something that blocks the loop (shown on the status page as a blocker). */
export function block(ctx, { id, what, needs }) {
  if (!id || !what) throw new Error('usage: loop block <id> --what "..." [--needs "..."]');
  const state = readState(ctx);
  state.blocked = [...(state.blocked ?? []).filter((b) => b.id !== id), { id, what, needs, since: ctx.now().toISOString(), status: 'open' }];
  writeState(ctx, state);
  appendEvent(ctx, { kind: 'block', id, what, needs });
}

export function unblock(ctx, { id, resolution }) {
  const state = readState(ctx);
  const b = (state.blocked ?? []).find((x) => x.id === id);
  if (!b) throw new Error(`no blocker ${id}`);
  Object.assign(b, { status: 'resolved', resolution, resolved: ctx.now().toISOString() });
  writeState(ctx, state);
  appendEvent(ctx, { kind: 'unblock', id, resolution });
}

const isOverridable = (cfg, rule) => Object.hasOwn(cfg.rules ?? {}, rule) || /^transition:\S+->\S+$/.test(rule) || /^guard:[a-z-]+$/.test(rule);

export function override(ctx, { rule, reason, ttl = 60 }) {
  if (!isOverridable(ctx.cfg, rule)) throw new Error(`unknown rule ${rule} (rules: ${Object.keys(ctx.cfg.rules ?? {}).join(', ')}, transition:<From>-><To>, guard:<name>)`);
  if (!reason || !String(reason).trim()) throw new Error('an override needs --reason "..."');
  const state = readState(ctx);
  const now = ctx.now();
  const o = { rule, reason: String(reason).trim(), t: now.toISOString(), until: new Date(now.getTime() + Number(ttl) * 60000).toISOString(), iteration: state.iteration, stage: state.stage };
  state.overrides.push(o);
  writeState(ctx, state);
  appendEvent(ctx, { kind: 'override', ...o });
  const row = ctx.paths.ledger ? appendLedgerDraft(ctx, o) : null;
  return { override: o, ledgerRow: row };
}

function appendLedgerDraft(ctx, o) {
  const file = ctx.paths.ledger;
  const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const ids = [...src.matchAll(/^\|\s*D-(\d+)\s*\|/gm)].map((m) => Number(m[1]));
  const id = `D-${ids.length ? Math.max(...ids) + 1 : 1}`;
  const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ');
  const row = `| ${id} | ${o.t.slice(0, 10)} | process | DRAFT: override of loop rule \`${cell(o.rule)}\` at ${o.stage ?? '?'} (iteration ${o.iteration ?? '?'}), valid until ${o.until}: ${cell(o.reason)} | loop events.jsonl ${o.t} | Follow the rule | The loop continues past a rule the owner or Group Manager chose to skip | The skipped check finds a problem later | Draft: Group Manager completes or supersedes |`;
  fs.appendFileSync(file, `${src && !src.endsWith('\n') ? '\n' : ''}${row}\n`);
  return row;
}

export function formatResults(check) {
  return check.results.map((r) => `  ${r.skipped ? 'skip' : r.ok ? 'ok  ' : 'FAIL'} ${r.rule}: ${r.detail}${!r.ok && r.why ? `\n       why: ${r.why}` : ''}`).join('\n') || '  (no rules)';
}

function status(ctx) {
  const state = readState(ctx);
  const lines = [];
  lines.push(`Iteration ${state.iteration ?? '?'}, stage ${state.stage ?? '(none)'} since ${state.stageSince ?? '?'}`);
  let target = null;
  try {
    target = loopTarget(ctx);
  } catch {}
  if (target) {
    const ct = codeTreeOf(ctx, target);
    lines.push(`Target ${ctx.cfg.sharedBranch ?? 'HEAD'} at ${target.slice(0, 9)}, code tree ${ct}`);
    for (const g of ctx.cfg.gates ?? []) {
      const last = state.records.filter((r) => r.gate === g).at(-1);
      if (!last) continue;
      const on = last.commit === target ? 'this commit' : last.codeTree === ct ? 'this code tree' : `other code (${last.commit.slice(0, 9)})`;
      lines.push(`  ${g.padEnd(15)} last ${last.result} on ${on} at ${last.t}`);
    }
  }
  const last = state.merges.at(-1);
  if (last) {
    const refreshed = state.records.some((r) => r.gate === 'status-refresh' && r.result === 'pass' && Date.parse(r.t) > Date.parse(last.t));
    lines.push(`Last merge: ${last.branch} at ${last.t}${refreshed ? '' : ' (status refresh owed)'}`);
  }
  for (const o of owedNow(state)) lines.push(`Status refresh owed: ${o.tier} (${o.because}, since ${o.t})`);
  for (const b of (state.blocked ?? []).filter((x) => x.status === 'open')) lines.push(`Blocked: ${b.id} ${b.what}${b.needs ? ` (needs ${b.needs})` : ''}`);
  const live = state.overrides.filter((o) => Date.parse(o.until) > ctx.now().getTime());
  for (const o of live) lines.push(`Override active: ${o.rule} until ${o.until} (${o.reason})`);
  if (state.stage) {
    lines.push('Next:');
    for (const s of legalNext(ctx.cfg, state.stage)) {
      const c = evaluate(ctx, `enter:${s}`, {}, state);
      lines.push(`  ${s}: ${c.ok ? 'ready' : 'blocked'}`);
      if (c.results.length) lines.push(formatResults(c).replace(/^/gm, '  '));
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------- CLI
function parseCli(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      if (v !== undefined) opt[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) opt[k] = argv[++i];
      else opt[k] = true;
    } else pos.push(a);
  }
  return { pos, opt };
}

export function main(argv, cwd = process.cwd()) {
  const cmdIdx = argv.findIndex((a, i) => !a.startsWith('--') && argv[i - 1] !== '--config');
  const cmd = argv[cmdIdx];
  // progress passes its options through untouched
  if (cmd === 'progress') {
    const ci = argv.indexOf('--config');
    const ctx = loadLoop({ cwd, config: ci >= 0 && ci < cmdIdx ? argv[ci + 1] : undefined });
    const state = readState(ctx);
    const rest = argv.slice(cmdIdx + 1);
    const args = rest.includes('--iteration') || ['--pause', '--resume'].some((f) => rest.includes(f)) ? rest : [...rest, '--iteration', String(state.iteration)];
    const notes = progress(ctx, args);
    appendEvent(ctx, { kind: 'progress', args: rest, iteration: state.iteration, stage: state.stage });
    return notes.length ? 1 : 0;
  }
  const { pos, opt } = parseCli(argv);
  const ctx = loadLoop({ cwd, config: opt.config });
  switch (pos[0]) {
    case 'status':
    case undefined:
      console.log(status(ctx));
      return 0;
    case 'init':
      init(ctx, { iteration: opt.iteration, stage: opt.stage, since: opt.since });
      console.log(`initialised: iteration ${opt.iteration}, ${opt.stage}`);
      return 0;
    case 'start':
    case 'advance': {
      const to = pos[0] === 'start' ? pos[1] : opt.to;
      if (pos[0] === 'start' && !to) throw new Error('usage: loop start <Stage>');
      const { state, event } = advance(ctx, to);
      console.log(`iteration ${state.iteration}: ${event.from} -> ${event.to}${event.skipped ? ` (skipped ${event.skipped.join(', ')})` : ''}`);
      return 0;
    }
    case 'record': {
      const extra = { ...(opt.tier ? { tier: opt.tier } : {}), ...(opt.verdict ? { verdict: opt.verdict } : {}) };
      const rec = record(ctx, { gate: pos[1], result: opt.result, commit: opt.commit ?? 'HEAD', evidence: opt.evidence, note: opt.note, extra: Object.keys(extra).length ? extra : undefined });
      console.log(`recorded ${rec.gate} ${rec.result} on ${rec.commit.slice(0, 9)} (code tree ${rec.codeTree})`);
      return 0;
    }
    case 'check': {
      if (!pos[1]) throw new Error('usage: loop check <action> [--commit sha] [--tree tree-ish] [--base ref]');
      const c = evaluate(ctx, pos[1], { commit: opt.commit, tree: opt.tree, base: opt.base });
      if (c.results.some((r) => r.overridden)) appendEvent(ctx, { kind: 'override-used', action: pos[1], rules: c.results.filter((r) => r.overridden).map((r) => r.rule) });
      if (c.ok) {
        if (!opt.quiet) console.log(`ok: ${pos[1]}\n${formatResults(c)}`);
        return 0;
      }
      console.error(`blocked: ${pos[1]}\n${formatResults(c)}\nRecord the missing gate, or \`loop override <rule> --reason "..."\` if this is a deliberate call.`);
      return 1;
    }
    case 'override': {
      const { override: o, ledgerRow } = override(ctx, { rule: pos[1], reason: opt.reason, ttl: opt.ttl ?? 60 });
      console.log(`override ${o.rule} until ${o.until}${ledgerRow ? '\nledger draft appended; complete it before the next Report' : ''}`);
      return 0;
    }
    case 'block':
      block(ctx, { id: pos[1], what: opt.what, needs: opt.needs });
      console.log(`blocked: ${pos[1]}`);
      return 0;
    case 'unblock':
      unblock(ctx, { id: pos[1], resolution: opt.resolution });
      console.log(`resolved: ${pos[1]}`);
      return 0;
    case 'log': {
      for (const e of readEvents(ctx).slice(-Number(opt.n ?? 20))) console.log(JSON.stringify(e));
      return 0;
    }
    default:
      throw new Error(`unknown command ${pos[0]} (status, init, start, advance, record, check, override, block, unblock, progress, log)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`loop: ${e.message}`);
    process.exitCode = 2;
  }
}

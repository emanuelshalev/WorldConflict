#!/usr/bin/env node
// Claude Code PreToolUse hook for the Bash tool: blocks git commands that have damaged the shared
// checkout (the main worktree, where several agents' files can sit uncommitted):
//   guard:pull-rebase         git pull --rebase / -r / --rebase=<mode> / -c pull.rebase=true
//   guard:autostash           --autostash anywhere, or -c rebase.autostash=true (it sweeps other agents' files)
//   guard:multipath-checkout  git checkout|restore --theirs/--ours with more than one path, a directory or a glob
// Linked worktrees are not guarded (an agent's own worktree is its own business). A rule can be lifted
// for a while with `node devloop/kit/loop.mjs override guard:<name> --reason "..."`.
//
// Reads the hook JSON ({ cwd, tool_name, tool_input: { command } }) on stdin; on a block prints the
// reason on stderr and exits 2 (Claude Code shows it to the model), otherwise exits 0.
// Plain Node (18+), no dependencies. Installation: devloop/kit/hooks/README.md.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Split a shell line into simple commands of words (quotes, escapes; operators separate). */
export function splitCommands(line) {
  const cmds = [];
  let words = [];
  let w = null;
  const endWord = () => {
    if (w !== null) words.push(w);
    w = null;
  };
  const endCmd = () => {
    endWord();
    if (words.length) cmds.push(words);
    words = [];
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'") {
      const j = line.indexOf("'", i + 1);
      w = (w ?? '') + line.slice(i + 1, j < 0 ? line.length : j);
      i = j < 0 ? line.length : j;
    } else if (c === '"') {
      let s = '';
      let j = i + 1;
      for (; j < line.length && line[j] !== '"'; j++) {
        if (line[j] === '\\' && j + 1 < line.length) s += line[++j];
        else s += line[j];
      }
      w = (w ?? '') + s;
      i = j;
    } else if (c === '\\' && i + 1 < line.length) {
      if (line[i + 1] === '\n') i++;
      else w = (w ?? '') + line[++i];
    } else if (c === ';' || c === '&' || c === '|' || c === '\n' || c === '(' || c === ')') endCmd();
    else if (c === ' ' || c === '\t') endWord();
    else w = (w ?? '') + c;
  }
  endCmd();
  return cmds;
}

const WRAPPERS = new Set(['sudo', 'env', 'command', 'time', 'nice', 'nohup', 'exec']);

/** { dirArg, globals: [[k, v]], sub, args } for a git invocation, or null. */
export function parseGit(words) {
  let i = 0;
  while (i < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || WRAPPERS.has(words[i]))) i++;
  if (i >= words.length || path.basename(words[i]) !== 'git') return null;
  i++;
  const dirs = [];
  const configs = [];
  while (i < words.length && words[i].startsWith('-')) {
    const o = words[i];
    if (o === '-C') dirs.push(words[++i]);
    else if (o === '-c') configs.push(words[++i] ?? '');
    else if (o === '--git-dir' || o === '--work-tree' || o === '--namespace') i++;
    i++;
  }
  return { dirs, configs, sub: words[i] ?? null, args: words.slice(i + 1) };
}

const isTrue = (v) => /^(true|yes|on|1|merges|interactive|i)$/i.test(v ?? '');
const cfgSet = (configs, key) => configs.some((c) => c.split('=')[0].toLowerCase() === key && isTrue(c.split('=').slice(1).join('=') || 'true'));

/** Violations in one parsed git command: [{ rule, reason }]. `isDir(p)` tells directories apart. */
export function gitViolations(g, isDir = () => false) {
  const out = [];
  if (!g?.sub) return out;
  const { sub, args, configs } = g;
  if (sub === 'pull') {
    const rebase = args.some((a) => a === '--rebase' || a === '-r' || (a.startsWith('--rebase=') && !/^--rebase=(false|no|0)$/i.test(a)) || /^-[a-z]*r[a-z]*$/.test(a)) && !args.includes('--no-rebase');
    if (rebase || cfgSet(configs, 'pull.rebase')) out.push({ rule: 'guard:pull-rebase', reason: 'git pull --rebase rewrites the shared checkout under other agents; use `git pull --ff-only` (or merge) instead' });
  }
  if (args.includes('--autostash') || cfgSet(configs, 'rebase.autostash') || cfgSet(configs, 'merge.autostash')) {
    out.push({ rule: 'guard:autostash', reason: '--autostash stashes and re-applies every uncommitted file in the shared checkout, including other agents\' work; commit or move your own changes first' });
  }
  if ((sub === 'checkout' || sub === 'restore') && args.some((a) => a === '--theirs' || a === '--ours')) {
    const paths = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--') {
        paths.push(...args.slice(i + 1));
        break;
      }
      if (a.startsWith('-')) {
        if (a === '-s' || a === '--source') i++;
        continue;
      }
      paths.push(a);
    }
    const wide = paths.filter((p) => p === '.' || p === ':/' || /[*?[]/.test(p) || isDir(p));
    if (paths.length > 1 || wide.length) {
      out.push({ rule: 'guard:multipath-checkout', reason: `\`git ${sub} --theirs/--ours\` on ${paths.length > 1 ? `${paths.length} paths` : `"${wide[0]}"`} resolves many files blindly; resolve conflicted files one by one` });
    }
  }
  return out;
}

const expandHome = (p) => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

/** Walk the command line: [{ rule, reason, dir }] with the directory each git command runs in. */
export function findViolations(command, cwd = process.cwd()) {
  const found = [];
  let dir = cwd;
  for (const words of splitCommands(command)) {
    if (words[0] === 'cd' && words[1]) {
      dir = path.resolve(dir, expandHome(words[1]));
      continue;
    }
    if (/^(ba|z|da)?sh$/.test(path.basename(words[0])) && words[1] === '-c' && words[2]) {
      found.push(...findViolations(words[2], dir));
      continue;
    }
    const g = parseGit(words);
    if (!g) continue;
    const gdir = g.dirs.reduce((d, x) => path.resolve(d, expandHome(x)), dir);
    const isDir = (p) => {
      try {
        return fs.statSync(path.resolve(gdir, p)).isDirectory();
      } catch {
        return false;
      }
    };
    for (const v of gitViolations(g, isDir)) found.push({ ...v, dir: gdir });
  }
  return found;
}

/** True when `dir` is inside the main worktree of its repository (not a linked worktree). */
export function isSharedCheckout(dir) {
  const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir'], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) return false;
  const [gd, common] = r.stdout.trim().split('\n');
  return path.resolve(gd) === path.resolve(common);
}

async function overridden(dir, rule) {
  try {
    const loop = await import('../loop.mjs');
    const ctx = loop.loadLoop({ cwd: dir });
    return loop.activeOverride(ctx, loop.readState(ctx), rule);
  } catch {
    return null;
  }
}

/** Decide on one hook input: { block, reasons }. */
export async function guard(input, { shared = isSharedCheckout } = {}) {
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !command.includes('git')) return { block: false, reasons: [] };
  const reasons = [];
  for (const v of findViolations(command, input.cwd || process.cwd())) {
    if (!fs.existsSync(v.dir) || !shared(v.dir)) continue;
    if (await overridden(v.dir, v.rule)) continue;
    reasons.push(`${v.rule}: ${v.reason}`);
  }
  return { block: reasons.length > 0, reasons };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    raw += d;
  });
  process.stdin.on('end', async () => {
    let input;
    try {
      input = JSON.parse(raw || '{}');
    } catch {
      process.exit(0); // not our input: never block on a parse problem
    }
    const { block, reasons } = await guard(input);
    if (block) {
      process.stderr.write(`Blocked in the shared checkout (devloop guard):\n${reasons.map((r) => `- ${r}`).join('\n')}\nIf this is a deliberate call: node devloop/kit/loop.mjs override <rule> --reason "..."\n`);
      process.exit(2);
    }
    process.exit(0);
  });
}

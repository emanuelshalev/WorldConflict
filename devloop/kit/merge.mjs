#!/usr/bin/env node
// Merge a work branch into the shared branch, only when the loop controller allows it: the
// `merge` rules are checked against the merge result's code tree, computed before anything is
// touched (git merge-tree). The usual way to satisfy them: merge the shared branch into the work
// branch, run `npm run verify` there (it records the pass), then run this. After the merge the
// status refresh is owed (rules matching "after-merge").
//
//   node devloop/kit/merge.mjs <branch> [--config <loop config>] [-m "message"] [--dry-run]
//
// Run it in the checkout that has the shared branch checked out. It refuses a dirty tracked file
// (no autostash, ever) and a conflicting merge (resolve in the work branch, file by file).
import { pathToFileURL } from 'node:url';
import * as loop from './loop.mjs';

export function merge({ cwd = process.cwd(), config, branch, message, dryRun = false, log = console.log } = {}) {
  if (!branch) throw new Error('usage: merge.mjs <branch> [-m message]');
  const ctx = loop.loadLoop({ cwd, config });
  const repo = loop.repoRoot(cwd);
  const shared = ctx.cfg.sharedBranch;
  const current = loop.git(repo, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFail: true });
  if (shared && current !== shared) throw new Error(`run this in the checkout of ${shared} (this one is on ${current ?? 'a detached HEAD'})`);
  // The controller's own state files change all the time in the shared checkout: they do not count
  const dirty = loop
    .git(repo, ['status', '--porcelain', '--untracked-files=no'], { raw: true })
    .split('\n')
    .filter(Boolean)
    .filter((l) => !(ctx.loopRel && l.slice(3).startsWith(`${ctx.loopRel}/`)));
  if (dirty.length) throw new Error(`tracked files have uncommitted changes (${dirty.slice(0, 3).map((l) => l.slice(3)).join(', ')}${dirty.length > 3 ? ', ...' : ''}); commit them or move them, never stash someone else's work`);
  const head = loop.resolveCommit(repo, 'HEAD');
  const theirs = loop.resolveCommit(repo, branch);
  if (loop.git(repo, ['merge-base', '--is-ancestor', theirs, head], { allowFail: true }) !== null) throw new Error(`${branch} is already merged`);
  const mt = loop.git(repo, ['merge-tree', '--write-tree', head, theirs], { allowFail: true });
  if (mt === null) throw new Error(`${branch} conflicts with ${shared ?? 'HEAD'}: merge ${shared ?? 'it'} into ${branch}, resolve file by file, verify, then retry`);
  const tree = mt.split('\n')[0];
  const ct = loop.codeTreeOf(ctx, tree);
  const check = loop.evaluate(ctx, 'merge', { tree, codeTree: ct, commit: theirs });
  if (!check.ok) throw new Error(`merge of ${branch} refused:\n${loop.formatResults(check)}\nVerify the merge result: merge ${shared ?? 'the shared branch'} into ${branch}, run \`npm run verify\` there, then retry.`);
  if (check.results.some((r) => r.overridden)) loop.appendEvent(ctx, { kind: 'override-used', action: 'merge', rules: check.results.filter((r) => r.overridden).map((r) => r.rule) });
  const msg = message ?? `merge: ${branch}`;
  log(`${dryRun ? '[dry run] ' : ''}git merge --no-ff -m "${msg}" ${branch}`);
  if (dryRun) return { tree, codeTree: ct, commit: null };
  loop.git(repo, ['merge', '--no-ff', '--no-edit', '-m', msg, theirs]);
  const commit = loop.resolveCommit(repo, 'HEAD');
  const got = loop.git(repo, ['rev-parse', 'HEAD^{tree}']);
  const st = loop.readState(ctx);
  const entry = { t: ctx.now().toISOString(), branch, commit, codeTree: ct, iteration: st.iteration, stage: st.stage, treeMatches: got === tree };
  st.merges.push(entry);
  loop.writeState(ctx, st);
  loop.appendEvent(ctx, { kind: 'merge', ...entry });
  log(`merged ${branch} at ${commit.slice(0, 9)}; status refresh owed (refresh the status page, then \`loop record status-refresh --result pass --evidence <page>\`)`);
  return { tree, codeTree: ct, commit };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const opt = (...ks) => {
    const i = argv.findIndex((a) => ks.includes(a));
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const branch = argv.find((a, i) => !a.startsWith('-') && !(i > 0 && ['--config', '-m', '--message'].includes(argv[i - 1])));
  try {
    merge({ branch, config: opt('--config'), message: opt('-m', '--message'), dryRun: argv.includes('--dry-run') });
  } catch (e) {
    console.error(`merge: ${e.message}`);
    process.exitCode = 1;
  }
}

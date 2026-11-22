#!/usr/bin/env node
// Publish a finished iteration: fast-forward the publish branch (main) to the iteration commit,
// tag it <tagPrefix>N and push both. Refuses unless the loop controller's `publish` rules hold for
// that commit (by default a verify pass recorded on that exact commit). Replaces the manual steps
// of "fast-forward main and tag iter-N".
//
//   node devloop/kit/publish.mjs [--config <loop config>] [--commit <ref>] [--iteration N]
//                                [--no-push] [--dry-run] [--no-refresh]
//
// --commit defaults to the shared branch tip, --iteration to the controller's current iteration.
// Never touches a working tree: the branch moves with update-ref (refused when the publish branch
// is checked out in some worktree), so it is safe to run from any checkout. Afterwards it owes and
// runs the status refresh tier of `owes.publish` (see merge.mjs).
import { pathToFileURL } from 'node:url';
import * as loop from './loop.mjs';
import { autoRefresh } from './status-refresh.mjs';

export function publish({ cwd = process.cwd(), config, commit, iteration, push = true, dryRun = false, log = console.log } = {}) {
  const ctx = loop.loadLoop({ cwd, config });
  const { cfg, repo } = ctx;
  const state = loop.readState(ctx);
  const branch = cfg.publishBranch ?? 'main';
  const remote = cfg.remote ?? 'origin';
  const n = iteration ?? state.iteration;
  if (n == null) throw new Error('no iteration: pass --iteration N or initialise the loop state');
  const tag = `${cfg.tagPrefix ?? 'iter-'}${n}`;
  const sha = commit ? loop.resolveCommit(repo, commit) : loop.loopTarget(ctx);

  const check = loop.evaluate(ctx, 'publish', { commit: sha }, state);
  if (!check.ok) throw new Error(`publish of ${sha.slice(0, 9)} refused:\n${loop.formatResults(check)}\nRun \`npm run verify\` on that commit (it records the result), or override with a reason.`);
  if (check.results.some((r) => r.overridden)) loop.appendEvent(ctx, { kind: 'override-used', action: 'publish', rules: check.results.filter((r) => r.overridden).map((r) => r.rule) });

  const old = loop.git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { allowFail: true });
  if (old && loop.git(repo, ['merge-base', '--is-ancestor', old, sha], { allowFail: true }) === null) throw new Error(`${branch} (${old.slice(0, 9)}) is not an ancestor of ${sha.slice(0, 9)}: not a fast-forward`);
  const wt = loop.git(repo, ['worktree', 'list', '--porcelain']);
  if (wt.split('\n').includes(`branch refs/heads/${branch}`)) throw new Error(`${branch} is checked out in a worktree; switch that worktree away first (moving it would desync its files)`);
  const existingTag = loop.git(repo, ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`], { allowFail: true });
  if (existingTag && existingTag !== sha) throw new Error(`tag ${tag} already points at ${existingTag.slice(0, 9)}`);

  const steps = [
    old === sha ? null : ['update-ref', `refs/heads/${branch}`, sha, old ?? ''],
    existingTag ? null : ['tag', '-a', tag, sha, '-m', `Iteration ${n}`],
    push ? ['push', '--atomic', remote, `refs/heads/${branch}:refs/heads/${branch}`, `refs/tags/${tag}:refs/tags/${tag}`] : null,
  ].filter(Boolean);
  for (const s of steps) {
    log(`${dryRun ? '[dry run] ' : ''}git ${s.join(' ')}`);
    if (!dryRun) loop.git(repo, s);
  }
  if (!dryRun) {
    const st = loop.readState(ctx);
    const entry = { t: ctx.now().toISOString(), iteration: n, commit: sha, tag, branch, pushed: push };
    st.publishes.push(entry);
    loop.writeState(ctx, st);
    loop.appendEvent(ctx, { kind: 'publish', ...entry });
  }
  const owes = !dryRun ? (cfg.owes?.publish ?? null) : null;
  if (owes) loop.owe(ctx, owes, `publish of ${tag}`);
  return { sha, tag, branch, steps, owes, ctx };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const opt = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    const r = publish({ config: opt('config'), commit: opt('commit'), iteration: opt('iteration') == null ? undefined : Number(opt('iteration')), push: !argv.includes('--no-push'), dryRun: argv.includes('--dry-run') });
    console.log(`published ${r.branch} and ${r.tag} at ${r.sha.slice(0, 9)}${r.owes ? `; status refresh ${r.owes} owed` : ''}`);
    if (r.owes && !argv.includes('--no-refresh')) await autoRefresh(r.ctx, r.owes);
  } catch (e) {
    console.error(`publish: ${e.message}`);
    process.exitCode = 1;
  }
}

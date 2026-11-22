#!/usr/bin/env node
// git pre-push hook: pushing the publish branch (main) or an iteration tag (iter-*) needs the loop
// controller's `publish` rules to hold for the pushed commit (a verify pass on that exact commit,
// unless overridden with a reason). Other refs pass untouched. Installed by devloop/kit/install-hooks.mjs.
//
//   git calls: pre-push <remote-name> <remote-url>, refs on stdin: <local ref> <local sha> <remote ref> <remote sha>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ZERO = /^0+$/;

/** Decide on the pushed refs: { block, messages }. */
export async function prePush(lines, { cwd = process.cwd(), config } = {}) {
  const loop = await import('../loop.mjs');
  let ctx;
  try {
    ctx = loop.loadLoop({ cwd, config });
  } catch {
    return { block: false, messages: [] }; // no controller in this repository
  }
  const branch = `refs/heads/${ctx.cfg.publishBranch ?? 'main'}`;
  const tagPrefix = `refs/tags/${ctx.cfg.tagPrefix ?? 'iter-'}`;
  const messages = [];
  let block = false;
  for (const line of lines) {
    const [localRef, localSha, remoteRef] = line.trim().split(/\s+/);
    if (!remoteRef || (remoteRef !== branch && !remoteRef.startsWith(tagPrefix))) continue;
    if (ZERO.test(localSha)) {
      messages.push(`blocked: deleting ${remoteRef} is not part of the loop`);
      block = true;
      continue;
    }
    const c = loop.evaluate(ctx, 'publish', { commit: localSha });
    if (c.results.some((r) => r.overridden)) loop.appendEvent(ctx, { kind: 'override-used', action: 'publish', ref: remoteRef, rules: c.results.filter((r) => r.overridden).map((r) => r.rule) });
    if (!c.ok) {
      block = true;
      messages.push(`blocked: push of ${localRef} to ${remoteRef} (${localSha.slice(0, 9)})\n${loop.formatResults(c)}`);
    }
  }
  if (block) messages.push('Publish with `node devloop/kit/publish.mjs` after a green `npm run verify` on that commit, or `node devloop/kit/loop.mjs override <rule> --reason "..."`.');
  return { block, messages };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const input = fs.readFileSync(0, 'utf8');
  try {
    const { block, messages } = await prePush(input.split('\n').filter((l) => l.trim()));
    if (messages.length) console.error(messages.join('\n'));
    process.exit(block ? 1 : 0);
  } catch (e) {
    console.error(`pre-push (devloop): ${e.message}`);
    process.exit(1);
  }
}

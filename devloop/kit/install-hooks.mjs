#!/usr/bin/env node
// Install the devloop git hooks (pre-push: publish rules of the loop controller) into the
// repository's hooks folder (shared by all worktrees; honours core.hooksPath).
//
//   node devloop/kit/install-hooks.mjs [--force] [--uninstall]
//
// The installed hook runs devloop/kit/hooks/pre-push.mjs from the checkout being pushed, falling
// back to the main worktree's copy; it never overwrites a foreign hook without --force.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MARK = '# devloop pre-push hook';

export function hookScript() {
  return `#!/bin/sh
${MARK} (devloop/kit/install-hooks.mjs)
top=$(git rev-parse --show-toplevel)
main=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
for d in "$top" "$main"; do
  if [ -f "$d/devloop/kit/hooks/pre-push.mjs" ]; then
    exec node "$d/devloop/kit/hooks/pre-push.mjs" "$@"
  fi
done
echo "devloop pre-push: devloop/kit/hooks/pre-push.mjs not found, push not checked" >&2
exit 0
`;
}

export function hooksDir(cwd) {
  const run = (args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
  const custom = run(['config', '--get', 'core.hooksPath']);
  if (custom.status === 0 && custom.stdout.trim()) return path.resolve(run(['rev-parse', '--show-toplevel']).stdout.trim(), custom.stdout.trim());
  const r = run(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (r.status !== 0) throw new Error('not a git repository');
  return path.join(r.stdout.trim(), 'hooks');
}

export function install(cwd, { force = false, uninstall = false } = {}) {
  const file = path.join(hooksDir(cwd), 'pre-push');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const ours = existing?.includes(MARK);
  if (uninstall) {
    if (ours) fs.rmSync(file);
    return { file, action: ours ? 'removed' : 'nothing to remove' };
  }
  if (existing && !ours && !force) throw new Error(`${file} exists and is not the devloop hook; pass --force to replace it`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, hookScript(), { mode: 0o755 });
  fs.chmodSync(file, 0o755);
  return { file, action: existing ? 'updated' : 'installed' };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const r = install(process.cwd(), { force: process.argv.includes('--force'), uninstall: process.argv.includes('--uninstall') });
    console.log(`pre-push hook ${r.action}: ${r.file}`);
  } catch (e) {
    console.error(`install-hooks: ${e.message}`);
    process.exitCode = 1;
  }
}

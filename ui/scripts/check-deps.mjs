#!/usr/bin/env node
/**
 * Is node_modules up to date with package.json? Run before `npm run dev` (root and ui/ predev) so a
 * stale install says so at once instead of shipping a game with missing parts (QA4-S2-1: the
 * @fontsource packages were in ui/package.json and the lock but not installed; every font failed
 * and nothing complained). Plain Node, no dependencies, reads a few dozen small files.
 *
 *   node ui/scripts/check-deps.mjs [dir ...]   (default: the folder holding this script's package)
 *
 * Exits 1, naming the command to run, when a dependency is not installed; warns when an installed
 * version differs from package-lock.json. Optional dependencies are skipped (the native SQLite
 * module may be missing on purpose: the game then saves to files).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (f) => JSON.parse(readFileSync(f, 'utf-8'));

/** What is missing or out of date in `dir`'s node_modules. */
export function checkDeps(dir) {
  const pkg = read(join(dir, 'package.json'));
  const lockFile = join(dir, 'package-lock.json');
  const lock = existsSync(lockFile) ? read(lockFile).packages ?? {} : {};
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const missing = [];
  const stale = [];
  for (const name of names) {
    const file = join(dir, 'node_modules', name, 'package.json');
    if (!existsSync(file)) {
      missing.push(name);
      continue;
    }
    const want = lock[`node_modules/${name}`]?.version;
    const have = read(file).version;
    if (want && have !== want) stale.push(`${name} ${have} (lock: ${want})`);
  }
  return { missing, stale };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dirs = process.argv.slice(2).length ? process.argv.slice(2).map((d) => resolve(d)) : [resolve(dirname(fileURLToPath(import.meta.url)), '..')];
  let failed = false;
  for (const dir of dirs) {
    const where = relative(process.cwd(), dir) || '.';
    const fix = where === '.' ? 'npm install' : `cd ${where.replace(/\\/g, '/')} && npm install`;
    const { missing, stale } = checkDeps(dir);
    if (missing.length) {
      failed = true;
      console.error(`\n  node_modules in ${where} is out of date: ${missing.length} package(s) not installed (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', ...' : ''}).\n  Run: ${fix}\n`);
    } else if (stale.length) {
      console.warn(`\n  node_modules in ${where} differs from package-lock.json: ${stale.slice(0, 3).join(', ')}${stale.length > 3 ? ', ...' : ''}.\n  Run: ${fix}\n`);
    }
  }
  if (failed) process.exit(1);
}

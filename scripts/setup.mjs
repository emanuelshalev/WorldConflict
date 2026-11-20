#!/usr/bin/env node
/**
 * One-step setup for World Conflict: checks Node, installs both packages, and picks a save store
 * that works on this machine. Robust by design: the native SQLite module (better-sqlite3) is an
 * optional dependency; when it cannot be downloaded or compiled (no Python, no C++ build tools,
 * an unusual Node version), the game saves to JSON files in ./saves instead, and setup still
 * succeeds.
 *
 *   npm run setup            (or double-click setup.cmd on Windows, ./setup.sh on macOS/Linux)
 *   npm run setup -- --start (set up, then launch the game)
 *   npm run setup -- --json  (skip SQLite: always save to files)
 *
 * Plain Node with no dependencies, written for old Node too so it can explain a version problem.
 */
import { spawnSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const npx = win ? "npx.cmd" : "npx";

const c = (n) => (s) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = c(1), green = c(32), yellow = c(33), red = c(31), dim = c(2);
const step = (n, t) => console.log(`\n${bold(`[${n}/5]`)} ${t}`);
const ok = (t) => console.log(`  ${green("ok")}  ${t}`);
const warn = (t) => console.log(`  ${yellow("!")}   ${t}`);
const fail = (t) => console.log(`  ${red("x")}   ${t}`);

/** Run a command in the project; returns true on success. Output is shown unless quiet. */
function run(cmd, cmdArgs, { cwd = ROOT, quiet = false, env = {} } = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd,
    stdio: quiet ? "pipe" : "inherit",
    shell: win, // .cmd shims need a shell on Windows
    env: { ...process.env, ...env },
  });
  return r.status === 0;
}

function setEnvVar(key, value) {
  const file = join(ROOT, ".env");
  let text = existsSync(file) ? readFileSync(file, "utf-8") : "";
  const line = value === null ? "" : `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) text = text.replace(re, line).replace(/\n{3,}/g, "\n\n");
  else if (value !== null) text = `${text.replace(/\s*$/, "")}\n${line}\n`;
  writeFileSync(file, text.replace(/^\n+/, ""));
}

console.log(bold("\nWorld Conflict setup"));

// ---------------------------------------------------------------------------
step(1, "Checking Node.js");
const [major, minor] = process.versions.node.split(".").map(Number);
const arch = process.arch;
console.log(`  ${dim(`Node ${process.versions.node}, ${process.platform} ${arch}`)}`);
if (major < 20 || (major === 20 && minor < 19)) {
  fail(`Node ${process.versions.node} is too old. Install Node.js 22 LTS (${win ? "Windows Installer, x64" : "LTS"}) from https://nodejs.org and run setup again.`);
  process.exit(1);
}
let nativeLikely = true;
if (major % 2 === 1 || major > 24) {
  warn(`Node ${major} is not a long-term-support release: ready-made SQLite binaries may not exist for it.`);
  nativeLikely = false;
}
if (arch !== "x64" && arch !== "arm64") {
  warn(`This is a ${arch} (32-bit) Node. Ready-made SQLite binaries are 64-bit only.`);
  nativeLikely = false;
}
if (!nativeLikely) warn("That is fine: games will be saved as files instead. For SQLite, install Node 22 LTS 64-bit from https://nodejs.org.");
else ok("Node is a supported LTS release");

// ---------------------------------------------------------------------------
step(2, "Installing the game server (this can take a minute)");
// Prefer ready-made native binaries; never fail the whole install because SQLite cannot build
const env = { npm_config_build_from_source: "false", npm_config_audit: "false", npm_config_fund: "false" };
const wantJson = args.includes("--json");
let installed = run(npm, ["install", ...(wantJson ? ["--omit=optional"] : [])], { env });
if (!installed && !wantJson) {
  warn("Install failed, retrying without the optional SQLite module");
  installed = run(npm, ["install", "--omit=optional"], { env });
}
if (!installed) {
  fail("npm install failed. Check your internet connection (or company proxy) and run setup again.");
  process.exit(1);
}
ok("Server packages installed");

// ---------------------------------------------------------------------------
step(3, "Installing the game interface");
if (!run(npm, ["install"], { cwd: join(ROOT, "ui"), env })) {
  fail("npm install in ui/ failed. Check your connection and run setup again.");
  process.exit(1);
}
ok("Interface packages installed");

// ---------------------------------------------------------------------------
step(4, "Choosing where games are saved");
if (!existsSync(join(ROOT, ".env"))) {
  if (existsSync(join(ROOT, ".env.example"))) copyFileSync(join(ROOT, ".env.example"), join(ROOT, ".env"));
  else writeFileSync(join(ROOT, ".env"), 'DATABASE_URL="file:./dev.db"\n');
  ok("Created .env (add an AI key there later if you like; the game works without one)");
}
let store = "json";
if (!wantJson) {
  const sqliteLoads = run(process.execPath, ["-e", "require('better-sqlite3')(':memory:').prepare('select 1').get()"], { quiet: true });
  if (!sqliteLoads) warn("SQLite's native module is not available on this machine");
  else if (!run(npx, ["prisma", "generate"], { quiet: true }) || !run(npx, ["prisma", "db", "push"], { quiet: true, env: { DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db" } }))
    warn("SQLite loads, but its database could not be prepared");
  else store = "sqlite";
}
if (store === "sqlite") {
  setEnvVar("DB_DRIVER", null);
  ok("Saves: SQLite database (dev.db)");
} else {
  setEnvVar("DB_DRIVER", "json");
  ok("Saves: files in the saves/ folder (no compiler or Python needed)");
}

// ---------------------------------------------------------------------------
step(5, "Done");
console.log(`
  Start the game:  ${bold("npm run dev")}
  Then open:       ${bold("http://localhost:5173")}
`);
if (args.includes("--start")) {
  const child = spawn(npm, ["run", "dev"], { cwd: ROOT, stdio: "inherit", shell: win });
  child.on("exit", (code) => process.exit(code ?? 0));
}

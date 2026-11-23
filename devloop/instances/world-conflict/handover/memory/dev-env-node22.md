---
name: dev-env-node22
description: Windows machine dev env for WorldConflict: use nvm's Node 24 LTS by PATH prefix, blank npm userconfig, SQLite set up by hand
metadata:
  type: reference
---

This machine is Windows 11 x64 (repo at `C:\MyData\git\WorldConflict`, a standalone clone made 2026-11-23; the older copy under `C:\Users\emanu\.openclaw\workspace\projects\WorldConflict` is an OpenClaw submodule and is not used for the dev loop; work moved here from the Linux aarch64 machine on 2026-11-23). The earlier Linux note about `~/.local/share/node/current/bin` no longer applies here.

- **Node:** the default `node` on PATH is v26 (`C:\Program Files\nodejs`), which is not an LTS release. Node 22 is not installed. Use Node 24.22.1 LTS from nvm, per shell only, without switching the system default (OpenClaw and other tools on this machine use the system Node). In Git Bash: `export PATH="/c/Users/emanu/AppData/Local/Author Software/nvm/installs/v24.22.1:$PATH"`.
- **npm install:** the user's `~/.npmrc` has an `allow-scripts=` line (needed by OpenClaw) that makes npm 11.19 fail project installs with `EALLOWSCRIPTS`. Do not edit that file. Point npm at a blank user config for this repo's installs: `export NPM_CONFIG_USERCONFIG=<path to an empty file>`.
- **Install scripts:** this npm does not run dependency install scripts by default, so after an install that replaces `better-sqlite3`, fetch its binary by hand: `cd node_modules/better-sqlite3 && npx --no-install prebuild-install`.
- **SQLite:** `scripts/setup.mjs` wrongly reports SQLite as unavailable on Windows (it runs `process.execPath` through a shell, and the path contains a space) and writes `DB_DRIVER=json` into `.env`. After running setup, remove that line and run `npx prisma generate` and `DATABASE_URL="file:./dev.db" npx prisma db push`. Fixing setup.mjs is an open item.
- `setup.cmd` is marked assume-unchanged (CRLF artifact). `.claude/` is in `.git/info/exclude`.
- **Line endings:** this clone is set to LF (`core.autocrlf=false`, `core.eol=lf`, local config); with the system default (CRLF) Biome and the kit fail. A fresh clone or worktree needs the same.
- **Gate on Windows:** first green full gate 2026-11-23 (about 20 minutes). Playwright Chromium is installed (`npx playwright install chromium` after a Playwright version bump). Visual baselines are per system: Windows set in `tests/visual/__screenshots__/surfaces.visual.ts/win32/`. If a gate is killed from outside, check ports 8640/5640 for leftover servers (`netstat -ano`, then `taskkill //PID <pid> //T //F`).
- A background gate started from Claude Code survives a session restart but its completion notice is lost; wait on its log instead.

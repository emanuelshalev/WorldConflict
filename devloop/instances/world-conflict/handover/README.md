# Handover: continuing on another machine

1. Clone the repository and check out `dev/rc1-synthetic-loop` (work branches listed in `../RESUME.md` are pushed too).
2. Install Node 22 (the repo needs Node >= 20.19) and run `npm run setup`.
3. Install the git hooks: `node devloop/kit/install-hooks.mjs` (blocks pushing `main` or `iter-*` tags without a recorded verify pass).
4. Claude Code project settings: `mkdir -p .claude && cp devloop/instances/world-conflict/handover/claude-settings.json .claude/settings.json` (the shell guard hook against rebase and autostash in the shared checkout, and auto-compaction at about 400k tokens).
5. Claude memory: copy `memory/*.md` into the new machine's project memory folder, `~/.claude/projects/<repo path with slashes as dashes>/memory/` (for example `~/.claude/projects/-home-<user>-git-WorldConflict/memory/`). Update the Node path note in `dev-env-node22.md` if Node lives elsewhere.
6. Start the dev servers (`npm run dev`), open Claude Code in the repo and say "resume": the Group Manager reads `../RESUME.md`, then `node devloop/kit/loop.mjs status`.

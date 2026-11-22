# devloop hooks

Enforcement of the loop controller's rules at the point of action (see `../../method/controller.md`).

## git pre-push (`pre-push.mjs`)
Blocks pushing the publish branch (`publishBranch`, e.g. `main`) or an iteration tag (`tagPrefix*`, e.g. `iter-3`) unless `loop check publish` passes for the pushed commit. Other refs pass. Install once per clone (the hooks folder is shared by all worktrees):

```
node devloop/kit/install-hooks.mjs            # --force replaces a foreign pre-push hook, --uninstall removes ours
```

## Claude Code bash guard (`guard-bash.mjs`)
A PreToolUse hook for the Bash tool. In the shared checkout (the main worktree) it blocks:
- `git pull --rebase` (also `-r`, `--rebase=<mode>`, `-c pull.rebase=true`): rule `guard:pull-rebase`
- `--autostash` on any git command (also `-c rebase.autostash=true`): rule `guard:autostash`
- `git checkout` / `git restore` with `--theirs` or `--ours` on more than one path, `.`, a glob or a directory: rule `guard:multipath-checkout`

Linked worktrees are not guarded. A blocked command prints the reason on stderr and exits 2, which Claude Code shows to the model. Lift a rule for a while with `node devloop/kit/loop.mjs override guard:<name> --reason "..."`.

Settings snippet to add (by the owner) to the project's `.claude/settings.json`, merged into any existing `hooks` key:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/devloop/kit/hooks/guard-bash.mjs\""
          }
        ]
      }
    ]
  }
}
```

The scripts run on Node 18 or later and have no dependencies, so whichever `node` is first on the hook's PATH works. To check by hand:

```
echo '{"cwd":"'"$PWD"'","tool_name":"Bash","tool_input":{"command":"git pull --rebase"}}' | node devloop/kit/hooks/guard-bash.mjs; echo $?
```

---
name: devloop-rc1-loop
description: "CEO's rules for the synthetic-customer dev loop on branch dev/rc1-synthetic-loop (devloop/ module, goals, check-ins)"
metadata:
  node_type: memory
  type: project
  originSessionId: 560a71e3-7113-4ffa-aea8-74191a508a8c
  modified: 2026-11-22T06:01:36.702Z
---

Since 2026-11-21 the user (acting as CEO) has me run World Conflict development as a synthetic-customer loop toward a public RC, on branch dev/rc1-synthetic-loop (main tagged v0.9.0).

- Keep all dev-process material in the reusable `devloop/` module (method, kit, templates); game specifics only in `devloop/instances/world-conflict/`.
- Two goal tracks: a fantastic game (G1-G9) AND discovering/adopting best agentic-AI dev practices (P1-P6).
- Audience is wide: gamers and non-gamers, teens to older current-affairs readers, quick and long sessions.
- At the end of each iteration (after a green verify gate) fast-forward main to the finished iteration and tag it iter-N so the CEO can playtest from main (CEO instruction 2026-11-23; overrides the general 'never push to main' default for this purpose only).
- "Fixed stays fixed" is product goal G13: every addressed finding needs an automated guard in devloop/instances/world-conflict/regressions.yaml; one `npm run verify` gate before merges and panel rounds.
- Never remove features. Be autonomous; ask only if absolutely blocked. Check in regularly and keep `dev_plan/project_status.html` (Iterations, Personas, How we work, Journal tabs, driven by the LOOP object) current.

- **Resume:** when picking up after a pause, read `devloop/instances/world-conflict/RESUME.md` first (state, WIP branches, next steps). Handover 2026-11-23: iteration 4 Build, five pushed work branches listed in RESUME.md; setup for a new machine in devloop/instances/world-conflict/handover/README.md.

- **Git in the shared checkout:** never `git pull --rebase` / `--autostash` there while agents write files (it swept up an agent's uncommitted file twice); use `git pull --ff-only` and commit explicit paths. `setup.cmd` is a CRLF artifact marked assume-unchanged locally.

- **Models and cost (D-82, D-83):** GM Opus 5.5 (Fable 5.2 trial planned for iteration 5); Fable selectively for hard design/architecture calls; designers and engineers Opus, Sonnet trial for mechanical packages; QA Sonnet for scripted checks, Opus for root-cause repro; customers/scorers Sonnet. CEO wants the hypothetical API list-price cost per iteration tracked on the status page.

**Why:** the CEO wants to monitor progress and reuse the method elsewhere.
**How to apply:** update the status page and journal at every stage, push at milestones, and keep product details out of `devloop/method`.

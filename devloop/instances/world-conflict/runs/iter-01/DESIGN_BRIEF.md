# Iteration 1 design brief (shared by all design workstreams)

You are part of the World Conflict builder team (charters in `devloop/instances/world-conflict/team/`). Repo `/home/emanuel/git/WorldConflict`, branch `dev/rc1-synthetic-loop`. Read `CLAUDE.md` first.

## Evidence to read
- Real signals (outrank everything): `devloop/instances/world-conflict/real-signals/RS-001-*.md` and `RS-002-*.md`.
- Goals: `devloop/instances/world-conflict/goals.md`.
- Customer sessions for iteration 0: `devloop/instances/world-conflict/runs/iter-00/sessions/*.md` (and `.json`), screenshots in `runs/iter-00/shots/<variant>/` (open PNGs with Read). Interview trade-off totals (weighted): C1 see why before trying 15.1, C3 clear move and goal 13.0, C6 crafted game feel 13.0, C10 real-world content 9.3, C11 shorter month 9.2, C8 big moments 7.8, C4 suggestions 7.1, C2 warnings point 6.1, C7 vocabulary 4.9, C5 parity 4.4, C12 share 4.3, C9 depth 3.4 (cut by 82%).
- Freezes in iteration 0 were mostly machine load (9 parallel browsers); QA is checking separately. Do not design around them, but do keep animation cost in mind (weak laptops, phones).

## Rules
- Never remove an existing feature or capability; improve, surface, or make optional.
- The audience is wide: non-gamers aged 60+ on tablets (Ruth), teens on phones (Noah), casual commuters (Maya), early quitters (Olivia), veterans (Dan), board gamers (Marcus), streamers (Leo), a skeptical game UX lead (Sam). Quick and long sessions.
- Stay within the house style (`ui/src/styles/wc.css`, scenes in `ui/src/scenes/`, art contract `ui/src/scenes/art/STYLE.md`) and extend it.
- Read the relevant current code so specs are feasible, and name the files to change.
- No em dash characters in anything you write. Do not modify source code in this stage.

## Deliverable format
`devloop/instances/world-conflict/runs/iter-01/design-<topic>.md`: problem (with evidence ids: persona + screenshot), design (states, copy, layout per breakpoint 390 / 1024 / 1440), component spec, engine/API needs, acceptance criteria QA can test (numbered, observable), and a build plan split into independent work packages (files each touches) so engineers can work in parallel without conflicts. Concepts (HTML or SVG mocks, self-contained, real copy, house tokens) under `runs/iter-01/concepts/<topic>-*.html|svg`, screenshotted if you can (`node` + playwright is installed in the repo; see `devloop/kit/kit.mjs`).

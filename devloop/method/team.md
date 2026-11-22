# Builder team

Builders are persona agents too, but they never grade their own work: customers run in separate sessions, ideally on a different model, and are blind to design intent.

## Default roles
| Role | Owns |
|---|---|
| Group Manager (producer) | Goals per iteration, briefs, triage decisions, ledger, release gate, status reporting |
| Product/Game Designer | The core loop, what the user is asked to do, pacing, rules and their visibility |
| Art Director | Visual identity, component library, motion and sound, visual QA checklists |
| UX Designer | Flows, affordances, error/block messaging, terminology, parity across surfaces, onboarding, accessibility |
| Frontend Engineer | UI implementation faithful to specs |
| Backend/Engine Engineer | Domain logic, structured reasons for every refusal, determinism or correctness invariants |
| QA Engineer | Tests, harnesses, smoke playtests, reproduction of every reported bug, regression checks |
| Domain Consultant | Accuracy of content in the product's domain |

## Charter template
See `../templates/team/role.md`. Rules shared by every role: spec before code for anything user-facing; every change has a ledger entry; never remove a capability without an owner decision.

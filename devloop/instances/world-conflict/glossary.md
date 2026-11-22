# World Conflict glossary

One name per concept (goal G3, `runs/iter-01/design-orders.md` §8). The source of truth is `ui/src/lib/glossary.ts` (`TERMS`); this page and `docs/GAMEPLAY.md` mirror it in prose. `tests/ui-glossary.spec.ts` fails when a banned synonym appears in a UI string, a flashpoint or data-loader objective label, or the gameplay guide.

| Concept | Name (full) | Compact (tight spaces) | Definition (explainer) | Banned in UI strings |
|---|---|---|---|---|
| Monthly action points | Political capital | ◆ n left (the ◆ is the only abbreviation) | What your orders cost. You get +2 each month (+3 in a Flashpoint), up to ◆ 6. Unspent capital carries over. | "political credit", "credit" as a label, "PC", "Cap", "CAP", "Capital" without "Political" ("Capital city" on the map legend is a city) |
| Order slots | Orders this month | Orders n of 6 | You can give up to 6 orders a month, one of each kind per country. | "Orders n/6", "Orders" alone as a meter label |
| Meetings you attend | Meetings | Meetings n of 3 | You attend up to 3 meetings a month. A deputy handles the rest with the default answer. | "In person", "n/3" |
| Defense money | Defense budget | n% defense | Military orders use a share of this month's defense budget. | "def", "Defense" alone as a meter label |
| The 4x50 total | Score | Score | Your standing out of 200: approval, stability, economy and security, moving 15% a month toward how things really are. | "Leadership score", "Leader score" |
| Stats | Approval, Stability, Legitimacy, Economy, World tension | the same full words | per stat | "APPR", "Appr", "STAB", "Stab", "LEGIT", "Legit", "TENS", "Tens", "GDP" as the stat label |
| Advisor recommendation | Staff pick | Staff pick | What your staff would do. Approve it or choose yourself. | "Suggested" as a tag, "Staff suggests", "Staff" alone |
| Bulk approve | Approve n staff picks | Approve n picks | | bare "Approve n" |
| An order in the tray | In this month | In this month | | "queued", "Already on your desk", "on your desk this month" |
| Chance | n% chance | n% (in a chip labelled by context) | | "success rate", "success odds", "odds" as a chip |
| Irreversible | No undo | | | |

## Allow-lists

- A code-only string in a `.ts`/`.tsx` file: end the line with `// glossary-ok`.
- A genuine use that only looks banned (a GDP figure labelled "GDP"): add `file :: text` to `ALLOWED` in the test.
- A string owned by a work package still in flight: `PENDING` in the test, with the package named. The test prints entries that no longer match so they get removed.

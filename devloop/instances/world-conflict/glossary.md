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
| Advisor recommendation (D-72) | Recommended by (adviser) | Recommended | What one of your advisers recommends. Choose it, or choose another answer yourself. | "Suggested" as a tag, "Staff suggests", "Staff" alone, "staff pick", "Cabinet pick" (QA3-S3-2) |
| The group of recommendations | Recommended | Recommended (n) | Your advisers recommend these for this month. A recommended order runs only if you choose it; a crisis or meeting listed here goes ahead on its recommended or usual answer unless you change it, one not listed is yours to answer (N-2). | |
| The per-item verb (D-73) | Choose | Choose | The one verb for deciding a thing: on every answer card, the recommended one included. | "Accept" for a recommendation ("Accept order", "Accept answer", "Accepted: X", "if accepted") |
| Bulk choose (one verb, D-73) | Choose all recommended (n) | Choose all (n) | Chooses the recommended answer for every routine thing still to do. Greyed out it says why ("Nothing to choose: every recommendation is decided", or "Nothing else to choose. Still open: <call>") | "Accept all", bare "Approve n", "Approve all", "Approve" as a verb, "if approved", "On Approve", "to approve", "wait for your approval" (QA3-S3-2) |
| Opening the list (bar, Map) | Review n recommended | Review n | Opens the Recommended list; chooses nothing. | |
| A decision that is the player's (D-84, D-85) | Your call | Your call | A decision that is yours: a crisis your advisers disagree on, or the move for your mission. Choose all recommended never decides it: you choose a card, or skip and the card says what leaving it does ("No answer yet. If you leave it: X", or "..., the crisis passes with no effect" before it is due). | |
| The opt-in setting (D-84) | Let the Chief of Staff make my calls | Chief of Staff makes my calls | Off by default. On: each call starts on the Chief of Staff's answer and Choose all recommended chooses it too. | |
| Leaving a thing on purpose | Skip | Skip | The last card of every answer list: it says who answers instead and what it costs, or for a call what leaving it does. | |
| The advisers' order ideas | Orders to consider | Orders to consider (n) | Orders your advisers think fit this month, with a line on why. Add any of them yourself; the ones marked Recommended are also in the Recommended list. | "Your advisors suggest" (QA3-S3-2: its count sat next to "Review n recommended") |
| An order in the tray | In this month | In this month | | "queued", "Already on your desk", "on your desk this month" |
| Chance | n% chance | n% (in a chip labelled by context) | | "success rate", "success odds", "odds" as a chip |
| Irreversible | No undo | | | |

## Allow-lists

- A code-only string in a `.ts`/`.tsx` file: end the line with `// glossary-ok`.
- A genuine use that only looks banned (a GDP figure labelled "GDP"): add `file :: text` to `ALLOWED` in the test.
- A string owned by a work package still in flight: `PENDING` in the test, with the package named. The test prints entries that no longer match so they get removed.

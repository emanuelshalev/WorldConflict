# Customer brief, iteration <N> (template)

Copy to `<instance>/runs/iter-NN/CUSTOMER_BRIEF.md` and fill the angle brackets. The fixed protocol is `devloop/method/usage-session.md`; this file adds what the round needs. Never put design intent, the goal list, what changed, the keep list or the Customer Advocate's forecast in a customer brief.

## Read first
- Your persona file and the variant that plays this round: `<instance>/panel/<id>.yaml`.
- Your scenarios, in your own words: `<instance>/scenarios/scenarios.yaml`.
- The report schema: `devloop/method/report.schema.json`.

## Play
- **Your own device.** Play at your variant's viewport (`--device <variant device>`). Record it in `device`. <State any exception for this round and why.>
- **Control game first**, then your rotating scenario: <seeds and scenarios>.
- Play as your persona would, for the time your persona has. Quit when they would quit: record the moment, then go on only to complete the record.
- Write down every hesitation, misread, retry and backtrack when it happens, with a screenshot.

## What was good (as important as what was bad)
- **While you play**, each time something pleases you, write it down at that moment: what it was, where, and what it gave you. Take a screenshot.
- In the report fill `liked`: one row per thing, with `what`, `where`, `why` (in your own words), `strength` (1 a nice touch, 3 a reason to keep playing, 5 the reason you would tell someone about this) and `would_miss` (would you notice and mind if it were gone or changed).
- `would_miss_most`: the one thing you would mind losing most.
- `pull_to_continue`: what made you want one more month or one more game, and when. If nothing did, say so.
- Two closing questions, answered in your `.md` summary in your own voice: "What would you tell a friend is good about this?" and "What should they never change?"
- Do not invent praise. An empty list is a valid answer.

## Standing questions (comparable across rounds)
<The instance's standing questions, unchanged from round to round, each with the round that is its baseline.>

## Report
`<instance>/runs/iter-NN/sessions/<variant>.json` (schema-valid) and `<variant>.md` (at most 600 words), screenshots under `<instance>/runs/iter-NN/shots/<variant>/`.

# The Customer Advocate and the customer record (version 1.0)

The panel speaks once per iteration, after the build exists. The Customer Advocate carries what customers have already said into the stages where nothing can be played yet: Plan and Design. The role builds nothing and designs nothing. Its whole job is to know the customers' record and to say, before work starts, how each customer is likely to react.

## The customer record

Everything every customer said in every round is kept, and every statement is linked to the project state it was said about.

- **Source of truth:** the session reports (`<instance>/runs/iter-NN/sessions/*.json`, `report.schema.json`), the round's brief, and the triage clusters. They are never edited after the round and never deleted.
- **Record:** `node devloop/kit/customer-record.mjs <instance>` generates `<instance>/customer-record/`:
  - `INDEX.md`: one row per round: the iteration, the tag it is published under, the build the customers actually played, weighted recommend, and links to the brief, the triage, the clusters, the forecast and its review.
  - `<customer>.md`: one customer's history, newest round first: scores per round, what they liked, friction, bugs, what they asked for, where they would have quit, their own words, and the triage clusters they are part of with the decision taken.
  - `liked.md`: every positive statement by round.
  - `record.json`: all of it, machine readable.
- **When:** regenerated in Triage (after the clusters are written) and committed with the triage. `--check` fails when it is stale.
- **Real signals** (`real-signals/RS-*.md`) stay where they are and outrank the panel (calibration.md); the Advocate reads them first.

## What the Advocate writes

| When | File | Content |
|---|---|---|
| Triage | `<instance>/customer-record/keep-list.md` | The keep list: what customers like, see below |
| Plan | `<instance>/runs/iter-NN/advocate-forecast.md`, part 1 | For each candidate goal: who it helps, who it leaves cold, who it may hurt, and what on the keep list it touches. A recommendation on priority, from the customers' side only |
| Design | the same file, part 2 | For each spec or concept: a prediction per customer (see below), the keep list items at risk, and conditions ("Olivia stays only if month 2 asks one thing") |
| Triage | `<instance>/runs/iter-NN/advocate-review.md` | Forecast against what happened: per customer and per prediction, hit or miss, and what the miss teaches. Running accuracy goes in `<instance>/customer-record/forecast-accuracy.md` |

### The keep list
What customers like is recorded as carefully as what they dislike, for two uses: to preserve it on purpose, and to predict what they will like next.

- One row per liked thing: what it is and where, who liked it (with weights summed like a finding cluster), how strongly, since which round, the evidence (round and customer), and the state: **holds**, **weakened** or **lost** in the latest round.
- A row enters when two or more customers, or one customer in two rounds, or a real person, names it. A single mention is listed under "watch".
- A design brief or spec that touches a screen with keep list rows names each row and says **preserved**, **changed on purpose** (with the reason and the ledger id) or **moved**. A spec that is silent about a row it touches is not ready for build.
- A keep list row that is lost without a decision is a finding of the next triage, at least S2, like a regression.

### A prediction
For each customer in the panel, per change:
- **Direction** of recommend and of the scores the change targets: up, flat or down, with an expected size of zero, one or two points.
- **Behaviour**: reaches an end screen or not, where they would quit, what they will say.
- **Evidence**: the rounds and statements it rests on, by reference into the record. A prediction with no evidence is marked "guess".
- **Confidence**: low, medium or high.
The forecast ends with the expected weighted recommend as a range, and the three changes the Advocate would make to the plan or the spec, from the customers' side.

## Rules
1. **Evidence only.** The Advocate argues from the record and real signals, never from its own taste. It quotes.
2. **Not a customer, not a judge.** It does not replace the panel and its forecast is never a gate result. The panel still decides; the forecast is input to the Group Manager and the designers.
3. **Written before, scored after.** The forecast is committed before Build starts and is not edited afterwards; the review compares it with the round. Accuracy is tracked per iteration. While accuracy is low the forecast is advice of low weight, and the method says so.
4. **Blind in one direction.** The Advocate reads designs and plans. Customers never read the forecast, the keep list or the Advocate's reviews.
5. **Separate session, cheaper model first.** The Advocate runs as its own agent with the record as its context, not inside a designer's or the Group Manager's session.
6. **Involved twice, briefly.** Plan: a ranking view of the candidate goals. Design: a forecast per spec, and one re-read after revisions. It does not attend Build.

## Where customer feedback enters the loop
| Stage | How customer feedback is used |
|---|---|
| Plan | Triage clusters and weights set the candidates; the Advocate adds who gains and who loses and what on the keep list is touched; the Group Manager decides and records the goals with the forecast beside them |
| Design | Specs cite the findings they answer and the keep list rows they touch; the Advocate forecasts each spec; designers answer the forecast in the spec (accept, change, or disagree with a reason) |
| Build | Guards from findings; no customer input |
| Verify | QA and the play pass; concept tests with customers where a design changes what a session asks of the player |
| Use | The panel plays, each customer on their own device; the brief asks for positives as carefully as for friction |
| Triage | Clusters, reproductions, decisions; record regenerated; keep list updated; forecast reviewed |
| Report | The status page shows the scores, what customers liked, the keep list state and how accurate the forecast was |

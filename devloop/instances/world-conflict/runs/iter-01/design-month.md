# Design: the month (G4, G5, G8, C11)

Owner: Game Designer. Iteration 1. Build inspected: `b271008` on `dev/rc1-synthetic-loop`.
Concepts: `concepts/month-desk-390.html`, `concepts/month-desk-1440.html`, `concepts/month-result.html` (screenshots next to them as `.png`).

Covers: G4 (clear what is expected each month), G5 (suggestions visible, explained, one tap), G8 (wide audience), interview wish C11 (shorter month, 9.2) and, because they are the same loop, C3 (clear move and goal, 13.0), C1 (see why before trying, 15.1) and C4 (suggestions, 7.1).
Touches but does not own: G1/G2 (blocked reasons, pointing: the warnings below must use the pointer pattern from that workstream), G3 (one vocabulary: copy here uses the current glossary candidates and must follow the glossary when it lands), G7 (visual craft: this spec gives structure and hierarchy, the art pass gives the finish), G10 (the end reveal reuses the score drivers and "decisive months" defined here).

---

## 1. Problem

The month today is: a briefing wall, a three-column desk where everything is pre-filled, "Approve N", "Execute month", three debrief pages, a newspaper, "To your desk". It has good parts (signed effect arrows, backers, the reaction panel, the Table) but a new player cannot tell what is being asked, a veteran cannot tell why the score moves, and pressing two buttons wins.

| # | Problem | Evidence |
|---|---|---|
| P1 | Nobody can say what the month asks of them. The desk shows ~10 equal-weight items (crisis, 4 meetings, orders, tip, budgets) and no single "your move". | CEO RS-001 "unclear what is expected"; Olivia "the desk looked like work" (`shots/olivia-laptop/003-desk1.png`); Noah did not read the desk, wants "one screen with three big buttons" (`shots/noah-phone/003-desk1.png`) |
| P2 | Mission progress is a dead counter. "Mission 2/4" never changes, does not respond to taps, does not say 2 of what, runs off the edge on a phone. "Met" counts goals that were met from the start (No war with the Emirates), so the number means nothing. | Maya (`shots/maya-phone/042-mis2.png`); Ruth "Mission chip did not respond to a normal tap" |
| P3 | Options do not say which goal they help. Only a red "mission" tag exists, for harm. Ruth: "which move helps Ukraine?" | Ruth (`shots/ruth-tablet/011-m2.png`); `ui/src/lib/staff.ts` `missionRisk` is negative-only |
| P4 | Suggestions exist but are buried and unexplained. The `why` strings computed in `computeSuggestions` are shown only in the Staff suggestions panel and as a truncated sub-line on the rail. | CEO RS-001 "Suggestions? Where are the suggestions?"; `shots/olivia-laptop/003-desk1.png` (rail: "Interior Minister: Mission: stability needs...") |
| P5 | The approval state is unreadable. After "Approve staff pick" the badge says "Your call" and the chosen option is no longer named. | Maya (`shots/maya-phone/004-s3.png`); Ruth (`shots/ruth-tablet/011-m2.png`) |
| P6 | Onboarding is a wall, and it repeats itself. The briefing paragraph says "You are X" twice (backstory = "You are ..." + objective briefing that starts "You are ..."), then the mission box repeats the same paragraph. Then the desk adds a 3-line coach tip. | Olivia (`shots/olivia-laptop/002-after-start.png`); Noah (`shots/noah-phone/002-start.png`); Maya "tells me the same thing three times" |
| P7 | The month is long after Execute: highlight page, Diplomacy, Home and security, the paper (scroll to close), "To your desk". About five screens. Tab chips appear to do nothing. | Maya ("Tapping the tab chips did not work"); Olivia; Noah (`shots/noah-phone/011-deb2b.png`); Marcus "Four debrief pages plus a newspaper" (`shots/marcus-term/016-m1f.png`) |
| P8 | The result of my choice is not told right away. Maya's hostage rescue showed a red X and "this will come back"; she learned a month later from the paper that every hostage came home. | Maya (`shots/maya-phone/018-t2.png`, `038-e4.png`) |
| P9 | The score falls while every stat rises, and the only explanation is "war weariness". Cause: `src/core/scoring.ts` drifts each component 15%/month toward `target * 0.9`; all components start at 25, so a country at war (security target ~4-14) bleeds score every month no matter what the player does, and nothing on screen says so. | Dan (`shots/dan-term/017-m1.png`), score 100, 97, 95, 94, 93 with mission 115+ |
| P10 | Autopilot wins. Approve all + Execute kept Dan alive and calmed tension; nothing punished it. Staff picks are filtered to never hurt the mission (`crisisStaffPick` drops risky options), so the staff plan is close to the best plan. The harness has no policy that plays like the staff, so this was never measured. | Dan (RC gate "one repeated move wins"); Priya "Approve all makes the month a button press"; Marcus approved the same picks for 9 months (`shots/marcus-term/060-B4-desk.png`); `scripts/simulate.ts` policies: none, smart, random, loop, hawk, greedy |
| P11 | Repetition. Same reaction line for two counterparts in one month; the same war-enemy call ("Offer talks on a ceasefire") in months 5, 7 and 8 (`meetings.ts` gives a war enemy only a -60 recency penalty instead of -200); the same Home and security cards each month; staff queue the same orders; filler lines ("Noted and filed"). | Maya (`shots/maya-phone/025-t3.png`, `032-t3e.png`); Dan (`shots/dan-term/034-dm7.png`); Priya (`shots/priya-flash/035-q3.png`, `007-desk.png`) |
| P12 | Numbers disagree between the crisis card and the month tile (crisis says approval -2, month tile -5.3), so the player cannot tell what their choice did versus the drift. | Priya (`shots/priya-flash/032-deb1.png`); Marcus (`shots/marcus-term/051-B1-a.png`) |

Root cause in one line: the desk treats every item as equal and the debrief treats every outcome as equal; the month needs a hierarchy (one move, one goal, one result) with depth one tap away.

---

## 2. Design principles for the month

1. **One move, one goal, one result.** Every month has exactly one primary decision shown big, one goal line that says what the mission needs now, and one result card after Execute. Everything else is one tap away, never removed.
2. **Tell, then let them check.** Every number that moves gets a one-line reason where it is shown (score, mission, stats). Depth (the Table, the pages, the paper) stays for Dan and Marcus.
3. **Staff help, they do not play for you.** Staff picks are the cabinet's view, which is not always the mission's view. When they differ the game says so, on the item, in one line, with a one-tap fix.
4. **Three seconds per decision for a new player.** Option buttons must be readable without the situation text: label, one-line consequence, mission tag, two key effects in words.
5. **Never the same sentence twice in a month; never the same card three months running.**

---

## 3. The month structure ("Your move")

### 3.1 States of a month

| State | What the player sees | Exit |
|---|---|---|
| S0 Briefing (month 1 only) | One screen: who you are (1 line), mission title, 3-4 goal chips with now/need, "Take office". | Take office |
| S1 Desk, Focus view | Goal line, Your move card (primary decision, 3 big options), Advisors (2-3 suggestions), "Also on your desk" (meetings and orders summary rows), sticky Execute. | Execute month, or "Full desk" |
| S2 Desk, Full desk | Today's three-column desk, with the goal line on top, mission tags on all options, advisor strip in the center column. | Execute month, or "Focus view" |
| S3 Executing | Existing scene playback (unchanged). | auto |
| S4 Result card | One card: what your choice did (1 sentence), 2-3 key deltas, mission progress change, why your score moved (1 line), front page thumbnail. | "Next month" (primary), "See everything", "Read the paper" |
| S5 Details (optional) | Today's debrief pages and Table, with working tabs; then the paper. | Back to result, or Next month from any page |

Default view: Focus view on screens under 1100 px wide (every month) and on all screens in month 1 and month 2. From month 3 on desktop, the last view the player chose is kept (`localStorage worldconflict.deskView`). A segmented control "Focus | Full desk" sits in the goal line row at all sizes.

### 3.2 Choosing the primary decision

Priority, first match wins (pure function `primaryItem()` in `ui/src/lib/month.ts`):
1. An EXISTENTIAL crisis.
2. A crisis whose options carry a mission tag (helps or hurts any primary objective).
3. An URGENT crisis.
4. Any crisis (first in `pendingDecisions`).
5. A meeting with a mission country (`withCountry` is a target of an objective).
6. No crisis or meeting: the top advisor suggestion becomes "Your move" ("A quiet month. Your Foreign Minister's move: Court the United States").

If there are two or more crises, the others appear as "Also on your desk: 1 more crisis (staff pick: Ration and appeal)" rows, each one tap from the full card.

### 3.3 The goal line (G4, P2)

A single row under the HUD, full width of the content column, always visible on the desk and the map.

Content, left to right:
- Target icon + mission title ("Close the gate"). On Term/Legacy without an authored objective: "Stay in power", with the term bonuses as chips.
- Segmented progress: one segment per primary objective, coloured by state: `on track` (good), `close` (accent: within 15% of the need or trending toward it), `off track` (bad), `failed` (bad, struck through). Bonus objectives are small outlined dots after a gap.
- Text: "1 of 4 on track · month 1 of 12". Never a bare "2/4".
- This month's step: the off-track objective with the largest gap that this month's choices can move, in one line: "This month: stability 62, needs 78". Tapping it highlights (G2 pointer pattern) every option and suggestion tagged for that objective.

Tap anywhere else on the row: opens the Mission sheet (bottom sheet on phone, right drawer on desktop, reusing `Drawers.tsx` `MissionPanel`), with one row per objective:

```
[seg] The Houthis pushed off the coast
      Front 42 your way, needs 58, or any ceasefire.   Last month: no change
      Helps now: Back channel via Muscat (crisis) · Propose ceasefire to Yemen (order)
[seg] No open war with the Emirates                     On track
[seg] The kingdom holds its nerve
      Stability 62%, needs 78% by month 12.             Last month: first month
      Helps now: Back channel via Muscat · Reform program (queued by staff)
[seg] Leadership score 114+
      Score 100, needs 114. Heading to 96 if nothing changes.  Why?
      Helps now: end the war (security), stability above 65 (security), approval
--- Bonus
[o]   A signed settlement: the Houthi war is over
[o]   Washington firmly behind you: US view of you 60, needs 70
```

"Helps now" items are buttons: tapping one focuses that item on the desk (or adds the order, same as the advisor "Add").

The labels are the authored `label` with the numbers stripped into the now/need line, so authored data does not change. `ConditionStatus` gains `now`, `need`, `unit`, `trend`, `state`, `helps[]` (section 6).

### 3.4 The Your move card (G4, P1, P3, P5)

```
YOUR MOVE · Crisis · Urgent                         [scene thumbnail]
After the Riyadh airport strike
A Houthi missile killed 13 at your capital's airport. The kingdom wants an answer.   More v

[ Bomb Sanaa                               ]  Hurts: stability 78%+
[ Revenge from the air. Civilians will die. ]  Approval up · US view down
[ Back channel via Muscat      CABINET PICK ]  Helps: ceasefire · stability 78%+
[ Quiet talks through Oman. Looks weak.     ]  Tension down · Yemen view up
[ Invite US and Israeli strikes            ]  Helps: Washington behind you (bonus)
[ Washington hits the launchers for you.    ]  Approval down · Iran view down

Backed by: Defence Minister (Bomb) · Foreign Minister (Back channel) · Intelligence Chief (Invite)
```

Rules:
- The situation shows its first sentence only (the "lede"; authored text split at the first full stop). "More" expands the full text and the per-option effect arrows (today's `Arrows` component), so nothing is lost.
- Each option is a button at least 64 px tall (72 px on phone), full width on phone, three columns at 1024+. Content: label (bold, 17 px), one-line description (the authored `description`, clamped to 2 lines), one mission tag, two key effects in words.
- Key effects: the two largest-magnitude entries from `effectArrows`, written in words with the glossary names ("Approval up", "US view of you down", "World tension down"). Never abbreviations; arrows stay in the expanded view.
- Mission tag: at most one per option, priority: breaks a primary objective (red, "Breaks: no war with the Emirates") > hurts a primary (red, "Hurts: stability 78%+") > helps a primary (green, "Helps: ceasefire") > helps a bonus (green outline, "Helps: Washington (bonus)") > none. If an option both helps and hurts, show the hurt and add "+1 more" that opens the expanded view where both are listed.
- Badges: "Cabinet pick" (the staff pick) and, if different, "Best for your mission" (the option with the best mission score, section 5.1). When they are the same option, one badge: "Cabinet pick · good for your mission".
- Selection state is always named, replacing "Your call":
  - not touched: "Cabinet pick: Back channel via Muscat" (outlined accent)
  - approved without change: "Approved: Back channel via Muscat" (filled good, check icon)
  - changed: "Your pick: Bomb Sanaa" (filled accent)
  The same string is used in the Navigator row tag (truncated with the option name kept, e.g. "Approved" + tooltip), the rail list and the Execute summary.
- Tapping an option selects it and marks it reviewed (one tap, no separate approve). The "Approve cabinet pick" button stays for keyboard and for the full desk.

### 3.5 Advisors (G5, P4)

A block titled "Your advisors suggest" under Your move (phone and Focus view) or as the first block of the center column under the crisis (full desk), and in the Map mode `CommandStrip` (same component, so G6 parity holds).

Each suggestion row:
```
[FM]  Court the United States                         ◆1   [ Add ]
      Why: Washington at 60, your bonus needs 70. Why now: they called you this month.
      Helps: Washington behind you (bonus)
```
- Shows 3 suggestions (the top 3 of `computeSuggestions`, which already has a mission-first priority), "Show 2 more" for the rest.
- "Why" line format: **why this** (the gap or threat, with a number) + **why now** (a trend, a deadline, a window). Max 120 characters. If no "why now" exists, the line is only "why this". Copy templates in section 7.
- One tap "Add" queues the order with its server preview (existing `queueOrder()`); the button becomes "Added" with a check and an "Undo" link for 5 s. If the order is unaffordable or blocked, the button is disabled and shows the reason inline ("Needs ◆2, you have ◆1": G1 pattern), never after Execute.
- Staff-queued orders appear as rows already "Added" with the tag "Queued by staff" and the same why line, so the player sees why the staff did it.
- Each row carries the mission tag from 3.4 using the same rules.

### 3.6 Also on your desk (Focus view)

Compact rows under advisors, each opening the full item:
- "3 calls and visits · staff will attend 2, a deputy takes 1" (opens meetings list). If a meeting is with a mission country, it shows first and is highlighted: "Mohammed bin Zayed calls (mission: no war with the Emirates)".
- "2 orders queued by staff · ◆3 of ◆4" (opens orders).
- "1 more crisis · cabinet pick: Call it a foreign forgery".

### 3.7 Execute

Sticky at the bottom on phone, in the rail on desktop. Label "Execute month". Above it a one-line plan summary: "Your pick on 1 crisis, 2 staff orders, staff attend 2 meetings". When any cabinet pick or staff order works against the mission, the summary adds a red line with a pointer: "1 cabinet pick works against your mission: Call it a foreign forgery. [Review]". Execute is never blocked by this.

"Approve all" stays on the full desk with an honest count: "Approve 4 (1 against your mission)".

---

## 4. Onboarding by doing (G4, G8, P6)

### 4.1 Briefing screen (S0)

Replace the paragraph + repeated mission box (`BackstoryModal.tsx`) with:

```
NOV 2026 · SAUDI ARABIA · FLASHPOINT · 12 MONTHS
[flag]
Mohammed bin Salman
Crown Prince and Prime Minister of Saudi Arabia

The Houthis hold the strait, and their missiles reached Riyadh's airport.

YOUR MISSION: CLOSE THE GATE
[seg] Push the Houthis off the coast, or get a ceasefire     front 42, need 58
[seg] No war with the Emirates                                  on track
[seg] Keep the kingdom calm                                     stability 62, need 78
[seg] Keep Vision 2030 alive                                    score 100, need 114

             [ Take office ]
                Full briefing v
```

Rules:
- The hook line is the first sentence of the objective briefing that does not start with "You are" (dedupe rule: strip any leading "You are the {title}." sentence, since the title is already the heading). Fallback: the scenario backstory's first sentence.
- Never render the same sentence twice on one screen (test: split visible text into sentences, assert no duplicates).
- "Full briefing" expands the full briefing paragraph and the flashpoint `hook` for Priya and Ruth. Nothing is removed.
- Goal chips use short labels: a new optional authored field `short` on `ObjectiveCondition` (e.g. "Keep the kingdom calm"); fallback is the label up to the first "(" or ":".

### 4.2 Month 1 coach (replaces the CoachTip wall)

Three steps, one at a time, each anchored to the element it talks about (G2 pointer pattern), each dismissed by doing the thing, not by "Got it":

1. On the Your move card: "This is your move this month. Pick one." The three options pulse once. Done when an option is tapped.
2. On the advisors block: "Your advisors queued these. Keep them, or tap Add on another." Done when the player taps Add, removes one, or taps "Fine".
3. On Execute: "When you are ready, run the month." Done on Execute.

After the first result card, one more line appears on the result card only: "Your mission bar moved. Tap it any time to see what each goal needs." Then the coach is finished for good (`worldconflict.coach = done`), replayable from Settings ("Show me around again"). The existing CoachTip text moves into that replay and Help; it is never shown by default again.

The coach never covers the element it points at, never shows two bubbles, and is skipped when the player acts before it appears.

### 4.3 Month 1 is lighter

Month 1 (turn 0) opens in Focus view with: the opening crisis as Your move, at most 2 staff orders, and meetings collapsed to the summary row (staff attend; unchanged rules). The full desk is one tap away. No new mechanic is introduced in month 1 beyond what is on the card. (Flashpoints already open with a crisis: `data-loader.ts` `newGame()`.)

---

## 5. Autopilot is not the best strategy (P10)

Goal: Approve all + Execute keeps the player alive and learning, but a player who reads the mission tags wins clearly more. Nothing is removed.

### 5.1 Cabinet pick versus mission pick

- **Cabinet pick** (today's `crisisStaffPick`): changes so that it is the cabinet's consensus, which can hurt the mission. Rule: the option with the most backers, ties broken by net effect, then not the default, then cheaper; affordability kept. The mission-risk filter is removed on STATESMAN and STRONGMAN and kept on ANALYST (the easy difficulty keeps the safety net for Ruth and Olivia).
- **Mission pick**: the option with the best mission score: `+3` per primary objective helped, `+1` per bonus helped, `-4` per primary hurt, `-20` if it breaks one; ties by net effect. Computed in the engine (section 6.2) so the harness and the UI agree.
- When cabinet pick and mission pick differ, the cabinet-pick option carries its red mission tag and the Your move card shows a one-line note under the options: "Your cabinet backs Call it a foreign forgery, but it hurts approval 55%+. [Switch to Launch an independent commission]". One tap switches.
- Advisors carry agendas, which explains disagreement in fiction: Defence Minister (security, strength), Foreign Minister (relations, standing), Interior Minister (stability), Chief of Staff (approval), Intelligence Chief (knowledge, rivals). This is already the shape of `backedBy`; the note names who backs it.

### 5.2 Staff orders

- Staff never queue an order whose preview has a `missionWarning` (unchanged).
- Variety: staff do not queue the same order type two months running, nor more than twice in any four months (today they skip only last month's exact label). This removes the "Court UK + Reform every month" loop Priya saw.
- Diminishing returns are shown on the card when the player queues a repeat: "Reform program, 3rd in 6 months: about half the effect" (reform already has 6-month diminishing returns; `outcomes.ts` `director.ledger` holds the history).

### 5.3 Engaging pays (optional, flagged)

`momentum` (default off behind `world.rules.momentum`, turned on only if the harness shows it keeps bands): when the month's step objective (3.3) moved toward its need by at least 2 points, the result card shows a "Step achieved" stamp and the next month gets +1 political capital (cap 6 unchanged). It rewards outcomes, not clicking, so autopilot can also earn it when the cabinet happens to be right. It also feeds G10's "decisive months" stat.

### 5.4 Harness targets

Add `--policy staff` to `scripts/simulate.ts`: crises take the cabinet pick, meetings take `meetingSuggestion` within slots, orders take the staff queue rules of `month.ts` (2 orders, reserve 1, no repeats, no mission warnings). This needs the staff logic in core (WP-B).

| Policy | Target (pooled, Flashpoints + Term seats) |
|---|---|
| smart | 70-95% wins, no seat below 65% (unchanged) |
| staff (autopilot) | 35-60% on STATESMAN; 55-75% on ANALYST; at least 15 points below smart on every seat with 36 games |
| staff + switch (cabinet pick replaced by mission pick when they differ, i.e. "reads the red tags") | within 10 points of smart |
| none | at most 20% (unchanged) |
| random | 15-45% (unchanged) |

Iran's Term stays exempt. Run `npm run sim -- --mode TERM --scenario 2026 --countries USA,UKR,PAK --games 36 --policy smart,staff,staffswitch,none` and the 8 flashpoints with `--games 36` before merging WP-B.

---

## 6. Score and results explained (P8, P9, P12)

### 6.1 Why your score moved

Engine computes a breakdown each month (section 6.3). The UI shows:
- On the result card, one line: "Score 97 → 95. Security is pulled down by the war with India; approval lifted it. Heading to 88 if nothing changes."
- Tap opens a small sheet with four rows (Economy, Security, Approval, Standing), each: now, where it is heading (target × 0.9), and the top term, e.g. "Security 24 → heading to 14: at war with India (-12), stability above 65 (+8)". Footer: "Each part moves 15% a month toward what your situation earns." This is the audit Dan asked for.
- The HUD score tile gets the same sheet on tap (desktop hover shows the one line).
- When the mission has a score goal, the goal line row for it shows "heading to 88" and its "Helps now" lists the biggest positive term the player can change (end a war, stability above 65, approval).

### 6.2 What your choice did (result card)

The result card's sentence is built from the highlight (`report.highlight`) and is about the player's choice, not the drift:
- "Your back channel opened a door: Yemen's view of you rose from -100 to -90 and world tension fell to 71."
- 2-3 key deltas: the highlight's own `facts` (they are the choice's effect), then the mission objective that moved most.
- The month's other movement is labelled as such: "Approval 64 → 58: your choice -2, the war and the economy -4 (Why?)". This resolves P12 by splitting choice versus drift where the engine knows both (`facts` are measured before/after the decision; `deltas` are the whole month). The engine adds `drift = delta - sum(choice facts)` per stat (6.3).
- Delayed outcomes: when a decision schedules a follow-up, the card says "The outcome comes in 1 to 2 months; we will tell you." When the follow-up resolves, the next result card leads with it: "Remember the hostages? All came home." (P8).

### 6.3 Engine/API needs (summary; details in work packages)

1. `ConditionStatus` (objectives.ts) gains: `now?: number`, `need?: number`, `unit?: '%' | 'front' | 'score' | 'view'`, `trend?: number` (change since last month, from `scoreHistory`/relations snapshot), `state: 'on_track' | 'close' | 'off_track' | 'failed'`, `short?: string`, `helps?: Array<{ kind: 'crisis' | 'meeting' | 'order'; id?: string; label: string; action?: Action }>`.
2. New pure module `src/core/missionImpact.ts`: `optionImpact(world, option): { helps: string[]; hurts: string[]; breaks: string[]; bonusHelps: string[]; score: number }` and `actionImpact(world, action)` with the same shape. Mapping: STAT_MIN ← effects[stat] sign and, for orders, preview stat deltas; RELATION_MIN ← `relations:<id>` sign or IMPROVE/DENOUNCE on the target; NO_WAR_WITH ← DECLARE_WAR (breaks), negative relations on target (hurts only when relation < -40); WAR_RESULT/WAR_ENDED ← PROPOSE_CEASEFIRE/MEDIATE on the war (helps), AIRSTRIKE/MOBILIZE in the war (helps WAR_RESULT, hurts WAR_ENDED), positive relations with the enemy (helps WAR_ENDED); SCORE_PAR ← effects on approval, stability crossing 65, average relations (via the score target terms); NO_NUCLEAR ← SABOTAGE/strike nuclear on the target; INSURGENCY_MAX ← policing, stability. Pure read, no RNG.
3. New `src/core/advisors.ts`: port of `computeSuggestions`, `crisisStaffPick` (cabinet pick), `missionPick`, `meetingSuggestion`, `meetingPriority`, `missionRisk` from `ui/src/lib/staff.ts`, reading the player's `beliefs` for nuclear estimates (no ground truth leak) and the last month's report instead of the module-level `relationMemory`. Deterministic, no RNG.
4. `scoring.ts`: `scoreBreakdown(world)` returns per component `{ value, target, terms: Array<{ label: string; points: number }> }`; `updateScore` uses the same function so the explanation can never disagree with the maths.
5. `PlayerTurnReportSchema` gains `score?: { before, after, heading, components: Record<'economic'|'security'|'approval'|'prestige', { before, after, target, terms }> }`, `drift?: Record<string, number>` (approval, stability, legitimacy), `followUps?: Array<{ title: string; due: number }>`, `stepObjective?: string` (index of the step objective), `momentum?: boolean`.
6. API payload (`routes/game.ts`, new game, turn, load): `advice: { suggestions, cabinetPicks: Record<decisionId, optionId>, missionPicks: Record<decisionId, optionId>, meetingPicks: Record<meetingId, optionId> }` and `missionImpact: Record<decisionOrMeetingId, Record<optionId, Impact>>`. The UI stops recomputing; `ui/src/lib/staff.ts` becomes an adapter over the payload (kept for the preview-time order tags).
7. Determinism: all new code is pure reads on state. Report fields are written once per turn from state. `momentum` changes political capital and must go through `tests/core/determinism.spec.ts` and the harness.

---

## 7. Copy

Tone: plain words, short, second person, numbers with their unit, no abbreviations (APPR, STAB, CAP never appear in the month surfaces). Follow the G3 glossary when it lands; until then: "political capital" (◆), "approval", "stability", "legitimacy", "world tension", "<Country>'s view of you", "front".

| Surface | Copy |
|---|---|
| Goal line text | "{n} of {m} on track · month {t} of {T}" |
| Step | "This month: {objective short}, {now}{unit}, needs {need}{unit}" |
| Objective states | "On track", "Close", "Off track", "Failed" |
| Your move header | "Your move" · "{Crisis/Call/Visit} · {Urgent/Existential}" |
| Option badges | "Cabinet pick", "Best for your mission", "Cabinet pick · good for your mission" |
| Mission tags | "Helps: {short}", "Hurts: {short}", "Breaks: {short}", "Helps: {short} (bonus)" |
| Selection | "Cabinet pick: {option}", "Approved: {option}", "Your pick: {option}" |
| Disagreement note | "Your cabinet backs {option}, but it hurts {short}. Switch to {mission option}" |
| Advisor why (templates) | Gap: "{metric} at {now}, your mission needs {need}." Trend: "It fell {x} last month." Window: "They called you this month." / "Reform takes months to pay off; start now." / "Their program may be {p}% along." Threat: "Foreign agents were active last month." |
| Advisor button | "Add" → "Added" (+ "Undo"); disabled: "Needs ◆{n}, you have ◆{m}" |
| Execute summary | "Your pick on {n} crisis, {k} staff orders, staff attend {j} meetings" |
| Against-mission warning | "{n} cabinet pick works against your mission: {option}. Review" |
| Result sentence | "{Your choice} {verb phrase}: {fact 1}, and {fact 2}." (from `outcomes.ts`/`reactions.ts` narration, never splicing a title into a headline) |
| Score line | "Score {a} → {b}. {top negative term}; {top positive term}. Heading to {h} if nothing changes." |
| Follow-up promise | "The outcome comes in {d} months; we will tell you." |
| Coach | "This is your move this month. Pick one." / "Your advisors queued these. Keep them, or tap Add on another." / "When you are ready, run the month." / "Your mission bar moved. Tap it any time to see what each goal needs." |

Never use: "Noted and filed. The machinery of government turns." (filler; staff-handled meetings with no effect become one footnote line "Your staff handled 2 routine meetings").

---

## 8. Layout per breakpoint

### 390 (phone, Noah, Maya)
Concept: `concepts/month-desk-390.html`.
1. HUD (two rows; owned by the HUD workstream; must not exceed 96 px).
2. Goal line: full-width row, 56 px: target icon, title, segmented bar (4 segments, 6 px tall), "1 of 4 on track · month 1 of 12"; second line the step. Never horizontally scrolls; the crisis chips that currently share this row move into "Also on your desk".
3. Your move card: scene thumbnail 16:9 at 100% width (static first frame on phones, animation on tap; keeps GPU cost low), kicker, title (22 px), lede (1 sentence, 16 px), "More".
4. Three option buttons stacked, each ≥72 px, 12 px gap; badge top-right; mission tag and two key effects in words on the last line.
5. Disagreement note (if any).
6. "Your advisors suggest": 3 rows, each 64-80 px, Add button 44×44 minimum.
7. "Also on your desk": 2-3 rows of 52 px.
8. Sticky footer (88 px): line 1 "◆ 2 of 6 political capital · Orders 2 of 6" (full words), line 2: "Full desk" text button (left), "Execute month" primary (right, ≥ 56 px tall, ≥ 60% width). "Approve" is not on the phone Focus footer; tapping an option already decides it.
Tap targets ≥ 44 px; body text ≥ 16 px; nothing below 13 px.

### 1024 (tablet landscape, Ruth at 125% zoom)
Two columns: main 62% (goal line spanning both columns on top, Your move with options in 3 columns, advisors under it), rail 38% (plan summary list "This month you will", budgets in full words, Execute, Approve all on full desk). Navigator becomes the "Also on your desk" rows in the main column. At 125% zoom (effective 819 px) the layout falls back to the 390 stack with a wider column (max 640 px, centered).

### 1440 (desktop, Dan, Marcus, Sam)
Concept: `concepts/month-desk-1440.html`.
Three columns as today (Navigator 280 px, center fluid, rail 380 px). Changes:
- Goal line spans the navigator and center columns at the top (48 px), with the "Focus | Full desk" switch at its right end.
- Navigator mission row expands into the four objective rows with segments (replacing "Mission 1/4"); rows keep their state tags with named picks.
- Center: Your move (options in 3 columns, mission tags and badges), disagreement note, "Your advisors suggest" block (3 rows, 2 columns of advisor cards at ≥1280 px), then the existing detail content ("More" expanded by default on desktop for crises: situation text and arrows visible, so Dan loses nothing).
- Rail: map, budgets (full words), "This month you will" list with named picks and why lines, the against-mission warning, Approve all with honest count, Execute. A compact "Why your score moved" line under the budgets from month 2.

### Result card (all sizes)
Concept: `concepts/month-result.html`. Phone: full screen, scene on top (40% height), sentence, deltas as 2-3 bars, mission row change ("Stability 62 → 69, needs 78"), score line, a small front page thumbnail, footer "See everything" (secondary) + "Next month" (primary). Desktop: centered 960 px card over the dimmed desk, scene left, text right (today's highlight layout, simplified), same footer, plus the "Also this month" chips (working, they open Details at the right page).

---

## 9. After the month: shorter flow (C11, P7)

- Execute → playback → **Result card** → Next month. Two screens in the common case (from ~5).
- "See everything" opens the existing debrief at page 1; the tabs work (whole chip is the button, ≥44 px tall, `aria-selected` updates, keyboard 1-4 kept). "Read the paper" opens the Chronicle. Both have "Next month" in their footer so no path needs scrolling to leave.
- Setting "After each month: Result card only / Result card + details / Everything" (default: Result card only; Dan and Marcus can pick Everything; persisted). The Table toggle stays.
- The paper: the result card shows the front page as a thumbnail with its headline; it opens automatically only on a big moment month (`report.moments` non-empty, war start/end, election, deposition warning) because those headlines are the shareable beats (Olivia, Maya, Noah liked them).
- Tab chips bug: QA reported taps on "Diplomacy" not responding (Maya, Olivia, Noah). The handler exists (`MonthDebrief.tsx` tab `onClick={() => go(i)}`); likely causes are the machine load or the label text not being the hit target on touch. The fix spec is behavioural (AC-18): the whole chip responds within 100 ms of a tap on a phone viewport. Engineers verify with a Playwright tap by role.

---

## 10. Anti-repetition rules (P11)

Engine:
- R1 Crisis templates: existing 9-month cooldown kept. Add: a crisis must not reuse the same scene kind as the previous month's crisis unless it is a follow-up (`kinds.ts`, art workstream to add scenes; the assassination crisis gets its own scene instead of the refugee rally).
- R2 Calls from the same leader: at most once in any 3 months even at war (raise the war recency penalty in `meetings.ts` `callers()` from 60 to 200), unless the front moved ≥ 8 or their view of you moved ≥ 15 since the last call; then the call uses a second text variant and option set that references the change ("Your offer of talks still stands? The front has moved since.").
- R3 Reaction lines (`reactions.ts`): no two cards in one month share a reaction line or headline template; the same line is not reused for the same speaker within 6 months. Store a small rolling hash list in `director.recentLines` (max 40 entries), deterministic.
- R4 Staff-handled meetings with no measurable effect produce no line of their own; they are counted in one footnote.

UI:
- R5 Home and security: an order or decision card whose label and verdict match last month's card collapses to a one-line row: "Reform program again (3rd in 6 months): stability +1.2, about half the effect". Same for "Why your numbers moved": causes that repeat last month's appear as "Still: war weariness weighs on the public mood" in muted text after new causes.
- R6 The result card never shows the same sentence pattern two months running for the same order type (pick the next variant from `outcomes.ts` narration).
- R7 Staff orders: see 5.2 (no same type two months running, max 2 in 4 months).

---

## 11. Acceptance criteria (QA, observable)

Goal line and mission
1. On the desk at 390, 1024 and 1440 a goal line is visible without scrolling, showing the mission title, one segment per primary objective, and the text "{n} of {m} on track · month {t} of {T}". The string "1/4" or "2/4" alone does not appear anywhere.
2. The goal line never causes horizontal scroll at 390 px (document `scrollWidth` equals viewport width).
3. Tapping the goal line opens the Mission sheet within 300 ms; each objective shows now, need and state; at least one objective shows a "Helps now" item when any option or suggestion helps it.
4. Tapping a "Helps now" item focuses that crisis/meeting or queues that order (visible in the plan list).
5. After a month in which stability rose, the stability objective's now value on the goal line and Mission sheet equals the HUD stability (rounded) and shows "Last month: +x".

Your move
6. Each month the desk shows exactly one card labelled "Your move" above all other items in Focus view and at the top of the center column in Full desk.
7. Each option of the Your move card shows its label, at most two key effects written in words (no "▲▲", no abbreviations), and at most one mission tag.
8. In the Bab al-Mandab SAU month 1, "Back channel via Muscat" shows a "Helps:" tag and "Bomb Sanaa" shows a "Hurts:" tag mentioning stability.
9. The crisis badge never reads "Your call". After tapping "Approve cabinet pick" it reads "Approved: {option label}"; after picking another option it reads "Your pick: {option label}". The Navigator row and the plan list agree.
10. When the cabinet pick hurts a primary objective (STATESMAN), a note naming the cabinet option and the mission option is shown, and one tap switches the choice.
11. On ANALYST the cabinet pick never carries a "Hurts" or "Breaks" tag.

Advisors
12. At least 2 advisor suggestions are visible without scrolling at 1440 and within one scroll at 390, on the desk and in Map mode, each with a "Why" line of at most 120 characters containing at least one number.
13. Tapping "Add" queues the order in one tap (plan list count +1) and the button reads "Added"; an unaffordable suggestion shows its reason on the button before any tap.
14. Staff never queue the same order type in two consecutive months (check 6 consecutive months of a Term with staff orders on).

Onboarding
15. In a new Flashpoint the briefing screen has no repeated sentence (split visible text on ". ", no duplicates) and shows at most 2 lines of prose above the goal chips; "Full briefing" reveals the full briefing.
16. In month 1 the coach shows exactly one bubble at a time, attached to the element it names, and advances when the player does the action. The 3-line "Left/Middle/Right" tip is not shown by default.
17. A first-time tester can say what they are supposed to do on month 1 within 30 s (panel check: Olivia, Noah, Ruth answer "pick one of three answers to the airport strike, then run the month").

After the month
18. After Execute, the first screen is a single result card containing one sentence about the player's primary choice, 2 or 3 deltas, the mission change and a score line; "Next month" returns to the desk in one tap (two screens total for the month).
19. Every debrief tab chip switches the page on a single tap at 390 px within 100 ms (Playwright tap by role "tab").
20. "See everything" and "Read the paper" are reachable from the result card, and each has a "Next month" control visible without scrolling.
21. When a decision schedules a follow-up, the result card says when the outcome comes; when it resolves, the next result card leads with it.

Score
22. The result card and the HUD score sheet show "why your score moved" with the four components, each with now, heading and at least one named term; the shown terms sum (within 1 point) to the change in the target.
23. In Dan's setup (PAK Term, at war with India), the sheet names the war as the main negative term within the first 3 months.

Repetition
24. Over 12 months of a Term with staff picks, no reaction line appears twice in the same month, and the same leader's call does not appear in two months less than 3 apart unless the front or relation moved by the threshold.
25. A repeated order card on the Home page collapses to a single line from the second consecutive month.

Balance (harness, engine QA)
26. `npm run sim` with `--policy staff` exists and the targets in 5.4 hold with `--games 36` on the listed seats; `tests/core/determinism.spec.ts` passes.

Accessibility
27. All month surfaces are usable at 125% zoom on a 1024×768 viewport with no clipped text and tap targets ≥ 44 px.

---

## 12. Build plan (work packages)

Order: WP-0 lands first (contract, half a day). Then WP-A to WP-I run in parallel; each owns its files. Shared files are owned by exactly one WP; others consume through the contract.

| WP | Title | Owner | Files (owns) | Depends on |
|---|---|---|---|---|
| WP-0 | Contract: types and payload stubs | Engine + Frontend | `src/core/types.ts` (report fields: `score`, `drift`, `followUps`, `stepObjective`, `momentum`; `ObjectiveCondition.short` optional), `src/api/routes/game.ts` (payload keys `advice`, `missionImpact`, richer `objectiveStatus`, filled with empty defaults), `ui/src/store/gameStore.ts` (mirrored types + store fields `advice`, `missionImpact`, `deskView`) | none |
| WP-A | Mission status and impact (engine) | Engine | `src/core/objectives.ts` (now/need/unit/trend/state/helps), new `src/core/missionImpact.ts`, `tests/core/mission-impact.spec.ts` | WP-0 |
| WP-B | Advisors in core, cabinet vs mission pick, staff policy in harness | Engine (Game Designer reviews bands) | new `src/core/advisors.ts`, `scripts/simulate.ts` (`staff`, `staffswitch` policies), `ui/src/lib/staff.ts` (adapter over payload), `ui/src/lib/month.ts` (staff order variety, `primaryItem()`), wiring calls in `src/api/routes/game.ts` payload builder (only the lines WP-0 stubbed), `tests/core/advisors.spec.ts` | WP-0, WP-A (impact functions) |
| WP-C | Score breakdown and choice vs drift (engine) | Engine | `src/core/scoring.ts` (`scoreBreakdown`, used by `updateScore`), `src/core/turn.ts` (`finishReport`: `score`, `drift`, `followUps`, `stepObjective`), `tests/core/scoring.spec.ts`; run determinism spec | WP-0 |
| WP-D | Goal line and Mission sheet | Frontend | new `ui/src/components/desk/GoalLine.tsx`, `ui/src/components/Drawers.tsx` (`MissionPanel` rewrite), `ui/src/components/desk/Navigator.tsx` (mission rows, named pick tags), new `ui/src/styles/month-goal.css` | WP-0 |
| WP-E | Your move card, mission tags, named selection, Focus view | Frontend (UX designer reviews) | new `ui/src/components/desk/YourMove.tsx`, `ui/src/components/desk/Detail.tsx` (`Option`, `CrisisDetail` badges and tags, lede/More), `ui/src/components/Desk.tsx` (Focus/Full switch, layout, coach mount slot, remove default CoachTip), new `ui/src/styles/month-move.css` | WP-0 |
| WP-F | Advisors block (desk and map) and Execute summary | Frontend | new `ui/src/components/desk/AdvisorList.tsx`, `ui/src/components/desk/CommandRail.tsx` (plan summary, against-mission warning, honest Approve count, `CommandStrip` uses `AdvisorList`), new `ui/src/styles/month-advisors.css` | WP-0 |
| WP-G | Onboarding by doing | Frontend | `ui/src/components/BackstoryModal.tsx` (dedupe, goal chips, Full briefing), new `ui/src/components/desk/Coach.tsx`, new `ui/src/lib/coach.ts`, `ui/src/components/SettingsModal.tsx` ("Show me around again"), data: optional `short` labels in `data/flashpoints/*.json` (Content consultant) | WP-0; mounts in WP-E's slot |
| WP-H | Result card, short flow, tab fix, after-month setting | Frontend + Art | new `ui/src/scenes/ResultCard.tsx`, new `ui/src/components/ScoreWhy.tsx` (also used by the HUD), `ui/src/scenes/MonthDebrief.tsx` (tabs, Next month on every page), `ui/src/components/Chronicle.tsx` (flow: result card first, paper optional/auto on moments), `ui/src/components/Hud.tsx` (score tile opens `ScoreWhy`), `ui/src/scenes/debrief.css` | WP-0 (consumes WP-C fields; renders without them) |
| WP-I | Anti-repetition | Engine + Frontend | engine: `src/core/meetings.ts` (R2), `src/core/reactions.ts` (R3, `director.recentLines`), `src/core/crises.ts` (R1 scene guard metadata only); UI: `ui/src/lib/debrief.ts` (R5, R4 footnote); `ui/src/scenes/kinds.ts` (R1 mapping, with Art); tests `tests/core/repetition.spec.ts` | WP-0 (`director.recentLines` added in WP-0 types) |
| WP-J (optional) | Momentum reward | Engine + Game Designer | `src/core/turn.ts` (after WP-C merges), `src/core/types.ts` `rules.momentum` flag, harness run | WP-C, WP-B |

Conflict notes:
- `src/core/types.ts`, `routes/game.ts` and `gameStore.ts` are touched in WP-0 only; WP-B edits only the payload builder lines that WP-0 created, after WP-0 merges.
- `src/core/turn.ts` is owned by WP-C in this iteration; WP-J waits for it.
- Each UI WP has its own CSS file, imported by its component, so `wc.css` is not edited concurrently (tokens only are read).
- `Desk.tsx` belongs to WP-E; WP-G only provides `Coach.tsx`, mounted in WP-E's slot (`<CoachSlot />`).

Definition of done per WP: ACs mapped (D: 1-5; E: 6-11, 16 slot; F: 12-14, 3.7; G: 15-17; H: 18-23; I: 24-25; B: 26; all: 27), unit tests, `npm run test`, `npm run lint`, `cd ui && npm run lint`, and a ledger entry.

---

## 13. Risks

- **Casual players lose more with an honest cabinet.** Mitigated by ANALYST keeping the safety net, the one-tap switch, and the harness band for staff on ANALYST (55-75%). Watch Olivia/Maya recommend scores in iteration 1.
- **Mission tags are heuristic for score goals.** Score tags only appear when a term crosses a threshold (stability over 65, a war ends, approval) so they are rarely wrong; QA AC-8 and a unit table guard the mapping.
- **Focus view hides the meetings.** Mission-country meetings are surfaced first in "Also on your desk", and the staff still attend; Full desk is one tap.
- **Performance.** Static scene first frame on phones in Focus view and on the result card until tapped; no new continuous animation.

# Iteration 3 triage (build d70608a, code as of 9624de4, served locally)

Sources: nine customer sessions (`sessions/*.json`, `sessions/*.md`), `qa-verify.md`, `../../regressions.yaml`, method `devloop/method/triage.md`. Paths below are relative to `devloop/instances/world-conflict/runs/iter-03/` unless they start with `shots/` (also under `runs/iter-03/`). Weights: maya .18, olivia .13, ruth .13, noah .10, priya .10, dan .10, sam .09, leo .09, marcus .08.

| Maya | Olivia | Ruth | Noah | Priya | Dan | Sam | Leo | Marcus | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| 6 | 6 | 7 | 5 | 7 | 6 | 6 | 7 | 6 | **6.22** (iter 2: 6.3) |

Weighted: fun 6.32, clarity 6.36, visual 7.44, feels like a game 6.51, agency 6.34, realism 6.26, replay 5.79, recommend 6.22. Nobody quit; all nine reached their stopping point (seven reached the reveal, Dan and Marcus stopped at month 12 of a 48-month Term by design). Verdict: the floor rose (only Noah is below 6; iter 2 had Olivia and Noah at 5), but the ceiling fell (Maya and Priya, 8 in iter 2, are now 6 and 7). The round is flat on the headline number and the dominant theme changed from "I drown" (iter 2) to "I am not asked anything" (Accept all autopilot).

## 1. Regression check (method step 8), before clustering

Rule: a reported problem matching a registered finding is REGRESSED and counts as at least S2. Matches below are by the registry entry's stated intent, not only its guard. Where the customer evidence is thin or the feature exists but was not found, it is marked "soft": QA must reproduce first (step 3) and the guard should be extended, but it is not dismissed.

### 1a. Attributed to the two QA S2s already being fixed

| Registry id | Report | Persona (weight) | Evidence | Cause |
|---|---|---|---|---|
| RS-001-5, F-02-5 (REGRESSED, confirmed by QA S2-1) | "Your advisors suggest" cards render one letter per line, 300 to 650 px tall, at every width, from month 2 | dan .10, marcus .08, priya .10, sam .09 (reach .37; every persona sees the list from month 2) | `shots/dan-term/015-m2full.png`, `shots/marcus-term/019-m5.png`, `shots/priya-flash/013-m2c.png`, `shots/sam-desktop/011-m2b.png` (under `sessions/sam-desktop/`), `qa-verify.md` S2-1 | Desk advisor list CSS; guard `QA1-S2-1.mjs` only checks the Map strip, where `.advisors.compact` hides it. Fix in progress; guard to be extended to the desk at 390, 1024, 1440, 1920 |
| RS-004 (not regressed; side effect, QA S2-2) | Sound button sits on Main menu and Skip in every reveal stage on phones | maya .18, noah .10 (reach .28; both rated it S3) | `shots/maya-phone/*` (reveal stages), `shots/noah-phone/044-v1.png`, `qa-verify.md` S2-2 | New Main menu button in the reveal header (RS-004 fix). Fix in progress. Customers did not lose the reveal (they did not tap Skip) but reported it on every stage |

RS-004 itself held: every one of the seven reveal players found a way back and six started or reached a second game (see section 4). RS-005 held functionally (Recommended group and counts verified by QA and used by all nine).

### 1b. Other matches (customers, not covered by the QA S2s)

| Registry id | Reported problem | Persona (weight) | Evidence | Status |
|---|---|---|---|---|
| F-00-6, F-00-7, QA0-8c, F-02-8 | Every country answers a call with the same sentence ("a better conversation than either of us expected" to Poland, Germany, Japan, UK); "Finally, someone who listens" quote reused on a strike result; Court Iran every month; Court UK answered by Denmark and Germany; staff propose Court Poland at relations -99 for +5; generic templates (Energy price shock, Beg for Patriots) after the war ended | dan .10, marcus .08, priya .10, leo .09 (reach .37) | `shots/dan-term/023-r3d.png`, `shots/dan-term/036-r7.png`, `shots/priya-flash/015-d2.png`, `marcus-term.md`, `leo-stream.md` | REGRESSED, S2. Guards cover one month or one speaker; they miss reuse across different countries and across months of a long game |
| F-01-2, F-01-3, F-00-5, QA2-S2-1, QA1-S4-share | Numbers and words disagree: mission strip Iran -75 to -89 vs report -74 to -69; verdict "5 of 5 goals" vs desk 4; reveal counts 13 orders for 1; verdict "missed 120 by 3" vs par 115; "better than 0%" at 562 while random staff scores 523; month 9 under both went well and went badly; "Accept it publicly" under went badly while it carried the mission; war under went well; best moment "Spy on Iran" in a Venezuela game; Presidency Score 0 before counting; "0 of 0 on track"; paper shows SCORE 0.0 and an unordered FAILED "Spy on Turkey" | marcus .08, sam .09, leo .09, ruth .13, priya .10, olivia .13, dan .10 (reach .72) | `shots/marcus-term/014-m3r.png`, `015-m3d.png`; `sessions/sam-desktop/038-x12.png`; `shots/leo-stream/046`, `048`; `shots/ruth-tablet/048-truth2.png`; `shots/priya-flash/041-r2.png`; `shots/olivia-laptop/035-mo.png`; `shots/dan-term/039-mis.png`, `045-paper.png` | REGRESSED, S2. Registered findings cover HUD, card, debrief and paper agreement and moment direction; the mission strip, the verdict, the order count and the moment text are not on the single source |
| F-01-7 | Era and context plausibility: 1990 game gets a clandestine Iraqi nuclear program, an outbreak with a vaccine effort and a 16-vote UN board on a 15-seat council; Australia spies on China; Gaza reconstruction for Russia; Afghan refugees, Iran sanctions and Gaza on a Scarborough game; "Donetsk and Kramatorsk" sample line in 1990 and China games; 377-seat majority for Ukraine and a one-party state | marcus .08, leo .09, dan .10, sam .09, priya .10, noah .10 (reach .56) | `shots/marcus-term/025-m6e.png`, `004-seed3.png`; `leo-stream.md`; `sessions/sam-desktop/038-x12.png`; QA S3-1 | REGRESSED, S2 (the filter covers events, AI orders and pacts; crisis templates, reveal text and the familiarity sample do not) |
| F-00-8 (soft), F-01-6 | Accept all recommended carried the game: Olivia A 746 3 stars, Sam B 652 2 stars, "Accept all won so I saw no reason to try other choices"; capital sat at 5 to 6 unspent for months (Maya, Sam, Dan months 2 to 5, Marcus, Olivia); the Big move suggestion did not change behaviour | olivia .13, sam .09, maya .18, dan .10, marcus .08, plus Ruth, Priya, Noah, Leo (reach .90 to 1.00) | `olivia-laptop.md`, `sam-desktop.md`, `shots/maya-phone/039-v2.png` | REGRESSED (soft), S2. Counter-evidence: Maya, Noah, Leo (peaceful run) and Marcus did not win on picks, and warnings exist (Ruth saw "hurts your mission"). So the autopilot is not a guaranteed win, but two of nine win with it and seven of nine report no decisions. QA to reproduce with the harness `staff` policy (approve all) over the control seeds |
| F-02-5, F-00-14, RS-001-3 | Map mode: "Add to this month" did not register and Execute ran with 0 orders (Olivia); game flipped back to Desk by itself in month 3 (Olivia) and the next month dropped to Focus (Noah); tapped Iran got Afghanistan (Noah); three taps on Taiwan did nothing, verbs differ from the desk (Accept order / Add / Remove vs Accept) (Sam); Map switch only inside the hamburger on phones (Maya, Noah) | olivia .13, noah .10, sam .09, maya .18 (reach .50) | `shots/olivia-laptop/013-map3b.png`, `shots/noah-phone/021-map2.png`, `019-menu.png`, `sessions/sam-desktop/013-map2b.png`, `015-map2d.png`, `shots/maya-phone/014-fd.png` | REGRESSED, S2 |
| F-00-4 | Titles and labels covered or clipped: "Best trade-off" label over the crisis headline and tip box over it (Ruth tablet), tablet right rail overlapping itself, header "month 6 o..." truncated, STEP ACHIEVED stamp covers a label (Noah, Ruth), Accept all box over the second recommendation (Sam), coach bubble covers the Recommended list (Dan), pin icon poking out of the tag (Sam) | ruth .13, noah .10, sam .09, dan .10 (reach .42) | `shots/ruth-tablet/005-m1.png`, `006-m1b.png`, `011-m2.png`, `022-m6pre.png`; `shots/noah-phone/015-r2.png`; `sessions/sam-desktop/010-m2.png`; `shots/dan-term/010-orders.png`; QA S3-3 | REGRESSED, S2 (rule), customer-rated S3 |
| F-00-3 | Goal box is a wall of text with "Iran relations -90+" and "approval 80%+"; Noah did not know what -90 means; Noah clarity 4 | noah .10 (with olivia .13 and maya .18 on unknown names) | `shots/noah-phone/005-m1.png` | REGRESSED (soft), S2: iter-2 F-02-1 fixes held (no auto-open briefing, month-1 goal sentence, Noah finished), but the number-heavy goal text remains. F-01-5 (names explained in place) held: chips exist and helped Maya, Olivia, Sam; Noah would not tap them; Dan found known names unmarked at "I know this" |
| F-00-9 | "Next month" shown twice per month (result card, then the paper) and dead air in the calm run | olivia .13, leo .09 (reach .22) | `olivia-laptop.md`, `leo-stream.md` | REGRESSED (soft), S3 customer-rated: the paper step depends on the "After each month" setting; confirm the default |
| F-02-6, F-00-11 | Cannot replay a crisis with the opposite choice and compare; "Compare runs" greyed out | marcus .08, noah .10, priya .10 | `marcus-term.md`, `shots/noah-phone/054-nw.png` | REGRESSED (soft): branch from month exists in Saved games (QA verified) but nobody found it from the debrief; discoverability, not absence. S3 customer-rated; QA S3-4 month numbering makes it worse |
| F-02-4, QA0-5 | Priya: political capital shows "6 left" while 0 seals and 5 orders are queued; Olivia: "2 staff proposals not accepted (they will not run)" confused her | priya .10, olivia .13 | `priya-flash.json` bug S4 | REGRESSED (soft): QA to reproduce the HUD number, S3 if confirmed |
| F-02-2 | Dan's paper lists a FAILED "Spy on Turkey" he never ordered; Noah's raid never reported on a result card (only the mediation) | dan .10, noah .10 | `shots/dan-term/045-paper.png`, `shots/noah-phone/024-r3.png` | Needs repro (step 3); if it reproduces, REGRESSED S2. Counted under F-03-4 |

Not regressed, checked: F-02-1 (no briefing wall), F-02-3 (Leo's war chain had loud, fair consequences and a postable card), RS-002 (benchmarks present, ladder and rarity shown), F-00-10 (the truth table was named the best part by Ruth, Priya, Maya, Sam), RS-003 learning aids, F-02-7.

Guard actions: extend `QA1-S2-1` to the desk; add a reveal-header overlap guard at 360 to 600 px; add cross-country and cross-month reply-reuse checks to the F-00-6 guard; add a reveal and strip consistency test (verdict goals, order count, moments direction, strip vs report); add an autopilot test on the control seeds; extend the F-00-4 overlap guard to tablet (768 to 1024).

## 2. Clustered findings

Severity S1 to S4. Reach is the sum of panel weights. "Planned" says whether the iteration-4 designs cover it: agenda = `design-agenda.md` (D-65, D-70), cards = `design-order-cards.md` (D-66, D-74).

No S1. S2 list first.

| ID | Cluster | Sev | Reach | Personas | Evidence | Planned |
|---|---|---|---|---|---|---|
| F-03-1 | **Accept all autopilot: from month 3 the game asks nothing.** Everyone guessed "answer the crisis, skip the rest" or "Accept all, Execute" and was right; capital sat unspent at the 6 cap; crises answered unread; middle months feel the same; agency and replay suffer; Olivia and Sam win on picks | S2 (REGRESSED F-00-8 soft, F-01-6) | 1.00 | all nine | `olivia-laptop.md`, `sam-desktop.md`, `maya-phone.md`, `ruth-tablet.md`, `shots/dan-term/` (cap months 2 to 5) | Agenda: yes, directly (one thing at a time, Skip with its cost, crisis first). Does not cover a game-design answer for months 5 to 12 (stakes that vary) or the autopilot win; needs a balance item |
| F-03-2 | Desk advisor cards collapse (QA S2-1) | S2 (REGRESSED RS-001-5, F-02-5) | .37 reported, 1.00 exposure | dan, marcus, priya, sam | see 1a | Being fixed; agenda replaces the list anyway, but the fix must ship first |
| F-03-3 | **Map mode hides the story and loses the player:** crisis text missing (only "Crisis answer: ..."), accepted a special forces raid and the Belarus rescue unread (stability 51 to 35, Ruth), Add not confirmed, flips back to Desk or Focus, tap targets wrong, Map switch buried on phones, different verbs than the desk | S2 (REGRESSED F-02-5, F-00-14) | .80 | maya, olivia, ruth, noah, sam, leo, marcus | `shots/ruth-tablet/014-m3map.png`, `015-m3map2.png`, `shots/noah-phone/022-map3.png`, `shots/marcus-term/013-m3map2.png`, `shots/olivia-laptop/013-map3b.png` | Agenda: partly (map agenda drawer and strip). Verbs parity, tap targets, mode persistence and phone Map switch are not in either design |
| F-03-4 | **Numbers and words contradict** (strip vs report, verdict vs desk, order count, par, 0% vs random, moments direction, phantom FAILED, 0 of 0, SCORE 0.0) | S2 (REGRESSED F-01-2, F-01-3, QA2-S2-1) | .72 | marcus, sam, leo, ruth, priya, olivia, dan | see 1b | No |
| F-03-5 | **Repeated, boilerplate and nonsensical lines and staff suggestions** (identical call replies, reused quotes, Court Iran monthly, Court Poland at -99, wrong country answering, generic templates after the war ended) | S2 (REGRESSED F-00-6, F-00-7, QA0-8c, F-02-8) | .37 (+ sam .09 filler = .46) | dan, marcus, priya, leo, sam | see 1b | No |
| F-03-6 | **Plausibility:** era-wrong crises in 1990, Australia spying on China, one order ends the Ukraine war in month 3 (Priya), Iran war ends by itself (Olivia), war ends month 8 "too neat" (Ruth), seat count for one-party states, Donetsk sample in other eras | S2 (REGRESSED F-01-7); the ceasefire needs QA repro | .72 | marcus, leo, dan, sam, priya, olivia, ruth | `shots/priya-flash/018-map4.png`, `shots/marcus-term/025-m6e.png`, QA S3-1 | No |
| F-03-7 | Phone reveal header overlap (QA S2-2) | S2 | .28 | maya, noah | 1a | Being fixed |
| F-03-8 | **Layout seams and overlaps** (labels over headlines, tablet rail, truncated header, stamps over labels, coach bubble over list, rail Accept all over item, crisis art reused 3 times, card row 4 px off) | S2 by rule (REGRESSED F-00-4), customer S3 | .42 | ruth, noah, sam, dan | see 1b | Cards: partly (reused art and card paper); the overlaps no |
| F-03-9 | **Newcomer legibility:** goal text with "-90+", names (Machado, Takaichi, Burnham, Khamenei, Kramatorsk, Fujairah, Zhang Youxia) not understood or not tapped; "i" chips not noticed by Noah; at "I know this" some names unmarked; Noah clarity 4, agency 5 (did not know the Iranian meeting cost US ties) | S2 (REGRESSED F-00-3 soft) | .51 | noah, olivia, maya, dan | `shots/noah-phone/005-m1.png`, `shots/olivia-laptop/003-seed2.png` | Agenda: partly (plain words, one thing at a time). Goal wording and consequence-before-accept for meetings not covered |
| F-03-10 | Play a seed is hard to find and use: first tap by label failed, field hidden until tapped, the disabled "Play this seed" beside Today's crisis looks like the button, no hint that dashes are optional. Some of this may be driver timing (globe turning), but eight of nine hit it | S3 | .90 | maya, olivia, ruth, priya, dan, leo, marcus, sam | `shots/dan-term/002-seed.png`, `shots/marcus-term/003-seed2.png`, `shots/priya-flash/004-s2.png` | No |
| F-03-11 | Crisis answer selection state and pressability unclear (picture selects, heading does not; no tick; cards do not look pressable until YOUR PICK; Ruth hoped) | S3 | .41 | ruth, priya, marcus, noah | `shots/ruth-tablet/006-m1b.png`, `shots/marcus-term/006-m1b.png`, `shots/priya-flash/007-m1b.png` | Agenda: affordance key mock covers part. Cards design covers orders, not crisis answers |
| F-03-12 | Way back labels: "New game" looks like a button or a label, "New world" vs "New game" sound the same, New world reopened the same UAE briefing, Compare runs greyed out, bottom button names the next stage | S3 (RS-004 held) | .51 | maya, noah, priya, ruth, olivia | `shots/ruth-tablet/050-rank.png`, `shots/noah-phone/054-nw.png`, `shots/maya-phone/050-sc.png` | No (Ruth and Maya both asked for one "Play again" button) |
| F-03-13 | Reveal polish: score 0 before counting, static on a 1920 stream, Share buttons under the footer, stages 4 to 8 are homework (Noah), sidebar "The verdict" lands elsewhere, Truth table jargon (Busan, Zhang Youxia, "1182k"), 8 stages long on a commute | S3 | .64 | leo, olivia, noah, ruth, sam, priya, maya | `shots/noah-phone/052-v8.png`, `shots/leo-stream/`, `shots/ruth-tablet/048-truth2.png` | No |
| F-03-14 | Wording is not yet one vocabulary: "Cabinet pick" vs Recommended, "staff proposals not accepted", "1 if approved", Hostile / lamentable / LAMENTABLE (-56), Accept order / Add / Remove vs Accept, two counts in the Map strip, "Jinping's answer", unit-less "Economy -65" | S3 (G3; QA S3-2) | .41 | sam, olivia, dan, noah | `qa-verify.md` S3-2, `sessions/sam-desktop/015-map2d.png` | No |
| F-03-15 | Debrief and effect gaps: free order cost Approval -3 hidden under "+1 more", Mass troops showed no number, tension 34 to 48 without a stated cause, header meters (Stability) not tappable, a path to the 115 bonus unclear | S3 | .36 | marcus, dan, leo | `shots/marcus-term/009-m1d.png`, `shots/dan-term/031-stab.png`, `027-r4.png` | Cards: partly (effect sizes) |
| F-03-16 | In-session replay with another choice and compare (what to do differently) | S3 (F-02-6, F-00-11 soft) | .36 | marcus, maya, noah | `marcus-term.md` | No |
| F-03-17 | Two Next month presses per month; dead air in the calm run | S3 (F-00-9 soft) | .22 | olivia, leo | | Agenda: partly (fewer steps) |
| F-03-18 | S4 bundle: phone HUD More off-screen at 6 seals, lone "," in the goal sentence, plan bar count, debrief table wider than the phone, "Replay or branch" and "Play a seed" look like text, 1960 What if Ukraine keeps 2026 text, German flag stripes, capital "6 left" HUD, `docs/GAMEPLAY.md` stray full stop, far-side rim marker and black last month in the report strip (open since iter 2) | S4 | | QA + sam, priya, dan | `qa-verify.md` S4 | No |

Verified-bug rate: of the 17 customer-reported bugs filed S2 to S4, QA reproduced the advisor cards (4 reports) and the phone reveal header (2 reports) in its own pass; the rest have not yet been run through QA (step 3) and are filed as "reported". Reproduction of F-03-4 items, the phantom FAILED order, the Priya capital number and the one-order ceasefire is the first QA task for iteration 4.

## 3. Friction tallies (120 friction rows, nine personas)

| Kind | Count | Maya | Olivia | Ruth | Noah | Priya | Dan | Sam | Leo | Marcus |
|---|---|---|---|---|---|---|---|---|---|---|
| affordance | 24 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 3 | 2 |
| other | 24 | 1 | 2 | 3 | 4 | 3 | 3 | 3 | 1 | 4 |
| naming | 21 | 2 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 1 |
| misread | 18 | 1 | 0 | 1 | 2 | 2 | 3 | 2 | 4 | 3 |
| hesitation | 15 | 2 | 3 | 3 | 2 | 0 | 1 | 1 | 1 | 2 |
| dashboard-feel | 12 | 1 | 1 | 0 | 2 | 0 | 2 | 4 | 1 | 1 |
| retry / backtrack / parity | 6 | 0 | 2 | 1 | 0 | 1 | 0 | 2 | 0 | 0 |

**Knowledge (naming) friction, 21 rows plus unknown names in prose.**
- Unknown names named by persona: Maya (Kramatorsk, caretaker PM, counter-intelligence sweep, Declassified nuclear estimate); Olivia (Machado, Rodriguez, Maduro, Caracas, snapback, stabilization force, Khamenei, Hamas); Noah (Al Dhafra, Fujairah, Khamenei, IRGC, Abiy Ahmed, and "-90"); Dan (Burnham, Takaichi, Mojtaba Khamenei, Kramatorsk, Kerem Shalom); Leo (Donetsk and Kramatorsk in a China game, Busan, Zhang Youxia, Central Military Commission); Ruth (Russia "1182k" strength, nuclear percentages).
- Pattern 1: the i chips help people who tap them (Maya, Olivia, Sam) and are invisible to the one who needs them most (Noah). Dan at "I know this" sees names he does not know with no mark.
- Pattern 2: jargon in numbers, not names, is the larger gap: -90+, "Hurts: Approval of 55%+", legitimacy, tension, strength "1182k", "caretaker PM".
- Pattern 3: the familiarity sample sentence is hard-coded to Donetsk (Leo, Marcus, Noah, QA S3-1).
- Vocabulary naming (G3): Cabinet pick vs Recommended, New world vs New game vs Replay, Hostile / lamentable.

**Affordance friction, 24 rows.** Play a seed (8 of 9), Map mode entry and Add confirmation (5), crisis answer selection (4), not-pressable cards (Noah), header meters not tappable (Dan), unexplained map icons (Ruth), seed box placeholder (Dan, Maya), bottom button names the next stage (Maya), "New game" label vs button (Maya, Priya, Noah, Ruth, Leo).

## 4. Control-scenario baseline (first iteration with fixed controls, D-59)

Seeds are the fixed control codes. Scores are Presidency Score out of 1000 at the reveal where reached. Baseline for iteration 4 to compare against; same seeds, same persona.

| Persona | Control seed, mode | Months played | End reached | Result | Second game | Recommend |
|---|---|---|---|---|---|---|
| Maya | CO-UKR-MAYA1, Flashpoint (phone) | 12 of 12 | Yes, full reveal | Mission failed, D, 470 (QA's recommended picks on the same seed also gave 471, D: reproducible) | Yes, New world from the share card | 6 |
| Olivia | CA-USA-OLIV1, Flashpoint (laptop) | 12 of 12 | Yes | Mission complete, A, 3 stars, 746 | New game pressed, landed on the title, no second game started | 6 |
| Ruth | CO-UKR-RUTH1, Flashpoint (tablet) | 12 of 12 (notes say 14, a typo) | Yes | B, 2 stars, 620, "Comeback Kid" | Yes, started from the end screen | 7 |
| Noah | HC-ARE-NOAH1, Flashpoint (phone) | 12 of 12 | Yes | Mission failed, D, 0 of 3 stars (missed US relations by 2) | Yes, New world (it reopened the same briefing) | 5 |
| Priya | CO-UKR-PRIY1, Flashpoint (laptop) | 12 of 12 | Yes | Mission complete, A, 3 stars, 714 | Yes, Hormuz Convoy as the US from Ranking | 7 |
| Dan | T2026-RUS-DAN01, One Term (desktop) | 12 of 48 | No (by design, no election reached) | Score 100 to 87, bonus 115 judged unreachable | No | 6 |
| Sam | SL-CHN-SAM01, Flashpoint (desktop) | 12 of 12 | Yes | Mission complete, B, 2 stars, 652 | No ("I had my answer") | 6 |
| Leo | QU-CHN-LEO01 (desktop, stream) | Run 1: 2 (declared war on Japan); run 2: 12 | Yes, both | Run 1: mission failed, F, "Warmonger". Run 2: 117 of 120, D, 562, "So Close" | Yes (Replay same opening, then another game from the title) | 7 |
| Marcus | T1990-USA-MARC1, One Term (desktop) | 12 of 48 | No (by design) | Score 100 to 120, approval 74 to 65 | No | 6 |

Reads: the three control seeds in Ukraine (Maya D 470, Ruth B 620, Priya A 714) differ by 244 points between a fast phone player and a careful laptop player, so scores are sensitive to play style as intended; the two losses (Maya, Noah) both came from unspent capital or an accepted pick with a hidden cost, which is also what both asked for ("what to do differently"). The same seed is reproducible (QA: 71 to 79% approval, 471 both times). Seven of nine reached a reveal, six started a second game or replayed, and no one quit.

## 5. Release gate (`goals.md`, `gate.md`)

| Check | Threshold | Result | Met |
|---|---|---|---|
| Weighted recommend | >= 7.0 | 6.22 | No |
| No persona below 6 | floor 6 | Noah 5 | No |
| Weighted feels like a game | >= 7.0 | 6.51 | No |
| Weighted agency | >= 7.0 | 6.34 | No |
| Olivia completes a session | complete | Yes (12 of 12, A, 3 stars) | Yes |
| Ruth completes a session | complete | Yes (12 of 12, B, 2 stars) | Yes |
| No open S1 or S2, no REGRESSED | none | Open S2: F-03-1 to F-03-9; REGRESSED: eleven registry matches (section 1) | No |
| Goals G1 to G13 verified and confirmed | all | G5, G6 (parity), G7, G13 (stability) are not confirmed; G13 fails by the regressions | No |
| Verify gate green | green | PASS at 9624de4 (597 tests, 83 of 83 guards), but the guards missed S2-1; not rerun | Gate itself yes, coverage no |

Gate not met. Compared with iteration 2 (6.3): recommend flat (6.22), floor up (Olivia now 6; Noah still 5), agency 6.34 (iter 2: 6.2), feels like a game 6.51 (6.6), clarity 6.36 (6.3), realism 6.26 (6.4), replay 5.79 (5.5), visual 7.44. The standout, visual 7.44 and Ruth and Priya at 7 recommend, shows the surface is working; the weak spots are decisions after month 3 and trust in the numbers.

## 6. Top 5 levers for iteration 4

1. **Build the guided agenda (D-65, D-70) and make months 3 to 12 ask something.** F-03-1 and F-03-3 reach 1.00 and .80, and the CEO and panel both name it (agency 6.34 is the largest gap to the 7.0 gate). Ship it with: one thing at a time, crisis text shown in Map mode before any answer, Skip with its default cost, an unspent-capital nudge that actually bites, and a balance item so Accept all is not a winner (QA harness `staff` policy on the control seeds).
2. **Fix S2-1 and S2-2 first and close the guard gaps.** Extend `QA1-S2-1` to the desk at 390, 1024, 1440, 1920; add a reveal-header overlap guard at 360 to 600 px and a tablet overlap guard (Ruth); adopt the rule "a guard must exercise the surface the customer used". Removes F-03-2, F-03-7, F-03-8 (reach about .5 with overlaps).
3. **One source of truth for numbers and verdict text.** F-03-4 (reach .72, REGRESSED): strip vs report, verdict goal count, order count, par vs target, rank vs random, moments direction, no 0 before counting, no phantom FAILED order. Add a consistency test that compares the strip, the report, the verdict and the reveal for the control seeds.
4. **Content that does not repeat and does not break the era.** F-03-5 and F-03-6 (reach .46 and .72): per-country and per-relation reply lines with a reuse check across countries and months, staff never suggest courting a relation at -99, era filter extended to crisis templates and reveal text (1990 Iraq, Gaza for Russia, Australia on China, seat counts for one-party states), generic templates stop after a war ends, the familiarity sample comes from the seat's own opening, one order cannot end the Ukraine war in month 3.
5. **Make it legible to Noah and Olivia: plain goal words, consequence before accept, one vocabulary, clear controls.** F-03-9, F-03-10, F-03-11, F-03-12, F-03-14: goal text without "-90+", a consequence line when accepting a meeting (Noah's US ties), Play a seed as a visible field, a selected state on crisis answers, one "Play again" button, Map next to Focus and Full desk on phones, one verb set, D-66 order cards. Noah is the only persona under the floor and the only blocker to "nobody below 6".

Not recommended now: reveal polish (F-03-13, reach .64, S3) and in-session compare (F-03-16) until the above ship, except the three cheap ones: Share buttons above the fold, score counting from the real value, one Play again button.

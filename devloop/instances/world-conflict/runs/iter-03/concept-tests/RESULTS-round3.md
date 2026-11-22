# Concept test results, round 3 (iteration 3): order icons (D-72)

Independent scoring of `round3-*.json` (nine personas, 28 icons each) against `icon-recognition-test.md` (scoring rules, round 3 notes, danger cells, confusion pairs) and `concepts/order-icons/recognition-key.json`. Panel weights: maya .18, olivia .13, ruth .13, noah .10, priya .10, dan .10, sam .09, leo .09, marcus .08. Icon numbers are round 3 numbers; every comparison is by order id.

## Verdict: FAIL the full bar (pooled bar passes, but 5 icons are under the 50% floor, 2 danger orders are under 90%, 2 confusion pairs are over the limit)

| Bar | Threshold | Result | Status |
|---|---|---|---|
| Pooled recognition | 80% or more | 213 / 252 = 84.5% unweighted, **83.8% weighted** | pass |
| Per icon floor | 50% or more on every icon | under floor: 15 Feed disinformation (0%), 6 Hard crackdown (33%), 12 Back a coup (44%), 20 Hunt foreign spies (44%), 26 Strike nuclear sites (44%) | FAIL |
| Danger orders | 90% or more on 12, 22, 23, 26, 27 | 22, 23, 27 at 100%; **12 at 44%, 26 at 44%** | FAIL |
| Confusion pairs | at most 2 personas per pair | **12/17 (4), 8/20 (4)** over; 6/21 at the limit (2) | FAIL |

### Pooled score and bounds

| Reading | Correct /252 | Unweighted | Weighted | Pass 80% |
|---|---|---|---|---|
| Strict (hedged and borderline calls scored against the icon) | 204 | 81.0% | 80.2% | yes, by 0.2 points |
| **Main call** | 213 | 84.5% | 83.8% | yes |
| Lenient (hedged and borderline calls scored for the icon) | 229 | 90.9% | 90.6% | yes |

Round 2 was 82.1% unweighted, 81.4% weighted. Round 3 is +2.4 / +2.4 on the main call. The pooled pass is not in doubt in any reading; the floors and danger cells are the problem.

### Per persona (main call)

| Persona | Weight | Correct /28 | % | Strict | Lenient | Wrong (number: answer, verbatim) |
|---|---|---|---|---|---|---|
| maya | .18 | 23 | 82% | 22 | 25 | 6: clean up or build something (guess); 15: no idea; 16: make an announcement or propaganda; 20: no idea; 26: hit a power plant or factory (guess) |
| olivia | .13 | 21 | 75% | 19 | 25 | 2: gun (guess); 12: tank with a crown (guess); 13: broken heart? (guess); 15: mask, chat (guess); 18: falling tower (guess); 26: factory explosion (guess); 28: shield with handshake (guess) |
| ruth | .13 | 22 | 79% | 21 | 25 | 2: a gun, arm the soldiers (guess); 6: clean up, rebuild after the war (guess); 12: a tank winning, attack with tanks (guess); 15: a mask, secret or undercover operation (guess); 20: a spy in a car, watching someone (guess); 26: a factory or power plant being bombed (guess) |
| noah | .10 | 21 | 75% | 20 | 22 | 2: shoot a gun, attack (guess); 6: build something, construction (guess); 12: tank attacks, invade; 13: break up, split the country (guess); 15: mask, no idea (guess: secret plot); 20: sneaky spy in a car, no idea (guess); 26: factory blowing up, sabotage |
| priya | .10 | 26 | 93% | 25 | 28 | 6: clean up / soft policing (guess); 15: secret messages / covert info ops (guess) |
| dan | .10 | 27 | 96% | 27 | 27 | 15: covert action / undercover op (guess) |
| sam | .09 | 27 | 96% | 27 | 27 | 15: covert operation / mask, secret action (guess) |
| leo | .09 | 23 | 82% | 22 | 25 | 6: soldier digging, build defenses (guess); 12: tank crushing something, invade (guess); 13: broken something, split or break up (guess); 15: mask, secret messages or undercover (guess); 20: spy in a car, spy on them (guess) |
| marcus | .08 | 23 | 82% | 21 | 25 | 6: soldier digging in, build defenses (guess); 12: attack with armor, invade, tank offensive (guess); 15: secret message, anonymous leak or covert contact (guess); 20: covert operation, spy with a getaway vehicle, maybe a coup (guess); 26: attack an industrial site, factory or power plant sabotage (guess) |

Wrong cells are the main-call misses; the Correct column is the authority and ties to the per icon table.

Pooled: 213 / (28 x 9) = 84.5% (weighted 83.8%). Pass (>= 80%): yes. Per icon below 50%: 6, 12, 15, 20, 26. Danger orders below 90%: 12, 26. Confused pairs over 2 personas: 12/17, 8/20.

### Per icon (round 3 numbering, with round 2 and round 1 by order id)

Weighted % is the main call. Strict and lenient columns are unweighted counts /9.

| # | Order (id) | Correct /9 | % | Weighted % | Strict /9 | Lenient /9 | Round 2 % (weighted) | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Withdraw troops (withdraw-border) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 2 | Arm rebels (arm-rebels) | 6 | 67% | 64% | 5 | 8 | 44 (40) | watch |
| 3 | Court (court) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 4 | Buy weapons (procure) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 5 | Sabotage (sabotage) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 6 | Hard crackdown (policing-hard) | 3 | 33% | 32% | 2 | 4 | 56 (54) | FAIL floor |
| 7 | Mobilize forces (mobilize) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 8 | Spy on (spy) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 9 | National address (address) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 10 | Mediate peace (mediate) | 9 | 100% | 100% | 8 | 9 | 100 (100) | ok |
| 11 | Fund nuclear program (fund-nuclear) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 12 | Back a coup (coup) | 4 | 44% | 47% | 4 | 5 | 33 (33) | FAIL floor + danger |
| 13 | Break pact (break-pact) | 6 | 67% | 68% | 5 | 8 | 78 (72) | watch |
| 14 | Strike military targets (airstrike-military) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 15 | Feed disinformation (disinformation) | 0 | 0% | 0% | 0 | 4 | 67 (60) | FAIL floor |
| 16 | Denounce (denounce) | 8 | 89% | 82% | 8 | 9 | 89 (87) | ok |
| 17 | Mass troops at border (deploy-border) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 18 | Destabilize (destabilize) | 8 | 89% | 87% | 6 | 9 | 0 (0) | ok |
| 19 | Stand down forces (demobilize) | 9 | 100% | 100% | 8 | 9 | 100 (100) | ok |
| 20 | Hunt foreign spies (counter-intel) | 4 | 44% | 42% | 3 | 4 | 67 (59) | FAIL floor |
| 21 | Soft policing (policing-soft) | 9 | 100% | 100% | 8 | 9 | 11 (13) | ok |
| 22 | Declare war (declare-war) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok (danger pass) |
| 23 | Nuclear strike (nuclear-strike) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok (danger pass) |
| 24 | Reform program (reform) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 25 | Propose ceasefire (ceasefire) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok |
| 26 | Strike nuclear sites (airstrike-nuclear) | 4 | 44% | 38% | 4 | 7 | 56 (62) | FAIL floor + danger |
| 27 | Assassinate leader (assassinate) | 9 | 100% | 100% | 9 | 9 | 100 (100) | ok (danger pass) |
| 28 | Offer defence pact (offer-pact) | 8 | 89% | 87% | 8 | 9 | 100 (100) | ok |

### Change for the six round 3 redraws (by order id)

| Order (id) | Round 1 | Round 2 | Round 3 | Change vs round 2 | Round 3 weighted | Strict / lenient /9 | What it reads as now |
|---|---|---|---|---|---|---|---|
| Destabilize (destabilize) | 22% | 0% | 89% | **+89** | 87% | 6 / 9 | collapsing building, topple or destabilize the government (maya, ruth, priya, dan, sam, leo; noah "wreck their economy", marcus hedged with "topple a government"); olivia "falling tower" (building only, partial). Fixed |
| Soft policing (policing-soft) | 67% | 11% | 100% | **+89** | 100% | 8 / 9 | police, security chat or soft policing (9 of 9); leo hedged "police or crack down". Fixed |
| Arm rebels (arm-rebels) | 89% | 44% | 67% | **+23** | 64% | 5 / 8 | give weapons or arm someone (maya, priya, dan, sam, leo, marcus). Olivia "gun", ruth "arm the soldiers", noah "shoot a gun, attack" do not name arming a faction. Better, still a watch icon |
| Back a coup (coup) | 44% | 33% | 44% | **+11** | 47% | 4 / 5 | coup or topple the leader (maya, priya, dan, sam). Olivia "tank with a crown" (describes, no action); ruth, noah, leo, marcus "tank attack, invade". Danger FAIL |
| Strike nuclear sites (airstrike-nuclear) | 78% | 56% | 44% | **-12** | 38% | 4 / 7 | nuclear sites named by priya, dan, sam, leo. Maya, ruth, marcus "power plant or factory" (no nuclear); olivia, noah "factory explosion / sabotage". Reads as a plain factory strike. Worse, danger FAIL |
| Hunt foreign spies (counter-intel) | 0% | 67% | 44% | **-23** | 42% | 3 / 4 | hunt spies (priya, dan, sam), olivia "spy with handcuffs". Ruth, noah, leo "spy in a car", marcus "getaway vehicle, maybe a coup", maya no idea. The car reads as the spy, not the capture. Worse |

Net of the six: 3 clearly up (destabilize +89, soft policing +89, arm rebels +23), 1 slightly up but still failing (coup +11), 2 worse (nuclear sites -12, hunt spies -23).

Unchanged icons that moved (same art, fresh answers): **Feed disinformation 67% to 0%** (mask reads as "secret or undercover operation", nobody says lie, fake or disguise; the only near hits are priya "covert info ops", leo "secret messages", marcus "anonymous leak", so lenient 4/9). **Hard crackdown 56% to 33%** (maya, ruth, noah read construction or cleaning; leo and marcus a soldier digging in; priya "soft policing"). **Break pact 78% to 67%**, **Denounce** and the others within one persona of round 2.

### Danger orders (round 3 numbers 12, 22, 23, 26, 27)

| # | Order | Rate | Strict / lenient | Result | What it reads as |
|---|---|---|---|---|---|
| 12 | Back a coup | 4/9 = 44% (weighted 47%) | 4 / 5 | FAIL | tank attack or invade (ruth, noah, leo, marcus), tank with a crown (olivia) |
| 22 | Declare war | 9/9 = 100% | 9 / 9 | pass | |
| 23 | Nuclear strike | 9/9 = 100% | 9 / 9 | pass | |
| 26 | Strike nuclear sites | 4/9 = 44% (weighted 38%) | 4 / 7 | FAIL | power plant or factory strike or sabotage (maya, olivia, ruth, noah, marcus). Even the lenient reading (power plant counted) is 7/9 = 78%, under 90% |
| 27 | Assassinate leader | 9/9 = 100% | 9 / 9 | pass | |

### Confusion pairs (personas who read one icon of the pair as the other)

| Pair | Count | Limit 2 | Who |
|---|---|---|---|
| 12/17 coup, mass troops at border | **4** | FAIL | ruth, noah, leo, marcus read the coup icon as a tank attack or invasion (olivia saw tank plus crown, not counted) |
| 8/20 spy, hunt spies | **4** | FAIL | ruth, noah, leo, marcus read icon 20 as plain spy or covert op in a car (maya "no idea" not counted) |
| 6/21 hard, soft policing | 2 | ok (at limit) | priya read 6 as soft policing; leo read 21 as crackdown (hedged "police or crack down") |
| 10/25 mediate, ceasefire | 1 | ok | priya wrote "peace offer / ceasefire" for 10 |
| 26/23 nuclear sites, nuclear strike | 0 | ok | nobody read 26 as a nuclear strike (round 2 had 4); the failure is now the opposite, losing "nuclear" |
| 14/26 airstrike, nuclear sites | 0 | ok | |
| 12/27 coup, assassinate | 0 | ok | |
| 12/18 coup, destabilize | 0 | ok | |
| 22/25 declare war, ceasefire | 0 | ok | |
| 7/19 mobilize, stand down | 0 | ok | |
| 17/1 deploy, withdraw | 0 | ok | |
| 28/13 pact, break pact | 0 | ok | |
| 28/3 pact, court | 0 | ok | |

### Judgment calls (logged)

- 2 Arm rebels: "arm someone / give weapons" with no recipient kept correct on the main call (maya, priya, leo, marcus); "gun", "arm the soldiers", "shoot a gun, attack" scored wrong. Strict drops marcus (no recipient); lenient adds olivia and ruth.
- 6 Hard crackdown: "police cleaning?" (olivia) kept as correct on the main call (police is accepted for 6 and 21), strict drops it. Priya's "clean up / soft policing" is wrong for 6; lenient counts it as the police family.
- 10: priya "peace offer / ceasefire" kept correct, strict drops it.
- 12 Back a coup: olivia "tank with a crown" is a description, no action, wrong on main call and counted in lenient only. Any "tank attacks, invade" without the ruler is the listed partial (wrong).
- 13 Break pact: ruth "broken heart, split, break off relations" kept correct (break relations is read as break pact), strict drops it. Noah "split the country" and leo "split or break up" with no object scored wrong, lenient adds them.
- 15 Feed disinformation: "mask / undercover / covert operation" is the spy family, not disinformation. 0 on main and strict; lenient adds priya, leo, marcus (info or message wording) and ruth ("mask, undercover" against accepted "disguise").
- 16 Denounce: maya "make an announcement or propaganda" is wrong, consistent with round 2 (announcement or speech alone). Others who paired "announcement" with denounce, condemn, megaphone or shout are correct.
- 18 Destabilize: "falling tower" (olivia) is the listed "building" partial, wrong main; noah "wreck their economy" and marcus "topple a government (guess)" kept correct main, strict drops both.
- 19: maya "pull troops out" kept correct (reduction implied, de-escalate is accepted); strict scores it as icon 1.
- 20 Hunt foreign spies: olivia "spy with handcuffs" matches "handcuff spies", correct main, strict drops it. "Spy in a car" is the listed "spy on" partial, wrong.
- 21 Soft policing: any "police" answer is correct; leo's "police or crack down" is correct main, strict drops it.
- 26 Strike nuclear sites: the answer must name nuclear plus a site, plant or reactor. "Power plant or factory" without nuclear is wrong on the main call (maya, ruth, marcus), counted in lenient.
- 28 Offer defence pact: olivia "shield with a handshake (guess)" describes the picture without naming the pact, wrong main, lenient adds it.

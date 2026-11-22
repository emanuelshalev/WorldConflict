# Icon recognition test: final replicated run (D-66, D-74)

The acceptance bar for the order pictograms: players tell what an order does from its picture alone. **Pass: 80% or more correct, pooled across the panel and across both sheets.**

Design and full history: `design-order-cards.md` section 3.4. Icon source: `concepts/order-icons/build.mjs`.

## Why this run is different (D-74)

Rounds 1 to 3 showed that one round is noisy: icons whose drawing did not change moved by up to 67 points between rounds (disinformation 89, 67, 0; crackdown 56, 56, 33; arm rebels 89, 44 before it was redrawn). So:

1. Icons are judged by their **average over the rounds that showed their current drawing**, keyed by **order id**, never by cell number (cell numbers change every sheet).
2. The final run is **replicated**: every persona answers **two sheets, A and B**, with different shuffles. The per-icon score is the mean of A and B; the difference between A and B measures the noise.
3. Only three icons were redrawn for this run (Back a coup, Strike nuclear sites, Hunt foreign spies), because they failed in every round. Every other icon is byte-identical to round 3, including Feed disinformation and Hard crackdown, whose drops are treated as noise until this replicate says otherwise.
4. In the game every order card also carries its title, family word and, for danger orders, a confirm face, so the icon is a glance aid, not the only cue. The test still hides all of that on purpose.

## Score history by order id

R1, R2 and R3 are the unweighted main-call rates from `concept-tests/RESULTS.md`, `RESULTS-round2.md` and `RESULTS-round3.md`. "Rounds with the current drawing" lists the rounds that showed the drawing being shipped; the average uses only those rounds.

| Order id | Order | R1 % | R2 % | R3 % | Rounds with the current drawing | Average over those rounds | Rounds counted | Status |
|---|---|---|---|---|---|---|---|---|
| `court` | Court | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `denounce` | Denounce | 78 | 89 | 89 | 1,2,3 | 85% | 3 | ok |
| `offer-pact` | Offer defence pact | 56 | 100 | 89 | 2,3 | 94% | 2 | ok |
| `break-pact` | Break pact | 78 | 78 | 67 | 1,2,3 | 74% | 3 | watch |
| `ceasefire` | Propose ceasefire | 0 | 100 | 100 | 2,3 | 100% | 2 | ok |
| `mediate` | Mediate peace | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `declare-war` | Declare war | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `mobilize` | Mobilize forces | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `demobilize` | Stand down forces | 89 | 100 | 100 | 1,2,3 | 96% | 3 | ok |
| `procure` | Buy weapons | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `deploy-border` | Mass troops at border | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `withdraw-border` | Withdraw troops | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `airstrike-military` | Strike military targets | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `airstrike-nuclear` | Strike nuclear sites | 78 | 56 | 44 | none (redrawn for the final run) | untested | 0 | final redraw |
| `fund-nuclear` | Fund nuclear program | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `nuclear-strike` | Nuclear strike | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `spy` | Spy on | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `counter-intel` | Hunt foreign spies | 0 | 67 | 44 | none (redrawn for the final run) | untested | 0 | final redraw |
| `sabotage` | Sabotage | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `destabilize` | Destabilize | 22 | 0 | 89 | 3 | 89% | 1 | ok (one round only) |
| `arm-rebels` | Arm rebels | 89 | 44 | 67 | 3 | 67% | 1 | watch (one round only) |
| `disinformation` | Feed disinformation | 89 | 67 | 0 | 1,2,3 | 52% | 3 | watch (unchanged per D-74; replicate decides) |
| `assassinate` | Assassinate leader | 56 | 100 | 100 | 2,3 | 100% | 2 | ok |
| `coup` | Back a coup | 44 | 33 | 44 | none (redrawn for the final run) | untested | 0 | final redraw |
| `reform` | Reform program | 100 | 100 | 100 | 1,2,3 | 100% | 3 | ok |
| `address` | National address | 0 | 100 | 100 | 2,3 | 100% | 2 | ok |
| `policing-soft` | Soft policing | 67 | 11 | 100 | 3 | 100% | 1 | ok (one round only) |
| `policing-hard` | Hard crackdown | 56 | 56 | 33 | 2,3 | 44% | 2 | watch (unchanged per D-74; replicate decides) |

Average of the 25 tested current drawings: **92.1%**. Single-round averages (destabilize, arm rebels, soft policing) rest on 9 answers and are the least certain; the replicate settles them. Consistent failures (every round under 50% or under 90% for a danger order): coup, strike nuclear sites and hunt foreign spies, which is why only these three were redrawn. Disinformation (average 52%) and crackdown (44%) are watched: if both sheets of the replicate put them under 50%, they are redrawn next.

## What the persona sees

- **Sheet A:** `concepts/order-icons-recognition-sheet-A.png` (HTML: `-A.html`), key `concepts/order-icons/recognition-key-A.json`.
- **Sheet B:** `concepts/order-icons-recognition-sheet-B.png` (HTML: `-B.html`), key `concepts/order-icons/recognition-key-B.json`.
- 28 numbered cells per sheet, in two different fixed shuffles (A: `(n * 5 + 3) % 29`, B: `(n * 19 + 11) % 29`). Each cell shows the icon at 48 px on a neutral plate, then 24 px on a plate and 24 px bare. **No labels, no family colour, no family word.**
- Do **not** show the persona the contact sheet, the mocks, the keys or this file's answer tables.

## Procedure

1. Each persona answers sheet A, then does something else (the agenda tasks or another test), then answers sheet B in a **separate session or prompt**, without seeing its sheet A answers. Half the panel (maya, ruth, priya, sam, marcus) does A first; the other half (olivia, noah, dan, leo) does B first, to cancel order effects.
2. Read the same instructions before each sheet (verbatim):

> You are about to see 28 small pictures. Each one is an order you can give as the head of a country in a strategy game (diplomacy, war, spying, the economy, things at home). For each number, write what you think the order is, in a few words. Answer quickly, the way you would react while playing: about 3 seconds per picture. Do not skip; if unsure, write your best guess and add "(guess)". Do not go back and change earlier answers.

3. Answer format, one line per icon: `1: <answer>` to `28: <answer>`, with the sheet letter at the top.
4. Each persona answers in character (reading patience and attention from `panel/<name>.yaml`); Noah, Olivia and Ruth answer at their real speed.

## Scoring

1. Map every answer to its **order id** with the sheet's key, then score by id. An answer is correct when it names the order's concept (accepted answers below or a clear synonym; the scorer logs each judgement call). "(guess)" counts the same.
2. Partial answers are wrong but logged (right family, wrong order; the picture named instead of the order).
3. Per icon: correct on A /9, correct on B /9, **mean %** = (A + B) / 18. **A/B gap** = number of personas who got it right on one sheet and wrong on the other.
4. Pooled: all correct answers on both sheets / (28 x 9 x 2). Report unweighted and weighted (panel weights), and strict / main / lenient bounds as in round 3.
5. Noise: report the per-icon A/B gap; an icon with a gap of 3 or more personas is "noisy" and its number is not trusted on its own.

### Acceptance

| Bar | Threshold (on the A+B mean) | If missed |
|---|---|---|
| Pooled recognition | **80% or more** | Not shipped as the only cue; redraw the lowest icons |
| Per icon floor | 50% or more on every icon | Redraw that icon (unless it is noisy and its history average is 80% or more) |
| Danger orders | 90% or more on coup, declare war, nuclear strike, strike nuclear sites, assassinate (sheet A: 3 Back a coup, 5 Declare war, 21 Nuclear strike, 11 Strike nuclear sites, 27 Assassinate leader; sheet B: 14 Back a coup, 10 Declare war, 7 Nuclear strike, 26 Strike nuclear sites, 23 Assassinate leader) | Redraw; the confirm face in the game is the safety net, the icon must still not mislead |
| Confusion pairs | No pair confused by more than 2 personas on either sheet | Strengthen the modifier of the pair |

Confusion pairs to count, sheet A numbers: 11/21 (airstrike-nuclear, nuclear-strike), 26/2 (spy, counter-intel), 3/25 (coup, deploy-border), 3/27 (coup, assassinate), 3/12 (coup, destabilize), 23/18 (policing-hard, policing-soft), 5/24 (declare-war, ceasefire), 28/24 (mediate, ceasefire), 10/15 (mobilize, demobilize), 25/1 (deploy-border, withdraw-border), 14/19 (offer-pact, break-pact), 14/4 (offer-pact, court), 6/11 (airstrike-military, airstrike-nuclear).

Sheet B numbers: 26/7 (airstrike-nuclear, nuclear-strike), 25/16 (spy, counter-intel), 14/27 (coup, deploy-border), 14/23 (coup, assassinate), 14/24 (coup, destabilize), 3/13 (policing-hard, policing-soft), 10/1 (declare-war, ceasefire), 20/1 (mediate, ceasefire), 28/19 (mobilize, demobilize), 27/18 (deploy-border, withdraw-border), 21/11 (offer-pact, break-pact), 21/12 (offer-pact, court), 8/26 (airstrike-military, airstrike-nuclear).

What the three redrawn icons must not read as (from rounds 1 to 3): Back a coup must not read as a tank attack, an invasion, an election or a covert agent; Strike nuclear sites must not read as a factory or power plant, or as a nuclear strike or bomber; Hunt foreign spies must not read as spy on, investigate, or a spy in a car.

## Answer key, sheet A (scorer only)

| # | Order | Registry id | Accepted answers |
|---|---|---|---|
| 1 | Withdraw troops | `withdraw-border` | withdraw, withdraw troops, pull back, retreat, leave border, de-escalate, bring troops back, pull out |
| 2 | Hunt foreign spies | `counter-intel` | counter intelligence, counter-intel, counterintelligence, hunt spies, catch spies, arrest spies, arrest the spy, jail spies, spy caught, captured spy, handcuff spies, lock up spies, expose spies, root out spies, find spies, stop spies |
| 3 | Back a coup | `coup` | coup, military coup, overthrow, overthrow the leader, military takeover, army takes over, army takes power, seize power, seize the throne, take the throne, topple leader, regime change, junta, military rule, take over the government, depose, usurp |
| 4 | Court | `court` | court, improve relations, friendship, handshake, deal, agreement, make friends, cooperation, diplomacy |
| 5 | Declare war | `declare-war` | declare war, war, go to war, attack, invade, invasion, fight, battle, swords, combat |
| 6 | Strike military targets | `airstrike-military` | airstrike, air strike, bomb, bombing, air raid, strike, jet attack, attack from the air, military strike |
| 7 | Sabotage | `sabotage` | sabotage, dynamite, blow up, explosives, bomb, destroy infrastructure, tnt, demolish, attack infrastructure |
| 8 | Reform program | `reform` | reform, reforms, economic reform, growth, modernise, modernize, develop, invest, improve economy, industry, progress, build |
| 9 | Denounce | `denounce` | denounce, condemn, criticise, criticize, protest, shout, megaphone, call out, public statement, accuse |
| 10 | Mobilize forces | `mobilize` | mobilize, mobilise, call up, reserves, raise army, recruit, more troops, build army, draft, troops up |
| 11 | Strike nuclear sites | `airstrike-nuclear` | strike nuclear sites, bomb nuclear sites, bomb a reactor, bomb nuclear facility, bomb nuclear plant, attack nuclear plant, airstrike on nuclear, hit nuclear facility, attack reactor, destroy nuclear program, bomb their nuclear program, strike the reactor, bomb radioactive site |
| 12 | Destabilize | `destabilize` | destabilize, destabilise, undermine, unstable, make unstable, weaken, weaken government, topple, collapse, about to collapse, chaos, subvert, shake the country, jenga |
| 13 | National address | `address` | national address, address the nation, speech, televised speech, tv address, speech on tv, broadcast, announcement, press conference, speak to the nation, address, rally the nation, propaganda |
| 14 | Offer defence pact | `offer-pact` | defence pact, defense pact, alliance, ally, mutual defence, defence agreement, security pact, military alliance, treaty, join forces, protect each other |
| 15 | Stand down forces | `demobilize` | demobilize, demobilise, stand down, send troops home, disband, fewer troops, reduce army, troops down, de-escalate |
| 16 | Fund nuclear program | `fund-nuclear` | fund nuclear, nuclear program, build nuclear, nuclear research, invest nuclear, develop the bomb, nuclear funding, atom, nuclear |
| 17 | Arm rebels | `arm-rebels` | arm rebels, support rebels, rebels, insurgents, revolution, armed uprising, uprising, guerrilla, arm the opposition, rebellion, militia, give guns to rebels, armed revolt |
| 18 | Soft policing | `policing-soft` | soft policing, community policing, police talks, police dialogue, police negotiate, calm policing, police, police talk to people, dialogue, gentle policing, police outreach, peaceful policing |
| 19 | Break pact | `break-pact` | break pact, break alliance, betray, end alliance, leave alliance, broken alliance, cancel treaty, split, broken protection |
| 20 | Buy weapons | `procure` | buy weapons, procure, arms purchase, buy arms, ammunition, weapons, arms deal, military spending, buy ammo |
| 21 | Nuclear strike | `nuclear-strike` | nuclear strike, nuke, nuclear attack, atomic bomb, nuclear war, launch nukes, mushroom cloud, nuclear bomb |
| 22 | Feed disinformation | `disinformation` | disinformation, misinformation, fake news, deception, deceive, lie, lies, propaganda, false information, mislead, disguise |
| 23 | Hard crackdown | `policing-hard` | crackdown, hard crackdown, riot police, riot control, repression, police force, police violence, force, martial law, suppress protests, hard policing, police, police brutality, clamp down |
| 24 | Propose ceasefire | `ceasefire` | ceasefire, truce, pause the war, pause fighting, stop fighting, stop the war, no war, end war, end the war, armistice, halt fighting, peace, stop the fighting, cease fire |
| 25 | Mass troops at border | `deploy-border` | deploy troops, mass troops, troops to border, border, deploy, advance, move tanks, threaten, border pressure |
| 26 | Spy on | `spy` | spy, spy on, espionage, intelligence, gather intel, surveillance, agent, secret agent, investigate, watch |
| 27 | Assassinate leader | `assassinate` | assassinate, assassination, kill leader, kill the leader, kill the king, kill the ruler, target leader, target the leader, shoot the leader, eliminate the leader, murder the leader, take out the leader, regicide |
| 28 | Mediate peace | `mediate` | mediate, mediation, peace, peace talks, broker peace, dove, negotiate, peacemaker, make peace |

## Answer key, sheet B (scorer only)

Accepted answers are the same per order id as on sheet A.

| # | Order | Registry id | Same order on sheet A |
|---|---|---|---|
| 1 | Propose ceasefire | `ceasefire` | 24 |
| 2 | Denounce | `denounce` | 9 |
| 3 | Hard crackdown | `policing-hard` | 23 |
| 4 | Reform program | `reform` | 8 |
| 5 | Feed disinformation | `disinformation` | 22 |
| 6 | Sabotage | `sabotage` | 7 |
| 7 | Nuclear strike | `nuclear-strike` | 21 |
| 8 | Strike military targets | `airstrike-military` | 6 |
| 9 | Buy weapons | `procure` | 20 |
| 10 | Declare war | `declare-war` | 5 |
| 11 | Break pact | `break-pact` | 19 |
| 12 | Court | `court` | 4 |
| 13 | Soft policing | `policing-soft` | 18 |
| 14 | Back a coup | `coup` | 3 |
| 15 | Arm rebels | `arm-rebels` | 17 |
| 16 | Hunt foreign spies | `counter-intel` | 2 |
| 17 | Fund nuclear program | `fund-nuclear` | 16 |
| 18 | Withdraw troops | `withdraw-border` | 1 |
| 19 | Stand down forces | `demobilize` | 15 |
| 20 | Mediate peace | `mediate` | 28 |
| 21 | Offer defence pact | `offer-pact` | 14 |
| 22 | National address | `address` | 13 |
| 23 | Assassinate leader | `assassinate` | 27 |
| 24 | Destabilize | `destabilize` | 12 |
| 25 | Spy on | `spy` | 26 |
| 26 | Strike nuclear sites | `airstrike-nuclear` | 11 |
| 27 | Mass troops at border | `deploy-border` | 25 |
| 28 | Mobilize forces | `mobilize` | 10 |

Single-word rules (by order id): "bomb" is accepted for `sabotage` and `airstrike-military`; "propaganda" for `disinformation` and `address`; "negotiate" for `mediate`; "de-escalate" for `withdraw-border` and `demobilize`; "peace" for `mediate` and `ceasefire`; "police" for `policing-soft` and `policing-hard`; "nuclear" alone for `fund-nuclear` only. Partials (wrong, logged): "power plant", "factory", "nuclear strike" or "nuclear bomber" for `airstrike-nuclear` unless it names a nuclear site or reactor; "spy", "spy on" or "investigate" for `counter-intel`; "tank attack", "invade" or "throne" alone for `coup`; "crown" or "king" alone for `coup` or `assassinate`; "target someone" without the leader for `assassinate`; "defence spending" for `offer-pact`; "pause" alone for `ceasefire`.

## Results template

```
| Order id | A /9 | B /9 | Mean % | A/B gap | R3 % | History avg (current drawing) | Status |
|---|---|---|---|---|---|---|---|
| ... |
Pooled: x / 504 = y% (weighted z%)   Pass (>= 80%): yes/no
Per icon below 50%: ...   Danger below 90%: ...   Pairs over 2: ...   Noisy icons (gap >= 3): ...
```

Regenerate after any icon change: `node concepts/order-icons/build.mjs`, then `node concepts/shoot-order-cards.mjs recognition` (both sheets; their order is fixed by the generator).

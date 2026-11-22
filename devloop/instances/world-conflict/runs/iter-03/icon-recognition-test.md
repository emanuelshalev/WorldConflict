# Icon recognition test (D-66, RS-007)

**Round 3 (D-72).** Round 1: 74% weighted (`concept-tests/RESULTS.md`); round 2: 81.4% weighted, 82.1% unweighted (`concept-tests/RESULTS-round2.md`), with four icons under the floor and two danger orders under 90%. Round 3 redraws six icons (`design-order-cards.md` section 3.4): Destabilize, Back a coup, Strike nuclear sites, Soft policing, Arm rebels, and Hunt foreign spies (for the spy / hunt spies confusion). Every other icon is byte-identical to round 2. The sheet has a **new shuffled order** (`(n * 13 + 2) % 29` in `build.mjs`).

**Compare rounds by order id, never by cell number.** Cell numbers change every round; the registry id (`court`, `coup`, ...) is the stable key. `recognition-key.json` maps this round's numbers to ids; score per id and put the round 1 and round 2 rates for the same id beside it. Everything below uses round 3 numbering.

The acceptance bar for the order pictograms: players must tell what an order does from its picture alone. The panel names each of the 28 order icons with every label hidden. **Pass: 80% or more correct, pooled across the panel.**

Design: `design-order-cards.md`. Icon source: `concepts/order-icons/build.mjs`.

## What the persona sees

- **Sheet (the only thing shown):** `concepts/order-icons-recognition-sheet.png` (HTML source: `concepts/order-icons-recognition-sheet.html`).
- 28 numbered cells in a fixed shuffled order (not grouped by family). Each cell shows the icon at 48 px on a neutral light plate, then at 24 px on a plate and 24 px bare. **No labels, no family colour, no family word**, so the test measures the pictogram alone. In the game the icon also gets its family colour and word, so the real-world score should be higher than the test score.
- Do **not** give the persona the contact sheet, the mocks, `recognition-key.json` or this file's answer key.

## Instructions to read to each persona (verbatim)

> You are about to see 28 small pictures. Each one is an order you can give as the head of a country in a strategy game (diplomacy, war, spying, the economy, things at home). For each number, write what you think the order is, in a few words. Answer quickly, the way you would react while playing: about 3 seconds per picture. Do not skip; if unsure, write your best guess and add "(guess)". Do not go back and change earlier answers.

Answer format, one line per icon:

```
1: <answer>
2: <answer>
...
28: <answer>
```

Each persona answers in character (reading patience and attention from `panel/<name>.yaml`); Noah, Olivia and Ruth must answer at their real speed, not at a careful reader's speed.

## Scoring

1. An answer is **correct** when it names the order's concept: it matches one of the accepted answers below, or a clear synonym of the label (the scorer decides, and logs the call). "(guess)" answers count the same as others.
2. **Partial** answers count as wrong but are logged, because they tell us what to fix: the right family but the wrong order (for example "nuclear" for 26, Strike nuclear sites; "police" is accepted for 6 and 21, since the family is the main signal and the plate word "Home" plus the card title settles which one).
3. Per persona: correct out of 28. Pooled: all correct answers / (28 x personas).
4. Record per icon: percent correct and the wrong answers, verbatim.

### Acceptance

| Bar | Threshold | If missed |
|---|---|---|
| Pooled recognition | **80% or more** (D-66) | Redesign the weakest icons and rerun before ship |
| Per icon floor | 50% or more on every icon | That icon is redesigned even if the pool passes |
| Danger orders | 90% or more on 12, 22, 23, 26, 27 (back a coup, declare war, nuclear strike, strike nuclear sites, assassinate) | Redesign: an irreversible order must never be mistaken |
| Confusion pairs | No pair confused by more than 2 personas: 26/23 (strike nuclear sites, nuclear strike; neighbours on this sheet, which makes the test harder, not easier), 8/20 (spy, hunt spies), 6/21 (hard, soft policing), 12/27 (coup, assassinate), 12/18 (coup, destabilize), 12/17 (coup, mass troops at border: both show a tank), 22/25 (declare war, ceasefire), 10/25 (mediate, ceasefire), 7/19 (mobilize, stand down), 17/1 (deploy, withdraw), 28/13 (pact, break pact), 28/3 (pact, court), 14/26 (airstrike, strike nuclear sites) | Strengthen the modifier (badge, arrow, slash) of the pair |

Round 3 watch list: 18 Destabilize (must not read as a ship or a building), 12 Back a coup (danger; must not read as plain deploy, the crown must carry it), 26 Strike nuclear sites (danger; must not read as a nuclear strike), 21 Soft policing (must not read as military), 2 Arm rebels (must not read as a protest), 20 Hunt foreign spies (must not read as spy on, and the cuffs must not read as binoculars), 15 Feed disinformation (67% in round 2, unchanged), 6 Hard crackdown (56%, unchanged).

## Answer key (scorer only)

| # | Order | Registry id | Accepted answers |
|---|---|---|---|
| 1 | Withdraw troops | `withdraw-border` | withdraw, withdraw troops, pull back, retreat, leave border, de-escalate, bring troops back, pull out |
| 2 | Arm rebels | `arm-rebels` | arm rebels, support rebels, rebels, insurgents, revolution, armed uprising, uprising, guerrilla, arm the opposition, rebellion, militia, give guns to rebels, armed revolt |
| 3 | Court | `court` | court, improve relations, friendship, handshake, deal, agreement, make friends, cooperation, diplomacy |
| 4 | Buy weapons | `procure` | buy weapons, procure, arms purchase, buy arms, ammunition, weapons, arms deal, military spending, buy ammo |
| 5 | Sabotage | `sabotage` | sabotage, dynamite, blow up, explosives, bomb, destroy infrastructure, tnt, demolish, attack infrastructure |
| 6 | Hard crackdown | `policing-hard` | crackdown, hard crackdown, riot police, riot control, repression, police force, police violence, force, martial law, suppress protests, hard policing, police, police brutality, clamp down |
| 7 | Mobilize forces | `mobilize` | mobilize, mobilise, call up, reserves, raise army, recruit, more troops, build army, draft, troops up |
| 8 | Spy on | `spy` | spy, spy on, espionage, intelligence, gather intel, surveillance, agent, secret agent, investigate, watch |
| 9 | National address | `address` | national address, address the nation, speech, televised speech, tv address, speech on tv, broadcast, announcement, press conference, speak to the nation, address, rally the nation, propaganda |
| 10 | Mediate peace | `mediate` | mediate, mediation, peace, peace talks, broker peace, dove, negotiate, peacemaker, make peace |
| 11 | Fund nuclear program | `fund-nuclear` | fund nuclear, nuclear program, build nuclear, nuclear research, invest nuclear, develop the bomb, nuclear funding, atom, nuclear |
| 12 | Back a coup | `coup` | coup, military coup, overthrow, overthrow the leader, overthrow the king, military takeover, army takes over, seize power, topple leader, topple the king, regime change, junta, take over the government, depose, tanks topple the king |
| 13 | Break pact | `break-pact` | break pact, break alliance, betray, end alliance, leave alliance, broken alliance, cancel treaty, split, broken protection |
| 14 | Strike military targets | `airstrike-military` | airstrike, air strike, bomb, bombing, air raid, strike, jet attack, attack from the air, military strike |
| 15 | Feed disinformation | `disinformation` | disinformation, misinformation, fake news, deception, deceive, lie, lies, propaganda, false information, mislead, disguise |
| 16 | Denounce | `denounce` | denounce, condemn, criticise, criticize, protest, shout, megaphone, call out, public statement, accuse |
| 17 | Mass troops at border | `deploy-border` | deploy troops, mass troops, troops to border, border, deploy, advance, move tanks, threaten, border pressure |
| 18 | Destabilize | `destabilize` | destabilize, destabilise, undermine, unstable, make unstable, weaken, weaken government, topple, collapse, about to collapse, chaos, subvert, shake the country, jenga |
| 19 | Stand down forces | `demobilize` | demobilize, demobilise, stand down, send troops home, disband, fewer troops, reduce army, troops down, de-escalate |
| 20 | Hunt foreign spies | `counter-intel` | counter intelligence, counter-intel, counterintelligence, hunt spies, catch spies, arrest spies, jail spies, spy caught, handcuff spies, captured spy, lock up spies, expose spies, root out spies, find spies, stop spies |
| 21 | Soft policing | `policing-soft` | soft policing, community policing, police talks, police dialogue, police negotiate, calm policing, police, police talk to people, dialogue, gentle policing, police outreach, peaceful policing |
| 22 | Declare war | `declare-war` | declare war, war, go to war, attack, invade, invasion, fight, battle, swords, combat |
| 23 | Nuclear strike | `nuclear-strike` | nuclear strike, nuke, nuclear attack, atomic bomb, nuclear war, launch nukes, mushroom cloud, nuclear bomb |
| 24 | Reform program | `reform` | reform, reforms, economic reform, growth, modernise, modernize, develop, invest, improve economy, industry, progress, build |
| 25 | Propose ceasefire | `ceasefire` | ceasefire, truce, pause the war, pause fighting, stop fighting, stop the war, no war, end war, end the war, armistice, halt fighting, peace, stop the fighting, cease fire |
| 26 | Strike nuclear sites | `airstrike-nuclear` | strike nuclear sites, bomb nuclear sites, bomb nuclear plant, bomb a reactor, bomb nuclear facility, attack nuclear plant, airstrike on nuclear, hit nuclear facility, attack reactor, destroy nuclear program, bomb their nuclear program, strike the reactor |
| 27 | Assassinate leader | `assassinate` | assassinate, assassination, kill leader, kill the leader, kill the king, kill the ruler, target leader, target the leader, shoot the leader, eliminate the leader, murder the leader, take out the leader, regicide |
| 28 | Offer defence pact | `offer-pact` | defence pact, defense pact, alliance, ally, mutual defence, defence agreement, security pact, military alliance, treaty, join forces, protect each other |

Notes on single words: "bomb" is accepted for 5 and 14, "propaganda" for 15 and 9, "negotiate" for 10, "de-escalate" for 1 and 19, "peace" for 10 and 25, "police" for 6 and 21. Partials (wrong, logged): "nuclear strike", "nuclear bomber" or "nuclear air strike" for 26 (the answer must name a site, plant or reactor), "investigate" or "spy on" for 20, "talk to the military" or "general" for 21, "protest" or "riot" without rebels or arms for 2, "tanks", "attack" or "invade" without the ruler for 12, "ship", "navy" or "building" for 18, "crown" or "king" alone for 12 or 27, "target someone" without the leader for 27, "defence spending" for 28, "pause" alone for 25. "nuclear" alone is accepted for 11 only.

The machine-readable key is `concepts/order-icons/recognition-key.json` (generated with the sheet, so the numbering always matches).

## Results template

```
| Persona | Correct /28 | % | Wrong (number: answer) |
|---|---|---|---|
| ... |
Pooled: x / (28 x n) = y%   Pass (>= 80%): yes/no
Per icon below 50%: ...
Danger orders below 90%: ...
Confused pairs (> 2 personas): ...
```

Rerun after any icon change: `node concepts/order-icons/build.mjs` then `node concepts/shoot-order-cards.mjs recognition` (the sheet order is fixed by the generator).

# Icon recognition test (D-66, RS-007)

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
2. **Partial** answers count as wrong but are logged, because they tell us what to fix: the right family but the wrong order (for example "nuclear" for 23, Strike nuclear sites; "police" is accepted for 1 and 13, since the family is the main signal and the plate word "Home" plus the card title settles which one).
3. Per persona: correct out of 28. Pooled: all correct answers / (28 x personas).
4. Record per icon: percent correct and the wrong answers, verbatim.

### Acceptance

| Bar | Threshold | If missed |
|---|---|---|
| Pooled recognition | **80% or more** (D-66) | Redesign the weakest icons and rerun before ship |
| Per icon floor | 50% or more on every icon | That icon is redesigned even if the pool passes |
| Danger orders | 90% or more on 3, 19, 20, 23, 28 (assassinate, coup, declare war, strike nuclear sites, nuclear strike) | Redesign: an irreversible order must never be mistaken |
| Confusion pairs | No pair confused by more than 2 personas: 4/16 (mediate, ceasefire), 9/25 (mobilize, stand down), 2/18 (deploy, withdraw), 1/13 (hard, soft policing), 17/5 (spy, hunt spies), 11/27 (pact, break pact), 7/23 (airstrike, strike nuclear sites) | Strengthen the modifier (badge, arrow, slash) of the pair |

Icons I expect to be weakest (watch list): 13 Soft policing (cap plus talk bubble may read as "police" only), 23 Strike nuclear sites (atom inside a crosshair), 9 and 25 (helmets with arrows), 26 Arm rebels (the rifle is partly hidden by the fist), 8 Reform (gear and sprout may read as "growth"; accepted).

## Answer key (scorer only)

| # | Order | Registry id | Accepted answers |
|---|---|---|---|
| 1 | Hard crackdown | `policing-hard` | crackdown, hard crackdown, riot police, repression, force, martial law, suppress, riot control, hard policing, police |
| 2 | Mass troops at border | `deploy-border` | deploy troops, mass troops, troops to border, border, deploy, advance, move tanks, threaten, border pressure |
| 3 | Assassinate leader | `assassinate` | assassinate, assassination, kill leader, kill, target leader, sniper, eliminate, murder, hit, take out the leader |
| 4 | Mediate peace | `mediate` | mediate, mediation, peace, peace talks, broker peace, dove, negotiate, peacemaker, make peace |
| 5 | Hunt foreign spies | `counter-intel` | counter intelligence, counter-intel, counterintelligence, hunt spies, catch spies, no spies, stop spies, anti spy, security |
| 6 | Court | `court` | court, improve relations, friendship, handshake, deal, agreement, make friends, cooperation, diplomacy |
| 7 | Strike military targets | `airstrike-military` | airstrike, air strike, bomb, bombing, air raid, strike, jet attack, attack from the air, military strike |
| 8 | Reform program | `reform` | reform, reforms, economic reform, growth, modernise, modernize, develop, invest, improve economy, industry, progress, build |
| 9 | Mobilize forces | `mobilize` | mobilize, mobilise, call up, reserves, raise army, recruit, more troops, build army, draft, troops up |
| 10 | Destabilize | `destabilize` | destabilize, destabilise, undermine, unrest, weaken government, topple, chaos, crack, collapse, subvert, unstable government |
| 11 | Offer defence pact | `offer-pact` | defence pact, defense pact, alliance, ally, mutual defence, protect, join forces, treaty, security pact |
| 12 | Fund nuclear program | `fund-nuclear` | fund nuclear, nuclear program, build nuclear, nuclear research, invest nuclear, develop the bomb, nuclear funding, atom, nuclear |
| 13 | Soft policing | `policing-soft` | soft policing, community policing, police talks, negotiate, police dialogue, calm policing, police, dialogue, mediation police |
| 14 | Buy weapons | `procure` | buy weapons, procure, arms purchase, buy arms, ammunition, weapons, arms deal, military spending, buy ammo |
| 15 | Feed disinformation | `disinformation` | disinformation, misinformation, fake news, deception, deceive, lie, lies, propaganda, false information, mislead, disguise |
| 16 | Propose ceasefire | `ceasefire` | ceasefire, truce, white flag, surrender, stop fighting, armistice, peace offer, end war, stop the war |
| 17 | Spy on | `spy` | spy, spy on, espionage, intelligence, gather intel, surveillance, agent, secret agent, investigate, watch |
| 18 | Withdraw troops | `withdraw-border` | withdraw, withdraw troops, pull back, retreat, leave border, de-escalate, bring troops back, pull out |
| 19 | Back a coup | `coup` | coup, regime change, overthrow, replace leader, seize power, take over, change government, topple leader, new ruler |
| 20 | Declare war | `declare-war` | declare war, war, go to war, attack, invade, invasion, fight, battle, swords, combat |
| 21 | Sabotage | `sabotage` | sabotage, dynamite, blow up, explosives, bomb, destroy infrastructure, tnt, demolish, attack infrastructure |
| 22 | Denounce | `denounce` | denounce, condemn, criticise, criticize, protest, shout, megaphone, call out, public statement, accuse |
| 23 | Strike nuclear sites | `airstrike-nuclear` | strike nuclear sites, bomb nuclear, target nuclear program, hit nuclear facility, attack reactor, destroy nuclear program, nuclear target |
| 24 | National address | `address` | national address, speech, address the nation, rally, press conference, speak, announcement, podium, broadcast, propaganda |
| 25 | Stand down forces | `demobilize` | demobilize, demobilise, stand down, send troops home, disband, fewer troops, reduce army, troops down, de-escalate |
| 26 | Arm rebels | `arm-rebels` | arm rebels, support rebels, rebels, insurgents, revolution, uprising, guerrilla, arm the opposition, rebellion, militia |
| 27 | Break pact | `break-pact` | break pact, break alliance, betray, end alliance, leave alliance, broken alliance, cancel treaty, split, broken protection |
| 28 | Nuclear strike | `nuclear-strike` | nuclear strike, nuke, nuclear attack, atomic bomb, nuclear war, launch nukes, mushroom cloud, nuclear bomb |

Notes on single words: "bomb" is accepted for 7 and 21, "propaganda" for 15 and 24, "negotiate" for 4 and 13, "de-escalate" for 18 and 25; "crown" alone for 19 is a partial (it names the picture, not the order). "nuclear" alone is accepted for 12 only.

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

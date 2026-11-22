# Icon recognition test (D-66, RS-007)

**Round 2 (D-70).** Round 1 scored 74% weighted, 75% unweighted (`concept-tests/RESULTS.md`). Nine icons were redrawn (`design-order-cards.md` section 3.4), the 13 icons that scored 9/9 are unchanged, and the sheet has a **new shuffled order**, so numbers from round 1 do not carry over. Everything below refers to round 2 numbering.

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
2. **Partial** answers count as wrong but are logged, because they tell us what to fix: the right family but the wrong order (for example "nuclear" for 6, Strike nuclear sites; "police" is accepted for 4 and 15, since the family is the main signal and the plate word "Home" plus the card title settles which one).
3. Per persona: correct out of 28. Pooled: all correct answers / (28 x personas).
4. Record per icon: percent correct and the wrong answers, verbatim.

### Acceptance

| Bar | Threshold | If missed |
|---|---|---|
| Pooled recognition | **80% or more** (D-66) | Redesign the weakest icons and rerun before ship |
| Per icon floor | 50% or more on every icon | That icon is redesigned even if the pool passes |
| Danger orders | 90% or more on 6, 16, 18, 27, 28 (strike nuclear sites, declare war, assassinate, nuclear strike, coup) | Redesign: an irreversible order must never be mistaken |
| Confusion pairs | No pair confused by more than 2 personas: 5/23 (mediate, ceasefire), 16/23 (declare war, ceasefire: the same swords, the pause badge must carry it), 26/9 (mobilize, stand down), 2/13 (deploy, withdraw), 15/4 (hard, soft policing), 10/21 (spy, hunt spies), 1/12 (pact, break pact), 1/8 (pact, court: both show a handshake), 24/6 (airstrike, strike nuclear sites), 6/27 (strike nuclear sites, nuclear strike), 18/28 (assassinate, coup: both show a crown) | Strengthen the modifier (badge, arrow, slash) of the pair |

Round 2 watch list: 23 Propose ceasefire (must not read as declare war), 14 Destabilize (must not read as a bank or as an election), 28 Back a coup and 18 Assassinate (danger, 90% bar), 6 Strike nuclear sites (must not read as a nuclear strike), 4 Soft policing (67% in round 1, unchanged).

## Answer key (scorer only)

| # | Order | Registry id | Accepted answers |
|---|---|---|---|
| 1 | Offer defence pact | `offer-pact` | defence pact, defense pact, alliance, ally, mutual defence, defence agreement, security pact, military alliance, treaty, join forces, protect each other |
| 2 | Mass troops at border | `deploy-border` | deploy troops, mass troops, troops to border, border, deploy, advance, move tanks, threaten, border pressure |
| 3 | Sabotage | `sabotage` | sabotage, dynamite, blow up, explosives, bomb, destroy infrastructure, tnt, demolish, attack infrastructure |
| 4 | Soft policing | `policing-soft` | soft policing, community policing, police talks, negotiate, police dialogue, calm policing, police, dialogue, mediation police |
| 5 | Mediate peace | `mediate` | mediate, mediation, peace, peace talks, broker peace, dove, negotiate, peacemaker, make peace |
| 6 | Strike nuclear sites | `airstrike-nuclear` | strike nuclear sites, bomb nuclear sites, bomb nuclear facility, airstrike on nuclear, air strike nuclear, target nuclear program, hit nuclear facility, attack reactor, destroy nuclear program, bomb their nuclear program |
| 7 | Feed disinformation | `disinformation` | disinformation, misinformation, fake news, deception, deceive, lie, lies, propaganda, false information, mislead, disguise |
| 8 | Court | `court` | court, improve relations, friendship, handshake, deal, agreement, make friends, cooperation, diplomacy |
| 9 | Stand down forces | `demobilize` | demobilize, demobilise, stand down, send troops home, disband, fewer troops, reduce army, troops down, de-escalate |
| 10 | Spy on | `spy` | spy, spy on, espionage, intelligence, gather intel, surveillance, agent, secret agent, investigate, watch |
| 11 | Reform program | `reform` | reform, reforms, economic reform, growth, modernise, modernize, develop, invest, improve economy, industry, progress, build |
| 12 | Break pact | `break-pact` | break pact, break alliance, betray, end alliance, leave alliance, broken alliance, cancel treaty, split, broken protection |
| 13 | Withdraw troops | `withdraw-border` | withdraw, withdraw troops, pull back, retreat, leave border, de-escalate, bring troops back, pull out |
| 14 | Destabilize | `destabilize` | destabilize, destabilise, undermine, unrest, weaken government, topple government, topple, government crisis, collapse the government, chaos, subvert, unstable government, break the government |
| 15 | Hard crackdown | `policing-hard` | crackdown, hard crackdown, riot police, riot control, repression, police force, police violence, force, martial law, suppress protests, hard policing, police, police brutality, clamp down |
| 16 | Declare war | `declare-war` | declare war, war, go to war, attack, invade, invasion, fight, battle, swords, combat |
| 17 | Fund nuclear program | `fund-nuclear` | fund nuclear, nuclear program, build nuclear, nuclear research, invest nuclear, develop the bomb, nuclear funding, atom, nuclear |
| 18 | Assassinate leader | `assassinate` | assassinate, assassination, kill leader, kill the leader, kill the king, kill the ruler, target leader, target the leader, shoot the leader, eliminate the leader, murder the leader, take out the leader, regicide |
| 19 | Denounce | `denounce` | denounce, condemn, criticise, criticize, protest, shout, megaphone, call out, public statement, accuse |
| 20 | Buy weapons | `procure` | buy weapons, procure, arms purchase, buy arms, ammunition, weapons, arms deal, military spending, buy ammo |
| 21 | Hunt foreign spies | `counter-intel` | counter intelligence, counter-intel, counterintelligence, hunt spies, catch spies, find spies, find the spy, spot spies, spy hunt, search for spies, expose spies, root out spies |
| 22 | National address | `address` | national address, address the nation, speech, televised speech, tv address, speech on tv, broadcast, announcement, press conference, speak to the nation, address, rally the nation, propaganda |
| 23 | Propose ceasefire | `ceasefire` | ceasefire, truce, pause the war, pause fighting, stop fighting, stop the war, no war, end war, end the war, armistice, halt fighting, peace, stop the fighting, cease fire |
| 24 | Strike military targets | `airstrike-military` | airstrike, air strike, bomb, bombing, air raid, strike, jet attack, attack from the air, military strike |
| 25 | Arm rebels | `arm-rebels` | arm rebels, support rebels, rebels, insurgents, revolution, uprising, guerrilla, arm the opposition, rebellion, militia |
| 26 | Mobilize forces | `mobilize` | mobilize, mobilise, call up, reserves, raise army, recruit, more troops, build army, draft, troops up |
| 27 | Nuclear strike | `nuclear-strike` | nuclear strike, nuke, nuclear attack, atomic bomb, nuclear war, launch nukes, mushroom cloud, nuclear bomb |
| 28 | Back a coup | `coup` | coup, military coup, overthrow, overthrow the leader, military takeover, army takes over, seize power, topple leader, topple the king, regime change, junta, take over the government, depose |

Notes on single words: "bomb" is accepted for 3 and 24, "propaganda" for 7 and 22, "negotiate" for 4 and 5, "de-escalate" for 9 and 13, "peace" for 5 and 23. Partials (wrong, logged): "crown" or "king" alone for 18 or 28, "target someone" without the leader for 18, "defence" alone or "defence spending" for 1, "election" or "reshuffle" for 28, "economic collapse" or "bank" for 14, "pause" alone for 23. "nuclear" alone is accepted for 17 only. Round 1 lesson: "target" alone is not "assassinate", and "protect" alone is no longer accepted for the pact.

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

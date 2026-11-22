# Order cards readable at a glance (D-66, RS-007)

Owner: Art Director. Status: concept, ready for the concept test (the icon recognition test) before build. Scope: the order card and its iconography only. The month agenda layout (D-65, D-68) is designed elsewhere and is not touched here: every mock keeps today's positions and sizes of the catalog, map menu and staff list.

## 1. Problem

CEO, RS-007: "The order cards are boring and dark; the icons do not give the intuition of what the order type is without reading the card." RS-001 already said the actions feel like "a dashboard created by AI".

What is on screen today (iter-2, `ui/src/components/orders/OrderCard.tsx`, `ui/src/styles/orders.css`):

- **No pictogram on the card at all.** The Tabler icons in `ui/src/scenes/actionIcons.ts` are thin 24 px outlines used on pills and outcome cards, never on the order card. The only identity is a 62 px dimmed scene band (40 px on the map menu), where a 200 px-wide thumbnail is cropped to a strip and darkened (`saturate(0.85) brightness(0.9)`); 8 covert orders share one identical "covert" band.
- **Family colour is a 3 px left stripe** (`--fam-*`), with no word. Diplomacy `#4c8dff` and Intelligence `#36c5f0` are both blue and collapse under deuteranopia. There is no Economy family although D-66 asks for one.
- **Dark paper** (`--card-top #1f2939` to `#161d2a`) on a `#0b0f17` desk: the cards blend into the background.
- The crisis option cards (the screens the panel liked) have a 116 px illustrated band and read as objects; the order cards do not.

Personas this must serve (RS-007 mapping): Noah and Olivia follow icons and colour and read almost nothing; Ruth needs instant recognition; Sam judges art direction; Leo is "dead on camera".

## 2. Decisions

1. **A pictogram per order type**, 28 icons (one per registry id in `ui/src/lib/orders.ts`), drawn for this game on one grid, bold filled silhouettes, one idea each, monochrome (colour never carries the meaning). Plus 3 reserve icons (sanctions, aid, trade deal) for the Economy orders the registry does not have yet.
2. **Six visual families**: the five D-66 families (Diplomacy, Military, Covert, Economy, Home) plus Nuclear as a hazard variant of Military (yellow plate with hazard stripes). Each family is always shown four ways at once: pictogram, family word, plate colour, edge. Never colour alone.
3. **The card leads with a pictogram plate** (52 px tile, 42 px compact, 46 px row): a solid light family-coloured token with the dark pictogram, overlapping the bottom of a **taller, full-colour scene band** (104 px tile, up from 62). The body paper is lighter and tinted by the family at the top.
4. **Recognition is the acceptance bar**: the panel names the unlabeled icons; 80% pooled before ship (`icon-recognition-test.md`). Round 1 scored 74%, round 2 82%, round 3 84%, the replicated final run 87%; nine icons were redrawn for round 2, six for round 3, three for the final run, and two fallbacks applied after it (section 3.4, D-74, D-75). From iteration 4 icons are validated in real use (section 3.4).

## 3. Icon system

Source of truth: `concepts/order-icons/build.mjs` (generates every SVG, the sprite used by the mocks, the contact sheet and the recognition sheet). Files: `concepts/order-icons/<registry-id>.svg`. Contact sheet: `concepts/order-icons/contact-sheet.html` (`.png`).

### 3.1 Grid and drawing rules

| Rule | Value |
|---|---|
| Canvas | 48 x 48 viewBox; designed at 48, shipped at 24, 34 (plate), 48 |
| Live area | 3 to 45 (1.5 unit bleed allowed for strokes) |
| Primary stroke | 4 units (2 px at 24 px), round caps and joins |
| Detail stroke | 2.4 to 3.6 units; nothing thinner than 2 units |
| Knockout gaps | at least 2 units (1 px at 24 px), done with masks, never with a background-coloured stroke, so icons work on any plate |
| Fill | `currentColor`, single colour; no gradients, no second tone |
| Ids | every mask and clipPath id is per icon (`oi-<id>-...`); when inlined several times on one page, build ids from `useId()` as the scene STYLE.md requires |
| Text | none (the $ on the coin is drawn as a path) |

### 3.2 Visual grammar (shared modifiers, so pairs are learnt once)

| Modifier | Meaning | Used by |
|---|---|---|
| Badge, bottom right (circle r 9, 2.5 cut ring) with up arrow | more of it | mobilize |
| Badge with down arrow | less of it | stand down |
| Badge with coin ($) | spend money on it | buy weapons, fund nuclear (reserve: sanctions puts the $ in the lock) |
| Speech-bubble badge | by talking | soft policing |
| Badge with pause bars | halt it | propose ceasefire (round 2) |
| Crown | the leader | assassinate, back a coup |
| Arrow towards a dashed border | go there | mass troops at border |
| Arrow away from the border, tank turned around | pull back | withdraw troops |
| Crosshair | target it | assassinate |
| Jet diving | strike from the air | strike military targets |
| Tank | the army on the ground | mass troops at border, withdraw troops |
| Helmet | soldiers, the army | mobilize, stand down, back a coup (final) |
| Radiation sign in square brackets, SITES tag | a nuclear site, targeted | strike nuclear sites (final, D-75) |
| Police star | the police | soft policing, hard crackdown (final, D-75) |
| Split or crack | break it | break pact, destabilize |

### 3.3 Final catalogue (28 registry orders, as built in iteration 4)

| Registry id | Order | Family | Pictogram (one idea) | Why this picture |
|---|---|---|---|---|
| `court` | Court | Diplomacy | Handshake with two sleeves | The universal sign for friendly relations and deals; nothing else in the set uses hands meeting |
| `denounce` | Denounce | Diplomacy | Megaphone with shout lines | Public, loud condemnation; distinct from the calm podium of National address |
| `offer-pact` | Offer defense pact | Diplomacy | Handshake inside a shield (round 2) | An agreement (handshake, 9/9 for Court) that is about defence (shield); two parties, so it cannot read as "my own defence" |
| `break-pact` | Break pact | Diplomacy | One shield split in two, halves pushed apart | Same shield vocabulary as the pact, broken; learnt as a pair |
| `ceasefire` | Propose ceasefire | Diplomacy | The Declare war swords with a pause badge (round 2) | The swords are read as war by 9 of 9; the pause badge says "halt the war". No flag anywhere: a flag read as claiming territory |
| `mediate` | Mediate peace | Diplomacy | Dove with an olive branch | Peace brokered for others; dove is not a flag, so it is not confused with ceasefire |
| `declare-war` | Declare war | Military | Crossed swords | Read as "war" in every culture and game; strongest silhouette in the set, fit for an irreversible order |
| `mobilize` | Mobilize forces | Military | Three helmets, up badge | Helmets = troops; up = more of them |
| `demobilize` | Stand down forces | Military | Three helmets, down badge | Same helmets, down = fewer; learnt with mobilize |
| `procure` | Buy weapons | Military | Three artillery shells and a coin badge | Ammunition plus money = buying arms |
| `deploy-border` | Mass troops at border | Military | Tank facing a dashed border line, arrow towards it | The border line is the subject; the barrel and arrow point at it |
| `withdraw-border` | Withdraw troops | Military | Same tank turned away, arrow back | Mirror of deploy, with the line kept on the same side so the direction is the only difference |
| `airstrike-military` | Strike military targets | Military | Jet diving onto a blast | Air attack in one look; the blast says "strike", not "fly" |
| `airstrike-nuclear` | Strike nuclear sites | Military | Text-forward: the radiation sign inside square target brackets, over a SITES tag (final, D-75) | The radiation sign is the one cue that says nuclear; square brackets target a place, unlike the round crosshair of Assassinate; no dome, head or person anywhere (the dome read as a leader); no mushroom, so not Nuclear strike; the SITES tag (drawn as paths, no font) settles it in words |
| `fund-nuclear` | Fund nuclear program | Nuclear | Atom with a coin badge | Money into the program; atom is the program in all three nuclear icons |
| `nuclear-strike` | Nuclear strike | Nuclear | Mushroom cloud | Unmistakable; must never be confused with anything (danger order) |
| `spy` | Spy on | Covert | Agent in a fedora and dark glasses, collar up | The pop-culture spy; recognised by children and casual players (Noah, Olivia) |
| `counter-intel` | Hunt foreign spies | Covert | The spy (top left) with a pair of open handcuffs, angled, with lock blocks (final) | Arrest, shown as an object next to the spy; the cuffs are angled and offset with their lock blocks, so they cannot read as wheels (car) or binoculars |
| `sabotage` | Sabotage | Covert | Dynamite bundle with a lit fuse | Covert destruction, hand-placed; distinct from the airstrike blast |
| `destabilize` | Destabilize | Covert | A leaning tower of blocks with a flag on top, one block pushed out (round 3) | The stacking-tower game everyone knows as "about to fall"; the flag makes it a country; no building, no hull shape |
| `arm-rebels` | Arm rebels | Covert | A raised fist holding a whole rifle aloft (round 3) | The rifle is fully visible across the top, so the fist reads as an armed revolt, not a protest |
| `disinformation` | Feed disinformation | Covert | Speech bubble wearing a masquerade mask | A message in disguise: words that lie |
| `assassinate` | Assassinate leader | Covert | Crosshair on a crowned head (round 2) | The crown makes the target the leader; "target the leader" is the order |
| `coup` | Back a coup | Covert | A soldier helmet sitting on the empty throne, crown carved in the backrest (final) | The army takes the seat of power; no vehicle, so it cannot read as a tank attack or invasion, and no face, so not an agent |
| `reform` | Reform program | Economy | Sprout growing out of a gear | Fixing the machine so it grows; "reform", "growth" and "modernise" all count |
| `address` | National address | Home | The leader at a lectern on a TV screen, with a flag (round 2) | A televised speech to the nation; the microphone and podium read as a plant pot |
| `policing-soft` | Soft policing | Home | A police badge (star shield) with a speech-bubble badge (round 3) | The badge is the police sign in every country; no cap, because after round 2 any headgear read as army |
| `policing-hard` | Hard crackdown | Home | A line of three riot police: visored helmets behind tall shields, star on the middle shield (final, D-75) | A shield wall is the picture of a crackdown; no stick anywhere (batons read as a pen, a shovel, a broom); the police star ties it to Soft policing, the shields and visors make it force |

Reserve (not in the registry yet, same grammar, family Economy): `reserve-sanctions` padlock with a $ (frozen money), `reserve-aid` care package with a heart, `reserve-trade` container ship with two-way arrows. They are drawn so a future sanctions, aid or trade order lands in the system without a new style; they are not part of the recognition test.

Note on the brief: the brief listed sanctions, aid and trade deal as order types; the registry (`ui/src/lib/orders.ts`, engine `src/core/orders.ts`) has no such orders today (it has 28: the 6 diplomacy, declare war, 7 military, 2 nuclear, 8 covert, 4 domestic). The set follows the registry.

### 3.4 Test rounds and redraws (D-70 to D-75)

#### Round 2 (D-70, after round 1)

Round 1: 74% weighted, 75% unweighted (bar 80%), `concept-tests/RESULTS.md`. Rule for the redraws: an icon must not show what people misread it as, and it should borrow from icons that scored 9/9 (swords, jet, atom, spy, helmet, handshake) so the set gets more consistent, not less. The 13 icons at 9/9 are unchanged (2, 4, 6, 7, 8, 9, 12, 14, 17, 18, 20, 21, 28 in round 1 numbering). Soft policing (67%) is also unchanged, as it was not on the redraw list.

| Order (round 1 score) | What people read (round 1) | Was | Now | Why it should not say the misreading |
|---|---|---|---|---|
| Hunt foreign spies (0%) | sanctions, embargo, ban trade (9 of 9) | Spy under a no sign | Magnifying glass with the spy in the lens | The no sign was read as "ban", so it is gone. Nothing in the picture is a ban or money; a search lens on the 9/9 spy says "find the spy" |
| Propose ceasefire (0%) | claim territory, plant a flag (9 of 9) | White flag on a pole | The war swords (9/9) with a pause badge | No flag, no pole, so nothing to plant. The swords set the topic as war, the pause badge says halt. New risk: confusion with Declare war, added as a watched pair (the badge must carry it) |
| National address (0%) | no idea; plant in a pot, farming; a bug, wiretap | Microphone on a podium with sound waves | The leader behind a lectern on a TV screen, small flag, TV stand | The microphone on a stalk was the "plant" and the "bug", so there is no microphone now. A person on a screen is a broadcast speech; the flag makes it a national one |
| Destabilize (22%) | bank or economy collapse (7 of 9) | Columned classical building, cracked and tilted | Domed capitol with a flag on top, crack and tilt, falling debris | Columns and a pediment are the bank icon everyone knows, so no columns. A dome with a flag reads as a seat of government |
| Back a coup (44%, danger) | election, new leader, reshuffle | Crown with two swap arrows | A soldier helmet knocking the crown off | Swap arrows are the language of exchange and votes, so they are gone. The helmet (read as troops) and a falling crown say "the army removes the ruler" |
| Assassinate (56%, danger) | target someone, aim at someone, surveillance | Crosshair on a head and shoulders | Crosshair on a crowned head | The crosshair was right but the target was anyone; the crown makes it the leader. Crown = the leader is shared with the coup icon |
| Strike nuclear sites (78%, danger) | nuclear target, nuclear strike | Atom in a crosshair | The Strike military jet diving onto the program atom, impact strokes | A crosshair on an atom reads as nuclear targeting in general, close to a nuclear strike. Jet plus atom is "air raid on the program", built from two 9/9 icons, and has no mushroom or crosshair |
| Hard crackdown (56%, watch) | sign a law, a decree (4 of 9) | Rectangular riot shield and diagonal baton | A riot officer: visored helmet, body, rounded shield, raised baton | The tall rectangle with a window and stripe was a sheet of paper and the baton a pen; now it is a person in riot gear, and the shield is rounded |
| Offer defence pact (56%, watch) | boost own defence, defence spending | Two shields side by side, plus sign | A handshake inside one shield | Two shields with a plus read as "more defence". The handshake (Court, 9/9) adds the second party: a defence agreement |

The round 2 sheet used a different shuffle, so nobody could repeat round 1 answers from memory.

#### Round 3 (D-72, after round 2: 82.1% pooled, thin pass)

Round 2 fixed the pact, ceasefire, national address and assassinate (all 100%), with no confusion between ceasefire and declare war or between coup and assassinate. Six icons are redrawn for round 3; the other 22 are byte-identical to round 2 (checked with git diff).

| Order (round 2 score) | Round 2 misreading | Diagnosis | Round 3 | Why it should not say the misreading |
|---|---|---|---|---|
| Destabilize (0%) | a ship, navy, naval blockade (8 of 9) | A tilted wide building with a base line and debris is a hull at sea; the flag on top became a mast | A leaning stack of blocks with a small national flag on top, one block pushed out to the side, on a flat ground line | No building and no hull; the stacking-tower game is the shared picture for "unstable, about to collapse", and the flag makes it a country, not a toy |
| Back a coup (33%, danger) | cyberattack, covert sabotage, expose a spy | The helmet over a tilted crown formed a face with a mask; in the covert family it read as an agent | A tank (from deploy/withdraw, 9/9) with its barrel knocking a crown off | A tank is not an agent and not a computer: it is the army. The crown, which round 2 proved reads as "the leader" (assassinate 9/9), is being knocked away by force. Watched pair: coup vs mass troops at border (both have a tank; the crown and the missing border line separate them) |
| Strike nuclear sites (56%, danger) | nuclear bomber, nuclear air strike (4 of 9, pair 6/27) | Any aircraft next to an atom reads as the plane that carries the bomb | A conventional finned bomb falling onto a cooling tower (with steam and an atom sign), impact burst | The atom is now painted on a building, so it is the target, not the weapon; a cooling tower is the stock picture of a nuclear plant; the bomb is a plain iron bomb; no jet, no mushroom cloud |
| Soft policing (11%, unchanged since round 1 at 67%) | talk to the military, a general speaks (8 of 9) | Not the art: the context changed. Round 2 added helmets (coup, crackdown) and kept helmets for troops, so the panel learnt "headgear = army", and the peaked cap now reads as a general's cap. On the round 2 sheet it also sat at cell 4, just after the pact and before mediate, a run of diplomacy and military pictures | A police badge (star on a shield-shaped badge) with the speech-bubble badge | No headgear at all; the star badge is the police sign in every country and is not used anywhere else in the set |
| Arm rebels (44%, unchanged since round 1 at 89%) | protest, riot, crackdown on protesters; "fist with a bottle", "fist and broom" | The rifle was mostly hidden behind the fist and forearm; with only its stock and muzzle showing, the fist alone says protest. Round 2 added a baton (crackdown) nearby, which pulled "riot" | A raised fist gripping a complete rifle held horizontally overhead | The whole rifle silhouette (stock, magazine, barrel, sight) is visible above the fist: an armed revolt, which no protest or crackdown shows |
| Hunt foreign spies (67%; pair 10/21 with 3 personas) | investigate, spy on someone | A lens on the spy is still an act of looking, the same verb as "spy on" | The spy (unchanged 9/9 figure) above a pair of handcuffs, set wide apart with a chain | Handcuffs are arrest, not looking; spaced wide with a visible chain so they do not read as binoculars (which would mean "spy on" again) |

Unchanged but watched: Feed disinformation (89% to 67% with the same art; "spy mask, secret talk" grew once covert icons multiplied) and Hard crackdown (56% twice; read as a soldier digging in). They are left as they are this round, as D-72 asks; if round 3 confirms them, they are next.

Round 3 uses another shuffle (`(n * 13 + 2) % 29`); results are compared across rounds by order id, not cell number.

#### Final redraw and replicated run (D-74, after round 3: 84.5% pooled)

Round 3 passed the pool, but icons whose drawing never changed swung by up to 67 points (disinformation 89, 67, 0), so one round is not enough to judge a single icon. Method from D-74: score every icon by order id across rounds, average only the rounds that showed its current drawing, redraw only icons that failed consistently, then run a replicated final test (two sheets per persona, `icon-recognition-test.md`).

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
| `airstrike-nuclear` | Strike nuclear sites | Military | Text-forward: the radiation sign inside square target brackets, over a SITES tag (final, D-75) | The radiation sign is the one cue that says nuclear; square brackets target a place, unlike the round crosshair of Assassinate; no dome, head or person anywhere (the dome read as a leader); no mushroom, so not Nuclear strike; the SITES tag (drawn as paths, no font) settles it in words |
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
| `policing-hard` | Hard crackdown | Home | A line of three riot police: visored helmets behind tall shields, star on the middle shield (final, D-75) | A shield wall is the picture of a crackdown; no stick anywhere (batons read as a pen, a shovel, a broom); the police star ties it to Soft policing, the shields and visors make it force |

Average of the 25 tested current drawings: 92.1%

Three icons failed in every round and are redrawn; every other icon is byte-identical to round 3 (git diff), including disinformation and crackdown.

| Order (R1, R2, R3) | Most common wrong readings, all rounds | Final drawing | Why it should not say the misreading |
|---|---|---|---|
| Back a coup (44, 33, 44) | R1 election, reshuffle; R2 masked agent, cyberattack; R3 tank attack, invasion (confused with mass troops at border by 4) | A soldier helmet sitting on the empty throne, crown carved in the high backrest | No vehicle, so no attack or invasion; no arrows, so no election; no face, so no agent. The throne is the seat of power, the helmet (read as soldiers in mobilize and stand down) has taken it: the army seizes power |
| Strike nuclear sites (78, 56, 44) | R1 and R2 nuclear strike or bomber; R3 factory or power plant strike | A finned bomb falling onto a reactor dome that carries a large radiation sign, impact strokes | The radiation trefoil is the strongest "nuclear" sign and sits on the building, so the place is nuclear; a dome is not a chimney or cooling tower, so not a factory or power plant; the weapon is an ordinary bomb and there is no jet or mushroom, so not a nuclear strike |
| Hunt foreign spies (0, 67, 44) | R1 sanctions, ban; R2 investigate, spy on; R3 "spy in a car" (the level cuffs read as wheels; confused with spy by 4) | The spy figure small at top left, a pair of open handcuffs angled at bottom right with lock blocks and a short chain | No slash, no lens, no level pair of rings: the cuffs are offset and tilted with their lock blocks, which wheels and binoculars do not have; the spy is the object, the cuffs are the action (arrest) |


#### Closing the icon design (D-75)

Final replicated run (`concept-tests/RESULTS-final.md`): 87% pooled, noise about 9 points per icon. Dedicated icon rounds stop here. The two consistent failures get the documented fallbacks without another test:

| Order | Final run | Fallback applied | Why |
|---|---|---|---|
| Strike nuclear sites | 22% (four drawings, every round failed; last read as a bomb at a leader, a crackdown, a coup) | Text-forward: radiation sign in square target brackets over a SITES tag | Every picture of a building was read as something else (factory, head); the radiation sign plus a word cannot be. Square brackets keep it apart from the round crosshair of Assassinate; no mushroom keeps it apart from Nuclear strike. The tag is drawn as paths (5 block letters, 1.7-unit stroke), so the build needs no font; legible from 34 px, so on cards the plate is at least 34 px and the 24 px tray slot relies on the title |
| Hard crackdown | 44% (A 78%, B 11%; read as cleaning or digging on sheet B) | A riot police line: three visored helmets behind tall shields, police star on the middle shield | The baton was the broom, the shovel and, in round 1, the pen: no stick at all now. The police star (soft policing, 100% in round 3) says police, the shield wall says force |

Every other icon is unchanged from the final run. The A/B sheet PNGs and keys are kept as the record of what the panel answered; the sheet HTML files load the live sprite, so they now show the final drawings.

**Validation in real use (D-75).** Icons are no longer validated by a dedicated test. They are checked in real use: (1) the iteration-4 playtests (synthetic panel and CEO) log any order picked or skipped by mistake, and any "what is this?" about an order card, by order id; (2) the debrief log notes when a player gives an order and then removes it; (3) any order id with two or more such reports across sessions is redrawn in `build.mjs` and the fix ships with the next build, with no separate test round. In the game every card keeps its title, family word and, for danger orders, the confirm face, so the icon helps at a glance but is never the only cue. Watch first: Strike nuclear sites and Hard crackdown (untested final drawings), Feed disinformation and Denounce (read as speech or announcement in the final run).

### 3.5 Legibility check

Verified on the contact sheet at 96, 48, 34 (plate) and 24 px, plate and bare. Strong at 24 px: swords, megaphone, mushroom, spy, dynamite, crosshair, magnifier, TV, shields, mask bubble. Acceptable at 24 px, best at 34 px plate: mobilize and stand down (the helmets merge, the badge carries the difference), destabilize (fine detail), strike nuclear sites (the SITES tag needs 34 px or more), arm rebels (the rifle is partly hidden by the fist). Rule: on cards the icon is never smaller than 28 px; the 24 px size is for the tray slot and inline text only.

## 4. Family colours

Tokens (NEW, to replace `--fam-*` in `ui/src/styles/orders.css` and the duplicate `FAMILY_COLOR` in `actionIcons.ts`):

| Family | `--fam-X` accent (edge, plate, band tint) | `--fam-X-ink` (words on dark) | `--fam-X-chip` (chip fill) | Plate vs icon ink `#0c1322` | Edge vs card `#273349` | Edge vs desk `#0b0f17` | Chip word vs chip | Ink vs card |
|---|---|---|---|---|---|---|---|---|
| Diplomacy `diplo` | `#4691ff` | `#8cbbff` | `#243858` | 5.97 | 4.08 | 6.17 | 5.99 | 6.44 |
| Military `mil` | `#ff7d4f` | `#ffae92` | `#41353c` | 7.33 | 5.01 | 7.58 | 6.51 | 7.08 |
| Nuclear `nuke` | `#f5d547` + hazard stripes | `#f9e58d` | `#40433a` | 12.80 | 8.75 | 13.23 | 7.98 | 10.04 |
| Covert `intel` | `#f48fd2` | `#f8bae3` | `#3f3851` | 8.58 | 5.86 | 8.86 | 6.92 | 7.93 |
| Economy `econ` (NEW) | `#1fbf95` | `#74d7bd` | `#1d3f47` | 7.90 | 5.40 | 8.17 | 6.58 | 7.37 |
| Home `home` | `#f1ede4` (ivory) | `#f6f4ee` | `#3f4754` | 15.88 | 10.85 | 16.42 | 8.52 | 11.53 |

All pass: icon on plate is graphics (WCAG 1.4.11 needs 3:1; every plate is 5.97:1 or more, so the pictogram on its plate also passes as if it were text). Edge vs card is 3:1 or more (non-text). Chip words are 4.5:1 or more (AA text). Plate ink: `--plate-ink: #0c1322`. Computed with `concepts/order-family-contrast.mjs` (WCAG relative luminance).

Colour vision deficiency (Machado 2009, severity 1, CIE76 dE between family accents; computed by the same script, previewed in the contact sheet's simulated strips):

| Vision | Smallest gap between two families | Old palette for comparison |
|---|---|---|
| Normal | 54.7 (Economy and Home) | 41.5 |
| Protanopia | 24.5 (Economy and Home) | 13.2 (Diplomacy and Intelligence) |
| Deuteranopia | 21.5 (Covert and Economy) | 2.4 (Diplomacy and Intelligence, effectively the same colour) |
| Tritanopia | 19.8 (Diplomacy and Economy) | 14.0 |

Why these hues: the old blue/cyan pair is gone (Diplomacy keeps blue, Covert moves to orchid pink, which stays apart from blue in all three deficiencies). Home is ivory, a near-neutral, because amber is taken by political capital and the unaffordable state (`--accent #f2a93b`), and red by danger and war. Military is vermilion, lighter and more orange than the war red `#e5383b` used by No undo and the confirm face. Known weak spot, visible in the contact sheet: under protanopia and deuteranopia Military and Economy both shift towards khaki (dE 26 and 45, distinguishable side by side, not at a glance alone). This is accepted because the pictogram, the family word and the edge also differ, and Economy has one order today; revisit if Economy grows.

Never colour alone: the family chip always carries a word (DIPLOMACY, MILITARY, NUCLEAR, COVERT, ECONOMY, HOME) and a small diamond in the accent (Nuclear: striped). State never uses family colour (section 5.3).

Text on the new card: `--text-1` 10.70:1, `--text-2` 5.65:1. `--text-3` drops to 4.07:1 on the lighter paper: do not use `--text-3` for small text on order cards (use `--text-2`).

## 5. Card anatomy and states

Concept pages (open in a browser; PNGs at 1440 and 390 next to them):

- `concepts/order-cards-catalog.html`: desk catalog, all targeted orders for Iran in every state; phone width switches to rows.
- `concepts/order-cards-map-menu.html`: map menu (compact tiles, two columns, today's size) and the phone sheet.
- `concepts/order-cards-staff-picks.html`: staff picks list (row with scene thumbnail and plate; phone: plate only).
- `concepts/order-cards-states.html`: the six families and every state.
- Shared: `concepts/order-cards.css` (tokens and component CSS), `concepts/order-cards.js` (renderer), `concepts/order-icons/sprite.js`. Scene thumbnails in `concepts/order-cards-assets/` are real captures of the game's scenes (`#clip` route).

### 5.1 Tile (desk catalog)

```
+--[6px family edge]------------------------------+
| SCENE BAND 104px, full colour        (seals)    |  scene from kinds.ts, brightness 1.08,
|   family tint from bottom left 38%              |  saturate 1.08, family gradient
|  [PLATE 52]  [◆ DIPLOMACY]                      |  plate overlaps band by 28px, 3px card ring
| Court Iran                          17px/700    |  title never ellipsizes
| Trade talks and quiet diplomacy...  14px text-2 |  blurb (available only)
| [70% chance] [6% defense] [NO UNDO]             |  chips (unchanged vocabulary)
| ------------------------------------------------|
| + Add to this month                  Forecast   |  state line
+-------------------------------------------------+
```

- Paper: `--card-top #273349`, `--card-bot #1b2435` (was `#1f2939` / `#161d2a`), line `#45546b`; the top 38% is mixed with 9% of the family accent.
- Edge: 6 px family accent on the left (was 3 px), Nuclear in yellow and black stripes.
- Hover or focus: lifts 4 px in 140 ms (existing lift verb), the outline takes 70% of the family accent; focus keeps the amber focus ring.
- Press: existing sink (80 ms) and `tap` sound. Queue: existing stamp and seal flight. Nothing new in motion: the brief is visual; motion stays the feel system's.

### 5.2 Compact tile (map menu) and row (phone sheet, staff picks, search)

- Compact tile: 54 px **family illustration band** (radial family gradient, a fine 14 px grid, the pictogram as a 72 px watermark at 35%), the family chip moves into the band top left, plate 42 px, title 15 px, footer "+ Add" only. A 40 px scene crop is unreadable, so compact tiles use the family band, not the scene.
- Row: plate 46 px left, title, chip plus meta line, action button right; the staff row adds a 112 x 64 scene thumbnail with the plate over its corner on desktop, plate only on phones. Row background is tinted by the family on the left third.
- Family band fallback (any tile with no scene or with a repeated scene) is the same as the compact band at full height; see the last cell of the states page.

### 5.3 States (kept from design-orders.md section 4, plus proposed)

| State | Border | Plate | Band | State line | Not colour alone |
|---|---|---|---|---|---|
| Available | 1 px line | family colour | full colour | "+ Add to this month", Forecast | words |
| Unaffordable | amber 70% | family colour at 60% saturation (still recognisable) | 50% saturation | lock icon, bold reason, amber fix button ("Remove a staff order (frees ◆ 1)" or "or wait: +2 next month"); missing seals drawn as dashed holes | lock icon, words, holes |
| Invalid | dashed, edge dashed | neutral `#c7ced9` plate, icon still dark and readable (11.71:1) | greyscale | info icon, bold rule, neutral alternative button | dashed line, words |
| Queued | 2 px green | green check badge on the plate corner | full colour | ORDERED stamp, "In this month", Remove | stamp, check, words |
| Proposed (staff) | 2 px dashed amber | family colour | full colour | staff avatar and "Proposed by the Foreign Minister", "Will change: ...", Approve order (primary), Remove | dashed line, words |
| Confirming (war, nuclear, mission warning) | 2 px red, red face replaces the card | red plate with the order's pictogram (nuclear keeps hazard stripes) | none | NO UNDO chip, question, consequence list, Declare war / Hold to authorize, Keep the peace / Stand down | words, hold gesture |

Family colour never changes with state, and state colours (amber, green, red) never appear on the plate except the queued check, so "what is it" and "can I do it" stay separate channels.

## 6. Acceptance criteria

1. **Icon recognition**: 80% or more pooled across the panel on the unlabeled sheet, every icon at 50% or more, danger orders (assassinate, coup, declare war, strike nuclear sites, nuclear strike) at 90% or more, no listed confusion pair mixed up by more than 2 personas (`icon-recognition-test.md`).
2. **Sight-picking (concept test on the mocks)**: asked "add a spy mission against Iran" and "find the order that ends the war", Noah, Olivia and Ruth point at the right card on `order-cards-catalog-1440.png` within 3 seconds without reading the blurb (narrated in character); Sam rates the card art direction 7/10 or more and does not call it a dashboard.
3. **Contrast**: every number in section 4 at or above its WCAG threshold on the shipped tokens (unit test on the token values).
4. **Never colour alone**: every order card, row and slot shows pictogram plus family word; a greyscale screenshot of the catalog still separates the families by pictogram and word.
5. **Parity**: the same pictogram for an order on desk catalog, map menu, dossier, staff picks, tray slot, outcome card and debrief (one map, `ORDER_PICTOGRAM`, keyed by registry id).
6. **States**: all six states render with the visuals in 5.3 at 1440, 1024 and 390, with no horizontal scroll at 390 and no title ellipsis.
7. **Brightness**: mean luminance of the order card area in the catalog screenshot at least 1.5 times today's (iter-2 baseline, same scene and target), measured by the QA script.

## 7. Work packages

| WP | What | Files | Size |
|---|---|---|---|
| WP-1 Pictogram component | Port the 28 icons from `concepts/order-icons/build.mjs` into one TSX module: `OrderPictogram({ id, size })` returning inline SVG with `useId()`-scoped mask ids; `ORDER_PICTOGRAM` map keyed by registry id (variants by id, so `airstrike-military` and `airstrike-nuclear`, `policing-soft` and `policing-hard` differ). Keep `ACTION_ICON` (Tabler) only for places with no order id, then remove it once WP-4 is in | NEW `ui/src/components/orders/pictograms.tsx`; `ui/src/scenes/actionIcons.ts` | M |
| WP-2 Family tokens | Replace `--fam-*` with the accent/ink/chip tokens of section 4 plus `--plate-ink`; add family `econ` to `OrderFamily` and set `reform` to it; keep `nuke`; one `familyOf(def)` used by cards and suggestions; delete the hard-coded `FAMILY_COLOR` hexes and the `.suggestion.fam-*` hexes in `wc.css` (use the tokens) | `ui/src/styles/orders.css`, `ui/src/lib/orders.ts`, `ui/src/scenes/actionIcons.ts`, `ui/src/styles/wc.css` (lines around 1662), `ui/src/lib/glossary.ts` (family words) | S |
| WP-3 Card surface | Lighter card paper for order cards only (scoped variables on `.ord-wrap`, crisis cards unchanged in this pass), 6 px edge, 104 px band at full colour with the family tint, plate overlapping the band, family chip, compact family band with watermark, row plate and staff thumbnail, the state visuals of 5.3 (plate per state, queued check badge) | `ui/src/components/orders/OrderCard.tsx`, `ui/src/components/game/CardShell.tsx` (new optional `plate` and `chip` slots, `bandStyle: 'scene' or 'family'`), `ui/src/styles/orders.css`, `ui/src/styles/game.css` | L |
| WP-4 Pictogram everywhere | Tray slot (`OrderSlot`), staff suggestions (`desk/AdvisorList`), map strip, outcome cards and debrief use `OrderPictogram` and the family tokens | `OrderCard.tsx` (`OrderSlot`), `ui/src/components/desk/AdvisorList.tsx`, `ui/src/scenes/OutcomeCard.tsx`, `ui/src/scenes/debriefParts.tsx` | M |
| WP-5 Scene mapping | Give orders that share the covert scene a better-fitting scene where one exists: `INTEL_DESTABILIZE` and `INTEL_SUPPORT_REBELS` to `streets`, `INTEL_COUP` to `parliament` (as in the mocks); the rest keep `covert` and rely on the plate | `ui/src/scenes/kinds.ts` (`ACTION_SCENES`) | S |
| WP-6 Gallery and tests | Add the pictogram sheet and every card state to the Feel gallery for QA screenshots; tests listed in section 8; refresh the visual baselines (`npm run verify -- --update-visual`) | `ui/src/scenes/FeelGallery.tsx`, `tests/` (new specs), `tests/visual/__screenshots__/` | M |

Order: WP-2, WP-1, WP-3, WP-5, WP-4, WP-6. WP-1 and WP-2 can run in parallel. Before WP-3 starts, the recognition test must pass (D-66 acceptance); icons that miss are redrawn in `build.mjs` first.

## 8. Regression guards

- `tests/ui-order-pictograms.spec.ts` (NEW): every `ORDERS` id has a pictogram; no two ids share a pictogram except declared pairs (none today); every pictogram SVG uses only `currentColor` fills, no `fill="#..."` other than mask black and white; mask ids are built from `useId`.
- `tests/ui-order-families.spec.ts` (NEW): every order has a family; every family has the three tokens; WCAG contrast of plate vs `--plate-ink` 4.5:1 or more, edge vs card 3:1 or more, chip word vs chip 4.5:1 or more (computed from the CSS token values); the family word appears in `glossary.ts`.
- Extend `tests/ui-orders-parity.spec.ts`: map menu, desk catalog and dossier render the same pictogram for the same order.
- Visual regression: Feel gallery cells for the six states and the six families at 1440 and 390, plus the pictogram sheet (catches a lost mask or a colour drift).
- Regression registry (`devloop/instances/world-conflict/regressions.yaml`): add RS-007 "order type not recognisable without reading" with the recognition test as its check, and "family shown by colour alone" with the greyscale check.
- Repo style: no em dash in the new files (`tests/repo-style.spec.ts`).

## 9. Visual QA checklist (for the QA engineer, on screenshots)

1. Every order card shows a plate with a pictogram and a family word; none shows only a stripe.
2. Plate pictograms are centred, 66% of the plate, crisp at 1x (no blurry half-pixel edges at 24 and 34 px).
3. Plate overlaps the band by half its height on tiles, with the card-coloured ring; nothing covers the cost seals.
4. Titles wrap, never ellipsize; at 390 there is no horizontal scroll and action buttons do not wrap their words.
5. Unaffordable: amber border, lock, reason, fix button; seals show holes. Invalid: dashed, neutral plate still showing the icon. Queued: green border, ORDERED stamp, check on the plate. Proposed: dashed amber, staff avatar, Approve. Confirming: red face with the order's pictogram.
6. Family colour unchanged across states; Nuclear always striped.
7. Greyscale screenshot: families still told apart by pictogram and word.
8. Reduced motion: no lift transform, border change only.

## 10. Open points

- The registry has no Economy orders besides Reform; the Economy family is set up for the reserve sanctions, aid and trade orders if the game adds them (product decision, not art).
- Crisis option cards keep the current paper in this pass; once the order cards ship, the same lighter paper should be tried on crisis cards for consistency (separate concept, Sam to judge).
- If round 3 misses: destabilize falls back to a flag on a cracked, split pedestal; coup to soldiers carrying away a throne; strike nuclear sites to a missile hitting a reactor dome; soft policing to two figures talking with a badge between them; hunt spies to a spy behind bars. Redraw in `build.mjs`, rerun the test, then build.

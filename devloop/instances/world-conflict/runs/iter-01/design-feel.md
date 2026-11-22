# Design: feel (G7 a game, not a dashboard; C8 big moments)

Owner: Art Director. Iteration 1. Status: proposed.
Concepts (screenshotted with Playwright, PNGs next to each file):
- `concepts/feel-desk.html`: the desk stage, one responsive file (`feel-desk-1440.png`, `feel-desk-1024.png`, `feel-desk-390.png`, `feel-desk-scrolled-390.png`).
- `concepts/feel-cards.html`: briefing card states plus a live press, stamp, seal spend, refund and refusal demo with synthesized sound (`feel-cards-1440.png`, `feel-cards-demo-refused.png`).
- `concepts/feel-seal.html`: the political capital seal: anatomy, sizes, states, spend frames, one representation everywhere (`feel-seal-1440.png`).
- `concepts/feel-stingers.html`: big-moment storyboard (5 moments x 4 frames) and a playable stage with sound (`feel-stingers-1440.png`, `feel-stingers-live-war-900ms.png`, `feel-stingers-live-nuclear-900ms.png`).
- `concepts/feel-sound.js`: the WebAudio sound kit, ready to port to `ui/src/lib/sound.ts`.

This spec is the visual and interaction language. It deliberately does not redesign what the month contains (that is `design-month.md`: Your move card, goal line, coach, result card) or how orders and availability work (that is `design-orders.md`: `OrderCard`, `CapitalMeter`, `pointAt`). It defines how those things look, move and sound, provides the shared primitives they render through, and owns the parts nobody else owns: stingers, sound, art-to-outcome consistency, the stage composition, legibility and the animation budget. Section 9 lists exactly which files each package touches and how it lines up with the orders, month and reveal packages.

---

## 1. Problem

| Id | Evidence | What is wrong |
|---|---|---|
| F1 | CEO RS-001 | "Still feels like a dashboard created by AI ... not just simple misaligned buttons with words ... I want to feel that I am playing, with a reactive rich UI." |
| F2 | Sam, `iter-00/shots/sam-desktop/003-desk.png`, `007-desk2.png` | The crisis picture is a 443 px block with nothing beside it; the lower half of the centre column is empty; "three cards of text"; the layout jumps when the tip banner closes. Reference: Frostpunk decision screens use the whole stage. |
| F3 | Sam, `sam-desktop/004-disabled.png`; Leo, `leo-stream/011-nuke.png`, `020-w3.png` | A press does nothing visible: no motion, no sound; the map menu closes with no motion. Disabled reasons live in native tooltips (Into the Breach puts the reason on the tile). Leo: a refusal toast that never leaves. |
| F4 | Sam, `sam-desktop/012-d3b.png`, `014-d5.png` | Art contradicts status: green check and handshake over a red "Propose ceasefire to Yemen (failed)"; a fighter-jet picture for the diplomatic "Back channel via Muscat". Root causes in code: `lib/debrief.ts` `decisionScene()` uses `sceneForCrisis(templateId, title)` and ignores the chosen option; `countryCard()` takes the verdict from the relation change and the scene from the lead decision even when an own order in the same card failed. |
| F5 | Sam, `sam-desktop/003-desk.png` (HUD) vs rail | Capital has two opposite pictures: HUD diamonds fill for capital left (`Hud.tsx` `.pc-pips`), the rail ticks fill for capital used (`CommandRail.tsx` `Meter used=`). Labels "Capital", "Cap", "◆ Capital". |
| F6 | Olivia, `olivia-laptop/003-desk1.png`; Noah, `noah-phone/003-desk1.png` | "Looked like work": three columns, little dots, tiny grey text. Want "one big button per month", "three big buttons", every tap answering instantly. |
| F7 | Leo, `leo-stream/033-e2.png` | Debrief page half empty; war, nuke and coup get no stinger and no sound ("nothing I could clip"). The current `Stinger` (`Chronicle.tsx`) is a red text band with a 250 ms slam, and only for CRITICAL world events. |
| F8 | Ruth, `ruth-tablet/004-g2.png` | APPR, STAB, LEGIT, CAP, TENS in tiny letters. Code: 50 declarations of 9 to 11.5 px text in `wc.css` and scene CSS; small caps labels across the HUD, nav heads and debrief kickers. |
| F9 | Sam, `sam-desktop/002-map.png` | Map labels collide with pins around the UK, Lebanon and Afghanistan: pins are DOM markers (`mapMarkers.ts`), labels are a MapLibre symbol layer (`MapView.tsx` `country-labels`), so collision detection cannot see the pins. |
| F10 | All visual scores 7 to 8, feels-like-a-game 5 to 7 | The art is good (title, globe, scenes, newspaper); the interaction layer around it is flat. |
| F11 | Freezes in iteration 0 (machine load) | Not the root cause, but there are 178 `infinite` CSS animations in scene art, every rendered scene loops whether visible or not, and the danger vignette pulses forever. Weak laptops and phones pay for this. |

---

## 2. The language in one page

1. **Objects, not widgets.** A decision option or an order is a **briefing card** you play. Political capital is a **wax seal** you place on an order. A crisis is the **stage**. A choice is **stamped**. The month is **executed** with a big physical button and the existing turn stamp.
2. **Every input answers within 100 ms**, on `pointerdown`, before any network. The server preview fills in later.
3. **Four motion verbs only**: lift (hover), sink (press), stamp (commit), fly (move a thing to where it now lives). Plus one big verb per month: the stinger.
4. **Sound is optional, synthesized, short and on by default with a visible mute.** It confirms; it never narrates.
5. **The picture always agrees with the outcome.** The scene you see on a card is the scene you get back in the debrief, lit by the result.
6. **Readable by a 70-year-old on a tablet.** 13 px floor, full words, no small caps in primary UI.
7. **Still when idle.** Nothing loops when the player is not doing anything or cannot see it.

---

## 3. Briefing cards (decision options and orders)

Concept: `concepts/feel-cards.html`, `feel-cards-1440.png`. One visual shell, `CardShell`, used by:
- crisis and meeting options (the Your move card in `design-month.md` 3.4 renders its options as `CardShell` in the `tile` layout),
- order cards (`OrderCard` in `design-orders.md` 4.2 renders inside `CardShell`, variants `tile`, `row`, `slot`),
- staff suggestions and search hits (`row`).

### 3.1 Anatomy (tile)
```
+--------------------------------------+  radius 14, 1px --line-2 edge, paper gradient
| [1]                    (seal)(seal)  |  illustration band 112-118 px (96 at 1024):
|      scene thumbnail of THIS option  |  the scene kind this option will play as
| ! Risks your mission: Yemen ceasefire|  mission ribbon (red) or helps tag, one at most
+--------------------------------------+
| Back channel via Muscat              |  title 19 px / 680, wraps to 2 lines, never ellipsis
| Talk to the men who just bombed ...  |  description 15 px, 2-line clamp (hidden at 1024)
| [Approval down a lot] [Yemen's view  |  two key effects in words (design-month 3.4)
|  of you up a lot] [+2 more]          |  "+n more" opens the full effect list
| (FM) Backed by the Foreign Minister  |  13 px
+--------------------------------------+
   4 px "thickness" shadow underneath (box-shadow 0 4px 0 #070a10)
```
- Keyboard digit chip top left (1, 2, 3), cost top right: seals (section 4) or the word "free".
- Badges follow `design-month.md`: a paper tag clipped to the top edge reads **Cabinet pick**; the stamp after a choice reads **YOUR PICK** (player changed it) or **APPROVED** (cabinet pick approved, steel ink). The words "Your call" and "Staff pick" retire.
- `row` layout (phone and lists): illustration 108 px square on the left, body on the right, same states. `slot` layout (rail plan): 54x38 thumbnail, title, mini stamp or seals, Undo.

### 3.2 States (all reachable on desk, map menu and phone)
| State | Visual | Motion | Sound |
|---|---|---|---|
| Rest | Paper gradient `--card-top` to `--card-bot`, art at 85% saturation, 90% brightness | none | none |
| Hover / focus | Lift 4 px, shadow `0 8px 0` + 18 px blur, edge `#56657c`, art full colour; focus adds the 2 px accent ring | 140 ms `--ease-out` | none (no hover sounds) |
| Pressed | Sink 2 px, scale 0.985, thickness 1 px | 80 ms on `pointerdown` | `tap` |
| Chosen (your pick) | 2 px accent border, warm glow, stamp YOUR PICK lands on the art; sibling cards to 78% opacity (never lower) | stamp from scale 1.8 and -16 deg, 280 ms `--ease-stamp` | `stamp` |
| Approved | Dashed accent border, steel stamp APPROVED | same | `stamp` (Approve all: one per card, 90 ms apart, max 4 sounds) |
| Unavailable | Saturation 35%, art 60% brightness, no lift. A reason box **on the card**: bold first sentence ("Needs 2 seals, you have 1."), fix sentence ("Remove Reform program to free 2."), link "Show me the seals" which calls `pointAt('capital')` (`design-orders.md` 5). Copy comes from the orders availability codes. | none | none |
| Refused on press | The unavailable card shakes; the capital bank shakes in sync and shows red "short" seals for the gap | 260 ms shake, 2 red flashes of 180 ms | `refuse` |
| Queued (order) | A dashed ghost stays in place with "In this month's plan" and Undo, so nothing reflows | thumbnail flies to the plan slot (FLIP), seals fly from the bank (section 4) 420 ms | `stamp`, then `spend` per seal |
| Resolved (debrief) | The same card face reappears in the debrief with a verdict stamp: DONE (good), MIXED (amber), FAILED (red) | 280 ms stamp | `stamp` (first card only) |

Reduced motion: no transforms. Hover, press and choose change border, opacity and the stamp's presence in 120 ms. Shakes become a 2-flash red outline.

### 3.3 Grid and alignment
- Spacing scale 4, 8, 12, 16, 24, 32. Card gutter 16 (desktop), 18 (phone stack). Card inner padding 12/14.
- In a row of cards the illustration bands are a fixed height, so every title starts on the same baseline; cards stretch to equal height (CSS grid `align-items: stretch`); cost chips and key chips sit on the same 10 px inset.
- Option counts: 2 options = 2 columns, max 360 px each, centred. 3 = 3 columns. 4 = 4 columns at >= 1000 px of stage width, else 2x2. Phone: always a vertical stack.

---

## 4. Political capital as a seal

Concept: `concepts/feel-seal.html`, `feel-seal-1440.png`; live in `feel-cards.html`.

- **One object**: a 16-lobe wax seal with a pressed ring and the embossed ◆ (so the text form "◆ 2" in copy and the seal read as the same thing). One SVG `<symbol>`, five variants: **full** (can still be spent), **imprint** (dashed ring left in the bank where a seal now sits on an order), **short** (red dashed ring with "!", shown only while a card needing more is hovered or refused), **new** (minted with a shine sweep), **broken** (cracks at Execute).
- **One rule everywhere**: a full seal is one you can still spend. This matches `design-orders.md`'s `CapitalMeter` (filled = left, hatched = held, dotted = next refill): `CapitalMeter` draws its units with `CapitalSeal` (full = left, imprint = held, a faint dotted seal outline = next refill).
- **Name**: "Political capital" in every label (HUD, rail, Settings, help). Counts read "1 left" or "1 of 3 left". Refusals read "Needs 2 seals, you have 1." in card copy; the glossary term stays "political capital" with "seal" as the unit noun in sentences. (Coordinate with the orders glossary: if the UX designer prefers "◆ 2" in sentences, the seal still renders and the sentence uses ◆; both are allowed, "credit", "Cap", "CAP" are not.)
- **Sizes**: 18 inline in text, 24 HUD and card cost, 38 rail bank, 56 onboarding and end screen.
- **Where**: HUD (24 px x up to 6, then "1 left"), rail bank (38 px, with the sentence "2 seals are on Reform program. Remove it to get them back. Next month you get 2 more (up to 6)."), card cost chip, map menu row cost, phone command bar (22 px), Execute stamp (seals on orders crack), end screen (seals spent per month as a strip, for the reveal).
- **Motion**:
  - Spend (queue an order that costs n): for each seal, 80 ms after the press the rightmost full seal in the bank turns into an imprint and a flying copy travels on a quadratic arc peaking 60 px above the straight line to the order's cost slot in the plan (420 ms, `cubic-bezier(.34, 1.3, .64, 1)`, scale 1 to 1.25 to 0.62, rotate 20 deg); on landing it plays `spend`. The HUD copy also turns into an imprint at the same moment (no second flight).
  - Refund (Undo or remove): the reverse path, `refund` sound.
  - Mint (monthly refill shown on the first desk frame of a month, or a crisis option giving +1): pop from 0.2 with a 500 ms shine, `refund` sound. At most one mint animation per seal, never looping.
  - Execute: the seals on orders crack inside the existing 1.5 s turn stamp (`App.tsx` `TurnStamp`), no extra time.
  - Reduced motion: no flight; the seal crossfades to an imprint in 120 ms and the count text flashes accent once.

---

## 5. The desk stage (composition per breakpoint)

Concept: `concepts/feel-desk.html` (`feel-desk-1440.png`, `-1024.png`, `-390.png`, `-scrolled-390.png`). This is the composition that both `design-month.md` views (Focus and Full desk) sit in: the Your move card is the hero plus its option cards; the goal line from `design-month.md` 3.3 sits above the stage.

### 5.1 Rules
1. **The crisis is the stage.** The scene renders full width of the centre column, as large as the column allows: the centre column is a CSS grid `[goal line 48] [hero minmax(240px, 1fr)] [staff line auto] [cards auto] [item nav auto]`; the hero takes all leftover height (max 52vh). There is no empty band under the cards at any viewport from 1024x700 up.
2. **Situation text lives in the hero's lower third** (serif 16 px, 2 to 3 lines; the lede from `design-month.md` with "More"). The kicker reads "YOUR MOVE · URGENT CRISIS". On phone the text sits right under the hero.
3. **Cards overlap the stage.** The staff line (advisor avatar, one-sentence quote, "Ask your staff") sits on the hero's bottom edge; the card row starts 14 px below. Cards cast shadows onto the stage: they read as objects on a table, not boxes in a list.
4. **No layout jumps.** Anything that comes and goes is an overlay or occupies a reserved slot: the coach bubble (`design-month.md` 4.2) floats over the hero's top right; warnings render inside the card (reason box) or as `pointAt` rings; queued orders leave a ghost. Closing any of them moves no other element.
5. **One hero per screen.** Meetings use the same stage (summit or interview scene as hero, options as cards). The order catalog uses the same stage with a static header scene for the selected family and a card grid of `OrderCard tile`s.
6. **Rail as a command table.** Map thumbnail 150 px, the seal bank, two meters in words (Orders "1 of 6", In person "0 of 3 meetings"), "This month you will" as `slot` cards with stamps and seals, empty slots as dashed outlines ("Empty order slot (4 more this month)"), then Approve and the **Execute the month** button: 64 px tall, gradient accent, 5 px bottom edge that collapses on press (80 ms), the turn stamp follows.

### 5.2 Per breakpoint
| | 1440 x 900 | 1024 x 768 (and 1440 at 125% zoom) | 390 x 844 |
|---|---|---|---|
| Columns | Navigator 264 / stage fluid / rail 360 | Stage fluid / rail 320; the navigator becomes a row of filing tabs at the top of the stage (44 px, horizontally scrollable, current tab with a coloured left edge and state dot) | One column; filing tabs strip under the HUD; rail becomes the bottom command bar |
| HUD | All seven indicators with full labels (13 px sentence case labels, 18 px values), seals, Map/Desk switch, sound toggle (44 px), menu | Approval, Stability, Political capital; others behind the score sheet / More | Row 1: leader and sound toggle; row 2: Approval, Stability, Political capital (seals + "1 left") and a 44 px "More" that expands all indicators. Max 96 px tall (month spec). |
| Hero | Full stage width, about 330 to 380 px tall, lower third with lede | Full stage width, min 200 px, lede clamped to 2 lines | Full bleed 16:9 (236 px), title in the lower third, lede below |
| Cards | 3 across, illustration band 118 px, description visible | 3 across, band 96 px, description hidden, two effect chips | Vertical stack of `row` cards (108 px art left), 18 px gap, min 150 px tall |
| Execute | Rail bottom, 64 px | Rail bottom, 64 px | Fixed command bar, 76 px: seals + "This month: 2 decided" (opens the plan sheet) and "Execute the month" (56 px); content reserves the bar's height |

The current stack breakpoint (`max-width: 1099px` in `wc.css`) moves to 900 px so 1024 tablets keep the rail (Ruth).

---

## 6. Motion and sound language

### 6.1 Motion tokens (new `ui/src/styles/feel.css`)
| Token | Value | Use |
|---|---|---|
| `--dur-press` | 80 ms | press, Execute depress |
| `--dur-quick` | 140 ms | hover, focus, toggles, tab switch |
| `--dur-move` | 280 ms | stamp, choose, sheet open |
| `--dur-travel` | 420 ms | seal flight, card to plan, stinger settle |
| `--dur-page` | 360 ms | debrief page slide, chronicle open |
| `--dur-scene` | 600 ms | scene crossfade when the focused desk item changes |
| `--dur-stinger` | 2400 ms (2800 nuclear) | big moments |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` (exists) | entrances, lifts |
| `--ease-stamp` | `cubic-bezier(.2, 1.6, .4, 1)` (exists in `ts-stamp`) | stamps, slams |
| `--ease-back` | `cubic-bezier(.34, 1.56, .64, 1)` | landings, seal arrival |
| `--ease-in` | `cubic-bezier(.5, 0, .75, 0)` | exits (exits run at 0.7x the enter duration) |

Rules: animate only `transform` and `opacity` (and `filter` on a single focused element); FLIP for anything that changes place; never animate layout properties; at most one overshoot per interaction; nothing blocks input except the 1.5 s turn stamp and a skippable stinger.

### 6.2 Interaction map
| Interaction | Motion | Sound |
|---|---|---|
| Card hover / focus | lift | none |
| Card press | sink | `tap` |
| Choose option | stamp YOUR PICK | `stamp` |
| Approve cabinet picks | stamps in sequence, 90 ms apart | `stamp` x up to 4 |
| Queue order | thumbnail to plan + seal flight | `stamp`, `spend` per seal |
| Remove / Undo | reverse flight | `refund` |
| Refused | card and bank shake, short seals flash | `refuse` |
| Tab, filing tab, debrief page | 140 ms underline slide; pages 360 ms slide | `page` (debrief pages only) |
| Map menu open / close | 180 ms scale from the pin (0.92 to 1) and fade; close reverses | `tap` on open |
| Execute | button depress 4 px, then turn stamp (exists) with seals cracking | `execute` |
| Debrief outcome card enters | card rises 12 px and fades, 280 ms, 60 ms stagger; verdict stamp | `stamp` on the first card |
| Big moment | stinger (section 6.4) | per moment |

### 6.3 Sound
- Engine: `ui/src/lib/sound.ts`, ported from `concepts/feel-sound.js`. WebAudio only: oscillators, filtered noise from a deterministic LCG (no `Math.random`), one master gain (0.55) into a compressor (threshold -18 dB, ratio 4). No asset files.
- Lifecycle: the `AudioContext` is created on the first user gesture that plays a sound, never at load; suspended after 30 s without sound; resumed on the next sound.
- Default **on**, with a **visible mute toggle in the HUD** (speaker icon, 44 px, `aria-pressed`, label "Sound on, press to mute") and a Sound section in Settings (toggle and volume slider 0 to 100, default 55). Persisted in `localStorage['worldconflict.sound']`. Muted means no `AudioContext` is created at all.
- Recipes (all under 150 ms for UI, 1.2 to 2.8 s for stingers): `tap`, `stamp` (110 to 48 Hz thump + low-passed noise), `spend` (triangle 560 to 380 Hz "tok"), `refund` (two rising notes), `refuse` (two low filtered square buzzes), `page` (noise sweep 600 to 3200 Hz), `execute` (paper slide + drum), `war`, `nuclear`, `coup`, `peace`, `mission` (section 6.4).
- Mixing rules: never more than 4 UI sounds in 500 ms (drop extras); stingers duck UI sounds; no sound on hover, scroll or idle; no music bed in this iteration.

### 6.4 Big-moment stingers (C8)
Concept: `concepts/feel-stingers.html`.

Common structure (2.4 s, skippable from frame 0 by any tap, click or key; `role="alert"` with the title as text):
1. **Hit (0 to 120 ms)**: the desk dims and takes the moment's colour wash.
2. **Slam (120 to 400 ms)**: the moment's scene full bleed (`SceneFrame size="full"`, `live`), the title band slams in (`--ease-stamp`), 6 px screen shake for war, nuclear and coup only.
3. **Reveal (400 to 1600 ms)**: who and when ("SAUDI ARABIA AGAINST YEMEN · MONTH 4") and one number that ticks (world tension, a relation, stars).
4. **Settle (1600 to 2400 ms)**: the whole frame shrinks into the card that tells the story (the result card or debrief highlight) with a FLIP, so the player is never stranded on a blank screen.

| Moment | Trigger (client-side first, engine field later) | Colour | Scene | Sound | Priority |
|---|---|---|---|---|---|
| Nuclear | a resolved NUCLEAR_STRIKE by anyone, or the player reaching TESTED | `--nuke` on near black; one white flash band at 60% max luminance change, never repeated (photosensitivity) | nuclear | sub boom 46 to 28 Hz, falling rumble, two faint sirens | 1 |
| War declared | a new war involving the player (declared by, on, or via a pact); `report.moments` "UNDER ATTACK" | `--war` | address (declarer) or deployment (defender) | drum + brass drone + second hit | 2 |
| Coup | `report.moments` "REGIME CHANGE" or game over by coup | `--intel` | covert abroad, cabinet or streets at home | accelerating snare, one low hit | 3 |
| Peace | `report.moments` "PEACEMAKER" or a player war with `ended` | gold key light, `--good` | signing or ceasefire (no shake, band rises instead of slams) | C major swell + bell | 4 |
| Mission complete | game over with a win, or the objective status flips to met | `--accent`, the turn-stamp motion scaled up | flag (home colours) | arpeggio + bell + stamp | 5 |

Rules: at most one stinger per Execute (highest priority; the rest become the debrief highlight and the newspaper headline); never two months in a row for the same moment kind unless it is nuclear; mission complete hands off to the end-of-game reveal (`design-reveal.md`) instead of the debrief; deposition (election loss, assassination) uses the coup frame with its own title and hands off to the end screen. Haptics on phones: `navigator.vibrate` 40/60/80 ms (war), 200 ms (nuclear), none otherwise, only when sound is on. Reduced motion: no shake, no flash, no scale; the scene and band fade in and out; sound still plays unless muted. The existing `Stinger` and its CRITICAL-event trigger are kept as the fallback for world events that are not one of the five moments (rendered in the new style, smaller, 1.6 s).

---

## 7. Art-to-outcome consistency rules (scenes)

The contract for `ui/src/scenes/kinds.ts`, `ui/src/lib/debrief.ts`, `ui/src/scenes/OutcomeCard.tsx` and the card thumbnails.

- **R1 The picture follows the choice, not the crisis.** New `sceneForChoice(templateId, title, optionLabel, optionEffects?)`: (a) an explicit optional `scene` on the crisis option (data, `src/core/crises.ts` templates and `data/flashpoints/*.json` scripted crises) wins; (b) otherwise keywords on the option label (`OPTION_KEYWORDS`, checked before crisis keywords): back channel, talks, envoy, mediate, ceasefire, truce => ceasefire; call, visit, summit, court => summit; strike, bomb, air => airstrike; troops, deploy, mobilize, border => deployment; address, speech, rally the nation => address; sanction, UN, resolution => un_vote; spy, covert, sabotage, back a coup, arm => covert; crackdown, police, curfew => streets; reform, decree, order => exec_order; aid, visit the victims, field => field_visit; pact, treaty, sign => signing; (c) otherwise `sceneForCrisis`. Desk option thumbnails and debrief decision cards both call `sceneForChoice`, so the card you played is the picture you get back.
- **R2 Mood follows the verdict.** `good` verdict => mood `good`; `bad` or failed => mood `bad`; else `neutral`. Never `good` mood on a failed item.
- **R3 Celebratory scenes never illustrate a failure.** If the item failed (`ok === false`) or its verdict is `bad`, swap: summit, signing, ceasefire => press (cold light, mood bad); exec_order => parliament; un_vote stays (the vote board shows the loss). Military scenes stay military.
- **R4 Families do not cross.** A diplomacy or domestic option or order never renders airstrike, deployment, war_room or nuclear; a military order never renders summit or signing. Enforced by a test over the option keyword table and `ACTION_SCENES`.
- **R5 One card, one verdict.** In a merged country card (`countryCard()`), if any of the player's own items failed: the lead becomes the failed own order (its scene, R3 swap), the verdict is `mixed` (if the relation still improved) or `bad`, the glyph is the amber dash or red cross, and the headline names the failure first ("Ceasefire offer rejected; al-Houthi keeps the line open"). A green check never sits on a card that lists a "(failed)" line.
- **R6 Verdict stamps reuse the stamp.** OutcomeCard shows DONE (good), MIXED (amber), FAILED (red) as the same stamp component that marks a choice, landing once as the card enters. Existing `SceneFrame` `verdict` prop is used for full-size scenes.
- **R7 No repeat backdrop.** A crisis must not reuse the previous month's crisis scene kind unless it is a follow-up (this is `design-month.md` R1; the mapping lives here). The assassination attempt gets its own mapping (cabinet with mood bad) instead of the refugee field visit.

---

## 8. Legibility and performance rules

### 8.1 Legibility (older players, tablets, 125% zoom)
1. Minimum computed font size 13 px for any text in the game UI (scene SVG art and the 3-letter channel bug excepted). Body 15 px; situation and lede 16 px (17 on phone); card titles 19 px; HUD values 18 px; HUD labels 13 px semibold sentence case.
2. No small caps or letter-spaced uppercase labels under 15 px in primary UI. Stamps, the kicker band and the channel bug are the only uppercase elements.
3. No abbreviations in primary UI: APPR, STAB, LEGIT, CAP, TENS, GDP, "mo", "def", "PC" are banned; "1/4" alone is banned (month spec). Numbers keep units ("$1.24T", "64%", "1 of 6").
4. Contrast: body text >= 7:1 on its surface (`--text-1`, `--text-2`), meta >= 4.5:1 (`--text-3` as today), effect chip text >= 4.5:1 on its tint. Colour never carries meaning alone: effects say "up" or "down", verdicts have a glyph and a word, seals differ by shape (full, dashed, red "!").
5. Touch targets >= 44 x 44 px everywhere at 390 and 1024; primary actions on phone >= 56 px tall.
6. Card titles and primary labels never ellipsize; navigator rows may, with the full title in `aria-label`.
7. The desk passes at 1024x768 at 125% zoom (it falls into the 1024 layout, section 5.2).

### 8.2 Performance budget for animation
1. **Nothing loops while idle.** Scene loops run only on the one hero scene in focus and on a `live` debrief card. After 15 s with no pointer, key or scroll input, all scene loops pause (`animation-play-state: paused` via a `.wc-idle` class on `<html>`); any input resumes.
2. **Off-screen and hidden is paused.** `SceneFrame` uses an `IntersectionObserver` (threshold 0.3) and `document.visibilityState`; scenes outside the viewport, thumbnails (`size="thumb"`), card illustrations and anything under an open modal are paused. A global rule in `scenes.css`: `.scene:not(.is-playing) .art * { animation-play-state: paused; }` covers all 20 art files without editing them.
3. **No infinite UI animations.** The danger vignette (`wc.css` `.vignette`, `heartbeat`) pulses 3 times then holds; the map marker glows (`wcm-*`) pause in Desk mode and when the map is hidden; the ticker scrolls only while visible.
4. **The globe sleeps when covered.** In Desk mode and under full-screen overlays, `MapView` stops requesting frames (MapLibre `map.stop()` plus skipping marker updates) and resumes on show.
5. Budget numbers (QA, section 10): idle desk at 1440 for 10 s uses < 0.5 s of main-thread task time; at most 2 elements with running scene animations at any time; every interaction's first visual change < 100 ms after input on a mid laptop; a stinger holds 55+ fps on desktop (one composited layer, no `backdrop-filter` on moving layers, no box-shadow animation on more than one element).
6. Sound: no `AudioContext` until a sound plays; suspended after 30 s of silence.

### 8.3 Map labels (F9)
For countries that carry a DOM pin, the label layer reserves the pin's space: add a symbol layer of invisible icons at pin anchors (`icon-allow-overlap: true`, `icon-ignore-placement: false`, size matching the pin) placed before `country-labels`, and give `country-labels` `text-variable-anchor: ['top', 'bottom', 'left', 'right']` with `text-radial-offset: 1.2`, so MapLibre places labels around pins or drops them. Labels for pinned countries also appear in the pin's tooltip, so nothing is lost.

### 8.4 Debrief fill (Leo F7)
Every debrief page fills the viewport: page 1's highlight uses a hero scene (clamp 320 to 460 px tall at 1440), stat tiles under it, "Also this month" cards fill the remaining width; a page with fewer than 3 cards uses larger scenes rather than leaving space. Coordinate with `design-month.md` WP-H, which owns `MonthDebrief.tsx` and `debrief.css`: this is a rule for that package, not a separate change.

---

## 9. Components, engine needs, and build plan

### 9.1 New shared primitives (owned here, consumed by orders and month packages)
- `ui/src/styles/feel.css`: tokens from 6.1, type scale (`--fs-meta 13px`, `--fs-body 15px`, `--fs-lead 16px`, `--fs-card 19px`), card surfaces (`--card-top`, `--card-bot`, `--card-edge`), seal colours, the four motion verbs as utility classes (`.wc-lift`, `.wc-sink`, `.wc-stamp-in`, `.wc-shake`) with reduced-motion fallbacks. Imported once from `ui/src/main.tsx`. Kept out of `wc.css` so the reveal package's token block and the orders deletions do not conflict.
- `ui/src/components/game/CardShell.tsx`: `{ layout: 'tile' | 'row' | 'slot'; art?: SceneKind; home?; other?; mood?; keyHint?; cost?: ReactNode; tag?: 'cabinet' | 'best'; ribbon?: { tone: 'risk' | 'help'; text }; state: 'rest' | 'chosen' | 'approved' | 'unavailable' | 'queued' | 'resolved'; stamp?: 'YOUR PICK' | 'APPROVED' | 'ORDERED' | 'DONE' | 'MIXED' | 'FAILED'; reason?: { title; fix?; point? }; onPress; children }`. Renders the illustration with `SceneFrame size="thumb"` (paused, rule 8.2), handles pointerdown sink, plays `tap`/`stamp`/`refuse`, exposes `data-card-id` for flights.
- `ui/src/components/game/Stamp.tsx`: the stamp (accent, steel, good, amber, red inks), used by cards, OutcomeCard, the result card and Execute.
- `ui/src/components/game/CapitalSeal.tsx`: `CapitalSeal { variant: 'full' | 'imprint' | 'short' | 'new' | 'broken'; size }` and `CapitalSeals { left; held; short?; nextRefill?; size }`. (Named to avoid collision with the reveal package's achievement `reveal/Seal.tsx`.)
- `ui/src/components/game/SealFlight.tsx` + `ui/src/lib/motion.ts`: `flyBetween(fromEl, toEl, { node, duration, arc })` (Web Animations API, portal layer, reduced-motion aware), `prefersReducedMotion()`, `useIdle(15000)` (sets `.wc-idle`).
- `ui/src/lib/sound.ts` + `ui/src/components/game/SoundToggle.tsx`.
- `ui/src/components/BigMoment.tsx` + `ui/src/styles/bigmoment.css` + `ui/src/lib/moments.ts` (`bigMomentFor(report, world, prevWorld)` returning `{ kind, title, line, stat?, scene, home, other } | null`).

### 9.2 Engine and API needs
- None required to ship. Stingers derive client-side from existing report fields (`report.moments`, `report.wars[].ended`, `gameOver`, `objectiveStatus`, world events with type NUCLEAR) plus a comparison with the previous world state for new wars and nuclear status.
- Optional, later (FEEL-5): `report.bigMoments: Array<{ kind: 'WAR_DECLARED' | 'NUCLEAR' | 'COUP' | 'PEACE' | 'MISSION_COMPLETE' | 'DEPOSED'; actor: string; target?: string; stat?: { label: string; before: number; after: number } }>` written in `turn.ts` next to the existing `report.moments.push` sites (pure, deterministic; run `tests/core/determinism.spec.ts`). `moments.ts` prefers it when present.
- Optional data: `scene?: SceneKind` on crisis options in `src/core/crises.ts` templates and scripted flashpoint crises (validated as an optional string by `FlashpointSchema`), for R1(a). Content consultant fills it for the 8 flashpoints' scripted crises.

### 9.3 Work packages
Coordination with sibling specs: `Hud.tsx`, `CommandRail.tsx` and `useExecute.ts` are owned by orders WP5; `Detail.tsx`, `MapActionMenu.tsx` by orders WP6 and month WP-E; `Desk.tsx` by month WP-E; `Navigator.tsx` by month WP-D; `MonthDebrief.tsx`, `debrief.css`, `Chronicle.tsx` by month WP-H; `gameStore.ts` by orders WP4 and month WP-0; `wc.css` tokens block by reveal WP9 and `.mam-item` rules by orders WP6. The FEEL packages below never edit those files; where a FEEL primitive must be mounted in one of them, the owning package does it (listed as "adopted by").

| WP | Scope | Files (owned) | Depends on | Adopted by |
|---|---|---|---|---|
| **FEEL-1 Foundation** | Tokens, type scale, motion utilities, reduced-motion fallbacks; `lib/motion.ts` (`flyBetween`, `prefersReducedMotion`, `useIdle`); `lib/sound.ts` (port of `feel-sound.js`, mute persistence, lazy context, rate limit); `SoundToggle`; Settings Sound section (toggle + volume) | new `ui/src/styles/feel.css`, new `ui/src/lib/motion.ts`, new `ui/src/lib/sound.ts`, new `ui/src/components/game/SoundToggle.tsx`, `ui/src/components/SettingsModal.tsx` (new Sound section only; month WP-G adds a different line), `ui/src/main.tsx` (one import line) | none | orders WP5 mounts `SoundToggle` in the HUD |
| **FEEL-2 Game primitives** | `CardShell` (3 layouts, all states of 3.2), `Stamp`, `CapitalSeal(s)`, `SealFlight`; dev gallery section "Feel" on the existing `#scenes` gallery showing every state for QA screenshots | new `ui/src/components/game/CardShell.tsx`, `Stamp.tsx`, `CapitalSeal.tsx`, `SealFlight.tsx`, new `ui/src/styles/game.css`, `ui/src/scenes/Gallery.tsx` | FEEL-1 | orders WP4 (`OrderCard` renders in `CardShell`), orders WP5 (`CapitalMeter` draws `CapitalSeals`; tray slots are `slot` cards), month WP-E (Your move options are `CardShell` tiles), month WP-H (result card uses `Stamp`) |
| **FEEL-3 Desk stage** | The composition of section 5: new layout component `DeskStage` (slots: goal, hero, staff, cards, nav) and its CSS; move the desk layout rules out of `wc.css` (the block from `.desk-screen` to the end of the desk media queries) into `desk-stage.css`; stack breakpoint 1099 to 900; filing tabs styles; command bar (phone) and Execute button styles; coach overlay slot positioned over the hero | new `ui/src/components/desk/DeskStage.tsx`, new `ui/src/styles/desk-stage.css`, `ui/src/styles/wc.css` (delete the moved desk layout block only) | FEEL-1 | month WP-E wraps Focus and Full desk content in `DeskStage`; month WP-D renders the navigator rows with the filing tab classes; orders WP5 applies the Execute and bank classes in `CommandRail` |
| **FEEL-4 Big moments** | `BigMoment` stinger (5 moments + deposed, priority, once per Execute, skip, settle FLIP, haptics, reduced motion); `moments.ts` client derivation; restyle of the fallback world-event stinger; `execute` sound and seal crack in the turn stamp | new `ui/src/components/BigMoment.tsx`, new `ui/src/styles/bigmoment.css`, new `ui/src/lib/moments.ts`, `ui/src/App.tsx` (mount `BigMoment` next to `TurnStamp`, swap the `Stinger` import; coordinate the one-line overlap with orders WP5's toast edit) | FEEL-1, FEEL-2 (`Stamp`) | month WP-H: the result card is the settle target (`data-settle="result"`) |
| **FEEL-5 Engine moments (optional)** | `report.bigMoments` structured field, schema, determinism | `src/core/turn.ts` (only at the existing `moments.push` sites and the war start), `src/core/types.ts` (report schema field), new `tests/core/big-moments.spec.ts`; mirrored type in `gameStore.ts` via month WP-0's type block | none; merge after month WP-C and reveal WP1 touch `turn.ts` | FEEL-4 |
| **FEEL-6 Art-to-outcome** | R1 to R7: `sceneForChoice`, option keyword table, failure swap, family guard, assassination mapping, previous-scene guard; `debrief.ts` decision scene by choice, mood by verdict, R5 lead and verdict rules; `OutcomeCard` verdict stamp and mood; unit test of the mapping | `ui/src/scenes/kinds.ts`, `ui/src/lib/debrief.ts` (`decisionScene`, `decisionCard`, `orderCard`, `countryCard`, `verdictOf` only), `ui/src/scenes/OutcomeCard.tsx`, new `tests/ui/kinds.spec.ts` (imports `ui/src/scenes/kinds.ts`, which has no dependencies) | FEEL-2 (`Stamp`) | month WP-I folds its R1 mapping into this package and edits only the page assembly in `debrief.ts`; merge FEEL-6 first. Desk thumbnails call `sceneForChoice` (month WP-E) |
| **FEEL-7 Performance** | Scene play/pause (IntersectionObserver, visibility, idle, thumbs static), global pause rule, finite danger vignette, map sleeps in Desk mode, map label collision (8.3) | `ui/src/scenes/SceneFrame.tsx`, `ui/src/scenes/scenes.css`, `ui/src/components/MapView.tsx`, `ui/src/components/mapMarkers.ts`, `ui/src/styles/wc.css` (the `.vignette` and `wcm-*` rules only) | FEEL-1 (`useIdle`) | none |
| **FEEL-8 Legibility sweep** | 13 px floor and no small caps across remaining CSS, after the other packages merge; full-word labels audit; contrast fixes | `ui/src/styles/wc.css` (non-desk, non-token rules), `ui/src/scenes/art/*.css` (text sizes only), `ui/src/App.css` | runs last, after FEEL-3, orders WP5/WP6, month WP-E/WP-H | none |
| **FEEL-9 QA scenario** | Playwright scenario for the acceptance criteria at 390/1024/1440 with screenshots and the visual QA checklist (section 11), plus the CPU idle check | new `devloop/instances/world-conflict/scenarios/feel.mjs` | FEEL-2 to FEEL-7 | QA engineer |

Merge order: FEEL-1, then FEEL-2 and FEEL-7 (parallel), then FEEL-3, FEEL-4 and FEEL-6 (parallel), then the adopting orders and month packages, then FEEL-8 and FEEL-9. FEEL-5 whenever `turn.ts` is quiet.

---

## 10. Acceptance criteria (numbered, observable)

Stage
1. On the desk at 1440x900, 1024x768 and 390x844, the focused crisis scene spans the full width of the stage column (phone: full viewport width) and is at least 200 px tall (236 px on phone).
2. At 1440x900 and 1024x768 the vertical gap between the bottom of the item navigation row and the bottom of the stage column is at most 48 px (no dead space).
3. Dismissing the coach bubble or any hint changes no option card's bounding box by more than 1 px (Playwright boxes before and after).
4. The page has no horizontal scroll at 390 px (`document.documentElement.scrollWidth === 390`).

Cards
5. Every crisis option, meeting option and order on the desk renders as a card with an illustration (`[data-card] .scene` present) and a title that is never ellipsized (`scrollWidth <= clientWidth` on the title, wrapping allowed).
6. Within 100 ms of `pointerdown` on an available card, its computed `transform` differs from rest (reduced motion off).
7. Choosing an option shows a stamp with the text "YOUR PICK"; "Approve cabinet pick" shows "APPROVED" on that card; the plan slot shows the same word.
8. An unavailable card shows its reason as visible text inside the card (not only a `title` attribute) with a fix sentence when one exists; pressing it shakes the card and the capital bank (both get the shake class within 100 ms) and adds no order.
9. Queuing an order leaves a dashed ghost in place with an Undo control; Undo restores the card and the seals.

Political capital
10. The HUD, the rail bank, every card cost, the map menu rows and the phone command bar render `CapitalSeal` elements; the number of `full` seals in the HUD equals the capital left shown in text.
11. The label "Political capital" appears in the HUD (1024 and 1440) and the rail; the strings "credit", "Cap ", "CAP", "APPR", "STAB", "LEGIT", "TENS" do not appear in visible text on the desk at any width.
12. Queuing an order that costs 1: within 500 ms one HUD and one rail seal become imprints and the plan slot shows 1 full seal; Undo reverses it within 500 ms.

Motion, sound, reduced motion
13. A sound toggle (44x44 px) is in the HUD at all three widths and a Sound section is in Settings; with sound muted, no `AudioContext` is constructed during a full month (instrumented constructor); the setting survives a reload.
14. With sound on, pressing a card, choosing, queuing, refusing and executing each call `sound.play` with `tap`, `stamp`, `spend`, `refuse` and `execute` respectively (spy on the module).
15. With `prefers-reduced-motion: reduce` emulated: no card transform on hover or press, no shake, no stinger flash or scale, no seal flight; stamps, imprints and the stinger text still appear.

Big moments
16. A month in which the player declares war (or is declared on) shows a full-screen element with role "alert" containing "War declared" within 300 ms of the turn result, and it is gone within 2.8 s or immediately on any key or tap.
17. Only one stinger appears per Execute even when several moments occur (force war + peace in a fixture: only war shows; peace is the debrief highlight).
18. Nuclear, coup, peace and mission complete each show their own title ("Nuclear strike", "Regime change", "Ceasefire", "Mission complete") in fixtures; mission complete is followed by the end-of-game sequence, not the debrief.

Art consistency
19. In the debrief (and result card), the scene for a decision whose chosen option label matches a diplomacy keyword (back channel, talks, ceasefire, call) is never airstrike, deployment, war_room or nuclear (test over all crisis templates' options with `tests/ui/kinds.spec.ts`, and a Bab al-Mandab SAU month 1 check: "Back channel via Muscat" shows the ceasefire scene).
20. A card that lists a failed order never shows a green check, a `good` mood scene, or a summit or signing scene.
21. The desk thumbnail of an option and the debrief scene of that decision are the same scene kind.

Legibility and performance
22. No visible text element on desk, map menu, debrief or result card has a computed font size below 13 px (SVG art excluded).
23. All interactive elements are at least 44x44 px at 390 and 1024.
24. After 10 s on the desk at 1440 with no input, the CDP `Performance.getMetrics` `TaskDuration` increases by less than 0.5 s over the next 10 s; `document.getAnimations()` shows no running animations inside `.scene` elements once idle.
25. At most 2 `.scene` elements have running animations at any time (desk with hero + thumbnails; debrief page with 3 cards).
26. At the default globe view no country label's box overlaps a crisis pin's box for the UK, Lebanon and Afghanistan.

---

## 11. Visual QA checklist (run against screenshots at 390, 1024, 1440)

1. One hero per screen, edge to edge of its column; nothing floats in empty space.
2. Card titles start on one baseline across a row; cost chips and digit chips on the same inset; equal card heights.
3. Every card shows a picture that matches its words (no jets on a talk, no handshake on a failure).
4. The chosen card carries a stamp; the plan slot repeats it.
5. Capital looks the same in every place (seals); full seals = number left.
6. No text smaller than the HUD labels (13 px); no APPR, STAB, CAP style labels.
7. No element overlaps another unintentionally (labels on pins, stamps on chips, fixed bars over the last card at the scroll end).
8. The Execute button is the largest, warmest thing in the rail or command bar.
9. Debrief pages are filled; verdict stamp, scene mood and headline agree.
10. Stinger frames: title legible at phone width, scene recognisable at a glance, no flash on reduced motion.

---

## 12. Risks
- Too much motion becomes noise: the four-verb limit and the "no hover sound, no idle loop" rules are the guard. Sam and Ruth both get a reduced-motion run in the panel.
- Sound on by default could annoy in public: the toggle is always visible in the HUD and the first sound is a quiet tap; if panel or real signals object, flip the default to off with a one-time "Turn on sound?" chip (no code change beyond the default).
- Shared primitives across three spec owners can stall: FEEL-1 and FEEL-2 are small and land first; consumers can start against the props in 9.1 with a stub.
- Thumbnails as card art multiply SVG nodes: thumbnails are paused and the desk shows at most 3 to 4 at once; if a weak phone struggles, `CardShell` falls back to a static flat illustration (first frame) via the same pause rule.

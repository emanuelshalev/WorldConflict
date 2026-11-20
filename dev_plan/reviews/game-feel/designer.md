# Game-feel review: main page, month debrief, desk polish

Brief (player, verbatim summary): the main page "looks like a dashboard rather than a game"; the
post-turn consequences are "very boring and not engaging", too many slides, and "it cannot be: you
decided to talk to this leader, outcome you talked to this leader". Group outcomes, fewer pages,
richer and more visual. Structure in-game is fine: iterate, beautify, gamify.

Sources read: screenshots in `before/` (title-1, title-1-full, desk, reel-00, reel-01, chronicle),
`desk-redesign/after/*` and `playtest/*`; code in `TitleScreen.tsx`, `TitleMontage.tsx`,
`OutcomeReel.tsx`, `Chronicle.tsx`, `desk/Detail.tsx`, `kinds.ts`, `OutcomeMap.tsx`, `MapView.tsx`,
`wc.css`, `src/core/turn.ts` (`resolveDecisions`, `finishReport`, `playerHeadline`),
`outcomes.ts`, `meetings.ts`, `crises.ts` (`applyEffects`, `general_strike`), `newspaper.ts`,
`types.ts` (`PlayerTurnReportSchema`). Sketches: `title-concept.svg`, `debrief-concept.svg`.

## 0. What the screenshots actually show (shared diagnosis)

1. Title (`title-1.png`): a centered 1130px column, H1 + paragraph + a 16:9 "trailer" card, then a
   daily banner, then three equal SaaS pricing-style cards with pill chips, then a form row (segmented
   control, text input, CTA). It is a landing page for a product, not the start of a game. The world,
   the thing the game is about, appears only as a 480px video thumbnail.
2. Reel (`reel-00/01.png`): 8 dots = 8 full-screen slides for one month. Each slide is a scene, a
   kicker, the decision title and the option label, plus a "DECIDED" stamp. The crisis slide for
   the general strike shows no numbers even though the option applied `approval +6, growth -0.3`.
   The secure call with Khamenei is staged with the `address` scene (`KIND_SCENE.CALL = 'address'`
   in `Detail.tsx`): the player sits alone at his desk under a "LIVE · ADDRESS" bug. No reply, no
   relation change, no consequence. At 3.6 to 5.6 s per slide that is 35+ s of near-empty content.
3. Chronicle (`chronicle.png`): the lead headline is the option label in caps ("ANSWER TO GENERAL
   STRIKE: MEET THEIR DEMANDS") and the body is `playerHeadline()` joining every decision as
   "Faced with X, President decided Y." Then "Your month" repeats the same list a third time.
   Small bugs: "Iran knows it was us.." (double period), staff meetings you skipped appear as
   decisions ("Let them handle it (you did not attend)").
4. The engine already knows much more than it shows: per-option `effects` maps, `followUp`
   templates with delays, order `facts` with before/after, the AI's `resolvedActions`, war
   `frontline`, hot-zone metrics, relation drift. The report schema simply does not carry most of it
   for decisions (`decisions: {title, choice, templateId}` only).

## 1. The team critiques

### 1.1 Art director (Ines): "Stop building a SaaS. Put the planet on stage."

The title is the clearest tell. Rounded cards with 1px borders, pill chips, a gray paragraph, a
max-width container: this is the visual grammar of a pricing page. The game's real assets are
strong: the MapLibre globe (`projection: { type: 'globe' }` in `MapView.tsx`), 20 illustrated
broadcast scenes, Instrument Serif and Newsreader already loaded. We hide all of it.

- The world is the hero. Full-bleed globe, slow rotation, red pins where fires burn, a lower-third
  ticker. The UI floats on it as diegetic objects: a dossier, a dial, a stamp. No containers.
- Typography with contrast: Instrument Serif caps for names of things (WORLD CONFLICT, crisis
  titles, debrief headlines), Geist Mono for data and dates, Geist for body. Today Geist does
  everything and everything looks equally important.
- Colour: keep amber as the "your hand" colour (CTA, your choices), red only for live danger (pins,
  war, BREAKING), intel cyan for "what to watch". On the title, kill the gray card borders entirely.
- Motion with purpose: camera fly-to when you pick a crisis (1.2 s ease-out), dossier slides in
  (240 ms), side cards stagger (60 ms each), the CTA "stamps" on hover. Everything respects
  `prefers-reduced-motion` (globe stops rotating, no fly-to, crossfade only).
- In the debrief: one scene per page, not per item. Thumbnails for items, a big scene only for the
  month's highlight. A wall of full-screen scenes desensitises: the eighth riot police line means
  nothing.
- The call scene must show two people. Short term: `summit` art with a phone overlay and both
  flags; better (M): a `call` variant in `art/` with split-screen portrait windows.

### 1.2 Narrative designer (Kofi): "Every choice deserves a reply."

"You talked to this leader. Outcome: you talked to this leader." Exactly. A consequence has three
beats: the other side answers, something measurable moves, and a thread is left hanging. Right now
we print the player's own button label back at them.

- Calls and visits come back as a quote from the counterpart, in their voice, keyed by the option
  you chose and the relationship band. Khamenei after "Offer talks": "Words are cheap, Mr President.
  Send your envoy to Muscat and we will listen." After "Hang up": "Then the guns will finish this
  conversation." Two to four variants per (kind, option, band), picked deterministically.
- Crises come back as a voice from the affected group, not the leader: the union boss, the bond
  markets, the anchor, the general. "Meet their demands" -> union leader: "The ports open
  tomorrow. We will be watching the next budget." Plus the measured effect and the scheduled
  follow-up if there is one (break the strike schedules `general_strike` again in 4 months: say so).
- Promises are callbacks. "Promise full support" should be remembered; when that ally calls next
  time, the situation line references it ("In December you promised full support. Now I need it.").
  That is cheap (a list in `director`) and it turns calls into a relationship you play.
- Orders get a reaction from the target when the target actually did something back this month
  (the AI's `resolvedActions` aimed at the player). That is truth, not flavour: "Iran answered:
  two brigades to your border." Only when nothing real happened do we fall back to a template
  keyed by how much their view of you moved.
- The newspaper lead must be one story: a headline written as news ("Trump caves to unions, ports
  reopen"), a lede with numbers, a pull quote from the reaction, one context paragraph
  ("Elsewhere, the president promised Tokyo full support and lunched with Marcos Jr."), and a
  "what next" line. Never a list.
- Unattended meetings are not story. Fold them into a single "Handled by your staff" line.

### 1.3 Game-feel / UX designer (Rui): "Fewer screens, more per screen, always skippable."

Interaction cost today: 8 slides at 3.6 to 5.6 s (or 8 clicks), then a newspaper modal, then a
desk. That is 9 screens to learn "approval +8". Target: 4 screens maximum, under a minute, every
page readable at a glance and jumpable.

- Pages are tabs, not dots: `Highlight | Diplomacy (3) | Home & security (4) | The paper`. Number
  keys 1-4, arrows, Esc to desk. Empty pages are dropped (a quiet month is 2 screens).
- Only the highlight auto-advances (4 s, paused on hover). Dense pages wait for the player: you
  cannot read three cards in 3.6 s, and auto-advance punishes careful readers.
- Each card has the same anatomy so the eye learns it: kicker (country, kind), headline (what
  happened as news), "what you did" line(s) with action icons, quote, 1 to 3 numbers before ->
  after with a coloured delta, one "Watch" line in cyan. Same component for calls, crises, orders.
- Juice where numbers move: count-up (already in `OutcomeReel` as `useCountUp`), a 300 ms green or
  red flash on the delta chip, relation gauges that slide. Keep it under 1.2 s per card, staggered.
- A "Dense view" toggle (persisted per viewer in localStorage) turns each page into a table: one row
  per outcome, all numbers, no art. A "Debrief style" setting: Full / Paper only.
- In-desk feedback on choice: when you pick a meeting option, show the reaction line's tone and the
  relation gauge ticking right there, so the debrief confirms instead of surprises.

### 1.4 Systems designer (Mei): "Make the report carry the truth; the UI only lays it out."

The UI must not invent consequences. Everything on a debrief card comes from fields the engine
writes during `executeTurn`. Today `report.decisions` has `{title, choice, templateId}`; we need
the measured effect, the counterpart, the scheduled follow-up and a deterministic reaction.

New fields (all optional or defaulted in `PlayerTurnReportSchema`, so old saves still validate):

```ts
decisions[i] += {
  kind: 'CRISIS' | 'CALL' | 'VISIT' | 'STAFF' | 'PRESS';
  optionId: string; withCountry?: string; speaker?: string;
  attended: boolean;          // false = deputy handled it, or default option on an ignored crisis
  facts: OrderFact[];         // snapshot() before/after applyEffects, same shape as orders
  reaction?: { who: string; line: string; tone: 'warm' | 'cold' | 'angry' | 'neutral' };
  watch?: string;             // from option.followUp (+ delay), promise logged, or band change
}
orders[i] += { reaction?: {...same}, watch?: string }
relations: Array<{ id: string; before: number; after: number }>;  // their view of you, top 5 |delta|
world: Array<{ actor: string; type: string; target?: string; label: string }>; // AI actions that touch you, max 6
wars: Array<{ vs: string; frontBefore: number; frontAfter: number; casualties: number }>;
hot: Array<{ id: string; metric: string; before: number; after: number; phase: string }>;
tension: { before: number; after: number };
highlight: { ref: 'decision' | 'order' | 'war' | 'world'; index: number };
```

Rules that keep it deterministic and safe:
- Reaction and headline picks never draw from the turn `rng` (that would shift every later roll and
  break balance baselines). Use the `pick(list, seed)` pattern from `outcomes.ts` with
  `seed = hash(world.seed, turn, decisionId, optionId)`. No `Math.random`, no clock.
- "World" items come from `resolvedActions` filtered to: target is the player, an ally, or a
  neighbour; or actor is at war with the player. Priority: war > denounce/sanctions > deployments
  > diplomacy. Max 6. Label via the existing `orderLabel()`.
- Facts for decisions: reuse `snapshot()` with the counterpart as target, then a small
  `effectFacts(effects, before, after)` that maps effect keys to labels (`relations:X` -> "X's view
  of you", `approval`, `stability`, `legitimacy`, `growth` -> "Growth (yr)", `mobilization`,
  `hot:GAZA:aid` -> "Gaza: aid getting through", `pc` -> "Political capital"). Max 3 per decision.
- Watch lines are only stated when the engine knows: a scheduled follow-up (template title + delay),
  a staff topic that recurs (cooldown 2 months in `staffMeeting`), a caller cooldown (3 months), a
  promise logged, a relation crossing a band (-20 hostile, +30 friendly: the thresholds
  `callMeeting` already uses).
- Highlight score: `|approval delta| + |stability delta| + |relation delta|/2 + 10 if war/front
  move >= 5 + 15 if a pact/war/ceasefire happened + 8 if crisis`. Ties broken by order in report.

### 1.5 Players (first read)

**Maya, 24, newcomer from a 30-second trailer.** "The trailer was jets and a globe. Then the page
was a form. I did not know what Flashpoint vs Legacy meant until I read three paragraphs. After my
first month I clicked Next eight times and learned I had decided things I had just decided. I want
to see who got angry at me."

**Henrik, 41, plays Hearts of Iron, Suzerain, Twilight Struggle.** "The desk is fine, I can work it.
The debrief is information-poor and slow: no numbers on crises, nothing on what the AI did to me,
nothing on the front. I want every delta, and I want a table view. And do not fake reactions: if
Iran's quote says they are softening, their numbers had better say so."

## 2. Main page overhaul: "The world tonight"

One concept: the globe is the menu. You pick a fire on the planet, a dossier opens, you pick a side,
you take office. Sketch: `title-concept.svg` (1440x900).

### 2.1 Layout, 1440x900 (no scroll)

```
+--------------------------------------------------------------------------------------+
| WORLD CONFLICT (Instrument Serif)                        [Continue: Iran m3] Saves (o)|
| THE WORLD TONIGHT · 20 NOV 2026 · TENSION 72 (mono)                                  |
| HOW LONG DO YOU HAVE?                                       +----------------------+ |
| ( 15 min | 1 term | Legacy )  <- dial                       | DOSSIER (390px)      | |
| Flashpoint: one crisis, one goal, a verdict.                | [scene card 16:9]    | |
|                  .-~~~~~~-.                                 | Bab al-Mandab Burning| |
|               .'   o  (pin) '.      full-bleed MapLibre     | 2-line hook          | |
|              /  o     *TODAY  \     globe, auto-rotate,     | CHOOSE YOUR SIDE     | |
|             |      o (*sel)    |    red pins = flashpoints  | [KSA  Tough  ●●○] <- | |
|              \   o            /     gold pin = daily        | [YEM  Brutal ●●●]    | |
|               '.          .'        arcs = live wars        | [ARE  Steady ●○○]    | |
|                 '-~~~~~~-'                                  | Story·Normal·Hard    | |
| Pick a fire.                                                | As: MBS (edit)       | |
| Put it out, or don't.                                       | [  TAKE OFFICE  >  ] | |
|                                                             +----------------------+ |
|LIVE| Strikes on Iran enter a second month · Coast guard cutters ring Taiwan · ...    |
+--------------------------------------------------------------------------------------+
```

- Mode dial (top left): three segments, plain words with the time first ("15 min", "1 term",
  "Legacy"), one sentence under it. Changing mode changes what the globe shows:
  - Flashpoint: 8 red pins (one per `data/flashpoints/*`), placed at the midpoint of the playable
    countries' `labelPoint()` from `worldGeo.ts` (no data change needed). The daily is gold with a
    TODAY tag; the dossier opens on it by default.
  - Term / Legacy: the 41 playable countries glow on the globe tinted by difficulty (steady green,
    tough amber, brutal red, low alpha); hover shows name + leader; an era stamp row (1960 · 1990 ·
    2025 · 2026) replaces the crisis pins inside the dossier header, styled as date stamps.
- Picking: click a pin or a country -> globe `flyTo` (1.2 s) and the dossier updates. Keyboard:
  Tab cycles pins, Enter opens. A "List" link in the dossier opens the old grid as an accessible
  fallback.
- Side cards: flag-colour edge, leader portrait circle (flag for now), role line from
  `fp.playable[].role`, difficulty as pips. For Term/Legacy the dossier shows the chosen nation's
  leader card, its 2-line narrative and three "you inherit" facts from the scenario (war, rival,
  approval) instead of side cards.
- Difficulty and leader name collapse into one quiet line under the cards; the name field opens
  inline on "edit". Default is the real leader.
- Continue is the primary CTA top-right when a save exists (amber); Take office is amber in the
  dossier. Only one amber button visible at a time: when a save exists the dossier CTA is outline
  until the player touches the dossier.
- Copy: "Pick a fire. Put it out, or don't." replaces "Lead your nation. Face the consequences."
  The three paragraphs of mode pitch become one sentence under the dial.

### 2.2 Layout, 390x844

```
+------------------------------+
| WORLD CONFLICT   [Continue]  |
| ( 15 min | 1 term | Legacy ) |
|        .-~~~~~~-.            |  globe 46% height, touch rotate,
|      /  o  *  o  \           |  pins tappable (44px hit areas)
|      \   o    o  /           |
|        '-~~~~~~-'            |
|LIVE| ticker                  |
| [<] Bab al-Mandab [>] swipe  |  crisis carousel = the pins as cards
| [scene card]  2-line hook    |  (bottom sheet, drag up to expand)
| KSA ●●○ | YEM ●●● | ARE ●○○  |  sides as a 3-up segmented row
| Normal ▾        As: MBS ✎    |
| [      TAKE OFFICE  >      ] |  sticky, safe-area padded
+------------------------------+
```

### 2.3 Build notes

- New `ui/src/components/TitleGlobe.tsx`: a stripped MapLibre instance with the same style source
  as `MapView.tsx` (globe projection, ocean, `world.geojson` land, no labels, no interaction except
  pin clicks and drag), `setInterval` bearing rotation paused on hover. Lazy-mounted after first
  paint; on WebGL failure or `prefers-reduced-motion`, fall back to the 2D `OutcomeMap` projection
  (`worldGeo.ts`) as a static SVG with the same pins.
- `TitleMontage` stays: it becomes the scene card at the top of the dossier, fed the selected
  flashpoint's key scene (`sceneForCrisis` of its first scripted crisis) instead of a fixed loop.
- `TitleScreen.tsx` keeps all state and `startGame` wiring; only the JSX and a new `title.css`
  change. No server change.

## 3. Post-turn redesign: the Month Debrief

Replaces `OutcomeReel` (one slide per item) with `MonthDebrief`: at most 4 pages, tabs on top,
several outcomes per page, every outcome with reply, numbers, follow-up and a visual. Sketch:
`debrief-concept.svg` (page 2).

### 3.1 Pages

| # | Page | Contents | Visual | Timing |
|---|------|----------|--------|--------|
| 1 | Highlight | The month's top item as a big scene with a news headline, its quote and numbers; under it the 4 HUD stats counting before -> after; moments/medals stamped; a ribbon of small icons, one per outcome, coloured by result (click jumps to it) | Full `SceneFrame` | auto 4 s, hover pauses |
| 2 | Diplomacy | One card per counterpart country: calls, visits, orders aimed at them, crisis effects on `relations:X`, and their own actions toward you, merged. Big card for the top one, up to 3 compact cards; "+N more" expands. Then "Handled by your staff" strip. Then "Meanwhile abroad": up to 3 `world` items not tied to a card | `OutcomeMap` strip on the top card (home-target arc), flag discs, relation sparkline from `relations` history | manual |
| 3 | Home & security | Left: crises without a counterpart, STAFF, PRESS, domestic orders, top 3 `causes`. Right: each war (front bar 0-100 with the month's move and casualties), military and intel orders, hot zones that moved (Gaza, West Bank: metric before -> after, phase) | Scene thumbnails, front bars, mini gauges | manual |
| 4 | The paper | Redesigned Chronicle (section 3.4) | Lead scene | manual, ends the debrief |

Rules: a page with no items is skipped; if page 3 has no security items it is titled "Home front";
if page 2 has only staff-handled items it folds into page 3. A quiet month = Highlight + Paper.
Esc anywhere goes to the desk; "Debrief style: Full | Paper only" in Settings.

### 3.2 Card anatomy (one `OutcomeCard` component for everything)

```
[kicker: flag · ALLY/AT WAR/RIVAL · CALL/VISIT/CRISIS/ORDER]          [verdict glyph]
Headline written as news ("Khamenei takes the call, and keeps the door ajar")
what you did: icon + option label (+ second line if two items were merged)
| "Quote from the counterpart or affected voice."  (Newsreader italic, amber rule)
NUMBER LABEL   before -> after (delta chip)   x up to 3          [sparkline / mini map]
▸ Watch: one cyan line, engine-grounded
```

Dense view: the same data as a table row: `Kind | Who | You did | Reaction tone | Δ1 | Δ2 | Δ3 |
Watch`.

### 3.3 What each item produces

All lines come from `src/core/reactions.ts` templates, keyed as shown, 2 to 4 variants each,
picked by `hash(seed, turn, id, optionId)`. Bands: `hostile` (view < -20), `cool` (-20..30),
`friendly` (> 30 or ally), `war`. Numbers come from `facts`.

| Item | Headline pattern | Reaction (who, keyed by) | Numbers | Watch |
|------|------------------|--------------------------|---------|-------|
| CALL attended | "{Leader} {verb phrase by option}" e.g. talks: "takes the call, and keeps the door ajar"; hangup: "is left holding a dead line" | counterpart leader, `call:{band}:{optionId}` | their view of you, tension if moved, approval if moved | band crossed; "a ceasefire proposal now starts from a warmer table" when at war and view rose; promise logged for `support` |
| CALL by deputy | none: goes to "Handled by your staff" | none | view -1 | "{Leader} may not call again for 3 months" |
| VISIT | state: "Banquet and honour guard for {Leader}"; working: "A working lunch with {Leader}"; decline: "{Country} snubbed" | visitor, `visit:{optionId}` | their view, capital spent | what the other option would have bought (from the meeting's own option effects, truthful) |
| STAFF | "{Minister}: {option as decision}" e.g. "Reservists called up" | the minister, `staff:{topicKey}:{optionId}` | the effect keys (mobilization, approval, relationsAllies as "Allies' view") | topic may return in 2 months if unresolved (`hold`, `deputy`) |
| PRESS | "On the evening news, {surname} {projects confidence / admits the risks / blames the opposition}" | soundbite in the player's voice + anchor verdict, `press:{optionId}` | approval, legitimacy, stability | confident: "Hostage to fortune: a bad month will be replayed" |
| CRISIS answer | `crisis:{templateId}:{optionId}` headline if authored, else "{surname} {verb by dominant effect}: {short option}" | template `voice` (union leader, markets, general, UN envoy); generic voice by dominant effect if none | the 3 largest effects, measured | scheduled follow-up: "{follow-up title} likely in {delay} months"; injected actions point to their order card |
| CRISIS ignored | "No decision: {default option}" in red | the voice, angrier variant | measured | "Ignoring crises usually costs more" only if it did |
| ORDER success | existing `orderStory` first sentence as headline material | target's real action toward you this month if any (from `resolvedActions`), else `order:{type}:{up/down/flat}` by `relFrom` delta | existing `facts` | ledger trend (existing `Trend`), cooldowns (denounce: "only the first denunciation each month moves approval") |
| ORDER failed | `failStory` | target or own staff voice | facts | the reason, cleaned (fix ".." join) |
| WAR | "{Front} moves {n} toward {side}" | none (numbers are the story) | frontline before -> after, casualties | exhaustion ceasefire odds language only if the engine exposes it, else none |
| WORLD item | `orderLabel()` of the AI action | none | the relation or tension change it caused if measurable | none |

Authoring budget for v1: about 60 lines of templates (calls 4 bands x 4 options x 2 variants is
the bulk; visits, press, staff topics, the top 8 crisis templates by weight). Every other crisis
uses the generic voice by dominant effect. Crisis options gain optional `voice`, `reaction[]`,
`headline` fields in `crises.ts` / flashpoint JSON; absent means generic.

### 3.4 Newspaper lead: a real story

`playerHeadline()` in `turn.ts` becomes `playerLead()` built from `report.highlight`:

- Headline: authored `crisis:{templateId}:{optionId}` headline, else a pattern by kind (examples:
  "TRUMP CAVES TO UNIONS AS PORTS REOPEN", "TEHRAN TAKES WASHINGTON'S CALL", "SAUDI JETS HIT
  SANAA"). Uses `possessive()`; no option label in caps.
- Lede (1 sentence, numbers): what happened and the biggest measured effect ("Approval jumped 6
  points to 48 after the president met the unions' wage demands; economists cut growth forecasts.").
- Pull quote: the highlight's reaction line, attributed.
- Context (1 sentence): up to two other attended items in prose ("Elsewhere, he promised Tokyo full
  support and hosted Ferdinand Marcos Jr. for a working lunch.").
- What next (1 sentence): the highlight's watch line.
- Chronicle UI: the "Your month" block shrinks to the 5-stat strip; the bullet list and causes move
  out (the debrief owns them). Statements from LLM leaders stay in the columns.

## 4. In-game beautify and gamify (structure unchanged)

| P | What | Where | Why | Effort |
|---|------|-------|-----|--------|
| 1 | Call scene shows both leaders (summit art + phone glyph now; `call` split-screen art later) | `desk/Detail.tsx` `KIND_SCENE`, `scenes/kinds.ts`, later `scenes/art/Call.tsx` | The lone-president "ADDRESS" shot for a phone call is the single most visible wrongness | S / M |
| 2 | HUD stat ticks: after a turn each stat rolls to its new value and shows a fading delta chip (+8.4 green) for 4 s | `Hud.tsx`, `wc.css` | Feedback lives where the eye already is | S |
| 3 | Reaction preview on choice: picking a meeting or crisis option pops the counterpart's tone glyph and slides their relation gauge by the option's `relations:X` effect | `desk/Detail.tsx` | Moment-to-moment juice, sets up the debrief | S |
| 4 | Capital spend animation: the diamond flies from the rail to the order card, pips refill on undo | `desk/CommandRail.tsx` | Makes the budget tactile | S |
| 5 | Execute: hold-to-confirm fill (400 ms) then an "ORDERS SENT" stamp and a calendar flip to the next month before the debrief | `desk/CommandRail.tsx`, `CommandStrip`, `App.tsx` | The turn boundary is the game's heartbeat; today it is a spinner | M |
| 6 | Medals and streaks: engine writes `milestones` (first pact, 6 months approval > 50, ceasefire brokered, survived a coup plot, 3 promises kept); stamped on the debrief highlight and a shelf in the Mission drawer and `EndScreen` | `src/core/turn.ts` (`finishReport`, uses `director.rallies/closeCalls/record`), `Drawers.tsx`, `EndScreen.tsx` | Long-term goals between months; shareable | M |
| 7 | Ticker filled from `report.world` and hot-zone incidents ("No news yet" in `desk.png` wastes the bar) | `Hud.tsx` ticker | Free world-feel | S |
| 8 | Map "last month" layer: arcs for your orders and AI actions touching you, fading over the first 10 s of the month | `MapView.tsx`, `mapMarkers.ts` | The globe shows consequence, not only state | M |
| 9 | Richer order cards: scene thumbnail, target flag edge, success odds as a small ring | `desk/CommandRail.tsx` | Cards read as playing cards, not list rows | S |
| 10 | Leader seal in the HUD: framed flag with an approval-coloured ring that pulses below 28 | `Hud.tsx` | Identity and danger at a glance (vignette exists) | S |
| 11 | Serif display type for titles in desk Detail and debrief headlines | `wc.css` tokens (`--font-news`) | Contrast between story and data | S |
| 12 | Sounds, off by default: stamp (execute), teletype (ticker), soft chime (good delta), low thud (bad), alarm (BREAKING). WebAudio-synthesised, no assets; toggle in Settings | new `ui/src/lib/sfx.ts`, `SettingsModal.tsx` | Juice for those who want it | M |

## 5. Persona feedback round on this draft

**Maya (newcomer):** "Globe with fires I can click: yes, that is the trailer. On my phone I worry it
will be slow and I will rotate it by accident while scrolling." -> Adopted: on 390px the globe is
not scroll-captured (rotation only with two fingers or the carousel), lazy-mounted, 2D fallback.
"The highlight page is the bit I would screenshot." -> Stretch: a share button on the highlight
reusing the EndScreen share-card renderer. "Three cards on the diplomacy page is fine if the quote
is big. Do not make me read numbers first." -> Card order kept: headline, quote, numbers.

**Henrik (veteran):** "Dense view is mandatory, and I want the world list uncapped there." ->
Adopted: dense view shows all `world` items (engine cap raised to 12, normal view shows 3). "No
auto-advance anywhere." -> Highlight auto-advance is disabled once the player has used Dense view
or pressed a number key (remembered per viewer). "Do not fake reactions." -> Rule written into
`reactions.ts`: tone must match the sign of the measured relation delta (a warm line with a
negative delta is a test failure); real AI actions beat templates. "Show me what the other option
would have bought." -> Kept only for visits (their effects are static and fair to show); not for
crises, which would turn the game into a lookup table.

**Ines (art) on the round:** cut the leader portrait art from v1; flag discs are enough. **Rui:**
the 4-page cap is a hard rule in code (pages are computed, never more than 4). **Mei:** reactions and
leads must not use the turn `rng`; `determinism.spec.ts` must pass unchanged, and a new spec checks
two runs give identical `turnReport`.

## 6. Final plan (1 to 2 days, single developer, in order)

Engine first (day 1 morning). All deterministic: no `Math.random`, no clock, no draws from the turn
`rng`; picks via a `hash(seed, turn, id)` helper (add to `src/core/seed.ts` next to `combineSeed`).

1. **Report schema** (`src/core/types.ts`): extend `PlayerTurnReportSchema` with the fields in 1.4,
   all `.optional()` or `.default()`. Add optional `voice`, `reaction`, `headline` to the crisis
   option schema. Mirror the TS types in `ui/src/store/gameStore.ts` (`TurnReport`).
2. **Reaction templates** (new `src/core/reactions.ts`): `reactionFor(kind, band, optionId, ctx)`,
   `crisisReaction(template, option, facts)`, `orderReaction(action, targetActions, relDelta)`,
   `watchFor(...)`, `headlineFor(...)`. About 60 template lines (calls by band, visits, press, staff
   topics, top 8 crises). Tone/sign guard. No em dashes in strings.
3. **Decisions carry outcomes** (`src/core/turn.ts` `resolveDecisions`): `snapshot()` before and
   after `applyEffects`, `effectFacts()` (new, in `outcomes.ts`), set `kind`, `optionId`,
   `withCountry`, `speaker`, `attended`, `reaction`, `watch` (from `option.followUp` + delay, staff
   cooldown, caller cooldown, band crossing). Record promises (`director.promises`, default `[]`)
   on CALL `support`/`quiet`.
4. **Month context** (`turn.ts`): capture relations toward the player, war frontlines, hot-zone
   metrics and tension at turn start; in `finishReport` write `relations` (top 5), `wars`, `hot`,
   `tension`, `world` (from `resolvedActions`, filtered and prioritised, cap 12), `highlight`
   (score in 1.4). Give orders a `reaction` (real target action first) and `watch`.
5. **Newspaper lead** (`turn.ts`): replace `playerHeadline()` with `playerLead()` (headline, lede,
   quote, context, next); fix the ".." join in order details.
6. **Promise callback** (`src/core/meetings.ts` `callMeeting`): when an ally with an open promise
   calls, the situation line cites it; keeping or breaking it (support vs neutral) adjusts the
   relation by +2/-4 extra.
7. **Tests**: run `tests/core/determinism.spec.ts` (must pass unchanged); new
   `tests/core/report.spec.ts`: every attended decision has facts and a reaction, two identical runs
   produce identical `turnReport`, warm tone never pairs with a negative relation delta, lead
   description has no "Faced with". `tests/repo-style.spec.ts` (no em dash). `npm run sim` once to
   confirm balance unchanged (only item 6 touches numbers).

UI (day 1 afternoon to day 2):

8. **Grouping** (new `ui/src/lib/debrief.ts`): pure `buildPages(report, world)` -> up to 4 pages of
   `OutcomeCardData`, merging items by counterpart, folding deputy items, skipping empty pages.
9. **MonthDebrief** (new `ui/src/scenes/MonthDebrief.tsx`, `OutcomeCard.tsx`, `debrief.css`): tabs,
   keys 1-4 / arrows / Esc, highlight auto-advance rule, count-up and delta flash (move `useCountUp`,
   `FactRow`, `Trend` out of `OutcomeReel.tsx` into `scenes/debriefParts.tsx`), `OutcomeMap` on the
   top diplomacy card, front bars, Dense view toggle (localStorage, try/catch). Swap it in for
   `OutcomeReel` in `Chronicle.tsx`; delete `OutcomeReel.tsx` and dead `reel.css` rules.
10. **Chronicle** (`Chronicle.tsx`, `wc.css`): lead story layout (headline, lede, pull quote,
    context, next), shrink "Your month" to the stat strip.
11. **Call scene fix** (`desk/Detail.tsx` `KIND_SCENE.CALL` and `scenes/kinds.ts` for
    `meeting_call`): `summit` + phone glyph.
12. **Title screen** (new `ui/src/components/TitleGlobe.tsx`, rewrite JSX of `TitleScreen.tsx`, new
    `ui/src/styles/title.css`): globe with pins, mode dial, dossier with side cards, 390px bottom
    sheet, reduced-motion and WebGL fallback to 2D, List fallback for keyboard/screen readers.
13. **Quick juice**: HUD stat ticks and delta chips (`Hud.tsx`), ticker from `report.world`,
    reaction preview on option pick (`desk/Detail.tsx`), serif display token.

Cut line: items 1 to 11 are the must-ship (the player's two complaints). 12 is day 2. If time
remains: Execute stamp + calendar flip, medals (`milestones`), map "last month" arcs, sounds,
highlight share card, `call` split-screen art. Verify with `npm run test`, `npm run lint`,
`cd ui && npm run lint`, `npm run build`, and screenshots at 1440x900 and 390x844 into
`dev_plan/reviews/game-feel/after/`.

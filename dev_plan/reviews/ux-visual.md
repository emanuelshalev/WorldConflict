# World Conflict: UX / Visual Redesign Review

*Reviewer stance: strategy + mobile game UX (Plague Inc., Civ VI/VII, Suzerain, Reigns, Frostpunk, Democracy 4, Polytopia). Branch `feat/engagement-overhaul`, build of 2026-11-01.*

**Evidence.** Screenshots are in `/tmp/claude-1000/-home-emanuel-git-WorldConflict/560a71e3-7113-4ffa-aea8-74191a508a8c/scratchpad/shots/`:
`baseline/` (1440×900, Israel 2025), `desk2/` (1440×900, USA 2025, 6 turns, action preview, advisor, Chronicle) and `mobile/` (390×844). They are cited below as `b/03`, `d/06` and `m/05`.

**Verdict in one line.** The simulation has good content: real dossiers, belief ranges, the Chronicle, backstories. The UI hides it behind a login wall, an admin-panel layout and a broken map, and the core loop (*plan → commit → watch the world react*) has no payoff moment.

---

## 1. First 60 seconds (friction ranked)

| # | Friction | Evidence | Severity |
|---|---|---|---|
| 1 | **Forced account creation** before any gameplay. The player has to type a name and password just to see a map. | `d/02` | Blocker |
| 2 | **Map is covered in "API KEY REQUIRED" watermarks.** The CARTO tiles in `MapView.tsx:126-136` now need a key. The first gameplay screen looks broken. | `b/03`, every map shot | Blocker |
| 3 | **The New Game modal is a long scroll.** The radio buttons float in mid-air with the labels wrapped ("Rule / as"). Every scenario shows its year twice ("Cold War Peak (1960) (1960)"). The country grid sits below the fold. There is no mode choice, no difficulty, and no info about the nation you pick. | `d/04`, `b/01`, `m/04` | High |
| 4 | **The leader defaults to the login handle**, so the backstory reads "You are tester70406, the new Prime Minister". This deflates the best narrative moment in the build. | `b/02` | High |
| 5 | **Half the screen is a mostly empty sidebar.** `--sidebar-width: 50vw` in `App.css:9`. Under the briefing, 75% of the panel is blank. The map, the actual toy, gets 720 px. | `b/03`, `b/13`, `b/14` | High |
| 6 | **The camera doesn't frame the player's country.** As the USA you see Europe and the Middle East, not America. Small nations like Israel are about 10 px at the default zoom. | `d/06`, `b/03` | Medium |
| 7 | **No clear first action.** The "Begin diplomacy" phase lists six verbs before a target exists. Clicking one fires a red toast, "Select a target country on the map first". | `b/05`, `m/09` | Medium |
| 8 | Brand inconsistency: the splash says "WORLD CONFLICTS" while the header says "WORLD CONFLICT". The poem plays for 6.5 s before the title. | `d/01`, `SplashScreen.tsx:56` | Low |

Time to first meaningful decision today is about 75–90 s and needs 9+ clicks. Target: **under 20 s and 3 clicks** (Play → pick nation → first suggested action).

---

## 2. Heuristic review by screen

**Global (all screens)**
- **Consistency.** The UI uses 145 unique hex colors and 206 inline `style={{}}` blocks, with no tokens. Mantine 8 is installed but not used. Emoji serve as icons, so they render differently on each OS and never match each other.
- **Typography.** System fonts throughout. The Chronicle (`App.css:1014`) falls back to Times New Roman.
- **Contrast.** Phase tabs are 10 px `#667` on `#1a1e28`, about 3.0:1, which fails WCAG AA (`ActionPanel.tsx:118-128`). The hint text `#778` on `#1a1e28` is borderline.
- **Dead code.** `PhaseIndicator.tsx`/`.css` and `LLMPermissionModal.tsx` are never imported. Their gold palette conflicts with the blue one actually in use.

**Header** (`Header.tsx`, `b/03`)
- Five buttons have equal visual weight. **"New Game" is the primary (blue) button mid-campaign**, even though it is a destructive action.
- The Leadership score ("100") has no scale, no delta and no explanation; its tooltip is hover-only.
- Global Tension is just a number. It went from 55 to 89 in 6 idle turns (`d/14`) without telling the player why.
- At 390 px the header wraps into four columns and overflows (`m/05`).

**Map** (`MapView.tsx`, `b/03`, `b/15`, `b/17`)
- **Land and ocean are the same near-black**, and only the ~40 game countries are filled. The rest of the world vanishes.
- **Color semantics are colorblind-unsafe and loaded.** The political layer uses democracy green `#3a7d44` vs autocracy red `#a63a3a`, which deuteranopes can't tell apart and which reads as a moral judgment. The nuclear layer reuses the same red as war borders.
- The Military layer is a muddy brown ramp, and there is no persistent legend: it hides behind "Guide".
- The green dashed alliance line across the Atlantic has no label (`b/03`).
- **Bug: the hover popup has a white background** (`App.css:224`) while its text is light (`MapView.tsx:86-94`). It shows as a blank white box (`b/09`).
- The layer toolbar gets covered by the dossier (`b/09`: "omic").

**Dossier** (`CountryDetailPanel.tsx`, `b/09`)
- Best content in the game: belief ranges, an intel-confidence bar and national character.
- Problems: it is a 330 px wall of uppercase labels and covers a third of the map. It **stays open across turns** (`d/14`, still Turkey at turn 6). Its action list duplicates the sidebar's, which gives two competing action surfaces.

**Phase flow** (`ActionPanel.tsx`, `b/05`, `d/09`)
- Six steps, three of them plain button lists. Moving between steps teaches nothing and costs a click each.
- Danger actions are marked only by red text.
- "Execute month" is the most important button in the game, but it is an orange bar that appears only on step 6.
- An empty confirm screen just says "the world will not wait". It should push the player to act.

**Action preview** (`ActionPreviewModal.tsx`, `d/06`)
- Good: it shows cost, predicted effects and success odds.
- Problems: it is a modal over a modal-like panel. The effect line is tiny ("+5 to +7"), with no visual delta or comparison to the alternatives.

**Turn result / Chronicle** (`NewspaperModal.tsx`, `d/10`, `d/13`)
- Strong tone and a pleasing paper look.
- But the **player's own actions and their outcomes never lead the paper**. Headlines are about Canada, Poland and so on. The "covert operation EXPOSED" template repeats four times on one page.
- There is no map replay, no numeric deltas and no "what changed for you".

**Cabinet / Wars / News tabs** (`TabbedSidebar.tsx`, `b/12`, `b/13`, `b/14`)
- The Cabinet tab is status text without recommendations.
- Wars and News are mostly empty states. The News tab still says "The presses are quiet" right after a newspaper was shown.

**Advisor modal** (`AdvisorModal.tsx`, `d/12`)
- Opens on an empty pane ("Select an advisor to consult"). The fifth advisor is clipped, and the advisors have no faces or personality.

**Crisis modal** (`CrisisDecisionModal.tsx`)
- The red-bordered card is the right idea. Problems: options carry no consequence hints, there are no advisor endorsements and no timer, and it is styled inline.
- No crisis fired in 7 turns of the capture, so crises are too rare for short sessions.

**End report** (`EndGameReport.tsx`)
- Has a grade and justification, but it is a scrolling modal and there is nothing to share.

**Mobile** (`m/05`, `m/09`)
- **The map is not rendered at all** at 390 px, and the sidebar takes the full width. The toast then tells the player to "select a target country on the map".
- The game is unplayable on phones.

---

## 3. Visual direction: "Situation Room, after hours"

**Mood.** A dimmed war-room table at 3 a.m.: matte navy surfaces, a lit map, amber "classified" accents, teletype numerals. Wit lives in copy and stamps ("EYES ONLY", "DENIABLE"), not in clutter. References: Plague Inc.'s map clarity, Suzerain's dossier typography, Frostpunk's dread vignettes, Reigns' card brevity.

**Palette tokens** (define as CSS custom properties plus a Mantine theme):

| Token | Hex | Use |
|---|---|---|
| `--bg-0` | `#0B0F17` | app background |
| `--ocean` | `#0E1A2B` | map ocean |
| `--land` | `#1F2A3A` | unplayed land |
| `--surface-1` | `#141B27` | panels |
| `--surface-2` | `#1C2533` | cards, inputs |
| `--line` | `#2A3546` | borders and dividers |
| `--text-1` | `#E8ECF2` | primary text (14.8:1 on bg-0) |
| `--text-2` | `#A3AEBF` | secondary text (7.6:1) |
| `--accent` | `#F2A93B` | amber: primary CTA, "your" country, focus ring |
| `--intel` | `#4FB3D9` | info, intel, selection |
| `--ally` | `#3D8BFD` | allied / positive relation (blue, not green) |
| `--rival` | `#F26B3A` | hostile / negative relation (orange) |
| `--war` | `#E5383B` | war only: never reused for anything else |
| `--nuke` | `#F5D547` | nuclear glyphs and radiation |
| `--good` / `--bad` | `#56C596` / `#E5383B` | deltas only, always paired with ▲/▼ |

The relations layer uses a **blue ↔ orange diverging** scale. Military and economy use **cividis**-style sequential ramps. Regime type uses the Okabe-Ito categorical set plus a hatch pattern for autocracies, so it never reads as green = good. Run every layer through a deuteranopia simulator before shipping.

**Typography** (Google Fonts)
- **Barlow Condensed** 600/700 for display, headers and stamps.
- **Inter** 400/500/600 for UI text.
- **IBM Plex Mono** for numbers, tickers, dates and the teletype.
- **Playfair Display** + **Source Serif 4** for the Chronicle only.

Use tabular numerals everywhere numbers animate.

**Iconography.** Replace emoji with **Tabler Icons** (`@tabler/icons-react`, Mantine's companion set) at 1.75 px stroke. Add a custom glyph set of about 10 icons for map markers: nuke, insurgency, war, coup, election, embargo.

**Motion.** 150 ms for UI, 300 ms for panels, 600–1200 ms for "world" events. Ease-out for entrances, spring for numbers. Motion always answers a player action or a world event and never loops idly, except slow war-border pulses. Honor `prefers-reduced-motion`: replace shake and pulses with opacity changes.

**Sound** (optional, off by default on mobile): teletype tick for headlines, low brass sting for war, Geiger crackle for nuclear progress, typewriter stamp on "Execute month", crowd murmur under the approval meter. Keep it to about 8 files of 30 KB or less each.

**Map style: recommendation: no tile provider.**
- Use a MapLibre `background` layer in `--ocean`, plus **all** `world.geojson` polygons. Non-game countries get the `--land` fill. Add a 10° graticule generated in code and a 1 px coastline glow (`line-blur`).
- Low intel confidence renders as a diagonal hatch (a `fill-pattern` drawn on a canvas at load). Asymmetric information becomes visible on the map itself.
- The player's country gets a permanent amber inner stroke.
- Labels: self-host the glyph PBFs, or switch to DOM/HTML markers so there is no external glyph dependency (today it uses `demotiles.maplibre.org`).
- Optional fallback if relief is ever wanted: OpenFreeMap's keyless "dark" style. Tiles add noise to a game map, though, and should not be the default.

---

## 4. Information architecture & layout

### 4.1 Title / mode select (replaces Splash + Login + NewGameModal)

```
┌───────────────────────────────────────────────────────────────┐
│  WORLD CONFLICT                         [Continue: USA, 1962 ▸]│
│  "Lead your nation. Face the consequences."     ⚙  ☁ Sign in  │
│                                                               │
│  CHOOSE YOUR TERM                                             │
│ ┌─────────────────┐┌─────────────────┐┌─────────────────┐     │
│ │ ⚡ CRISIS SPRINT ││ 🗳 ONE TERM      ││ 🏛 FULL CAREER   │     │
│ │ 12 months       ││ 48 months       ││ 120 months      │     │
│ │ ~10–15 min      ││ ~45 min         ││ multi-session   │     │
│ │ 1 scripted      ││ elections,      ││ coups, legacy   │     │
│ │ crisis/turn     ││ wars, deals     ││ score           │     │
│ └─────────────────┘└─────────────────┘└─────────────────┘     │
│  ERA:  ( 1960 Cold War ) ( 1990 Unipolar ) (•2025 Multipolar )│
│  NATION:  [map strip, tap a country]  ▸ Israel               │
│     Difficulty ●●●○  "Coalition on a knife-edge"  Stability 65│
│                         [ TAKE OFFICE ▸ ]                     │
└───────────────────────────────────────────────────────────────┘
```

- Guest play by default (local id). Account creation is offered only on "Save to cloud".
- The leader name is generated per era and country (e.g. "PM Dana Levi") and can be edited in place.

### 4.2 Main game HUD (map-first)

```
┌───────────────────────────────────────────────────────────────┐
│ 🇮🇱 PM Levi  APR 2025 ·T4/12  ▕Approval 68▲2▏Stab 65 ▏GDP $.52T▏│
│ ░░░░░ TENSION ████████░░ 72 ▲8 "Iran test rumours" ░░░░  ≡ menu│
├───────────────────────────────────────────────────────────────┤
│ [layers: Pol|Rel|Mil|Econ|Nuke|Intel]          ┌────────────┐ │
│                                                │ DOSSIER    │ │
│              FULL-BLEED MAP                    │ (slides in │ │
│        (player country = amber outline)        │  on tap,   │ │
│                                                │  320px)    │ │
│ legend chip (always on) ▸                      └────────────┘ │
├───────────────────────────────────────────────────────────────┤
│ ▶ BREAKING: Pakistan and China sign pact · Turkey drone deal… │
├───────────────────────────────────────────────────────────────┤
│ ORDERS  [card][card][ + ]  2/3 slots   PC ◆◆◇   [EXECUTE ▸]   │
└───────────────────────────────────────────────────────────────┘
```

- The sidebar is gone. Cabinet, Wars and News become a drawer (≡ or swipe up).
- On mobile the HUD collapses to a two-line top bar, and the orders tray becomes a bottom sheet over a full-screen map.

### 4.3 Turn decision surface (one screen, not six phases)

```
┌─ YOUR DESK: APRIL 2025 ───────────────────────────── 2/3 ─┐
│ ADVISORS SUGGEST                                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │🕵 Intel Chief │ │🌐 Foreign Min.│ │💰 Finance     │         │
│ │ Sabotage Iran │ │ Court Saudi  │ │ Cut defence  │         │
│ │ enrichment    │ │ Arabia       │ │ budget −1%   │         │
│ │ 62% · $400M   │ │ +6 rel · $100M│ │ +3 approval  │         │
│ │ ⚠ exposure 30%│ │              │ │ −2 readiness │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│ ALL ORDERS ▸  Diplomacy · Military · Covert · Domestic     │
│ (tap a country on the map → radial menu of valid verbs)    │
│                                  [ EXECUTE MONTH ▸ ]       │
└────────────────────────────────────────────────────────────┘
```

- **Order slots (2–3 per month)** replace the phases. They create scarcity, cut decision time and make every card matter.
- Suggestions come from a deterministic heuristic over `playerView` that reuses the `PersonalityAI` scoring. Each card embeds the existing `ActionPreview` numbers.

**Short-mode loop target, 30–60 s per turn:** 5 s headline sting → 0–1 crisis card (10 s) → pick 1–3 suggested orders (15–30 s) → Execute → 5–8 s "month replay" (map animates the events, deltas tick) → next.

### 4.4 Crisis card (Reigns × Suzerain)

```
┌──────────── ⚠ CRISIS · EYES ONLY ─────────────┐
│  [illustration / flag pair]                    │
│  IRANIAN CENTRIFUGES SPOTTED AT FORDOW         │
│  Satellite imagery (confidence 70%) shows…     │
│                                                │
│  ◀ STRIKE NOW          NEGOTIATE ▶             │
│  🎖 Defence ✔          🌐 Foreign ✔             │
│  Security ▲▲ Tension ▲▲▲   Approval ▲ Prestige ▼│
│  [ Ask for more intel: costs 1 order slot ]   │
│                          ⏱ resolves this month │
└────────────────────────────────────────────────┘
```

Two or three options, with qualitative arrows rather than exact numbers, which keeps the uncertainty. The advisor faces show who backs which option. Swipe on mobile, click or arrow keys on desktop.

### 4.5 End screen + shareable card

```
┌──────────────────────────────────────────────┐
│  THE WORLD CHRONICLE · FINAL EDITION         │
│  "LEVI OUSTED IN SNAP ELECTION AFTER         │
│   IRAN GAMBIT"                         [ B ] │
│  Israel · 2025–2026 · 14 months · Sprint     │
│  ▁▂▄▆▅▃▅▇ leadership sparkline               │
│  🟩🟩🟨🟥🟥🟨🟩🟩🟨🟥🟥⬛  (month grid)         │
│  Best: Saudi normalisation · Worst: Fordow   │
│  [Share image] [Copy text] [Rematch] [New]   │
└──────────────────────────────────────────────┘
```

- The share card is a 1200×630 PNG rendered client-side (canvas or `html-to-image`) with a mini map and the player's country highlighted.
- "Copy text" produces a Wordle-style month grid plus the URL.

### 4.6 Onboarding (progressive disclosure)

- **Turn 1 (scripted):** the Foreign Minister coach-mark points at a neighbour, the player taps it, picks "Improve relations" and executes. The replay shows the relation line turning blue.
- **Turn 2:** a guaranteed crisis card teaches trade-offs and arrows.
- **Turn 3:** the map layers are unlocked with an Intel Chief hint ("hatched = we're guessing").

Further systems are introduced only when they first matter: covert ops, the nuclear layer, elections. The tutorial can be skipped and is remembered per device. Short mode always uses this script.

---

## 5. Juice (delight and drama)

1. **News ticker:** a persistent marquee in IBM Plex Mono. Headlines involving the player flash amber.
2. **Breaking-news stinger:** for war, coup or nuclear events, a full-width red bar slams in (200 ms) with a brass hit, then the map flies to the location.
3. **Map pulses:** a ripple ring at the event origin; a relation line animates its color shift on change; war borders pulse slowly.
4. **Number tickers:** approval, GDP and tension count up or down over 600 ms, with ▲/▼ chips that fade after 3 s.
5. **Execute month:** a typewriter stamp "ORDERS ISSUED", a 300 ms page-turn to the replay, then the calendar flips.
6. **Screen shake:** 4 px for 250 ms on a war declaration against you. Nuclear use gets a white flash and desaturated audio. Both are reduced-motion safe.
7. **Near-loss red vignette:** when approval is under 30, a coup risk is flagged, or the player is within 3 months of an election they are losing. A heartbeat-pulsed edge vignette plus advisor alarm copy.
8. **Comeback celebration:** if a 15+ point recovery follows a low, show a confetti-free "RALLY 'ROUND THE FLAG" stamp, a gold flash on the score and a Chronicle front-page praise headline.
9. **Personal headlines:** the Chronicle always leads with the player's action outcome ("Levi's Riyadh gambit pays off").
10. **Milestone stamps:** "First alliance", "Survived a coup", "Nuclear club". These feed the end card.

---

## 6. Prioritized backlog

### P0: unblock and make it look intentional (1–2 weeks)

| ID | Change | Files | Acceptance criteria |
|---|---|---|---|
| P0-1 | Keyless map: ocean background, all-country land fill, player amber outline, fixed dark popup | `MapView.tsx`, `App.css:224-234` | No external tile requests; zero watermarks; popup text ≥4.5:1; player country identifiable in every layer |
| P0-2 | Guest play; login optional | `App.tsx`, `LoginScreen.tsx`, `gameStore.ts` | From cold load, the map is visible in ≤2 clicks with no form fields |
| P0-3 | New title/mode screen (Sprint 12 / Term 48 / Career 120) with explicit time estimates | replace `NewGameModal.tsx`, `SplashScreen.tsx` (poem becomes a 2 s skippable intro); engine needs a `termLength` option in `/new-game` | Mode, era and nation chosen on one screen with no scroll at 1440×900; no duplicated years; generated leader name |
| P0-4 | Design tokens + Mantine theme; remove inline colors from the core screens | `index.css`, new `ui/src/theme.ts`, `Header.tsx`, `ActionPanel.tsx`, `CrisisDecisionModal.tsx`, `EndGameReport.tsx` | ≤25 hex values in the codebase, all in tokens; all text ≥4.5:1 (AA) |
| P0-5 | Map-first layout: sidebar becomes a drawer; persistent orders tray with an always-visible Execute | `App.tsx`, `Sidebar.tsx`, `TabbedSidebar.tsx`, `App.css` | Map ≥75% of the viewport on desktop; Execute reachable in one click from any state |
| P0-6 | Mobile baseline | `App.css` media queries, new `BottomSheet` | At 390×844: map visible, a country can be tapped, a turn can be executed, no horizontal scroll |
| P0-7 | Colorblind-safe layers + persistent legend chip | `MapView.tsx`, `MapGuide.tsx` | Every layer distinguishable under deuteranopia simulation; regime colors are not red vs green |

### P1: make the loop compelling (2–4 weeks)

| ID | Change | Files | Acceptance criteria |
|---|---|---|---|
| P1-1 | Order slots + advisor-suggested action cards replace the six phases | `ActionPanel.tsx` (replace), `gameStore.ts` (`TurnPhase` → `turnStage`), `ActionPreviewModal.tsx` (inline into the card) | Median short-mode turn ≤60 s in a playtest (5 users); 3 suggestions every turn |
| P1-2 | Month replay + personal Chronicle lead | `TurnFeedbackModal.tsx` (replace), `NewspaperModal.tsx`; backend `newspaper` puts player outcomes first and dedupes templates | The player's action outcome is always headline #1; ≤1 headline per template per edition |
| P1-3 | Crisis card redesign + guaranteed cadence in Sprint mode (≥1 per 2 turns) | `CrisisDecisionModal.tsx`, `src/core/events.ts` (mode-aware weights) | Card shows ≥2 options, advisor endorsements and arrow consequences; keyboard and swipe input |
| P1-4 | Scripted first 3 turns plus coach-marks | new `Tutorial.tsx`, `gameStore.ts` | A new player completes turn 1 unaided in ≤45 s; tutorial can be skipped and is remembered |
| P1-5 | HUD stat strip with deltas + tension cause | `Header.tsx` (replace) | Every stat shows its last-turn delta; the tension tooltip/tap lists the top 2 causes |
| P1-6 | Dossier as a slide-over with collapsible sections; one action surface (radial on map) | `CountryDetailPanel.tsx` | Closes on turn end; does not cover the layer toolbar; actions are not duplicated |
| P1-7 | Fonts + Tabler icons replace emoji | `index.html`, all components | No emoji used as UI icons |

### P2: delight, retention, polish

| ID | Change | Files | Acceptance criteria |
|---|---|---|---|
| P2-1 | Shareable end card (PNG + text grid) | `EndGameReport.tsx` (replace) | One click produces a 1200×630 PNG under 300 KB plus clipboard text |
| P2-2 | Juice pack (ticker, stingers, shake, vignette, rally stamp, number tickers) | new `fx/` module, `MapView.tsx` | All effects respect `prefers-reduced-motion`; 60 fps on a mid-range phone |
| P2-3 | Advisor portraits + an advisor that opens with today's recommendation | `AdvisorModal.tsx` | Never opens on an empty pane |
| P2-4 | Optional sound pack | new `audio.ts`, Settings toggle | Off by default on mobile; ≤250 KB total |
| P2-5 | Intel hatch overlay (belief uncertainty on the map) | `MapView.tsx` | Countries under 50% confidence render hatched, with a legend entry |
| P2-6 | Remove dead UI code | `PhaseIndicator.*`, `LLMPermissionModal.*` | Files deleted; lint clean |
| P2-7 | Milestone stamps / achievements | `gameStore.ts`, end card | ≥10 milestones, surfaced in game and on the share card |

**Engine dependencies to flag for the backend:**
- A configurable term length (currently fixed at 120).
- Mode-aware crisis frequency.
- A per-turn "player outcome" payload for the replay and the Chronicle.
- Tension-cause attribution.

All of these must stay deterministic: they go through `SeededRandom`, and `tests/core/determinism.spec.ts` has to keep passing.

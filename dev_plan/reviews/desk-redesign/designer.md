# Desk redesign: game + UI design spec

Status: draft v1, persona round, revised spec (final). Owner: game/UI design. Scope: the in-game
screen (HUD, map, desk, ticker). No engine changes: every rule below already exists in
`src/core/costs.ts`, `src/core/turn.ts` and `src/core/preview.ts`.

## 0. What is broken today (from the brief and `before/*.png`)

| Problem | Evidence |
| --- | --- |
| Desk is capped at `max-height: 52vh` (58vh on phone) and scrolls; the crisis options, the order tray and Execute are never on screen together | `desktop-1`: crisis options start at y=860 of 900; `desktop-2`: must scroll to see the tray |
| The selection (order pills) sits below the catalog, far from Execute | `.order-tray` is the last child of `.orders`, Execute is a separate column at the right edge |
| Budgets are scattered: ◆ in the HUD, "political capital left 3" in a section label, meeting slots in the calendar header, order slots and defense budget nowhere | Hud `CAPITAL ◆◆◆`, Desk "ADVISORS SUGGEST · POLITICAL CAPITAL LEFT 3", Calendar "0/3 in person" |
| The globe runs under the desk (`--under-bottom: 60vh`), so the map guide/legend and zoom controls are partly covered even when the desk is collapsed | `desktop-3`: desk bar overlaps the globe bottom; MapGuide is top-anchored at `100% - 80px` of a container that extends under the desk |
| "What must I do before Execute?" is a single warning line ("1 crisis unanswered, it will resolve on its own") | `desktop-2` bottom right |
| Nothing starts selected; the player builds every month from zero | crises default to "nothing chosen", suggestions must be clicked one by one |
| Ticker floats over the bottom of the map stage, always scrolling, no way to hide it | `App.tsx` `Ticker` inside `.map-stage`, `animation: ticker 60s linear infinite` |

## 1. Draft v1 spec

### 1.1 Layout decision: two modes, one permanent command rail

I combine the player's two ideas instead of picking one:

- **Act mode** (default every month): the desk owns the screen. A small **contextual 2D map**
  (built from `OutcomeMap`) sits in the top of the right rail and follows whatever item is in focus.
  This *is* the "map as side panel, small state" from idea (a).
- **Investigate mode**: the full 3D globe (current `MapView`), layer bar, dossiers, and the legend
  docked as a real column. This is the "full screen" state from idea (a).
- The **command rail** (selection, budgets, readiness, Execute) is visible in **both** modes: as a
  380px right column in Act, as a 56px bottom strip in Investigate.

Why not the 4-state map side panel: the "collapsed" and "map + legend" states are just smaller
versions of the two states above, each one adds a toggle the player must manage every month, and
any side panel wide enough to read a 3D globe (600px+) leaves the desk too narrow for three crisis
options side by side (each option needs ~240px for its text and effect arrows). The 2D map reads
fine at 380x230 because it is cropped to the subject; the globe does not. Two modes with one
keystroke between them is fewer decisions than four panel sizes.

### 1.2 Screen grid (desktop)

```
+---------------------------------------------------------------------------------+
| HUD 56px: leader | stats | [Investigate | Act] tabs | tension | score | icons    |
+-------------------+-----------------------------------------+-------------------+
| NAVIGATOR 280px   | FOCUS DETAIL (flex, own scroll only if  | COMMAND RAIL 380  |
|  Mission          |  the detail is long: a long crisis text)| Context map 230px |
|  Crises (1)       |                                         | Budgets           |
|  Meetings (4)     |                                         | Selection tray    |
|  Staff orders (5) |                                         | Readiness         |
|  All orders       |                                         | [Execute month]   |
+-------------------+-----------------------------------------+-------------------+
| NEWS TICKER 28px (toggle, remembered)                                           |
+---------------------------------------------------------------------------------+
```

- `.game` grid: `grid-template-rows: 56px 1fr auto` (ticker row is `auto`: 28px or 0 when hidden).
- Act body: `grid-template-columns: 280px minmax(0, 1fr) 380px`, gap 0, column borders `var(--line)`.
- 1280x720: columns `240px 1fr 340px`, context map 340x150, tray rows 30px.
- Height budget at 1440x900 (body = 900 - 56 - 28 = 816px), rail: context map 230, budgets 96,
  tray header 24 + 3 crisis/meeting lines 108 + 6 order rows x 36 = 216, readiness 56, Execute 56,
  paddings/gaps 40: total 826. One line over, so the tray's meeting line collapses into one row of
  three slot chips (36px), giving 790. At 1280x720 (body 636): 150 + 72 + 24 + 72 + 6x30 + 44 + 48 +
  32 = 622. **No scrolling of the rail at either size**, verified by arithmetic; only the focus detail
  may scroll internally, and never hides Execute.

### 1.3 Navigator + focus detail (information architecture)

The navigator is a list of everything this month, in the order it should be handled. One item is
in focus at a time; the detail pane shows it. No stacked cards.

1. **Mission** (pinned, 1 line): objective title + months left; focus shows the full ObjectiveChip
   content (conditions, now/needed). Replaces the floating `ObjectiveChip` in Act mode.
2. **Crises** (count): one row per `pendingDecisions` item (all of them, not `slice(0, 2)`): flag(s),
   title, urgency color bar, status badge `Staff pick` (amber outline) or `Your call` (solid amber).
   Detail: scene banner (the existing `SceneFrame` at 160px tall), situation, Consult button, the
   options in a 3-column row with arrows and backers; the selected option has the amber border.
3. **Meetings** (count, plus `1/3 in person`): one row per `agenda` meeting: weekday/time, kind icon,
   flag + speaker, badge `Suggested` (dashed), `You attend` (solid), or `Deputy` (grey). Detail is the
   current `MeetingModal` body rendered inline (no modal), suggested option marked
   `Staff suggests` but **not selected**, buttons `Approve suggestion` / pick another / `Send deputy`.
4. **Staff orders** (count queued/total): the top 5 suggestions (`useSuggestions`, same priority
   rules), each row: icon, label, ◆ cost, who, `Queued` check. Detail: the why text, server preview
   (success %, effects) and Add/Remove.
5. **All orders**: detail is the catalog: a target picker (searchable list of countries with flag and
   relation, defaults to the map selection) and four category tabs (Diplomacy, Military, Intelligence,
   Domestic) with the existing `CATALOG` buttons, each showing ◆ cost and defense % chip.

Readiness, the answer to "what needs to be addressed": every navigator row has a state dot:
`empty` (needs you), `half` (staff default, not reviewed), `full` (decided by you). The rail shows
the same as a checklist (1.6).

### 1.4 Selection tray (rail, under budgets)

Title: `This month you will` . Lines, top to bottom:

- **Crisis lines** (one per crisis): `General strike -> Personally mediate`, tag `Staff` if not
  touched, ◆ effect chip (`-1◆`, `+1◆`). Click: focuses the crisis.
- **Meetings line** (one row): three slot chips, each a flag/kind icon of a meeting you attend, empty
  slots dashed, then `+2 deputy`. Click a chip: focuses that meeting.
- **Order rows** (exactly 6 rows, fixed): filled rows show icon, label (`Spy on Iran`), `Staff` tag if
  pre-queued, cost chips (`◆1`, `12% def`), success % from the preview, a warning glyph if
  `preview.missionWarning`, and a remove `x` (always visible, 28px hit area). Empty rows are dashed
  `Empty order slot`. Click a filled row: focuses it (detail = preview + `Change target`).

### 1.5 Budgets (rail, directly above the tray)

Four meters, one line each, always visible:

| Meter | Shows | Source |
| --- | --- | --- |
| `◆ Political capital` | 6 pips (the cap): filled = left, outlined = committed this month, red = over. Text `3 bank, -1 crisis, -2 orders: 0 left` | `capitalLeft()` broken into its parts |
| `Defense budget` | bar 0-100% of the monthly budget, text `$71.4B/mo, 12% committed` | `monthlyDefenseBudgetM` mirrored in UI, `preview.costM` per order |
| `Orders` | 6 ticks, `4/6` | `pendingActions.length`, `MAX_ORDERS` |
| `In person` | 3 ticks, `1/3` | meetings with a non-deputy choice, `MEETING_SLOTS` |

Over budget: the meter turns `var(--war)`, the order row that will be refused (the last ◆ order,
matching engine order) gets a red left border and `Will be refused`, and Execute is **disabled** with
the reason in its sub-line (`Over political capital by 1: remove an order`). Today the engine just
refuses it silently into the report; blocking is clearer and costs nothing.

### 1.6 Readiness + Execute (rail bottom)

```
Before you execute
  [half] 1 crisis on staff pick          Review
  [empty] 3 meetings await approval       Approve all suggestions
  [full] 4 orders queued (2 staff)
[ Execute month  >  ]    Ctrl+Enter
  47 months left
```

- Execute is always enabled except over budget or while resolving. Unapproved meetings go to the
  deputy (current engine behavior via `defaultOptionId`); the line says so: `3 meetings: deputy goes`.
- `Approve all suggestions` approves every suggested meeting answer, best 3 in person (1.7), the
  rest deputy. It also marks crisis staff picks as reviewed.

### 1.7 Defaults

- **Crisis staff pick** (pre-selected, tag `Staff pick`): among options without a `missionRisk`, the
  one with the most `backedBy`; ties: higher net effect score (good arrows minus bad, from
  `effectArrows`), then not the `defaultOptionId`, then lower ◆ cost, then first listed. If every
  option has a mission risk, ignore that filter. Never pick an option whose ◆ cost makes the month
  negative.
- **Pre-queued orders**: after crisis picks, walk the suggestion list in priority order and queue
  while `capitalLeft() >= cost`, skipping `danger` catalog types, blocked previews and mission
  warnings; stop at 3 orders, leaving 3 slots for the player. Queued with `origin: 'staff'`.
  A staff order the player removes is remembered for the month and never re-added.
- **Meetings**: never pre-selected. Suggested option: highest net effect score excluding the deputy
  option, with ◆ cost >= 0 preferred. Which 3 to attend under Approve all: meetings with a mission
  country first, then VISIT, CALL, STAFF, PRESS, then by net score.
- Defaults are applied once per month, client side, when a new world arrives (after `/turn`,
  `/new-game`, `/load`). Determinism is untouched: the server only sees the final actions/choices.

### 1.8 Contextual 2D map (rail top)

`ContextMap` wraps `OutcomeMap` (Natural Earth SVG, SMIL, cached geojson), so it costs one new prop
set, not a new renderer. It is driven by the focused item:

| Focus | Framing | Animation |
| --- | --- | --- |
| Crisis | home + first non-home affected country (home only if none) | war/border crisis: `war` front line; unrest/strike: pulse rings on home; pact offer: `alliance` |
| Meeting CALL | home + `withCountry` | dashed arc with a travelling dot (`court` effect) |
| Meeting VISIT | home + `withCountry` | arc with a plane glyph (`court` path) |
| Meeting STAFF/PRESS | home | if at war, the front; else a soft pulse |
| Order (suggestion, tray row, catalog with target) | home + target | the order's `MapEffect` as a **preview**: dashed, 60% opacity, plays twice then holds the final frame |
| Hot zone (Gaza, West Bank, from a crisis or dossier) | crop on `hotspot.mapId` | ring pulse colored by `heat(h)`, phase label |
| Nothing / Mission | home + countries at war with us | fronts static, mission target outlined |

Caption under the map: what it shows (`You and Iran: Spy on Iran (preview)`). Clicking the map
switches to Investigate with the globe flown to the same pair and `selectCountry(target)`.
`prefers-reduced-motion`: final frame only (OutcomeMap already supports `still`).

### 1.9 Investigate mode

- Full globe, layer bar top right, `ObjectiveChip` top left (as now).
- Legend: `MapGuide` becomes a docked right column (320px) inside the map stage, toggled by `Guide`;
  when open the globe's camera padding grows by 320px right. Nothing overlaps it: there is no desk
  in this mode and the ticker is a grid row, not an overlay. Set `--under-bottom: 0`.
- **Command strip** (56px, bottom, above the ticker): budget mini meters (`◆ 0 left`, `4/6`, `1/3`,
  `12% def`), `1 crisis on staff pick, 3 meetings await`, button `Back to desk (A)`, `Execute`.
  Orders queued from the dossier / map menu (`queueOrder`) appear in the strip count instantly.

### 1.10 News ticker

- Moves out of `.map-stage` into its own grid row at the very bottom: never covers controls.
- Toggle: a `News` icon button in the HUD toolbar and a `Hide` text button at the ticker's right end;
  shortcut `N`. Stored in `localStorage['wc.ticker']` (try/catch), default shown.
- Pauses on hover and keyboard focus. Reduced motion: no scroll; one headline shown statically with
  `<` `>` buttons, never auto-advancing.

### 1.11 Phone (390x844)

- HUD 48px, one row (flag, month, ◆ left, tension dot, menu); stats move to a tap-down sheet.
- Tabs `Investigate | Act` in a 40px bar under the HUD.
- Act: context map strip 390x140; navigator as a horizontal chip row (44px): `Mission`, `Crisis 1`,
  `Meetings 4`, `Orders`, `All`; focus detail fills the rest and is the only scrolling area; crisis
  options stack vertically.
- Command sheet pinned at the bottom (72px collapsed): `◆ 0 left · 4/6 · 1/3` and `Execute`;
  drag or tap `Review` to open it to 70% height with tray + readiness + Approve all.
- Ticker 24px above the sheet, same toggle.

### 1.12 Keyboard, accessibility, states

- Keys: `A` / `I` switch Act / Investigate; `J` / `K` next/prev navigator item; `1`-`3` choose a
  crisis or meeting option; `Shift+A` approve all; `Del` removes the focused tray row; `/` focuses
  the catalog search; `N` ticker; `Ctrl/Cmd+Enter` Execute. Ignore keys while typing in inputs.
- Navigator is a `role="listbox"` with `aria-activedescendant`; detail is a labelled region;
  budgets are `role="meter"` with text equivalents; status is never color-only (dot shape + word).
- Loading: rail dims, Execute shows `Resolving...`, navigator locked. Game over: rail and desk
  hidden, `EndScreen` as now. Outcome reel / Chronicle overlay unchanged.
- Flashpoint: Mission row shows the authored objective and turns left of 12, ◆ income 3 (pips scale
  to cap 6 regardless). Term: Mission row adds the election countdown chip.

## 2. Persona round (on draft v1)

### Nora, 34, newcomer, 13" laptop (1366x768), finds strategy games overwhelming

> "Okay, this is so much calmer. I land on the desk, the left list tells me there's one crisis and
> four meetings, and the right side tells me what's going to happen. The `Before you execute` box
> is the best part, I finally know I'm allowed to press the button.
>
> But 'Investigate' and 'Act' sounded like two different games. I clicked Investigate and thought
> I'd lost my orders. 'Map' and 'Desk' would just make sense.
>
> The six dashed 'Empty order slot' rows stress me out. It looks like homework: am I supposed to
> fill all six? And the staff already queued three things, and I don't really know why. I want a
> one-line 'why' on the tray row, not just a 'Staff' tag.
>
> Defense budget '12% committed' with a red-to-green bar... is 12% bad? I never touched the army.
> Oh, Mobilize was a staff order. Fine, but explain it.
>
> 'Approve all suggestions' is buried in a sentence. That's the button I want, make it a button.
> The ticker scrolling next to the Execute button while I read a crisis is distracting, glad I can
> hide it. On my screen everything fit, just barely."

### Dan, 41, strategy veteran (Paradox, Civ), plays fast, hates hand-holding

> "Navigator plus detail is right, that's how a real game does it. J/K, number keys, Ctrl+Enter:
> good, I could do a month in ten seconds.
>
> Do NOT spend my capital for me. Crisis staff picks I'll accept, it's a default answer either way.
> But auto-queuing three orders means every month I start by deleting things. I want that off,
> permanently.
>
> The detail pane is half picture. A 160px scene banner on every crisis is wasted space for me.
> Give me a compact density: text, options, numbers.
>
> The catalog: let me filter by typing 'spy ir' and hit Enter. And the 2D map should let me click a
> country to target it, that's the obvious move.
>
> Tabs: I lose the globe when I'm deciding who to strike, which is exactly when I want it. At least
> the strip in Investigate lets me queue from the dossier and still see budgets and Execute, so I'll
> live there half the time. Make sure everything in the rail is also in the strip.
>
> Readiness checklist: fine, just never make me confirm anything. Ticker: off forever."

### Jo, 27, phone commuter (390x844), plays one-handed on the train in 10-minute bursts

> "The bottom sheet with Execute under my thumb is great, and seeing `◆ 0 left · 4/6 · 1/3` without
> opening anything is exactly enough.
>
> Top of the screen is crowded: HUD, tabs, a 140px map, chip row, then finally the crisis. The tiny
> map is pretty but at 140px I can't tell what the arrow means. Let me collapse it to a thin strip,
> or tap to see it big.
>
> Approve all needs to be on the collapsed sheet, not inside it. That's my whole turn on a busy
> train: glance, approve all, execute.
>
> The ticker on a phone is 24px I don't have and it moves while the train moves. Default it off on
> phone. Tabs at the top are a stretch for my thumb: put Map/Desk in the bottom sheet or make it a
> swipe.
>
> When I lose signal mid-turn I want my picks still there when I reopen."

### Synthesis

| Theme | Nora | Dan | Jo | Resolution |
| --- | --- | --- | --- | --- |
| Tab names | confusing | neutral | neutral | rename `Map` / `Desk` |
| Auto-queued orders | wants why | wants off | neutral | keep default on, one-line why, Settings toggle |
| 6 empty slots | pressure | neutral | space | show filled rows + one add row + counter |
| Approve all prominence | wants button | neutral | wants on collapsed sheet | real button above Execute, on phone sheet |
| Scene art density | likes it | wants off | too tall | `Compact desk` setting; phone defaults compact |
| Context map | ok | wants click-to-target | too small | click opens Map mode on the pair (no target picking in v1), phone tap-to-expand |
| Ticker | hides it | off | off on phone | default off on phone, on elsewhere, remembered |
| Lose globe while targeting | n/a | complains | n/a | strip parity in Map mode; no split view (trade-off kept) |
| Persistence | n/a | n/a | wants | pending picks saved per save/turn in localStorage |

## 3. Revised spec (final)

Changes from v1 are marked **[changed]** or **[new]**. Anything not mentioned stays as in section 1.

### 3.1 Layout

- Two modes, labelled **`Map`** and **`Desk`** **[changed]** (tooltips: `Investigate the world` /
  `Decide this month`). Segmented control in the HUD center-right on desktop. Shortcut `M` toggles
  **[changed]** (frees `A`/`I`). The player lands on `Desk` every new month, but switching to `Map`
  never discards anything, and the Map-mode strip says `Your 4 orders are kept`.
- Desk grid as 1.2: `280 / 1fr / 380` at >=1440 wide, `240 / 1fr / 340` at 1280-1439,
  `220 / 1fr / 320` at 1100-1279. Below 1100 wide use the phone layout (1.11 / 3.9).
- Trade-off kept, honestly: there is no simultaneous big map + desk. Dan pays a keystroke to target
  from the globe; in exchange everyone gets a desk that never scrolls. The Map-mode strip has full
  parity with the rail's numbers and Execute, so a map-first player can play a whole month there.

### 3.2 Navigator and detail

- As 1.3. **[new]** `Compact desk` setting (SettingsModal, `localStorage['wc.deskDensity']`): hides
  `SceneFrame` banners in the detail (keeps a 20px kind icon), options become rows with arrows
  inline. Default: comfortable on desktop, compact on phone.
- **[new]** Catalog search box (`/` focuses it): fuzzy match over `verb + country` (`spy ir` ->
  `Spy on Iran`), Up/Down to move, Enter queues through `queueOrder`.

### 3.3 Selection tray **[changed]**

- Title `This month you will`, then crisis lines and the meetings slot row as 1.4.
- Orders: only filled rows, then one dashed `+ Add order` row (focuses All orders), with the counter
  in the section header `Orders 4/6`. Empty slots are no longer drawn as homework.
- Staff rows show the advisor's one-line why under the label in `var(--text-3)`, 12px, truncated
  with a title tooltip (`Chief of Staff: approval 42%, speak to the nation`).
- Height at 1440x900 is lower than v1 (unused slots are not drawn), so the arithmetic in 1.2 holds
  with room to spare; with 6 orders it is the 1.2 figure exactly.

### 3.4 Budgets **[changed]**

- Same four meters. Defense meter is neutral blue (not red-green) until 80%, amber 80-100%, red over;
  text reads `Defense $71.4B/mo: 12% used by Mobilize forces` (names what spends it). With nothing
  military queued it collapses to one muted line `Defense budget: untouched`.
- ◆ hover/focus shows the breakdown `Bank 3, crisis -1, meetings 0, orders -2 = 0 left`.

### 3.5 Readiness, Approve all, Execute **[changed]**

```
Before you execute
  * 1 crisis: staff pick (Personally mediate)       Review
  o 3 meetings waiting: deputy goes if not approved
  * 4 orders queued, 2 by staff
[ Approve 3 staff suggestions ]          Shift+A     <- ghost button, full width
[ Execute month                ]          Ctrl+Enter  <- primary
  47 months left
```

- `Approve N staff suggestions` is a real button directly above Execute, hidden when N = 0.
- Never a confirm dialog. Execute disabled only over budget or while resolving (as 1.5).

### 3.6 Defaults **[changed]**

- Crisis staff pick rules unchanged (1.7).
- Pre-queued orders: unchanged rules, but behind a Settings toggle `Staff pre-selects orders`
  (default on, `localStorage['wc.staffOrders']`). Off: suggestions still listed, nothing queued.
- Meetings unchanged: suggested, never selected, approved by row button or Approve all.
- **[new]** Pending picks (orders, crisis choices, meeting approvals, dismissed staff orders) are saved
  to `localStorage['wc.pending.<saveId>.<turn>']` on every change and restored on load of the same
  save/turn; staff defaults are applied only when no stored entry exists.

### 3.7 Contextual 2D map **[changed]**

- As 1.8. Clicking it opens Map mode on the same pair (no click-to-target in v1: OutcomeMap draws
  one merged land path; per-country hit areas are a follow-up, noted for Dan).
- Phone: 96px strip by default, tap expands to a full-width 16:9 overlay with caption; a chevron
  collapses it to a 28px caption line (remembered).

### 3.8 Ticker **[changed]**

- Bottom grid row, toggle in the HUD (`News` icon, `aria-pressed`) plus `Hide` on the bar, key `N`.
- Default: shown when viewport width > 900px, hidden on phone; any explicit choice is remembered.
- Pauses on hover/focus; reduced motion shows one static headline with `<` `>`.

### 3.9 Phone **[changed]**

- HUD 48px. **No top tabs**: `Map` / `Desk` live in the bottom sheet's left as a two-icon switch
  (thumb zone).
- Order top to bottom: HUD 48, context strip 96 (or 28 collapsed), chip navigator 44, detail
  (scrolls), bottom sheet.
- Collapsed sheet (88px): line 1 `◆ 0 left · Orders 4/6 · In person 1/3`; line 2
  `[Map|Desk]  [Approve 3]  [Execute]`. `Approve` sits on the collapsed sheet. Swipe up or tap the
  grabber for the full tray (70% height).

### 3.10 Keyboard and a11y (final keys)

`M` Map/Desk, `J`/`K` navigator, `1`-`3` option, `Enter` approve focused suggestion, `Shift+A`
approve all, `Del` remove focused tray row, `/` catalog search, `N` news, `G` legend (Map mode),
`Ctrl/Cmd+Enter` Execute. Everything else as 1.12. Focus returns to the navigator after Execute.

### 3.11 Build steps (one developer, one day)

Ordered so the app works after every step.

1. **Store** (`ui/src/store/gameStore.ts`, ~1.5h): add `deskMode: 'map' | 'desk'`, `focus:
   { kind: 'mission' | 'crisis' | 'meeting' | 'suggestions' | 'catalog' | 'order'; id?: string }`,
   `tickerVisible`, `deskDensity`, `staffOrders` (localStorage-backed, try/catch);
   `origin?: 'staff' | 'player'` on `PendingAction`; `staffPicked: Record<decisionId, true>` and
   `dismissedStaff: string[]` (order keys); `MAX_ORDERS = 6` constant; selector `budgetStatus()`
   returning `{ pc: { bank, crisis, meetings, orders, left }, defense: { budgetM, usedM }, orders:
   { used, max }, inPerson: { used, max } }` (factor out of `capitalLeft`, which keeps its signature);
   `applyStaffDefaults()` and `approveAllSuggestions()`; pending-pick persistence (3.6).
2. **Suggestions/picks as pure functions** (new `ui/src/lib/staff.ts`, ~1h): move `useSuggestions`
   body to `computeSuggestions(world, view, me)` (keep the hook as a `useMemo` wrapper in Desk);
   add `crisisStaffPick(decision, objective)`, `meetingSuggestion(meeting)`, `meetingPriority()`;
   move `missionRisk` here from `Desk.tsx`.
3. **App grid + ticker** (`ui/src/App.tsx`, `wc.css`, ~45m): `.game` rows `56px 1fr auto`; render
   `<MapStage/>` or `<DeskScreen/>` by `deskMode`; `Ticker` becomes the third row with Hide button,
   pause-on-hover, reduced-motion static variant; delete `.ticker { position: absolute }`.
4. **Desk split** (`ui/src/components/Desk.tsx` -> `Desk.tsx`, `DeskNavigator.tsx`,
   `FocusDetail.tsx`, `CommandRail.tsx`, ~2.5h): `CrisisCard` becomes the crisis detail (density
   aware); suggestions and `CATALOG` become the two order details (+ search); `CommandRail` holds
   `Budgets`, `Tray`, `Readiness`, Execute (the existing double-click guard moves with it);
   `CommandStrip` (Map mode) reuses `budgetStatus()` and the same Execute handler. Remove `CoachTip`
   left/right wording (`layoutTip`) in favour of one tip: `Left: what needs you. Right: what you will
   do.`
5. **Calendar** (`ui/src/components/Calendar.tsx`, ~45m): export `MeetingRows` (navigator rows,
   status badges) and `MeetingDetail` (the `MeetingModal` body, inline, with `Staff suggests`
   marker, `Approve suggestion`, `Send deputy`); keep `MeetingModal` only for the phone overlay.
6. **ContextMap** (new `ui/src/scenes/ContextMap.tsx`, small edits in `OutcomeMap.tsx`, ~1h): add
   props `preview?: boolean` (dashed, 60% opacity, `repeatCount=2`, hold) and `pulseHome?: boolean`;
   `contextFor(focus, world)` maps the focus to `{ home, target, effect, caption }` per table 1.8;
   hot zones pass `hotspot.mapId` as target.
7. **Map mode** (`ui/src/components/MapView.tsx`, `MapGuide.tsx`, `App.tsx`, ~45m): set
   `--under-bottom: 0`; `MapGuide` docked as a 320px right column (no `maxHeight` hack), camera
   right padding when open; ObjectiveChip stays here; `G` toggles the guide.
8. **HUD** (`ui/src/components/Hud.tsx`, ~30m): `Map | Desk` segmented control, `News` toggle;
   phone single-row variant.
9. **CSS + phone** (`ui/src/styles/wc.css`, ~1h): `.desk-grid`, `.navigator`, `.focus`, `.rail`,
   `.tray-row`, `.meter`, `.readiness`, `.cmd-strip`, `.cmd-sheet` (phone), breakpoints 1440 /
   1280 / 1100 / 900; drop `.desk { max-height: 52vh; overflow-y: auto }` and the old
   `.desk .execute` sticky hack.
10. **Keys + Settings** (`App.tsx` `useEscapeToClose` sibling `useDeskKeys`, `SettingsModal.tsx`,
    ~30m): shortcuts in 3.10; `Compact desk` and `Staff pre-selects orders` toggles.
11. **Verify** (~30m): screenshots at 1440x900, 1280x720, 1366x768, 390x844 into
    `dev_plan/reviews/desk-redesign/after/`: rail fully visible without scroll in every desktop shot;
    `cd ui && npm run lint`; `npm run test` (repo-style, no em dash); a 3-turn manual game in Term
    and one Flashpoint checking defaults, Approve all, over-budget block, ticker toggle persistence.

Out of scope (follow-ups): click-to-target on the 2D map, a split big-map + desk view for very wide
screens, server-side storage of pending picks.

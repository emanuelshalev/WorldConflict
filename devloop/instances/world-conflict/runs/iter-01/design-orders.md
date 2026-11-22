# Design: orders (G1, G2, G3, G6)

Owner: UX Designer, with the Engine Engineer. Iteration 1. Concept: `concepts/orders-card-states.html` (screenshots `concepts/orders-card-states-1440.png`, `concepts/orders-card-states-390.png`).

## 1. Problem

The player can't see what they are allowed to do until they try it, and the refusal then shows up somewhere else, worded differently from the meter it refers to.

| # | Evidence | What happened | Root cause in code |
|---|---|---|---|
| E1 | CEO RS-001 | "Not enough political credit" toast vs a tiny "Capital" bar: unclear what it refers to. | `queueOrder()` in `ui/src/store/gameStore.ts` calls `setError()` (global toast in `App.tsx`); HUD label is "Capital" / "Cap" (`Hud.tsx`), rail label "◆ Capital" (`CommandRail.tsx`). Nothing links the message to the meter. |
| E2 | Leo, `leo-stream/011-nuke.png` | Tapped greyed Nuclear strike and Declare war: nothing, no reason. | `CatalogDetail` in `desk/Detail.tsx` disables every targeted order while `target === ''` (`disabled={!!needs}`) with no visible reason. |
| E3 | Leo, `leo-stream/020-w3.png`, `028-w10.png` | Enter: toast "Not enough political capital (2 needed)" while the rail says "1 left of 3". He removed staff orders, tried again, and the war never queued. The toast stayed on screen. | The capital check runs only after the tap. The toast never auto-dismisses and is not cleared on success. Probable cause of "never queued": `preview.missionWarning` goes through `window.confirm`, which is dismissed silently in automation and is easy to miss in a real browser. The order is then dropped with no feedback. |
| E4 | Dan, `dan-term/013-hov.png` | Dimmed orders do nothing on click or hover, with no rule shown. On his dealbreaker list. | Same as E2. The map menu uses a native `title` tooltip only. |
| E5 | Dan | Enter in the search box queued a nuclear strike with no confirmation. | `CatalogDetail` Enter calls `add()` directly. Only `NUCLEAR_STRIKE` has a `window.confirm`, war has none, and a native confirm is easy to blow through. |
| E6 | Dan | "Capital sat at 1 of 3; I never learned the refill rule." | The refill (`politicalCapitalIncome`, +2 or +3, cap 6) only appears in a HUD `title` tooltip. |
| E7 | Sam, `sam-desktop/004-disabled.png` | HUD diamonds go empty as capital is spent while the rail pips fill up. Disabled reason only in a native tooltip. The map menu hides the success chance. The first map press gives no feedback and the menu just closes. Naming: "Capital", "Orders", "In person", "Leadership score" vs "Score". | HUD `pc-pips` fill `i < pc` (left), rail `Meter` fills `i < used` (spent). `MapActionMenu` has no preview and calls `onClose()` before queuing. Objective labels in `data-loader.ts` and `data/flashpoints/*.json` say "Leadership score". |
| E8 | Ruth, `ruth-tablet/004-g2.png`, `011-m2.png` | Can't read APPR / STAB / LEGIT / CAP / TENS. "Approve 4", "1 left", "Orders 2/6", "In person 0/3" are unexplained. | `StatLabel short=` abbreviations at tablet width. Compact strings in `CommandRail.tsx` (`sheet-grab`, `CommandStrip`). |
| E9 | Code audit (G6) | Four separate order lists with different labels and rules: desk `CATALOG` (`Detail.tsx`), `mapOrdersFor` (`MapActionMenu.tsx`), `DOSSIER_ORDERS` (`CountryDetailPanel.tsx`), staff suggestions (`lib/staff.ts`). Examples: "Hit nuclear sites" vs "Strike nuclear sites in", "Mass troops" vs "Mass troops facing". The desk shows chance only after queuing. The map never shows it. | No shared registry or component. The engine's rule reasons live only as free text in `preview.ts` (`blocked: string`) and `turn.ts` (`rejectedActions`). |

Several E3 states also break G1 directly: the engine re-checks `ORDER_LIMIT`, `DUPLICATE`, `NO_CAPITAL` and `NO_DEFENSE_BUDGET` in `turn.ts` and reports them after Execute as `ok:false` dispatches, even though each one was predictable.

## 2. Design principles applied

1. **Prevent, don't reject.** Every order a player can see shows its state before they pick it. Predictable refusals never reach the toast or the debrief.
2. **The reason and the fix live on the control.** The reason line is always visible, never in a tooltip.
3. **Point at what you mean.** A reason that names a resource lights that resource up wherever it is drawn.
4. **One registry, one component, one vocabulary.** Desk, map, dossier and staff picks all render `OrderCard` from `ui/src/lib/orders.ts`, with words from `ui/src/lib/glossary.ts`.
5. **Irreversible means deliberate.** War and nuclear use need an explicit second action inside the game UI, never on Enter alone and never through a native dialog.

## 3. Availability model

### 3.1 Two layers, one result

Availability has two layers that compose into one result.

| Layer | Depends on | Computed by | When |
|---|---|---|---|
| **Rule layer** | World state only: wars, alliances, warheads, target stability, game over | Engine, pure function `orderRules(world, action)` in `src/core/availability.ts` | Server side, once per target when a menu or catalog opens (batch endpoint, §6), cached per `turn + target` |
| **Month layer** | The unsent selection: queued orders, crisis and meeting answers | `monthBudget()` in `ui/src/lib/availability.ts`, mirroring the engine constants exported from `src/core/costs.ts` | Client side, live on every store change |

The engine's Execute-time checks in `turn.ts` use the same function and the same codes, so the preview and the engine cannot disagree.

### 3.2 Shape

```ts
// src/core/availability.ts (engine); ui/src/store/gameStore.ts re-declares it (types are duplicated, see CLAUDE.md)
export type OrderBlockCode =
  // month layer (budgets): the "unaffordable" state
  | "NO_CAPITAL" | "NO_DEFENSE_BUDGET" | "ORDER_LIMIT"
  // selection
  | "DUPLICATE"            // already in this month: rendered as the queued state, not an error
  | "NEEDS_TARGET"
  // rule layer: the "invalid" state
  | "GAME_OVER" | "SELF_TARGET" | "TARGET_COLLAPSED" | "INVALID_VALUE"
  | "AT_WAR"               // Court a country you are fighting
  | "NOT_AT_WAR"           // Ceasefire, Nuclear strike
  | "ALREADY_AT_WAR"       // Declare war
  | "TARGET_NOT_AT_WAR" | "PARTY_TO_WAR"   // Mediate
  | "NOT_ALLIED"           // Break pact
  | "PACT_REFUSED"         // allianceOdds().refusal (rival, belligerent, cap of 4, TWN)
  | "RELATIONS_MAXED"
  | "NO_WARHEADS" | "PROGRAM_MAXED"
  | "TOO_PROTECTED"        // Assassinate: needs stability < 40 or active unrest
  | "TOO_STABLE"           // Coup: needs GUERILLA insurgency or stability < 25
  | "NO_TROOPS";           // Mass troops: manpower

export type PointTarget = "capital" | "orders" | "meetings" | "defense" | "tray" | "target" | "mission";

export interface OrderBlock {
  code: OrderBlockCode;
  reason: string;            // one line, glossary words: "Needs ◆ 2, you have ◆ 1."
  fix: string | null;        // one line: "Remove a staff order (frees ◆ 1), or wait: +2 next month"
  points: PointTarget | null;  // the element the reason refers to
  alt?: { type: string; params?: Record<string, unknown> };  // a valid order to offer instead
  need?: { have: number; need: number; refill?: number };     // budgets only, for the meter callout
}

export interface OrderAvailability {
  state: "available" | "unaffordable" | "invalid" | "queued";
  block: OrderBlock | null;
}
```

**Precedence**, from first to last: `GAME_OVER`, `NEEDS_TARGET`, rule codes, `DUPLICATE` (queued), `ORDER_LIMIT`, `NO_CAPITAL`, `NO_DEFENSE_BUDGET`. The permanent reason wins. In E3, Leo freed capital for an order whose real blocker was elsewhere. With this order of checks he would have seen the true blocker first.

**No new game rules.** The codes describe rules that already exist in `preview.ts`, `turn.ts` (`applyAction`) and `systems/diplomacy.ts`. Rule ideas like "no shared border" or "regime forbids it" would change balance and are out of scope for this topic. If they ever ship, they get a code here.

**Belief safety.** `TOO_PROTECTED` and `TOO_STABLE` evaluate ground truth (as the engine does today), but the reason text states only the requirement. It never shows the hidden number: "Too well protected: needs stability under 40 or active unrest." Showing the requirement leaks one bit, the same as the current preview, and nothing more.

### 3.3 Copy for every code

Placeholders: `{T}` = target name (use `withArticle()` where the engine does), `{n}` = cost, `{h}` = have, `{r}` = monthly refill.

| Code | State | Reason (on the card) | Fix (button or line) | Points at | Alt |
|---|---|---|---|---|---|
| NO_CAPITAL | unaffordable | Needs ◆ {n}, you have ◆ {h}. | Button "Remove an order (frees ◆ x)" if a queued order frees enough. Always "or wait: +{r} next month". | capital (and the tray slots that would free it) | |
| NO_DEFENSE_BUDGET | unaffordable | Needs {p}% of the defense budget, {q}% is left. | "Remove a military order" | defense | |
| ORDER_LIMIT | unaffordable | All 6 orders this month are used. | "Remove an order" | orders | |
| DUPLICATE | queued | In this month. | "Remove" | tray | |
| NEEDS_TARGET | invalid | Pick a country first. | Button "Pick a country" (focuses the target picker) | target | |
| GAME_OVER | invalid | The game is over. | | | |
| SELF_TARGET | invalid | You can't target your own country. | | | |
| TARGET_COLLAPSED | invalid | {T} has collapsed: there is no government to deal with. | | | |
| AT_WAR | invalid | You are at war with {T}. | Button "Propose a ceasefire instead" | | PROPOSE_CEASEFIRE |
| NOT_AT_WAR | invalid | Only in wartime. You are not at war with {T}. | (Ceasefire: "You are not at war with {T}.") | | |
| ALREADY_AT_WAR | invalid | You are already at war with {T}. | Button "Strike military targets instead" | | MILITARY_AIRSTRIKE |
| TARGET_NOT_AT_WAR | invalid | {T} is not at war. | | | |
| PARTY_TO_WAR | invalid | You are fighting this war: propose a ceasefire instead. | Button "Propose a ceasefire" | | PROPOSE_CEASEFIRE |
| NOT_ALLIED | invalid | You have no defense pact with {T}. | | | |
| PACT_REFUSED | invalid | the `allianceOdds().refusal` text, unchanged | | | |
| RELATIONS_MAXED | invalid | Relations with {T} are as good as they get. | | | |
| NO_WARHEADS | invalid | You have no deliverable warheads. | (only if the program exists) "Fund the nuclear program" | | NUCLEAR_FUND_PROGRAM |
| PROGRAM_MAXED | invalid | Your nuclear program can't go further. | | | |
| TOO_PROTECTED | invalid | {T}'s leadership is too well protected: needs stability under 40 or active unrest. | "Weaken them first: Destabilize or Arm rebels" | | INTEL_DESTABILIZE |
| TOO_STABLE | invalid | {T} is too stable for a coup: needs an armed insurgency or stability under 25. | "Arm rebels first" | | INTEL_SUPPORT_REBELS |
| NO_TROOPS | invalid | You can deploy at most {m} troops. | | | |
| INVALID_VALUE | invalid | That amount isn't allowed. | | | |

The refill line always uses the real income: `politicalCapitalIncome(world)` (2, or 3 in a Flashpoint, +1 on Analyst), capped by `PC_CAP` 6. The payload exposes it as `pcIncome` (§6). When the bank is already at 6, the line reads "Capital is full: you can't save more than ◆ 6", so the player learns the cap too (E6).

## 4. Order card (one component, every surface)

### 4.1 Registry

`ui/src/lib/orders.ts` becomes the single list of orders and replaces `CATALOG` (`Detail.tsx`), `mapOrdersFor` (`MapActionMenu.tsx`) and `DOSSIER_ORDERS` / `DOSSIER_ORDERS_AT_WAR` (`CountryDetailPanel.tsx`). Staff suggestions keep their own logic in `lib/staff.ts` but render their `action` through the same card.

```ts
export interface OrderDef {
  id: string;                 // "airstrike-nuclear", stable, used for tests and keys
  type: string;               // ActionType
  params?: Record<string, unknown>;
  verb: string;               // "Strike nuclear sites in": the full label is `${verb} ${target}`
  untargetedLabel?: string;   // "Fund nuclear program"
  family: "diplo" | "mil" | "intel" | "nuke" | "home";
  category: "Diplomacy" | "Military" | "Intelligence" | "Domestic";
  targeted: boolean;
  danger?: boolean;
  irreversible?: boolean;     // DIPLOMACY_DECLARE_WAR, NUCLEAR_STRIKE
  relevance?: (me: CountryFull, view: PlayerViewCountry) => number; // map ordering, 0 = hide from the short list
  blurb: string;              // one line shown on an available card ("Sharpens your estimate of {T}'s forces")
}
```

One label everywhere: `orderLabel(def, targetName)`. Examples: "Strike nuclear sites in Iran", "Mass troops facing India", "Nuclear strike on India". The ☢ glyph moves from the label to the icon. `ACTION_VERBS` in `lib/actions.ts` derives from the registry, so `outcomes.ts` labels and the debrief keep matching. `PC` and `BUDGET_SHARE` stay as mirrors of `src/core/costs.ts` until the batch endpoint ships. After that the card reads costs from the server and a test checks that the mirrors still equal the engine values.

### 4.2 Anatomy

```
+------------------------------------------+
| [icon]  Declare war on India             |   family stripe on the left edge
|         NO UNDO                          |   irreversible tag
| (◆ 2) (8% defense) (53% chance)          |   chips: political capital, defense budget, chance
|------------------------------------------|
| reason / action line                     |   state-dependent, always visible
| [fix button]  or wait: +2 next month     |
+------------------------------------------+
```

- **Chips.** `◆ n` or `free`. `p% defense` when it uses the defense budget. `n% chance` when the preview has one, or a key effect ("Relations +5 to +7", "Force ratio 0.62") when the order is certain.
- **Variants** (one component, `variant` prop): `tile` (desk catalog, map menu at 1024/1440), `row` (map bottom sheet at 390, search hits, staff picks), `slot` (rail tray, compact: label, ◆ chip, state icon, remove).
- **Preview.** `OrderPreview` (summary, effects, risks, mission warning) is shared by the desk `OrderDetail`, hover/focus on a tile (desktop, 300 ms delay) and the info button on touch.

### 4.3 States

| State | Look (house tokens) | Footer line | Interaction |
|---|---|---|---|
| available | `--surface-2`, family stripe, full colour | "+ Add to this month", `Enter` kbd hint on the focused search hit, blurb | Tap/Enter adds it. The card stamps (green check, 350 ms) and the tray slot pulses once (`pointAt('tray')`). The ◆ meter ticks down and pulses once. The map menu **stays open**. |
| unaffordable | amber border (`rgba(242,169,59,.55)`), ◆ chip turns red, lock glyph | **Needs ◆ 2, you have ◆ 1.** + fix button + refill line | Tap: no queue. One 180 ms shake, the referenced meter is pointed at, and the fix button gets focus. Hovering or focusing the reason also points (desktop). |
| invalid | `--surface-1`, dashed `--line-2` border, greyscale icon, text-2 label (≥ 4.5:1), info glyph | **Reason.** + alt button when an `alt` exists | Tap: expands the reason (on a `tile` the reason is already visible, so tap only points). Never fades the whole card below readable contrast (today `.mam-item:disabled { opacity: .4 }`). |
| queued | green border and wash, check stamp, `◆ n held` chip | "In this month", Remove button, "Staff pick: Foreign Minister" when staff queued it | Tap opens it in the desk Detail (desk) or expands the preview (map). Never raises a "duplicate" error. |
| confirming | the card flips (rotateY 180 ms; crossfade under reduced motion) to a red confirm face | Question, "There is no undo.", the top 3 preview effects/risks | See §4.4 |

Buttons that look disabled must still receive focus and taps (`aria-disabled="true"`, not `disabled`), so the reason can be read by touch, keyboard and screen readers. The accessible name is "{label}, unavailable: {reason}".

### 4.4 Irreversible orders

- **Scope:** `DIPLOMACY_DECLARE_WAR` and `NUCLEAR_STRIKE` (`irreversible: true`). The mission-warning confirm (`preview.missionWarning`, currently `window.confirm`) moves to the same face with amber styling. That removes every native `confirm` from order flows and fixes E3's silent drop.
- **Declare war:** the face has "Declare war on India?" and two buttons, "Keep the peace" (focused) and "Declare war". Enter on the card or search hit opens the face only. Confirming takes an explicit press on "Declare war" (Tab to it, then Enter, or a tap).
- **Nuclear strike:** same, with "Stand down" (focused) and **"Hold to authorize"** (1.2 s press-and-hold, or holding Space/Enter; a fill bar shows progress). Releasing early cancels. This is a tactile moment (G7) that can't be triggered by accident.
- Esc or a tap outside cancels and returns focus to the card.
- If the order also carries a mission warning, the face shows that warning as its first line, so there is one confirmation, not two.

### 4.5 Surfaces and parity (G6)

| Surface | Today | After |
|---|---|---|
| Desk "All orders" (`CatalogDetail`) | grid of `wc-btn`, targeted disabled until a target is picked | `OrderCard tile` grouped by category. With no target, targeted cards are `invalid NEEDS_TARGET` with a "Pick a country" button that points at the picker. With a target, availability comes from the batch endpoint plus the month layer. |
| Desk search hits | rows, Enter adds | `OrderCard row`, with the same state on every hit. Enter on an unaffordable/invalid hit points and focuses the fix instead of adding. Enter on an irreversible hit opens the confirm face. |
| Staff picks (`SuggestionsDetail`) | custom rows | `OrderCard row` with the staff line ("Foreign Minister: ...") as the blurb |
| Rail tray (`Tray`) | custom slots | `OrderCard slot`. These slots are what `pointAt('capital')` lights up as "frees ◆ n". |
| Map menu (`MapActionMenu`) | `mam-item` buttons, title tooltip, no chance, closes on press | `OrderCard tile` (1024/1440), `row` in the bottom sheet (390). Shows the top 6 by `relevance`, then "All {n} orders for {T}", which expands in place to the same list the desk shows for that target. Stays open after a queue. |
| Dossier (`CountryDetailPanel`) | emoji buttons | `OrderCard row` list from the registry (same `relevance` ordering) |

**Parity rule:** for any target, `mapOrders(target, expanded) == deskOrders(target)` as sets of `OrderDef.id`. Both come from one function `ordersFor(me, view)` in `orders.ts`, and a test enforces it (§9 WP3).

### 4.6 Layout per breakpoint

| Width | Desk catalog | Map menu | HUD capital | Rail |
|---|---|---|---|---|
| 1440 | tiles, 4 per row, min 220 px | popover 380 px, 2-column tiles, preview to the side | "Political capital", pips, "◆ 1 left", sub-line "2 held by orders · +2 next month" | meters: "Political capital", "Orders this month", "Meetings", "Defense budget" |
| 1024 | tiles, 2 per row | popover 380 px, reason lines wrap to 2 lines, preview below the grid | full label "Political capital" on two lines if needed. The leader name truncates first (`HUD` gives stats priority). | rail is a bottom sheet (current behaviour); the grab bar reads "◆ 1 left · Orders 2 of 6 · Meetings 0 of 3" |
| 390 | rows | bottom sheet of `row`s (min 56 px, 44 px action button whose label is the fix verb: "Add", "Remove", "Free ◆ 1", "Pick", "Why") | diamond pips plus "◆ 1 left". Tap opens a 2-line explainer (the glossary definition and the refill). | chip strip "◆ 1 left", "Orders 2 of 6", "Meetings 0 of 3" (spelled out). These are the point targets on phones. |

## 5. Point at it (G2)

### 5.1 Mechanism

- `ui/src/lib/pointAt.ts` holds a tiny separate Zustand store (no `gameStore` change): `pointAt(target: PointTarget, opts?: { detail?: string; slots?: number[] })` sets `{ target, nonce, detail }`, and the state clears after 1.6 s or when the source message unmounts (`holdWhile` option for persistent reasons).
- `usePointTarget(name)` returns `{ 'data-point': name, className: pointed ? 'is-pointed' : '' }`. Every element that draws a resource spreads it, so **all instances** react (HUD meter, rail meter, phone chip, map menu header ◆).
- If no instance is visible (rail collapsed on phone or tablet), the visible proxy reacts instead: the sheet grab bar or the chip strip. The grab bar never auto-opens the sheet, which would be too disruptive.
- `detail` shows as a small accent callout under the HUD meter: "Declare war on India needs ◆ 2" (concept §1).
- `slots` lights the tray slots whose removal would cover the gap (concept §3, desk rail).

### 5.2 Motion

`is-pointed`: two 0.8 s pulses (accent ring `0 0 0 2px var(--accent)` growing to a 10 px halo, scale 1.04), then a static ring while `holdWhile` is true. Only `transform` and `box-shadow` animate, which is cheap on weak laptops and phones. Under `prefers-reduced-motion`: static ring for 2 s, no scale.

### 5.3 Who calls it

| Source | Target |
|---|---|
| Unaffordable or invalid card: tap, focus, or hover on the reason | `block.points` |
| An available order added | `tray` once, and `capital` once if it costs ◆ |
| Execute disabled reason (`budgetStatus().blocked`, `useExecute`) | capital / defense / orders / meetings, by which check failed |
| Readiness list in the rail ("1 crisis on staff pick") | `tray` / crisis item |
| Debrief rejected line (unpredictable failures only, after this design) | none, those are chance failures |
| Glossary explainer on any resource label | itself |

## 6. Engine and API needs

1. **`src/core/availability.ts` (new, pure, no RNG):** `orderRules(world, action): OrderBlock | null` holds the rule layer, moved out of `preview.ts` early returns and the `applyAction` guards. `monthBlock(world, action, month: { pcLeft, ordersUsed, queuedKeys, defenseShareUsed }): OrderBlock | null` holds the month layer. Also `orderKey()` (moved from the UI and `turn.ts`) and the copy builder.
2. **`src/core/costs.ts`:** export `MAX_ORDERS` (moved from `turn.ts`) and keep `PC_CAP` and `politicalCapitalIncome`.
3. **`src/core/preview.ts`:** keep `blocked: string | null` for compatibility and add `block: OrderBlock | null` and `irreversible: boolean`. `blocked = block?.reason`.
4. **`src/core/turn.ts`:** Execute-time rejections call the same functions. `PlayerTurnReportSchema.orders[]` gets an optional `code` (in `types.ts`). Determinism is unaffected (pure reads). Run `tests/core/determinism.spec.ts`.
5. **API (`src/api/routes/game.ts`):**
   - `POST /api/orders/menu` `{ saveId, targetCountryId | null }` returns `{ orders: Array<{ id, type, params, label, costPC, defenseShare, chance, block, irreversible, missionWarning, summary, effects, risks }> }`, one entry per registry order applicable to that target. One call per menu or catalog open, cached client-side per `turn:target`. About 20 entries.
   - The registry ids must exist server side too. Option chosen: the engine owns the order list as data (`src/core/orders.ts`: id, type, params, verb, targeted, irreversible), and the UI registry adds presentation (family, relevance, blurb) keyed by `id`. A test checks that both id sets match.
   - New-game, turn and load payloads add `pcIncome` (this month's refill) and `pcCap`.
   - `POST /api/preview-action` keeps working and gains `block`.
6. **Harness:** no balance change is expected (no rule changes). Run `npm run sim -- --mode TERM --scenario 2026 --countries USA,UKR --games 12 --policy smart,none` once to confirm.

## 7. Toasts (replace the pattern for predictable refusals)

- `queueOrder()` returns `{ ok: true } | { ok: false, block: OrderBlock }` and **never calls `setError` for a block**. Callers render the block on the card and call `pointAt`. With the card showing state up front, this path should almost never run. It stays as a safety net against stale state.
- The global toast (`App.tsx`) is kept only for unpredictable problems (network, server error). It auto-dismisses after 6 s, collapses identical messages ("Connection failed ×3"), and clears when the store changes turn or the next order succeeds (fixes Leo's stale toast).
- Repeated identical warnings are collapsed in the readiness list too (G1).

## 8. Glossary (G3): one name per concept

Single source: `ui/src/lib/glossary.ts` (`TERMS`: `id`, `name`, `compact`, `token`, `definition`, `banned: RegExp[]`), mirrored in prose in `devloop/instances/world-conflict/glossary.md` and `docs/GAMEPLAY.md`. UI labels import `TERMS.x.name` / `.compact` instead of literals.

| Concept | Name (full, where it lives) | Compact (tight spaces) | Definition shown in the explainer | Banned in UI strings |
|---|---|---|---|---|
| Monthly action points | **Political capital** | **◆ n left** (the ◆ token is the only abbreviation) | "What your orders cost. You get +2 each month (+3 in a Flashpoint), up to ◆ 6. Unspent capital carries over." | "credit", "political credit", "PC", "Cap", "CAP", "Capital" without "Political" in a label |
| Order slots | **Orders this month** | **Orders n of 6** | "You can give up to 6 orders a month, one of each kind per country." | "Orders n/6", bare "n left" |
| Meetings you attend | **Meetings** | **Meetings n of 3** | "You attend up to 3 meetings a month. A deputy handles the rest with the default answer." | "In person" as a label, "n/3 in person", "0/3" |
| Defense money | **Defense budget** | **n% defense** | "Military orders use a share of this month's defense budget." | "def", "Defense" alone as a meter label |
| The 4x50 total | **Score** | **Score** | "Your standing out of 200: approval, stability, economy and security, moving 15% a month toward how things really are." | "Leadership score", "Leader score" |
| Stats | **Approval, Stability, Legitimacy, Economy, World tension** | the same full words (smaller type, never letters) | per stat | "APPR", "Appr", "STAB", "Stab", "LEGIT", "Legit", "TENS", "Tens", "GDP" as the stat label |
| Advisor recommendation | **Staff pick** (proposed, G5 design confirms) | **Staff pick** | "What your staff would do. Approve it or choose yourself." | "Suggested", "Staff suggests", "Staff" alone as a tag |
| Bulk approve | **Approve n staff picks** | **Approve n picks** | | bare "Approve n" |
| An order in the tray | **In this month** | **In this month** | | "queued", "on your desk" (player-facing) |
| Chance | **n% chance** | **n%** (inside a chip labelled by context) | | "success rate", "odds" in chips |
| Irreversible | **No undo** | | | |

Every resource label is also a button (or has an `i` button on touch) that opens its definition. Tapping it calls `pointAt` on itself, so Ruth can learn by tapping (E8).

**Enforcement:** `tests/ui-glossary.spec.ts` (root vitest, so it runs in `npm run test`) reads `ui/src/**/*.tsx|ts`, extracts string literals and JSX text with a small regex tokenizer, and fails on any `TERMS[*].banned` match. It skips identifiers, `className` values and lines ending in `// glossary-ok` (the allow-list for code-only strings). It also scans `data/flashpoints/*.json` objective labels, `src/core/data-loader.ts` objective labels and `docs/GAMEPLAY.md`.

## 9. Build plan (independent work packages)

The interfaces in §3.2 and §6 are the contract, so WP1, WP3, WP4 and WP5 can start in parallel against them. Each WP lists the files it owns. No two WPs edit the same file. Run WP6 and WP7 after WP4 merges.

| WP | Owner | Scope | Files (owned) | Depends on |
|---|---|---|---|---|
| **WP1 Engine availability** | Engine | `availability.ts` with all codes and copy. `preview.ts` adds `block`/`irreversible`. `turn.ts` routes rejections through it and adds `code` to the report. `MAX_ORDERS` moves to `costs.ts`. Engine order list `src/core/orders.ts`. Tests: every `blocked` preview has a code. **Agreement test:** over 24-turn sims with random player orders, any order `orderRules + monthBlock` passes is never rejected at Execute for a predictable reason (only chance failures). Determinism spec. | `src/core/availability.ts` (new), `src/core/orders.ts` (new), `src/core/preview.ts`, `src/core/turn.ts`, `src/core/costs.ts`, `src/core/types.ts`, `tests/core/availability.spec.ts` (new) | none |
| **WP2 API** | Engine/Backend | `POST /api/orders/menu`, `pcIncome`/`pcCap` in payloads, `block` on preview-action, `docs/API.md`. Route test. | `src/api/routes/game.ts`, `docs/API.md`, `tests/api/orders-menu.spec.ts` (new) | WP1 interface (can stub) |
| **WP3 Registry, glossary, tests, data copy** | Frontend + UX | `ui/src/lib/orders.ts` (registry, `ordersFor`, `orderLabel`, relevance moved from `mapOrdersFor`). `ui/src/lib/glossary.ts`. `ui/src/lib/actions.ts` derives verbs from the registry. `tests/ui-glossary.spec.ts`. `tests/ui-orders-parity.spec.ts` (map expanded == desk per target, and registry ids == engine ids). "Leadership score" becomes "Score" in data labels. `glossary.md`. `docs/GAMEPLAY.md` terms. | `ui/src/lib/orders.ts` (new), `ui/src/lib/glossary.ts` (new), `ui/src/lib/actions.ts`, `tests/ui-glossary.spec.ts` (new), `tests/ui-orders-parity.spec.ts` (new), `data/flashpoints/*.json` (labels only), `src/core/data-loader.ts` (labels only), `devloop/instances/world-conflict/glossary.md` (new), `docs/GAMEPLAY.md` | none |
| **WP4 OrderCard and availability client** | Frontend | `OrderCard` (tile/row/slot, 5 states, confirm face with hold-to-authorize), `OrderPreview`, `ui/src/lib/availability.ts` (month layer, menu fetch and cache, merging). `queueOrder()` returns a result, with no `setError` on blocks and no `window.confirm`. Styles in a new `orders.css` (keeps `wc.css` conflict-free). Dev gallery route `#orders` showing every state, for QA screenshots. | `ui/src/components/orders/OrderCard.tsx`, `OrderPreview.tsx`, `ConfirmFace.tsx` (new), `ui/src/lib/availability.ts` (new), `ui/src/styles/orders.css` (new), `ui/src/store/gameStore.ts` (`queueOrder`, `capitalLeft`, types for `OrderBlock`, menu cache), `ui/src/main.tsx` or the gallery router file for `#orders` | WP3 registry interface, WP2 endpoint (falls back to `/preview-action` per order until then) |
| **WP5 Point-at, meters, HUD vocabulary, toast** | Frontend + UX | `pointAt.ts` store and hook, `pointer.css`. One `CapitalMeter` (filled = left, hatched = held, dotted = next refill) used by the HUD and the rail. `data-point` on the HUD, rail meters, phone chip strip and grab bar. Labels from the glossary (no APPR/STAB/...). Resource labels open their definition. Execute-disabled reason points. Toast auto-dismisses, dedupes and clears. Tray slots accept `OrderCard slot` once WP4 lands (one follow-up commit inside WP5). | `ui/src/lib/pointAt.ts` (new), `ui/src/styles/pointer.css` (new), `ui/src/components/CapitalMeter.tsx` (new), `ui/src/components/Hud.tsx`, `ui/src/components/desk/CommandRail.tsx`, `ui/src/lib/useExecute.ts`, `ui/src/lib/budget.ts`, `ui/src/App.tsx` (toast) | none (tray part after WP4) |
| **WP6 Surfaces adopt OrderCard** | Frontend | Desk catalog, search hits and staff picks become `OrderCard`. `OrderDetail` uses `OrderPreview`. Map menu uses `OrderCard` tile/row, top 6 plus "All n orders for {T}" expanding in place, stays open after a queue. Dossier orders list. Remove the `CATALOG`, `mapOrdersFor` and `DOSSIER_ORDERS` data. | `ui/src/components/desk/Detail.tsx`, `ui/src/components/MapActionMenu.tsx`, `ui/src/components/CountryDetailPanel.tsx`, `ui/src/styles/wc.css` (delete the `.mam-item` rules only) | WP3, WP4 |
| **WP7 QA script** | QA | Kit scenario `devloop/instances/world-conflict/scenarios/orders.mjs` running the acceptance list below at 390/1024/1440 with screenshots, plus the hold-out check (CEO capital naming). | `devloop/instances/world-conflict/scenarios/orders.mjs` (new) | WP4 to WP6 |

Merge order: WP1, WP3 and WP5 (any order) first, then WP2 and WP4, then WP6, then WP7.

## 10. Acceptance criteria (numbered, observable)

**G1: never blocked without a reason**
1. In the desk "All orders" with no target picked, every targeted order shows "Pick a country first." on the card. Tapping it focuses the target picker and pulses it.
2. With ◆ 1 left, "Declare war on India" (◆ 2) shows "Needs ◆ 2, you have ◆ 1." and "+2 next month" (or +3 in a Flashpoint) on the card **before** any tap, on the desk, in search hits, in the map menu and in the dossier.
3. Tapping an unaffordable or invalid order never adds it, never shows a toast, and the card's reason stays visible.
4. With 6 orders queued, every non-queued card shows "All 6 orders this month are used." and points at "Orders this month".
5. A queued order shows "In this month" with Remove on every surface. Tapping it again never produces a duplicate message.
6. Nuclear strike against a country you are not at war with shows "Only in wartime. You are not at war with {T}."
7. After Execute, the debrief contains no `ok:false` dispatch whose code is NO_CAPITAL, NO_DEFENSE_BUDGET, ORDER_LIMIT, DUPLICATE or any rule code (engine agreement test, plus QA over 3 months of play).
8. No native `confirm`/`alert` dialog appears anywhere in the order flow (the Playwright dialog handler records zero dialogs).
9. The toast appears only for network or server errors, disappears within 6 s, and identical toasts collapse into one with a count.
10. Disabled-looking cards are reachable by Tab and announce "{label}, unavailable: {reason}" (axe or the accessibility snapshot shows it).

**G2: point at what you mean**
11. Tapping an unaffordable ◆ order adds `is-pointed` to every visible `[data-point="capital"]` element within 100 ms (HUD and rail at 1440; HUD and chip strip at 390), and the HUD callout names the order and its cost.
12. Where a queued order would free enough capital, its tray slot is highlighted at the same time.
13. Adding an order pulses its tray slot once, and the ◆ meter once if the order costs capital.
14. The disabled Execute reason ("Over political capital by 1: remove an order") points at the matching meter.
15. With reduced motion, pointing shows a static ring and no scale animation.

**G3: one vocabulary**
16. `npm run test` includes `tests/ui-glossary.spec.ts`, which passes. Adding the string "political credit" or "APPR" to any UI file makes it fail.
17. At 1024 x 768 the HUD shows "Approval", "Stability", "Legitimacy", "Economy", "Political capital", "World tension" and "Score" as full words.
18. The HUD capital meter and the rail capital meter show the same filled diamond count, equal to "◆ n left".
19. No visible string reads "Orders n/6", "In person", "Leadership score" or "Approve n" without a noun (checked by the glossary test and by a QA text dump at 390/1024/1440).
20. Tapping "Political capital" (or its ◆ on the phone) shows the definition, including the refill amount and the ◆ 6 cap.

**G6: desk and map parity**
21. For any target, the map menu's expanded list and the desk catalog with that target selected contain the same orders with identical labels (`tests/ui-orders-parity.spec.ts` plus a QA spot check on 3 targets).
22. For the same order and target, the map card and the desk card show the same ◆ cost, defense share, chance and reason text.
23. Queuing from the map keeps the menu open and turns the card to "In this month" with a check stamp. The order then appears in the desk tray.
24. The map card's info button (touch) or hover (desktop) shows the same preview content as the desk order detail.

**Irreversible orders**
25. Enter on "Declare war on {T}" in search opens the confirm face with focus on "Keep the peace". A second Enter cancels and does not declare war.
26. A nuclear strike needs a 1.2 s hold on "Hold to authorize". Releasing early leaves nothing queued.
27. An order with a mission warning shows the warning on the confirm face (amber), once.

## 11. Risks and open points

- **Payload and latency:** one menu call per target per month, cached. Fallback: per-order `/preview-action` (exists today). No per-hover requests.
- **Engine and UI copy drift:** reason text is built only in `availability.ts`. The UI renders `block.reason` and never rewrites it, except the month layer, which uses the same template table mirrored in `ui/src/lib/availability.ts` and covered by a snapshot test against the engine strings.
- **"Staff pick" naming** is coordinated with the G5 (suggestions) design. If G5 chooses another word, only `glossary.ts` changes.
- **Card density on the 1024 desk:** tiles can grow taller than today's buttons. WP6 verifies the catalog still fits two categories above the fold at 1024 x 768, or collapses categories into tabs.

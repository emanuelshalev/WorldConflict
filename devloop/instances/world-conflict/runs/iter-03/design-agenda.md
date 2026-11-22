# Design: the month as a guided agenda (D-65)

Owner: UX Designer, with the Art Director and the Game Designer. Iteration 3. Builds on D-64 (the titled "Staff picks" group next to every Approve control), the newcomers package (month 1 goal sentence, Focus view, staff propose and the player spends) and design-month.md (iteration 1).

Concept mocks (HTML + screenshots) in `concepts/`:

| Mock | 1440 | 390 | Shows |
|---|---|---|---|
| `agenda-a-desk-m1.html` | `agenda-a-desk-m1-1440.png` | `agenda-a-desk-m1-390.png` | Variant A, month 1, newcomer |
| `agenda-a-desk-m4.html` | `agenda-a-desk-m4-1440.png` (+ `-1024.png`) | `agenda-a-desk-m4-390.png` | Variant A, month 4: crisis, 4 meetings, 2 proposals, own moves |
| `agenda-b-desk-m4.html` | `agenda-b-desk-m4-1440.png` | `agenda-b-desk-m4-390.png` | Variant B, top agenda bar with steps |
| `agenda-map.html` | `agenda-map-1440.png` | `agenda-map-390.png` | Map mode: agenda drawer and strip |
| `agenda-skip.html` | `agenda-skip-1440.png` | `agenda-skip-390.png` | The Skip choice, its confirmation and the Skipped list |
| `agenda-affordance.html` | `agenda-affordance-1440.png` | `agenda-affordance-390.png` | The affordance key |

Regenerate: `node devloop/instances/world-conflict/runs/iter-03/agenda-shots.mjs [name ...]`.

## 1. Problem (with evidence)

CEO, RS-006: "It's unclear what the things to go through are: some things on the left panel, some things on the right. There is no clear way to iterate over the things to do or open, and to be intentional about what I want to skip. [...] Also it's not intuitively clear what is clickable and what is not."

What the code does today (branch `dev/rc1-synthetic-loop`, 4a8144a):

1. **Three lists of the same month, none of them a to-do list.** Full desk: `desk/Navigator.tsx` (left) lists Mission, Crises, Meetings, "Advisors' suggestions", "All orders"; `desk/CommandRail.tsx` `Tray` (right) lists "This month you will" (crisis slots, order slots, an empty order slot, a meetings line); Focus view (`Desk.tsx` `FocusView`) shows one Your move card, then `AdvisorList`, then `AlsoOnDesk` (other crises, a mission meeting, "n calls and meetings", orders, All orders). The same meeting can appear in three places with three different wordings ("Open", "a deputy goes unless you answer", "On Approve, staff attend 3").
2. **No order and no progress.** `lib/deskItems.ts` defines an order (used only for J/K), but nothing on screen numbers the items or says how many are left. The rail's "n decided" counts decisions, not items gone through.
3. **No deliberate skip.** Skipping is the absence of action: an untouched meeting silently goes to a deputy, an untouched crisis silently takes the cabinet pick, an unapproved proposal silently does not run. "Send a deputy" exists only on a meeting stage (`YourMove.tsx` line ~172). Approve all (`approveAll()` in `lib/month.ts`) mixes three outcomes into one press.
4. **Navigation is two modes with different contents.** Focus and Full desk (`GoalLine.tsx` toggle) are different layouts, not two speeds of the same list; month 1 (`lib/ease.ts` `simpleMonth`) hides the rest behind "Show the whole desk".
5. **Map mode has no list at all.** `CommandStrip` shows chips, "n crisis on the cabinet pick", a collapsed "Your advisors suggest" and Approve: RS-005's "I am not sure what I am approving".
6. **Clickable and static look alike** (full list in 6.4): bordered static cards next to bordered button cards, status pills shaped like buttons, buttons with no border at all.

Related: RS-001 ("unclear what is expected", "where are the suggestions?"), RS-005 (staff picks unseen), F-01-4 (density), F-00-3.

## 2. Principles

P1. **One list, one order.** The month is a numbered agenda: crisis first, then meetings, then orders. The same list, in the same order, with the same state words, is on the desk, in Map mode and on phones.
P2. **Every item ends with a deliberate choice.** Decide yourself, accept the staff pick, or skip, with the consequence of skipping written on the Skip button itself. Nothing is skipped silently any more: untouched items are "not handled yet", and Execute says what will happen to them.
P3. **Left = what to go through, right = what will happen.** Labelled as steps: 1 Go through, 2 Review, 3 Execute.
P4. **Guided by default, never forced.** Next/Back and auto-advance for newcomers; any item can be opened from the list at any time; Full desk and keyboard for experts; Execute is never locked behind the agenda.
P5. **Pressable things look pressable, nothing else does** (section 6), enforced by a test.

## 3. Flow

### 3.1 The agenda (model)

New `ui/src/lib/agenda.ts` builds `agendaItems(state): AgendaItem[]` (replaces `deskItems()` and is the only source for Navigator, step-through, Map drawer, J/K, phone sheet):

```
AgendaItem = {
  key: string                       // 'crisis:<id>' | 'meeting:<id>' | 'proposal:<index>' | 'moves'
  kind: 'crisis' | 'meeting' | 'proposal' | 'moves'
  title: string                     // "Xi Jinping calls", "Staff propose: Court India"
  staffPick?: { label: string; effect?: string }   // what "Accept staff pick" does
  skip: { label: string; means: string }           // what "Skip" does (section 5)
  state: 'open' | 'mine' | 'staff' | 'skipped'     // derived from the store, never stored twice
  needsYou: boolean                 // false for items handled for you (month 1 meetings)
}
```

Order: (1) crises, primary first (`primaryItem()` order, then EXISTENTIAL, URGENT, rest); (2) meetings, mission meetings first, then by urgency; (3) staff proposals, in the order staff added them; (4) one "Your own moves" item (advisors' suggestions, Big move, All orders). Length today: 1 to 2 crises + 3 to 5 meetings + 0 to 2 proposals + 1 = at most 10.

State comes from the existing store fields plus one new map, `handled: Record<key, 'mine' | 'staff' | 'skipped'>` in `gameStore.ts`, persisted per save and month next to `reviewed` and `decisionChoices` (the subscriber in `lib/month.ts`). Mapping to existing effects (no engine change):

| Kind | Decide yourself (`mine`) | Accept staff pick (`staff`) | Skip (`skipped`) | Not handled at Execute |
|---|---|---|---|---|
| Crisis | `chooseDecision(id, option)` | `reviewed[id] = true` with the cabinet pick | cabinet pick stays, not marked approved | cabinet pick applies |
| Meeting | choose an answer (attend, uses 1 of 3) | attend with `meetingPick(m)` | `defaultOptionId` (deputy) | deputy goes (as today) |
| Staff proposal | change it (opens the order card for another target or order) | `approveProposal(i)` | `dismissedStaff` + removed from plan, nothing spent | does not run (as today) |
| Your own moves | add orders from suggestions or All orders | add the top advisor suggestion | no extra orders | nothing |

### 3.2 Step-through (Guided)

- The current item is the hero of the centre column: kicker ("Call on the secure line, China"), title, lede, staff line, options as choice cards (radio cue), then the **handling box** "How do you handle this call?" with three buttons (copy in 7). Each button records the choice and, in Guided, advances to the next item that is `open` (wrapping once; when none is left, focus moves to the plan's Review header with the line "All 8 handled. Review your plan, then execute.").
- `Back` and `Next: <next item title>` above the hero. Next without a choice does not mark anything: the item stays "Needs you".
- Selecting an option card only selects it; "Use my answer" commits it (one deliberate press, no double meaning of a card tap). Keyboard: 1 to 4 select, Enter = primary handling button, S = skip, A = accept staff pick, J/K = next/previous item, Shift+A = approve all staff picks, Ctrl+Enter = execute.
- After a Skip, a status line at the top of the next item: "Skipped: Court India. It will not run this month and your ◆ 1 stays in the bank. [Undo]" (`agenda-skip`). Undo returns to the skipped item with its state cleared.
- Reopening a handled item shows its choice ("You attend: hold firm") and a "Change" link; changing re-records.

### 3.3 Free navigation (experts)

- Every agenda row is a button: click jumps to that item. In Guided, a choice then advances to the next open item after it; experts turn auto-advance off with Full desk (below).
- The GoalLine toggle becomes **Guided | Full desk**. Guided: auto-advance on, one item at a time. Full desk: same three columns, auto-advance off, the centre can also show All orders, the advisors list and an order in the plan (today's `Detail` targets). The saved choice persists as today (`deskView`), with Guided the default for months 1 to 3 and on phones (`defaultDeskView`).
- Approve all stays (D-64 group button "Approve n staff picks"): it sets `staff` on every open item that has a staff pick, and the agenda shows the result.
- Execute is always available (unless a budget blocks it, as today). With open items, its line says exactly what happens to them (copy in 7).

### 3.4 Month 1 (newcomer) and month N (expert)

Month 1 (`agenda-a-desk-m1`), with the newcomers package:
- The goal sentence (`MissionLine`) stays above the first item; the goal line keeps "How you win: read your goal".
- The agenda lists only items that need the player: the crisis and the staff proposals (usually 1 or 2). Meetings are listed under a flat panel "Handled for you in month 1: 3 meetings, your deputies take them. From month 2 you choose." with a link "See the meetings anyway" (adds them to the agenda for this month). This replaces "Show the whole desk" (`ShowDesk`): nothing is hidden, it is named.
- A one-line coach panel at the top of the agenda: "Go through them in order. Each one ends with your choice: decide yourself, accept the staff pick, or skip." Dismissed after the first handled item, never shown again (`lib/learn.ts` flag). The three-step coach (`Coach.tsx`) points at: the agenda, the handling box, Execute.
- The plan column shows only You decided, Staff picks (with the first-use line from D-64) and political capital; the other budgets appear from month 2.
- Progress counts only `needsYou` items: "0 of 2 handled".

Month N (`agenda-a-desk-m4`): all items listed, meetings grouped under "Meetings: you can attend 3", the full plan column. A player who switched to Full desk keeps it; Guided remains one click away.

## 4. States

| Element | States |
|---|---|
| Agenda row | `open` (number, amber dot "Needs you"); `now` (amber number, amber border, "Now: needs you", `aria-current="step"`); `mine` (green check, "Your pick: ..." / "You attend: ..."); `staff` (green check, blue dot "Staff pick approved: ..."); `skipped` (dashed number, dashed dot "Skipped: <consequence>"); `handled for you` (month 1 meetings, in the flat panel, not numbered) |
| Progress | "n of m handled" + one segment per item (green handled, dashed skipped, amber now, grey open) |
| Handling box | no option selected ("Use my answer" disabled with "Pick an answer above first"); option selected (primary names it); already handled (shows the choice, "Change"); unavailable option (calendar full: the card says why, Skip still available) |
| Plan column | empty ("Nothing yet. Your choices appear here."); groups You decided / Staff picks (waiting, approved) / Skipped / Budgets; over budget (as today, the reason points at its meter) |
| Execute line | all handled: "Everything is handled."; open items: what happens to them; blocked: the reason, as today |
| Map drawer | open on the first open item when entering Map mode in a month with open items; closed to the strip pill; current item expanded inline |
| Phone | agenda pill (sticky, opens the list as a sheet); command bar ("Your plan", Execute) opens the plan as a sheet |

## 5. What Skip means (shown on the button and in "What does Skip do?")

| Kind | Skip button | Sub-line |
|---|---|---|
| Crisis | Leave it to the cabinet | Their pick applies when you execute. You can come back. |
| Meeting | Send a deputy | Default answer, free. <Leader> notices you were not there. |
| Staff proposal | Do not run it | Nothing happens. ◆ n stays in the bank. |
| Your own moves | No more orders this month | Unspent political capital carries over (up to ◆ 6). |

Game Designer note: crisis Skip and crisis Accept have the same game effect; they differ in the record (Skipped vs Staff pick approved) so the player sees what they chose to look at. No balance change; the harness `staff` policy (Approve all) is unaffected.

## 6. Affordance system

### 6.1 Visual language

Clickable (one look, `agenda-affordance`):
- **Primary button**: filled amber, at most one per region (the handling box's main choice, Execute).
- **Button**: 1.5 px outline, raised (2 px bottom shadow), sinks 1 px on press, visible label. Skip = same button with a dashed outline.
- **Card you can open or pick**: raised card (border, gradient, bottom shadow) with a trailing cue: `›` opens, `▾` expands, a radio picks. The whole card is the target.
- **Link**: intel blue and always underlined.
- **Switch / chip**: a bordered pill. A bordered pill is never static.
- Every clickable thing: hover changes the border, focus ring 2 px amber, min 44 x 44 px on touch (36 px on pointer devices for small buttons in dense rows).

Not clickable:
- **Stat panel**: flat surface, no border, no shadow, no cue (budgets, meters, facts).
- **Status**: a dot or icon plus a word, never a bordered pill.
- **Labels and headings**: plain text, sentence case, at least 13 px (Ruth ignores small caps).
- **Region frames** (item body, handling box, Staff picks group) may have a 1 px hairline border but never a bottom shadow, a cue or a hover change.
- **Rows that are only partly active** are flat panels with a real button inside; no half-clickable cards.

### 6.2 Tokens and classes

`ui/src/styles/affordance.css` (new, imported by `wc.css`): `--af-raise` (the bottom shadow), `--af-press`, `--af-focus`; classes `.af-btn`, `.af-btn.primary`, `.af-btn.skip`, `.af-card` (+ `[data-af-cue]` child), `.af-link`, `.af-chip`; static `.af-panel`, `.af-stat`, `.af-tag`, `.af-label`. Existing classes are mapped, not renamed in one go: `wc-btn` -> af-btn, `also-row`, `nav-row`, `slot-card`, `wc-card` press area -> af-card, `link` -> af-link, `seg` -> af-chip; `budget-tile`, `chip-b`, `adv-row`, `nav-tag`, `sel-mini`, `sel-badge`, `stat` -> static classes.

### 6.3 Rules a test can enforce

- AF-1. Every element whose computed `cursor` is `pointer` is, or is inside, `button`, `a[href]`, `summary`, `label[for]`, `input`, `select`, `[role=button|link|tab|option|radio|checkbox|switch|menuitem]`, or a registered map feature (`[data-map-feature]`), and has a non-empty accessible name.
- AF-2. Every interactive element (as listed in AF-1) has `cursor: pointer` (or `not-allowed` when disabled) and at least one of: the `--af-raise` shadow, an underline, a bordered pill, a radio/checkbox cue, or a `[data-af-cue]` child. (Map features and explain marks `lx-mark` are registered exceptions with their own documented cue.)
- AF-3. No non-interactive element has a `:hover` rule that changes border, background or shadow (stylesheet scan: every `:hover` selector's subject class must be in the interactive class registry).
- AF-4. No non-interactive element has `border-radius >= 999px` together with a visible border (the pill rule), and no non-interactive element has the `--af-raise` shadow.
- AF-5. No interactive element contains another interactive element unless the outer one is a flat region (`.af-panel`); a raised card never contains a button (`slot-card order` today).
- AF-6. JSX: no `onClick` on `div`, `span`, `li`, `article`, `section`, `p` unless it is a backdrop (`data-backdrop` + `aria-hidden`) whose click only closes; enable `jsx-a11y/click-events-have-key-events`, `no-static-element-interactions`, `no-noninteractive-element-interactions` in `ui/eslint.config.js`.
- AF-7. A backdrop click never confirms or commits anything.
- AF-8. No control explains its effect only in `title` (hover-only): if a button has a `title` longer than its label, the same information is visible next to it or in its accessible description.
- AF-9. Interactive elements are at least 44 x 44 px at 390 and 1024 widths (24 x 24 for inline links in running text).

### 6.4 Current violations found in the code

Looks clickable, is not:
1. `desk/AdvisorList.tsx` lines 37, 107: `.adv-row` is a bordered 14 px card (same look as the `.also-row` buttons right under it in Focus view), but only its Add button / link acts. (AF-4 spirit, AF-5 look)
2. `desk/CommandRail.tsx` line ~93 `Budgets`: `.budget-tile` bordered tiles, static, next to `.slot-card` buttons with the same border. 
3. `desk/CommandRail.tsx` lines 431-436 `CommandStrip`: `.chip-b` spans are 44 px bordered pills (AF-4), static.
4. `desk/Navigator.tsx` lines 99, 125 `.nav-tag`; `CommandRail.tsx` line 150 `.sel-mini` ("Cabinet pick"); `YourMove.tsx` line 57 `.sel-badge` (36 px filled amber pill, identical to a primary button): static status words shaped as buttons (AF-4).
5. `CommandRail.tsx` line 156 `slot-card order` and line 201 `slot-card order proposed`: the whole card is styled as a raised card but only its middle is a button, plus Approve and X buttons inside (AF-5).
6. `YourMove.tsx` hero (`.stage-hero`): full-bleed scene art directly above option cards with the same art thumbnails; not a target, fine, but option art thumbnails inside `CardShell` repeat it. Check with AF-3 only.

Clickable, looks static:
7. `desk/Navigator.tsx` line 51 `.nav-row`: transparent border and background until hover; reads as a plain list (RS-006 "not clear what is clickable"). Same for `.nav-goal` (line 71).
8. `desk/GoalLine.tsx` line 53 `.goal-main`: the whole goal line is one borderless button (hover underlines only the title); `.goal-step` (line 65) likewise.
9. `CommandRail.tsx` line 185 `slot-card empty meet`: a button styled as an empty dashed placeholder in grey ("2 meetings: a deputy goes unless you answer"), reads as disabled.
10. `components/Hud.tsx` lines 119, 149 `.stat-btn`: political capital and score are borderless buttons identical to the static stats beside them (lines 108, 138).
11. `CommandRail.tsx` line ~311 `ScoreNote`: a whole sentence is a button with only "Why?" styled as a link.
12. `CommandRail.tsx` line ~425 `.strip-tray-btn` "Your advisors suggest": a toggle styled as plain text.

Behaviour and semantics:
13. `components/Chronicle.tsx` line 49: `div.stinger` with `onClick` and `role="alert"`, no keyboard access (AF-6).
14. `components/ActionPreviewModal.tsx` line 32: the backdrop click **confirms** the order when it is not blocked (AF-7).
15. `components/Hud.tsx` line 206: `div.hud-phone-menu` with `onClick` (AF-6; a backdrop, needs `data-backdrop`).
16. `components/reveal/RevealDemo.tsx` line 99: toast `div` with `onClick` (dev route; exempt or fix).
17. `CommandRail.tsx` line 272 `ApproveButton`: what it does is only in `title` (AF-8); D-64 replaces it with the titled group.
18. `GoalLine.tsx` line 65 and `CommandRail.tsx` line 168 (`title={a.why ?? ...}` on slot buttons): meaning in hover-only titles (AF-8).
19. Five clickable styles for the same kind of action "open this item": `.also-row`, `.nav-row`, `.slot-card`, `.show-desk` (dashed), `.link`. One class (`af-card`) replaces the first four.

## 7. Copy

| Where | Text |
|---|---|
| Left header | "1 · This month: go through these" / sub "In order, or click any item" (month 1: "Two things need you") |
| Progress | "2 of 8 handled" |
| Group labels | "Crisis", "Meetings · you can attend 3", "Orders" |
| Row states | "Needs you", "Now: needs you", "Your pick: <option>", "You attend: <answer>", "Staff pick approved: <option>", "Staff pick waiting · ◆ 1", "Skipped: <consequence>", "Optional · 3 suggestions, all orders" |
| Item nav | "‹ Back", "Item 2 of 8 · Meeting (call)", "Next: Takaichi visits ›" |
| Handling box title | "How do you handle this crisis / call / visit / meeting / interview / proposal?" + "Every item ends with one of three choices. Each takes you to the next item." (month 1 and until 3 items handled) |
| Handling buttons | YOUR ANSWER "Take the call: 'Hold firm'" / "You attend (meeting 1 of 3) · then item 3"; STAFF PICK "Accept 'Offer a quiet pause'" / "You attend with the staff's answer"; SKIP per section 5. Proposal: YOUR CALL "Change it", STAFF PICK "Approve the order" / "Spends ◆ 1 when you execute" |
| Skip confirmation | "Skipped: <title>. <consequence>. It is listed under Skipped in your plan. [Undo]" |
| Right header | "2 · Your plan: what will happen" / "Updates as you go through" |
| Plan groups | "You decided n", "Staff picks n waiting for your OK" (D-64; row sub-line "If you do nothing: a deputy goes / this pick applies / not run"), "Skipped n", "Budgets" |
| Execute | "3 · Execute"; "Everything is handled." or "6 items not handled yet. If you execute now, deputies take 3 meetings and the 2 proposals do not run."; button "Execute month" |
| All handled | "All 8 handled. Review your plan, then execute." |
| Map pill | "Agenda · 3 of 8 handled" / "Now: PM Takaichi visits" |
| Phone pill | "Item 2 of 8 · Xi Jinping calls" / "2 of 8 handled · tap for the list" |
| View switch | "Guided" / "Full desk" |

All words from `lib/glossary.ts` (political capital, staff pick, meetings, orders this month); add "agenda", "handled", "skip" entries; ban "to-do", "task", "queue" as synonyms.

## 8. Layout per breakpoint

### 1440 (laptop: Dan, Marcus, Sam, Ruth at 125%)
Three columns under the HUD and goal line: agenda 288 px | current item (fluid, options in 3 columns) | plan 360 px. The agenda and plan scroll on their own; the plan's Execute footer is fixed at the bottom of its column. At 125% zoom (1152 px effective) the tablet layout applies.

### 1024 (tablet landscape: Ruth)
The agenda becomes a horizontal numbered stepper above the item (variant B's bar, scrolls sideways, current item kept in view); item | plan 320 px; options stacked. (`agenda-a-desk-m4-1024.png`.)

### 390 (phone: Noah, Maya, Olivia)
Sticky agenda pill under the goal line ("Item 2 of 8 · ...", segment bar) that opens the agenda as a bottom sheet; the item; the handling box with its three buttons stacked (60 px each, Skip last and dashed); a fixed command bar "Your plan · 4 staff picks ▴" + "Execute". The plan sheet holds the Staff picks group, Skipped, budgets. No horizontal scroll (checked by the shot script).

### Map mode (all sizes)
Agenda drawer on the left (340 px, over the map) with the current item expanded inline: its options as compact choice cards and the handling buttons; the strip along the bottom holds the agenda pill (opens/closes the drawer), static budget stats, the inline "Staff picks: n waiting" group with "See them" and "Approve n staff picks", Desk and Execute. On phones the drawer is a bottom sheet (64% height) above the strip. Clicking a country with the drawer open keeps the drawer and opens the map order menu beside it; an order added there appears in the plan and marks "Your own moves" as `mine`.

## 9. Variants and recommendation

**A: left agenda column** (`agenda-a-*`). A vertical numbered list on the left, item centre, plan right.
- For: matches the CEO's own mental model ("left panel / right panel") and fixes it by labelling; fits 10 items with full titles and state words; room for group labels and the month 1 "handled for you" panel; the list stays visible while answering (Dan, Sam).
- Against: takes 288 px; needs a different form below 1280.

**B: top agenda bar with steps** (`agenda-b-desk-m4`). Numbered step chips under the goal line ending in "2 Review your plan" and "3 Execute", item centre (wider), plan right.
- For: the steps metaphor is explicit; the item gets more width; familiar from checkout flows (Ruth, Olivia).
- Against: at 1440 with 8 items the bar already overflows and pushes Review and Execute off-screen (see the 1440 shot); titles truncate to two words; no room for consequences ("Skipped: a deputy answers") on the chips; puts the list far from the plan.

**Recommendation: A**, with B's bar as A's responsive form at 1024 and below and as the compact form in Map mode. Ask the panel (concept test) to confirm: success = every persona can state "go through the list on the left, then check the plan on the right, then execute" after one look.

## 10. Acceptance criteria (numbered, testable)

AC-1. On the desk at 1440, 1024 and 390, exactly one element has `data-agenda` and lists every item of `agendaItems()` in order (crises, meetings, proposals, own moves), each numbered 1..n.
AC-2. The progress text matches `/^\d+ of \d+ handled$/` and equals the count of items with `state != 'open'` among `needsYou` items.
AC-3. The left column (1440) has an accessible name starting "This month: go through these" and a visible step number 1; the right column is named "Your plan: what will happen" with step 2; the Execute region shows step 3.
AC-4. The current item has `aria-current="step"`; Back and Next exist; Next's label names the next item's title (at >= 1024).
AC-5. Every crisis, meeting and proposal item shows exactly three handling buttons whose labels start with the YOUR ANSWER/YOUR CALL, STAFF PICK and SKIP keywords; the Skip button's text includes its consequence from section 5.
AC-6. Pressing any handling button sets the item's state, and in Guided moves `aria-current` to the next open item within 400 ms.
AC-7. After Skip, a status line with "Skipped:" and an Undo button appears; Undo restores the previous state; the item appears under "Skipped" in the plan with its consequence.
AC-8. With open items, the Execute region's text names what happens to them (deputies, cabinet picks, proposals not run) and the counts match the store; Execute stays enabled unless a budget blocks it.
AC-9. Clicking any agenda row (including handled ones) makes it current, in Guided and in Full desk; J/K move through the same order.
AC-10. Month 1: the agenda lists only items that need the player (crisis and proposals); a flat panel names the meetings handled for the player with a "See the meetings anyway" link; the goal sentence sits above the first item; no "Show the whole desk" button.
AC-11. Map mode: the strip shows the agenda pill with the same "n of m handled" as the desk; opening it shows the same items in the same order; the current item can be handled from the drawer with the same three choices; the Staff picks group is titled "Staff picks" (D-64).
AC-12. At 390 no horizontal scroll; the agenda pill and the command bar stay visible while scrolling the item; every interactive element is at least 44 x 44 px.
AC-13. Approve all ("Approve n staff picks") marks every open item that has a staff pick as `staff` and the progress updates.
AC-14. A reload restores `handled`, the current item and the progress (per save and month).
AC-15. Affordance rules AF-1 to AF-9 pass on: desk month 1, desk month 4, Map mode, the order catalogue, the result card, at 390 and 1440.
AC-16. Violations 1 to 15 and 17 to 19 in 6.4 are fixed (16 is a dev route: fixed or registered as exempt).
AC-17. The harness `staff` policy and balance bands are unchanged (no engine change).

## 11. Work packages

WP-A1 Agenda model (UI logic). New `ui/src/lib/agenda.ts` (`agendaItems`, `skipMeaning`, `handle(key, how)`), `handled` in `ui/src/store/gameStore.ts`, persistence in `ui/src/lib/month.ts`; `approveAll()` writes `handled`; `ui/src/lib/deskItems.ts` delegates to `agendaItems`; glossary entries in `ui/src/lib/glossary.ts`. Unit tests `tests/ui-agenda.spec.ts` (order, states, skip mapping, Approve all, persistence key).

WP-A2 Desk layout and step-through. `ui/src/components/Desk.tsx` (one layout; `FocusView`, `AlsoOnDesk`, `ShowDesk`, `QuietMove` retire into the agenda), new `ui/src/components/desk/Agenda.tsx` (column, stepper and sheet forms), new `desk/HandleBox.tsx` (three choices, skip confirmation, Undo), `desk/YourMove.tsx` (uses HandleBox; remove the ad hoc Approve/Send a deputy row), `desk/Detail.tsx` (proposal and own-moves items), `desk/Navigator.tsx` (replaced by Agenda; mission rows move to the goal line sheet), `desk/GoalLine.tsx` (Guided | Full desk), `desk/Coach.tsx` (3 steps: agenda, handling box, Execute), keyboard in `Desk.tsx` `useDeskKeys`. CSS in `ui/src/styles/month.css` / `desk-stage.css`.

WP-A3 Plan column. `desk/CommandRail.tsx`: `Tray` becomes You decided / Staff picks (the D-64 component, reused, not duplicated) / Skipped / Budgets; Execute line from `agendaItems`; `CommandBar` phone sheet; remove `slot-card empty meet`.

WP-A4 Map mode. `CommandStrip` in `desk/CommandRail.tsx`: agenda pill, inline Staff picks group, static stats; new drawer form of `desk/Agenda.tsx` with `HandleBox compact`; open-on-enter rule in `ui/src/lib/ease.ts`; `MapActionMenu.tsx` coexists with the drawer.

WP-A5 Affordance system. New `ui/src/styles/affordance.css`; map existing classes (6.2) in `wc.css`, `month.css`, `desk-stage.css`, `ease.css`, `hud.css`; fix violations 6.4 in `AdvisorList.tsx`, `CommandRail.tsx`, `Navigator.tsx` (if kept for Full desk), `YourMove.tsx`, `GoalLine.tsx`, `Hud.tsx`, `Chronicle.tsx`, `ActionPreviewModal.tsx`; ESLint jsx-a11y rules in `ui/eslint.config.js`.

WP-A6 Guards and docs. Scripts and tests in 12; registry entries RS-006-1 (agenda), RS-006-2 (deliberate skip), RS-006-3 (affordance) in `devloop/instances/world-conflict/regressions.yaml`; update `docs/GAMEPLAY.md` section 2 (month flow, keys), `docs/ARCHITECTURE.md` (agenda.ts), CLAUDE.md frontend paragraph; refresh `tests/visual` baselines.

Order: A1 -> (A2, A5 in parallel) -> A3 -> A4 -> A6. A5 can ship alone first if A2 slips.

## 12. Regression guards to add

- `tests/ui-agenda.spec.ts` (vitest): agenda order, state derivation, skip mapping per kind, Approve all, month 1 `needsYou` filter.
- `devloop/instances/world-conflict/scenarios-qa/regressions/RS-006-1.mjs` (Playwright, Hormuz Convoy USA fixed seed): AC-1 to AC-6, AC-9, AC-14 at 1440 and 390; walks every item with Next and handles each with a different choice.
- `.../RS-006-2.mjs`: Skip on a meeting, a proposal and a crisis; checks the confirmation, Undo, the Skipped list and the Execute line (AC-7, AC-8), then executes and checks the result card: the meeting went to a deputy, the proposal did not run, ◆ unchanged.
- `.../RS-006-3.mjs` (affordance audit, reusable `devloop/kit/page-check.mjs` addition `affordanceAudit(page)`): AF-1, AF-2, AF-4, AF-5, AF-9 on the computed DOM of 6 screens x 2 widths; fails with a list of selectors.
- `tests/ui-affordance-css.spec.ts` (vitest, stylesheet scan): AF-3 (hover only on registered interactive classes), AF-4 (pill rule on static classes), `--af-raise` only on interactive classes.
- ESLint jsx-a11y rules (AF-6) in `cd ui && npm run lint`, so the verify gate fails on a new clickable `div`.
- `tests/ui-glossary.spec.ts`: add "agenda", "handled", "skip" and ban the synonyms "to-do", "task", "queue".
- RS-005 guard extended: in Map mode, the Approve control sits inside a group titled "Staff picks" that lists each pick (AC-11).
- Visual baselines (`tests/visual`): desk month 1, desk month 4, Map mode with drawer, at 390 and 1440.

## 13. Risks

- Experts find the stepper slower (D-65 risk): Full desk keeps the three columns with auto-advance off; keyboard covers every choice; Approve all stays one press.
- Ten items feel like homework: month 1 has 1 to 2; meetings stay capped at 5; "Your own moves" is optional and says so; Execute is never locked.
- Crisis Skip equals Accept in effect: explained in "What does Skip do?"; if the panel finds it confusing, crisis Skip becomes "Decide later" with the same consequence line.
- D-64 is landing in parallel: WP-A3 must reuse its Staff picks component and copy, not fork it.

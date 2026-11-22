# Design: learn as you play (G12, C14)

Owner: UX Designer, with the Content Consultant and the Game Designer. Iteration 1.
Concepts (self-contained HTML, house tokens, real copy), screenshots next to them:

| File | Shows |
|---|---|
| `concepts/learn-a-underline.html` (`-1440.png`, `-390.png`) | A: inline underlines, popover (desktop) / bottom sheet (touch) |
| `concepts/learn-b-briefing.html` (`-1440.png`, `-390.png`) | B: "Briefing" tab / sheet listing every name on the screen |
| `concepts/learn-c-info.html` (`-1440.png`, `-1440-full-drawer.png`, `-390.png`) | C: quiet "i" per paragraph, "What is going on here?" situation briefing, codex unlock |
| `concepts/learn-onboarding.html` (`-1440.png`, `-390.png`) | Shared: the familiarity question, Settings section, codex drawer |

Concept test for the panel: `learn-concept-test.md`.

---

## 1. Problem

The CEO wants the game to be a learning tool without bothering players who already know the material (RS-003, verbatim). Crisis and briefing text is dense with real names that most of the audience does not know, and nothing in the UI explains them.

| # | Evidence | What happened | Where in code |
|---|---|---|---|
| E1 | CEO RS-003 | "The explanations may contain names and concepts people are not familiar with... we don't want to bother [experts] with accessibility UI elements they don't need... maybe a way to turn these features on and off." | No explanation surface for world knowledge exists. |
| E2 | Priya, `priya-flash/036-us.png`, `032-deb1.png` | "No real-world context. I came to learn what really happened." | Debriefs and the Chronicle restate choices; flashpoint `sources` and `hook` are never shown in play. |
| E3 | Priya, `priya-flash/007-desk.png` | The opening crisis alone uses Donetsk oblast, the fortress belt, Kramatorsk, Sloviansk, the midterms, a referendum (a constitutional rule), the Rada, the Pokrovsk axis, Moscow and Washington as metonyms. None is explained. | `CrisisDetail` / `Option` in `ui/src/components/desk/Detail.tsx` render `d.situation` and `o.description` as plain strings. Text from `data/flashpoints/ceasefire-or-collapse.json` (`scripted.UKR[0]`). |
| E4 | Title dossier, `priya-flash/005-brief.png` | "What is happening" hides the hook behind a `<details>`; the hook names ISW, Oleshky, Abu Dhabi talks, Donetsk with no help. `bab-al-mandab-burning` names the Houthis, Mokha, Perim, Dhubab, STC, Aden, Vision 2030 in one paragraph. | `TitleScreen.tsx` (`ts2-more`, `fp.hook`, `ts2-brief`). |
| E5 | Ruth, `ruth-tablet/004-g2.png`, `011-m2.png` | Abbreviations and compact counters unexplained. | Game vocabulary: solved by `ui/src/lib/glossary.ts` (design-orders §8). Listed here because the explain surface must serve both. |
| E6 | Panel bias (RS-003 "Gap and correction") | The panel did not flag unknown names because synthetic respondents know too much. Personas now carry `knowledge` (e.g. Ruth does not know Sudan's factions, newer leaders, enrichment levels; Noah does not know where Yemen is or what an embargo is; Priya needs nothing). | `panel/*.yaml` `knowledge`. |
| E7 | Content audit | Accuracy risk the codex would expose: the scripted crisis says "Washington wants an answer before the midterms", but the 2026 midterms were on 3 November 2026 and the game opens later that month (the scenario description itself says the midterms "land in your first month"). | `data/flashpoints/ceasefire-or-collapse.json` line ~399. Content Consultant to fix wording ("after the midterms" / "before the new Congress sits"). |
| E8 | Engine | Leaders who come to power during a game get generated names (`generateLeaderName` in `src/core/systems/government.ts`). They are fictional and must never be presented as real. | Codex needs a "fictional, in your game" entry type built from game state. |

## 2. Principles

1. **Explain in place, at the moment of need.** The explanation opens where the word is; the player never leaves the decision to learn.
2. **Layered.** Layer 1: one line (always fits a popover or sheet peek). Layer 2: "More": 2 to 4 short sentences, a small map or who is who. Layer 3: "In your game" (live facts from the player's world) and the codex page with sources.
3. **Real versus your game, always labelled.** Codex text describes the real world up to the scenario's start date, stamped "As of Nov 2026". Anything that happened in this game is shown in an amber "In your game" box. Fictional people are labelled fictional.
4. **Quiet for experts, never hidden.** The level setting changes what is marked, not what is reachable. At "I know this" the text is clean, yet every explanation is still one "i" or one codex search away (rule: never remove a capability).
5. **One explain surface for two dictionaries.** World knowledge (codex) and game vocabulary (glossary) open in the same Explainer component, so the player learns one gesture.
6. **No hover-only information.** Hover only previews what click, tap or Enter opens.
7. **Accuracy is a build check.** Entries carry sources, validity dates and review dates, and tests fail on missing coverage.

## 3. Variants

All three share the data, matcher, Explainer card, setting and codex. They differ in how a player finds an explanation.

### A. Underline and peek (`learn-a-underline`)
- Less known names are underlined in place: 1.5 px dotted line in `--learn-mark` (the intel blue at 62%), offset 3 px. Hover: solid line plus `--learn-tint` background.
- Desktop (pointer: fine): a hover of 300 ms previews the popover; click or Enter pins it. Tablet: tap opens the popover anchored to the word. Phone (≤ 600 px): tap opens a bottom-sheet peek (layer 1 + More / Codex / Close, 44 px buttons). "More" grows the sheet to 85% height.
- Pros: zero navigation, exact moment of need, works in every text surface. Cons: visual noise if density is not capped; many tab stops; underlines on a phone are small tap targets (inline-target exception, WCAG 2.5.8, but tap slop still needed).

### B. Briefing panel (`learn-b-briefing`)
- The text has no marks. Desktop: the right rail gets tabs "This month | Briefing 7"; the Briefing tab lists every entry found on the current screen, grouped (Places, People, Politics), with a "What is going on here" card on top. Pointing at an item highlights its mentions in the text (`.mark`). Phone: a "Briefing · 7 names on this card" pill above the options opens a sheet with the same list.
- Pros: clean text, scannable list, good for Ruth who reads everything. Cons: the Briefing tab hides the order tray and Execute on desktop (the rail is the month's control centre, design-month); the player has to connect a list to the text; the list goes stale when focus moves between cards.

### C. Quiet "i" and codex (`learn-c-info`)
- The text has no marks. Each paragraph ends with a 22 px "i" (44 px hit area) that opens "In this paragraph": the entries found in it, one line each. Each crisis bar gets a "What is going on here?" button that opens the situation briefing (right drawer 500 px on desktop, full-screen sheet on phone): one line, mini map, who is who with flag discs, why it matters, what really happened (timeline with dates), and "From November 2026 on, this is your game." New entries met go into the codex with a quiet "+4 new in your codex" toast.
- Pros: expert friendly, the deep situation layer serves Priya ("what really happened"), collectible codex for Noah. Cons: the player must suspect that a paragraph holds something unknown; per-paragraph scope is coarse for a single word.

### Recommendation: "Layered" = A for marking, C for depth, governed by the level setting; B folded in

| Level (asked once) | Marks in text (A) | "i" per paragraph (C) | "What is going on here?" (C) | Codex |
|---|---|---|---|---|
| **Guide me** | All entries with obscurity ≥ 1 (first mention per card) | yes | yes, and opens automatically the first time a crisis appears (toggle) | yes |
| **Some help** (default, preselected) | Entries with obscurity ≥ 2 that the player has not learned | yes | yes (button) | yes |
| **I know this** | none | yes, at 60% opacity until hover or focus (still visible, never hover-only) | yes (button) | yes |

Why: A is the only variant that puts the answer at the exact word (C14 wording: "when I meet a name... I can tap it"), which is what Ruth and Noah need; the level setting answers the CEO's "don't bother experts" with a clean "I know this" mode that still keeps C's depth. C2, the situation briefing, is the strongest answer to Priya's E2 and to "situations" in G12, and it costs nothing in the text. B is not shipped as a panel because it competes with the order tray for the rail, but its content (the list of entries on a card) becomes the "In this paragraph" sheet behind the "i" and the "On this card" section at the bottom of the situation briefing. The concept test (`learn-concept-test.md`) can overturn this: kill criteria are listed there.

## 4. The Explainer card (all variants)

Copy from the concept (entry `fortress-belt`):

```
PLACE · UKRAINE                               [glyph]
The fortress belt
Four fortified cities in Ukrainian-held Donetsk: Sloviansk, Kramatorsk,
Druzhkivka and Kostiantynivka. Ukraine's strongest line in the east.      <- layer 1 (short, ≤ 140 chars)
[mini map: Donetsk, hatch = Russian-held (approx.), dashed ring = belt]    <- layer 2
Fortified since 2014. Russia demands the whole of Donetsk in any deal;
giving the belt up without a fight would leave open country between the
front and the Dnipro.                                                      <- layer 2 (long, ≤ 600 chars)
IN YOUR GAME  Front line 52 of 100: close to stalemate. You hold the belt. <- layer 3 (live, optional)
As of Nov 2026 · 2 sources          Stop marking   Codex ›
```

- Header: kind chip (`Person | Place | Group | Term | Event | Situation | Game rule`) and country, name, glyph (flag disc for people, kind glyph otherwise).
- Popover opens at layer 1 plus "More"; pinned popovers and sheets remember the last layer used (players who always press More get layer 2 directly, local preference).
- "In your game" lines come from a small client function `liveLine(entry, world, playerView)` per kind: country entries show relations and war state, leader entries show the leader's current stance toward you, hot zones show their metrics, places inside a war show the front line. Only belief-filtered `playerView` data, never ground truth (asymmetric information invariant).
- "Stop marking" marks the entry learned for this device (it remains reachable by "i" and codex).
- People: flag disc with initials, no photo likeness (house style uses faceless figures, and photos raise rights issues). The art pass may add a tinted silhouette bust per `ui/src/scenes/art/STYLE.md`.
- Fictional (generated) leaders: kind chip `Person · fictional`, line "Came to power in your game in Mar 2027 (election)." Built at runtime from `CountryState.leader`; no codex file entry.
- Glossary terms (`g:capital`, `g:approval`...): the same card with kind `Game rule`, short = `TERMS[x].definition`, no sources, no "as of". The HUD and rail labels that design-orders makes tappable open this card.

### Breakpoints

| | 390 (phone) | 1024 (tablet, touch) | 1440 (desktop) |
|---|---|---|---|
| Term tap | bottom-sheet peek, ~40% height, 3 buttons (More, Codex, Close) | popover anchored to the word, 44 px buttons | hover preview 300 ms, click pins |
| More | sheet grows to 85% | popover grows, max 70vh, scrolls | popover grows to 420 px wide, max 70vh |
| Situation briefing | full-screen sheet, close top right, swipe down | right drawer 480 px | right drawer 500 px over the rail |
| "i" per paragraph | 22 px visual, 44 px hit | same | same |
| Codex | full-screen page from Hud menu | drawer tab | drawer tab |

## 5. The familiarity setting

- **Asked once**, before the first month of the first game: a step inside `BackstoryModal` (before "Take office" is pressed for the first time; title screen stays untouched for returning players). Title "How well do you follow world news?", three cards with a live sample sentence each (see `learn-onboarding-1440.png`). "Some help" is preselected; pressing the primary button without choosing keeps it.
- **Changeable**: Settings, new "Explanations" section (segmented control + toggles: Brief me on each new crisis; Show "In your game" lines; Stop marking names I know; Larger explanation text; Mark names again (reset learned); Clear codex progress; privacy line "What you open stays on this device. Nothing is sent anywhere.").
- **Per session**: the Hud book chip ("Some help") opens a 3-option popover; key `I` toggles marks on/off for this session only (A ↔ none) without changing the saved level. A session override shows as "Some help · hidden" on the chip.
- Daily and Flashpoint modes: no difference; the level is per device, not per save.

## 6. What gets matched, and density rules

Surfaces (priority order for build):

| Surface | File | Marks | "i" | Situation button |
|---|---|---|---|---|
| Crisis situation + option descriptions | `ui/src/components/desk/Detail.tsx` (`CrisisDetail`, `Option`) | yes | per paragraph, per option card | crisis bar |
| Meeting detail | `Detail.tsx` (`MeetingDetail`) | yes | yes | no |
| Mission briefing | `Detail.tsx` (`world.objective.briefing`) | yes | yes | yes (flashpoint situation) |
| Title dossier: tagline, hook, side roles, brief | `ui/src/components/TitleScreen.tsx` | yes (hook and brief) | yes | yes, replaces "What is happening" summary text with the briefing button (the hook stays inside) |
| Backstory | `ui/src/components/BackstoryModal.tsx` | yes | no | adds "Who is who" row (3 to 4 discs) |
| Month debrief cards | `ui/src/scenes/OutcomeCard.tsx`, `debriefParts.tsx` | yes (lines, not headlines) | no | no |
| Chronicle | `ui/src/components/Chronicle.tsx` | yes (lede and story bodies) | per story | no |
| Dossier | `ui/src/components/CountryDetailPanel.tsx` | yes (narrative, key events) | no | leader disc opens leader card |
| Advisor chat (LLM text) | `ui/src/components/AdvisorModal.tsx` | yes (on completed messages only) | no | no |
| Not matched | ticker (moving text), SceneFrame in-art headlines, map labels, buttons, HUD numbers | | | |

Density rules (all levels):
1. First mention per card (a crisis card, an outcome card, a story) only.
2. At most one mark per 12 words of a text block; when over budget, keep the highest obscurity.
3. If an entry is marked, its `related` entries within the same sentence are not (the belt covers Kramatorsk and Sloviansk).
4. Never mark inside a button label, a headline, the player's own country name, or a name the player is already looking at (the dossier of Russia does not mark "Russia").
5. Metonyms ("Washington", "Moscow", "Beijing", "the Kremlin", "the White House") are obscurity 1 entries: marked only at Guide me.

## 7. Content: the codex

### 7.1 Files

`data/codex/` (Content Consultant owns), validated by Zod:

```
data/codex/people.json        leaders and other named people
data/codex/places.json        countries (one per data/countries profile), cities, regions, straits, hot zones
data/codex/groups.json        organisations, parties, armed groups, alliances (NATO, OPEC+, the Houthis, the RSF, the STC, the Rada)
data/codex/terms.json         world terms (sanctions, embargo, enrichment, A2/AD, referendum rule, demilitarised zone, the midterms)
data/codex/events.json        dated events (Feb 2022 invasion, 2026 Iran war, New START expiry)
data/codex/situations/<flashpointId|scenarioId>.json   situation briefings
```

### 7.2 Schema (`src/core/codex.ts`)

```ts
export const CodexAliasSchema = z.union([
  z.string(),                                   // case-insensitive, whole word
  z.object({ text: z.string(), caseSensitive: z.boolean().default(false), wholeWord: z.boolean().default(true) }),
]);
export const CodexEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),         // "fortress-belt", "volodymyr-zelensky"
  kind: z.enum(["person", "place", "group", "term", "event"]),
  name: z.string(),                             // display name
  aliases: z.array(CodexAliasSchema).min(1),    // what the matcher looks for ("fortress belt", "Zelensky", {text:"STC", caseSensitive:true})
  avoid: z.array(z.string()).default([]),       // phrases that block a match ("Georgia, USA")
  countryId: z.string().optional(),             // flag and "Place · Ukraine"
  obscurity: z.union([z.literal(1), z.literal(2), z.literal(3)]), // 1 widely known, 2 news followers, 3 specialist
  short: z.string().max(140),
  long: z.string().max(600).optional(),
  related: z.array(z.string()).default([]),
  map: z.object({ countries: z.array(z.string()), points: z.array(z.object({ name: z.string(), lon: z.number(), lat: z.number() })).default([]) }).optional(),
  valid: z.object({ from: z.string().regex(/^\d{4}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}$/).optional() }),
  eras: z.record(z.string(), z.object({ short: z.string().max(140).optional(), long: z.string().max(600).optional(), obscurity: z.number().optional() })).default({}),
  sources: z.array(z.string().url()).default([]), // required (min 1) for person, event; checked in tests
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedBy: z.string().optional(),
});
export const SituationSchema = z.object({
  id: z.string(),                               // flashpoint id or "scenario-2026"
  title: z.string(), oneLine: z.string().max(220),
  whoIsWho: z.array(z.object({ entryId: z.string(), stance: z.string().max(110) })).min(2).max(6),
  whyItMatters: z.string().max(320),
  timeline: z.array(z.object({ date: z.string(), text: z.string().max(90), source: z.string().url().optional() })).min(3).max(8),
  gameStarts: z.string(),                       // "2026-11": "From November 2026 on, this is your game."
  map: CodexEntrySchema.shape.map,
  onThisCard: z.array(z.string()).default([]),  // extra entry ids worth listing even if not mentioned
  sources: z.array(z.string().url()).min(1), asOf: z.string(),
});
```

Leader role lines are not duplicated in the codex: "President of Ukraine since 2019" is built from the scenario's `leaders[countryId]` (`title`, `sinceDate`), so era files stay the single source. The person entry adds the biography line and sources.

Optional authored markup: flashpoint and crisis text may use `[[fortress-belt|fortress belt]]` to force a match or disambiguate. The server strips the markup for clients that do not render it (no change to save files: text is stored as authored, rendered by the client). Plain text is matched automatically, so markup is the exception.

### 7.3 Serving

`GET /api/codex?scenario=2026&flashpoint=ceasefire-or-collapse` returns `{ version, entries, situations }` filtered to entries valid at the scenario start date, with era overrides applied. About 150 entries for 2026 (~90 KB, ~25 KB gzipped), `ETag` = content hash, `Cache-Control: max-age=86400`. Fetched once at new game / load, kept in the store. Not part of `WorldState`: saves and determinism are untouched.

### 7.4 Matching

`ui/src/lib/codexMatch.ts`, pure, no React:
- `compile(entries)` builds one RegExp per entry set from all aliases, longest first, `\b` boundaries, Unicode aware (`u` flag, handles "Erdoğan"), case per alias. Compiled once per codex version.
- `match(text, opts)` returns `[{start, end, id}]` after the density rules (§6), memoized by `text + level + learnedVersion` in an LRU (500 strings).
- Generated text (crisis templates with `${}` names, newspaper, outcomes, LLM statements) is matched the same way at render time: no engine changes.
- Coverage helper `scripts/codex-coverage.mjs`: runs the matcher over every string in `data/flashpoints/*.json`, `data/scenarios/*.json` briefings and the string literals of `src/core/crises.ts` and `src/core/events.ts`, lists capitalised phrases with no entry, sorted by frequency. The Content Consultant triages the list each iteration.

### 7.5 Keeping it accurate

- Every person and event entry has at least one source URL; situations have sources per timeline row where possible (the flashpoint `sources` arrays are the starting set).
- `asOf` and `valid` make staleness visible: a new scenario date fails the test for any person entry whose `valid.to` is before it, and an entry whose `asOf` is more than 6 months before the newest scenario date shows up in the coverage report.
- Two-source rule for anything contested; contested facts are worded as claims ("Russia claims all of it", "reports, not independently confirmed").
- "Something wrong?" link in the codex page footer copies a prefilled report (entry id, asOf, text) to the clipboard and opens the project's issue page; nothing is sent automatically.
- LLMs may draft entries offline, never at runtime, and a draft is not merged without `reviewedBy`.

## 8. Learning from the player, locally only

`ui/src/lib/learn.ts`, localStorage key `worldconflict.learn.v1` (wrapped in try/catch, works without storage):

```ts
{ level: "guide" | "some" | "know", asked: boolean,
  prefs: { autoBrief: boolean, liveLines: boolean, fadeKnown: boolean, largeText: boolean, lastLayer: 1 | 2 },
  entries: { [id]: { seen: number, opened: number, firstMet?: { title: string, date: string }, learnedAt?: number } },
  nudges: { [key]: number } }
```

Uses:
1. **Codex unlocks**: an entry is "met" when a marked or "i"-listed text containing it was rendered on screen (IntersectionObserver, 50% visible). Unmet entries in the current flashpoint show as locked tiles ("A person · met later in this crisis"), never their names (no spoilers).
2. **Fading** (Some help, toggle on): an entry opened once fades to `--learn-mark-known`; after 3 more screens where it appears, it stops being marked. "Stop marking" does it at once. "Mark names again" resets.
3. **Last layer**: if the player pressed More on 3 of their last 5 opens, cards open at layer 2.
4. **One-time nudges** (each at most once per device, never during month 1 of a Flashpoint): at Guide me or Some help with 0 opens across 3 sessions: "Hide the marks? You can bring them back from the book button." At I know this with 5 or more "i" opens in one session: "Want less known names marked? Switch to Some help." Dismiss = never again.
5. **End screen line**: "You met 14 new entries" with a link to the codex (EndScreen); no share card change in this iteration.
6. **Playtests**: the devloop kit may read `localStorage` in synthetic sessions on the test machine (`page.evaluate`) to record which entries personas opened. No server endpoint, no telemetry, no account sync.

## 9. Accessibility

- Marks are `<button type="button" class="t">` inside text (not links), `aria-haspopup="dialog"`, `aria-expanded`, accessible name = the visible word; the explainer is `role="dialog"` with `aria-labelledby` on the entry name. No `aria-describedby` on marks (screen readers would read every definition aloud).
- Keyboard: marks are in the tab order (capped by the density rules: at most ~8 per card); Enter or Space opens and moves focus into the card; Esc closes and returns focus to the mark; Tab cycles inside a pinned card. `I` toggles marks for the session (ignored while typing in inputs, matching the existing `M` and `N` handlers in `App.tsx`).
- Hover popovers follow WCAG 1.4.13: dismissible (Esc), hoverable (the pointer can move into the card), persistent (stays until moved away or dismissed).
- No information is hover-only: the same card opens on click, tap or Enter.
- Underline, not colour, is the cue (works for colour-blind players and in forced-colours mode, where `text-decoration` survives). Mark colour is a decoration, the text keeps its own contrast.
- Touch: inline marks get an invisible hit box (`::after`, inset -6 px) without moving layout; "i" buttons have 44 px hit areas; sheet buttons are 44 px high.
- Screen readers at "I know this" get no inline buttons (clean reading); the paragraph "i" is labelled "Explain this paragraph" and the situation button "What is going on here?".
- Reduced motion: popover and sheet appear without slide or scale; the codex toast does not animate.
- Text size: explainer 14 px (16 px with "Larger explanation text"), respects browser zoom to 200% without clipping (sheet scrolls).
- Map in the briefing has a text alternative: `aria-label` and the who-is-who and timeline carry all facts the map shows.

## 10. Performance

- One Explainer instance per app (portal), not one per mark.
- Matching cost budget: under 2 ms for all text on the desk on a mid phone (about 3 KB of text, one compiled RegExp, memoized). Measured in a perf test (`tests/perf/codex-match.spec.ts`) over all flashpoint text: under 20 ms for the whole data set on CI.
- No layout shift: marks are text decoration only; the "i" is inline at the paragraph end.
- Codex payload fetched once per game (~25 KB gzipped); long text and maps are in the same payload (no extra round trip on open). Mini maps reuse `scenes/ContextMap.tsx` and the already loaded `world.geojson`.
- Matching does not re-run on store changes that do not change the text (memo by string).

## 11. Engine and API needs

- `src/core/codex.ts`: schemas (pure, no I/O).
- `src/core/data-loader.ts`: `loadCodex()` reading `data/codex/**`, validating, caching, and returning deep copies (CLAUDE.md invariant on loader caches).
- `src/api/routes/codex.ts`: `GET /api/codex` (§7.3), registered with the other routes; documented in `docs/API.md`.
- No `WorldState` changes, no turn engine changes, determinism unaffected.
- Optional (later): scripted crises may carry `codex: string[]` (entry ids to list in "On this card" even if not named in the text).

## 12. Acceptance criteria

Numbered, observable. "Card" = a crisis card on the desk unless stated.

1. On a fresh profile, starting any game shows the question "How well do you follow world news?" before month 1 with three options and "Some help" preselected; it never shows again on that device after a choice or after "Take office".
2. At Some help, the opening Ukraine crisis (`ceasefire-or-collapse`, side UKR) shows dotted underlines on "fortress belt", "Donetsk oblast", "the midterms", "a referendum" and "Pokrovsk axis", and none on "Moscow" or "Washington".
3. At Guide me, the same card also marks "Moscow" and "Washington"; at I know this, the card shows no underlines and shows one "i" per paragraph.
4. No card shows more than one mark per 12 words, and an entry is marked at most once per card.
5. Desktop: hovering a mark for 300 ms shows the card; moving the pointer into the card keeps it open; Esc closes it and focus returns to the mark.
6. Clicking, tapping or pressing Enter on a mark opens the same card as hover, with layer 1 text and a "More" control; "More" shows the long text, and the map when the entry has one.
7. At 390 px wide, tapping a mark opens a bottom sheet with More, Codex and Close buttons, each at least 44 px high; swiping down or tapping the scrim closes it.
8. Every card for a place inside an active war, a country, or a leader shows an "In your game" line drawn from the player's belief-filtered view (verify: a foreign country's stats in the line match the dossier's ranges, not ground truth).
9. Every explainer for a codex entry shows "As of <month year>" and a source count; glossary cards show neither and are labelled "Game rule".
10. A leader who came to power during the game shows "Person · fictional" and the month and way they came to power.
11. "What is going on here?" on the opening crisis opens the situation briefing with: one line, a map, 2 to 6 who-is-who rows (player marked YOU), why it matters, a dated timeline, and the line "From November 2026 on, this is your game."
12. With "Brief me on each new crisis" on (default at Guide me), the briefing opens automatically the first time each flashpoint's first crisis appears, and never again for that crisis.
13. Pressing `I` hides all marks for the session (chip reads "· hidden"); reloading the page restores the saved level.
14. Settings shows the Explanations section; changing the level updates the marks on the current screen without a reload.
15. After opening an entry once at Some help, its underline is fainter; after it appears on 3 more screens it is no longer marked; "Mark names again" restores the marks.
16. The codex drawer lists met entries with counts per category and "N of M met" for the current flashpoint; unmet entries show as locked tiles without names; entries met this month carry NEW.
17. The codex search finds an entry by any alias (search "Zelenskyy" or "Zelensky" finds the same entry).
18. Clearing site data (or blocked storage) leaves the game fully playable at Some help with no errors in the console.
19. No network request carries learn data: with devtools open, opening 10 entries produces no request other than the single `/api/codex` load.
20. Keyboard only: a player can reach every mark and "i" on a card with Tab, open, read layer 2 and close, without a mouse.
21. With `prefers-reduced-motion: reduce`, popovers and sheets appear without motion.
22. axe-core reports no violations on the desk with an explainer open (popover and sheet).
23. `npm run test` includes: codex schema validation; every leader in every `data/scenarios/*.json` `leaders` resolves to a person entry valid at that scenario's date; every `data/countries/*.json` profile has a place entry; every flashpoint has a situation; every `related`, `whoIsWho.entryId` and `[[id]]` resolves; no alias collides with another entry valid in the same era; person and event entries have ≥ 1 source; `short` ≤ 140 chars; no em dash.
24. The matcher perf test runs all flashpoint text through `match()` in under 20 ms on CI.
25. Determinism and save tests pass unchanged (codex is not in `WorldState`).

## 13. Build plan (work packages)

Independent packages with file ownership. WP1 and WP3 can start at once; WP2 starts at once on content; WP4 to WP8 need WP1's types and WP3's API.

| WP | Owner | Scope | Files (new = N) |
|---|---|---|---|
| **WP1 Codex schema, loader, API** | Engine Engineer | Zod schemas, loader with deep copy, route, docs, schema test | `src/core/codex.ts` (N), `src/core/data-loader.ts`, `src/api/routes/codex.ts` (N), `src/api/server.ts` (one `register` line), `docs/API.md`, `tests/codex/schema.spec.ts` (N) |
| **WP2 Content** | Content Consultant | Entries for: all 41 countries, all scenario leaders (4 eras), every name in the 8 flashpoints and the 2026 briefing, ~30 terms, 8 flashpoint situations + 4 scenario situations; coverage test and script; fix E7 wording | `data/codex/*.json` (N), `data/codex/situations/*.json` (N), `tests/codex/coverage.spec.ts` (N), `scripts/codex-coverage.mjs` (N), `data/flashpoints/ceasefire-or-collapse.json` (E7 only) |
| **WP3 Matcher and learn store** | UI Engineer A | pure matcher with density rules, learn.ts (levels, fading, nudges, met), store slice (codex fetch, level, session override), mirrored types | `ui/src/lib/codexMatch.ts` (N), `ui/src/lib/learn.ts` (N), `ui/src/store/gameStore.ts` (codex slice only), `tests/ui-codex-match.spec.ts` (N), `tests/perf/codex-match.spec.ts` (N) |
| **WP4 Explainer components** | UI Engineer B | `ExplainText` (string to text + mark buttons), `Explainer` (single portal: popover / sheet, layers, live line, glossary adapter), `ParagraphInfo` ("i"), styles and tokens | `ui/src/components/learn/ExplainText.tsx` (N), `Explainer.tsx` (N), `ParagraphInfo.tsx` (N), `liveLine.ts` (N), `ui/src/styles/learn.css` (N, imported from `main.tsx`), `ui/src/styles/wc.css` (tokens `--learn*`, `--real` only) |
| **WP5 Situation briefing and who's who** | UI Engineer B (after WP4) or C | briefing drawer/sheet, who-is-who discs, timeline, mini map via ContextMap | `ui/src/components/learn/SituationBriefing.tsx` (N), `WhoIsWho.tsx` (N), `ui/src/scenes/ContextMap.tsx` (only if a `points`/`hatch` prop is needed; coordinate with scenes owner) |
| **WP6 Codex drawer and collectible** | UI Engineer C | codex page (search, categories, locked tiles, NEW, "How the game works" tab listing glossary TERMS), drawer tab, end screen line | `ui/src/components/learn/Codex.tsx` (N), `ui/src/components/Drawers.tsx`, `ui/src/components/EndScreen.tsx` |
| **WP7 Setting, Settings, Hud chip** | UI Engineer D | familiarity prompt component, Settings section, Hud book chip and level popover, `I` key | `ui/src/components/learn/FamiliarityPrompt.tsx` (N), `ui/src/components/SettingsModal.tsx`, `ui/src/components/Hud.tsx`, `ui/src/App.tsx` (key handler line only) |
| **WP8 Surface integration** | UI Engineer A (after WP3, WP4) | wrap text with `ExplainText`, add "i" and situation buttons, mount `FamiliarityPrompt` and who's who in the backstory | `ui/src/components/desk/Detail.tsx`, `TitleScreen.tsx`, `BackstoryModal.tsx`, `Chronicle.tsx`, `ui/src/scenes/OutcomeCard.tsx`, `ui/src/scenes/debriefParts.tsx`, `CountryDetailPanel.tsx`, `AdvisorModal.tsx` |
| **WP9 QA and panel** | QA + Panel lead | AC 1 to 25; concept test run before build; post-build session where every persona flags unknown names (RS-003 correction) | `devloop/instances/world-conflict/runs/iter-01/learn-concept-test.md`, sessions under `runs/iter-01/sessions/` |

Conflicts to watch: `Detail.tsx` and `Hud.tsx` are also touched by the orders and month workstreams; WP8 and WP7 land after them and keep diffs to wrapping text nodes and one chip. `gameStore.ts` is shared: WP3 adds a separate slice block only.

## 14. Open questions for the concept test

- Is "Some help" the right default, or should first-time players on phones default to Guide me?
- Do experts accept the faint "i" at "I know this", or want it gone (then: codex only, plus the situation button)?
- Should the situation briefing open automatically on a Flashpoint's first month for everyone, since it is the one moment most players lack context?

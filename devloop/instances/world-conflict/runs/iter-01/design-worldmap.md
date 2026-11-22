# Design: world map (G11, a world map that fits and tells the story of its era)

Owner: Art Director, with the Game Designer. Iteration 1. Status: proposed.
Signal: CEO RS-003 (`real-signals/RS-003-ceo-map-and-learning-2026-11-22.md`). Goal: G11 in `goals.md`.

Concepts (self-contained HTML, real scenario data, house tokens; screenshotted with Playwright):
- `concepts/worldmap-a.html` **A "Situation Room"** (rich): `worldmap-a-1960-1440.png`, `worldmap-a-2026-1440.png`, `worldmap-a-1960-390.png`, `worldmap-a-2026-390.png`.
- `concepts/worldmap-b.html` **B "Atlas"** (calm): `worldmap-b-1960-1440.png`, `worldmap-b-1990-1440.png`, `worldmap-b-2026-1440.png`, `worldmap-b-1960-390.png`, `worldmap-b-2026-390.png`.
- Time travel storyboard: `worldmap-timetravel-strip.png` (frames `worldmap-tt-0..3.png`, 2026 to 1960).
- Both mocks take `?era=1960|1990|2025|2026&sel=<situation>&hover=<country>&from=<era>&p=<0..1>` (the last two render a transition frame).
- Concept test: `runs/iter-01/worldmap-concept-test.md`.

Scope: the title globe (`TitleGlobe.tsx`, `TitleScreen.tsx`, `MapKey.tsx`) and the in-game map (`MapView.tsx`, `mapMarkers.ts`). This spec builds on FEEL-7 (`design-feel.md` 8.2 and 8.3, in progress in the `feel-foundation` worktree: map sleep in Desk mode, `pin-reserve` symbol layer, `text-variable-anchor` on `country-labels`). It does not redo any of that: section 7 says what lands after FEEL-7 and in which lines.

---

## 1. Problem

| Id | Evidence | What is wrong |
|---|---|---|
| M1 | CEO RS-003 | "The world map should zoom to the screen." |
| M2 | Sam, `iter-00/shots/sam-desktop/002-map.png` (1920x1080) | The in-game globe is about 745 px across in a stage about 930 px tall: a fixed `zoom: 1.8` (`MapView.tsx`), then `flyTo` the capital at a fixed 2.4 / 1.9. Nothing depends on the viewport. |
| M3 | `marcus-term/002-term.png` (1366x768), `noah-phone/001-title.png` (390) | Title globe uses a fixed `zoom: 1.55` (0.9 under 700 px). On the phone the globe is about 270 px of 390, its top hides behind the mode dial and the pin card is clipped at the right edge ("Bab al-Mandab Burn"). |
| M4 | CEO RS-003 | "Would be great to have country names on the globe so it's richer." `TitleGlobe` has no `glyphs` in its style, so it cannot draw any text. |
| M5 | Sam, `sam-desktop/002-map.png` (F9 in design-feel) | In-game labels collide with pins (UK, Lebanon, Afghanistan). Owned by FEEL-7 (`pin-reserve`); this spec only extends it to the title globe. |
| M6 | Ruth (`knowledge`: follows the news, not every name), FEEL legibility floor | In-game labels are 10 px at low zoom (`text-size` 10 to 13), below the 13 px floor; all countries share one size. |
| M7 | CEO RS-003 | "While changing eras deciding the game mode, the map remains the same, while stability and significant situations with icons and lines should be different." Code: `TitleScreen.tsx` pins exist only in Flashpoint mode; the rival arcs are always the 2026 flashpoints, whatever the era or mode; the tint is always difficulty; switching era changes one paragraph of text. |
| M8 | RS-003 mapping (Marcus wants era maps that are right), data audit 4.1 | In 1960 the game offers "Ukraine" with a generated leader name, the map shows modern borders and names, and 16 of 41 nations have no era leader in 1960, 1990 and 2025 (including Zelensky in 2025 and Castro in 1960). |
| M9 | design-feel 8.2.3, QA B-07 | `TitleGlobe` spins with `setCenter` on every animation frame forever, and every title pin runs two infinite ring animations. |
| M10 | Priya (`priya-flash` session) | Wants real-world context; trusts the game when leaders and situations are right, checks when not ("Andy Burnham"). Era situations need sources. |

---

## 2. Principles

1. **The map is the era.** Picking 1960 must look like 1960 before a word is read: blocs, the year, the fires of that winter, the people in charge.
2. **Fit first, then frame.** The whole globe fills the free part of the screen on load and resize; choosing a situation frames it without hiding it behind panels.
3. **Calm by default, rich on request.** Five fires and a clean globe for a first look (Ruth, Noah, Maya, Olivia); every situation, rival line and label one switch away (Marcus, Priya, Dan, Leo). Never remove: the switch keeps everything reachable.
4. **No per-frame work.** Labels are a MapLibre symbol layer (placement is GPU and throttled), not DOM; sources update on era change only; nothing loops while idle.
5. **Data, not art, carries the history.** Every pin, line and colour comes from `data/scenarios/*.json` (with sources), so content fixes do not need code.

---

## 3. Design

### 3.1 Zoom to fit (both maps)

**Rule.** The globe diameter `D = min(freeW x 0.98, freeH x 1.02)` (a few percent of pole may crop on wide screens, never the sides), centred in the free box. The free box is the viewport minus what permanently covers the globe:

| Screen | Free box (left, top, right, bottom insets) | D at 1920x1080 | 1440x900 | 1024x768 | 390x844 |
|---|---|---|---|---|---|
| Title, desktop (> 900 px) | left 230 (0 below 1280 wide: the copy overlays the globe edge under the vignette, as today), top 112, right dossier 452, bottom 20 | 967 (today about 626) | 743 | 560 | n/a |
| Title, phone (<= 900 px) | globe band: full width, top 160 (under the mode dial), band height = width + 8 | n/a | n/a | n/a | 382 (today about 270) |
| In-game map | top 64 (HUD glass), bottom = command strip + ticker (measured), right = open drawer width, left 0 | about 950 (today 745) | about 760 | about 620 | full width minus 16 |

**Mechanism** (new `ui/src/lib/globeFit.ts`, shared):
- `measureDiameter(map)`: project the two limb points `[center.lng +- 90, 0]` with `map.project` (globe projection) and take their distance. This self-calibrates against MapLibre's globe scale, so no magic constant.
- `fitZoom(map, box) = map.getZoom() + log2(Dtarget / measureDiameter(map))`, clamped to `[minZoom, maxZoom]`; `map.setPadding(box)` first so the centre is the free box centre.
- Load: fit immediately (`jumpTo`, no animation), then any framing below.
- Resize: a `ResizeObserver` on the container, debounced 120 ms. If the player has not zoomed by hand (track `userZoomed` on `zoomstart` with `originalEvent`), re-fit; otherwise keep their offset: `z = newFit + (z - oldFit)`.
- A "Whole world" control (Tabler `IconWorld`, 44 px) next to the zoom buttons re-fits and clears `userZoomed`.

**Framing a selection.**
- Title: picking a pin or a fire turns the globe to it (`easeTo` center, 900 ms, zoom `fit + 0.6` desktop, `fit + 0.4` phone, padding keeps it out of the dossier). Picking a nation turns to its capital at `fit + 0.3`. Today's `hold = Infinity` rule stays (no spin after a pick).
- In-game: opens at fit, centred on the player's capital longitude (latitude clamped to +-35). Selecting a crisis or country frames the bounding box of the sides' label points (`fitBounds`, padding 25 percent of the free box, zoom clamped to `[fit, fit + 2]`). No re-framing after the player pans or zooms until the next selection.

### 3.2 Country names (both maps)

**Source.** One label point per country: Natural Earth `LABEL_X`/`LABEL_Y` from `world.geojson` (curated, better than centroids; already in the file). Names: the game name for the 41 nations, with era names from the scenario (`countryOverrides.name`: "Soviet Union", "West Germany"; `eraStatus.label`: "Ukrainian SSR"); Natural Earth `NAME` for other countries; era-only labels from `mapLabels` ("Czechoslovakia", "Yugoslavia", "East Germany").

**Anachronism guard.** For eras before 1992 (any scenario with `eraStatus` or `mapLabels`), non-roster modern names are hidden unless listed in the era's `labelAllow` (the 1960 globe must not print "Kazakhstan" or "Mali"). Countries merged into another (`eraStatus.status = PART_OF`) take the parent's fill, a hairline border in the same colour (so the USSR reads as one country) and an italic era label.

**Tiers, sizes, priority** (`ui/src/lib/mapLabels.ts`, pure, shared):

| Tier | Rule | Size and weight | Visible at |
|---|---|---|---|
| 0 | Selected country, the player's country, sides of the selected situation | 15 px semibold, `--text-1` | always |
| 1 | Area > 2.5M km² (Russia, Canada, US, China, Brazil, Australia, India...) | 15 px semibold | always |
| 2 | 0.4M to 2.5M km² | 13 px semibold (roster), 13 px regular `--text-3`-ish `#a9b4c4` (non-roster) | desktop at fit; phone at fit + 0.6 |
| 3 | < 0.4M km² (Israel, Lebanon, Taiwan, UAE, Denmark...) | 13 px semibold | fit + 0.8, or when in a situation or selected (tier 0) |
| Era | `mapLabels` rank 2 / 3 | 13 px italic | as tier 2 / 3 |

- Never below 13 px (FEEL legibility floor; Ruth). Halo 1.6 px `#05080f` (`text-halo-blur` 0.4), which keeps 4.5:1 on every fill colour in 3.3.
- Collision: `text-allow-overlap: false`, `symbol-sort-key` = tier then priority (tier 0 wins), `text-variable-anchor: ['center', 'top', 'bottom', 'left', 'right']`, `text-radial-offset: 0.9`, `text-padding: 3`, `text-max-width: 7` (wraps "United Arab Emirates"). Pins reserve their space through FEEL-7's invisible `pin-reserve` layer; the title globe gets the same layer (its pins are uniform 30 px: one reserve icon per pin). Labels of pinned countries also appear on the pin's card, so a dropped label loses nothing.
- Globe limb: labels whose anchor is within about 15 degrees of the horizon fade (`text-opacity` by MapLibre's own back-face handling, plus `text-pitch-alignment: viewport`).
- Phone: at fit, tiers 0 and 1 plus situation sides only (the concept shows 8 to 12 names on a 382 px globe).
- Glyphs: self-hosted. Copy the Latin ranges (`0-255.pbf`, `256-511.pbf`) of the fontstack `MapView` already uses from the demotiles server into `ui/public/glyphs/{fontstack}/` and point both styles at `/glyphs/{fontstack}/{range}.pbf`. This removes the external runtime dependency and lets `TitleGlobe` draw text at all.
- Performance: names live in one GeoJSON source per map, written once per era change (`setData`), never per frame. MapLibre placement runs on its own throttle (`fadeDuration` 150). No DOM labels.

### 3.3 Era and mode overlays (title globe)

**What changes with the mode.**
- **Flashpoint**: as today (eight crisis pins, rival lines of the flashpoints, sides tinted by difficulty), plus names and fit. No era control (flashpoints are November 2026).
- **One Term and Legacy**: the globe shows the selected era's world (below). Term and Legacy share the map on purpose (same world, different length); the copy and dossier change, the map does not. Switching Flashpoint to Term is itself a short transition (pins fold, era layers fade in, 400 ms).

**The era world** (from the era map payload, 4.3):
- **Colour by** (segmented control in the map key, persisted in `localStorage['wc.globe.colour']`): **Blocs** (fill by bloc side: West `#3d8bfd`, West treaty allies `#86b6ff`, East `#e0475a`, East partners `#f08a6a`, Non-aligned `#2bb3a3`, Other pacts `#b48cff`, 62 percent opacity), **Stability** (5 steps, instability glows and stability recedes, so it reads in colour-blind modes by lightness: Shaky <= 35 `#ef5a3c`, Strained <= 50 `#e39a42`, Holding <= 62 `#b8a27a`, Steady <= 75 `#74829a`, Solid `#55647c`), **Difficulty** (today's tint, kept). Non-roster countries: neutral land, except bloc members in Blocs mode (Czechoslovakia is Warsaw Pact red in 1960).
- **Situations** as pins (the title pin element, `tg-pin`, with the kind colour and icon): kinds are the four existing (`WAR`, `SEA`, `REGIME`, `NUCLEAR`) plus **`TRUCE`** "Armed truce: a line nobody crosses, yet" (Tabler `IconFence`, `#c9d3e0`, dark icon ink) for Berlin, the Korean DMZ. Phases: **Active** solid, **Brewing** hollow with a dashed ring in the kind colour (Iraq eyes Kuwait, France's first atomic test), **Frozen** at 55 percent fill (Korea). Pulse rings run only on the selected pin and stop after 3 cycles elsewhere (budget 8.2.3).
- **Lines**: war **front** (solid red 2.6 px with a soft glow, between neighbours at war), **rivals** (dotted `--rival`, relations -60 or worse, top 8), **blockade** (dotted cyan). A line is drawn only when both ends are on the visible side, or when its situation is selected; otherwise the rim marker carries it.
- **Rim markers**: a situation on the far side shows as a small ring with a chevron on the globe's rim pointing to it (number in B, title in A on desktop). Tap turns the globe to it. The concept shows Taiwan, Cuba, Korea on the 1960 rim.
- **Clustering**: pins closer than 28 px merge into one pin with a count badge; tap fans them out in a ring (Kashmir and Afghanistan in 1990 overlap at fit).
- **Hotspots** (Gaza, West Bank from the scenario) render as their own small pins as in-game (`zoneIcon`), included in the situation count.
- **Leaders on hover**: hovering (desktop) or long-pressing (touch) a country shows a tooltip: name (era name), leader and title, stability word and number, bloc, up to two rivals. Example (S5): "Ukraine / Volodymyr Zelensky, President / Stability 48 (strained) / Rivals: Russia". A missing era leader shows "Leader invented for this era" (until data WP-W4 fills them).
- **Era ink**: a static warm vignette over the canvas edge (CSS gradient, `mix-blend-mode: soft-light`), opacity 0.75 for 1960, 0.35 for 1990, 0 for 2025 and 2026. It costs nothing at idle and makes the older eras feel like an archive.
- **Header**: "The world in January 1960 · tension 75" and "8 situations · 1 war · 5 blocs" replace "The world tonight" when an era is shown.

**Situation card** (new `EraCard`): kind and phase chip with "since 1958" when known; title (serif 21 px); one or two sentence blurb; the sides with bloc swatch, leader and title, stability word and number; actions: **Lead <country>** (sets the nation, 40 px), and **Play it as a 15-minute Flashpoint** when the situation has a `flashpointId` (switches mode and selects it). When the learn package (G12) is present, a "What is going on here?" link opens its situation briefing via `codexId`.

#### Variant A "Situation Room" (rich)
Every situation pinned with a name chip (desktop; chips avoid pins, labels and the dossier, or hide), all rival lines, Blocs colouring by default, the full key (blocs, kinds, phases, lines). The card floats next to the pin on the side with more room. Phone: pins without chips; a horizontal strip of every situation under the era chips; card as a bottom sheet. Screens: S1, S2, S3.

#### Variant B "Atlas" (calm)
Stability colouring with bloc outlines (1.3 px in the bloc colour), the era's **five fires** (top 5 by `weight`) as numbered pins, fronts only, other lines only for the selected situation; labels tiers 0 to 2. The dossier gets "This era's five fires" (number, pin, title, one line) and a switch **"Show all 8 situations and rival lines"**. The card docks in the dossier in place of the era description, so nothing covers the globe; the five fires compress to one line each while it is open. Phone: five fires as horizontal cards under the era chips; bottom sheet. Screens: S4, S5, S6.

#### Recommendation
**Ship B as the default, with A as its switch** ("Show all situations and rival lines", persisted in `localStorage['wc.globe.density']`, default off; on by default when the G12 familiarity level is "I know this"). B answers the CEO's "stability and significant situations" in one look and keeps the globe readable for the non-gamer and teen personas; the switch gives Marcus, Priya, Dan and Leo everything A has, so no capability is lost. The colour-by control lets anyone choose Blocs. The concept test lists kill criteria that would flip the default to A.

### 3.4 The time-travel moment (era switch)

Total 900 ms, one transition at a time, interruptible (a new era retargets from the current frame). Storyboard: `worldmap-timetravel-strip.png`.

| t (ms) | What moves | How (cost) |
|---|---|---|
| 0 to 150 | Pins and lines fold (scale 0.4, fade), labels fade; the header year starts rolling | CSS class on markers (transform, opacity); `text-opacity` paint transition |
| 100 to 650 | The camera turns to the new era's `mapFocus`; country fills cross-fade to the new era; the year rolls (2026, 2011, 1996, 1978, 1960) in the header; a large serif year stamp (Instrument Serif, 150 px desktop, 96 px phone) fades in over the globe | one `easeTo` (900 ms ease-in-out); `fill-color-transition` 450 ms (built in, GPU); the year text node updated at most every 80 ms outside React; the stamp is one composited layer (opacity only) |
| 600 to 800 | The era ink settles; the stamp fades | CSS opacity |
| 720 to 950 | The new pins drop in, staggered 30 ms (5 in B, up to 12 in A), labels return | CSS `animation-delay`, finite |

- Reduced motion: no camera move, no stamp, no roll: a 150 ms cross-fade of layers.
- Budget: no `setData` during the move (all era sources are swapped at t = 0 behind faded layers, or prefetched: see 4.3), no box-shadow animation, no `backdrop-filter` on moving layers; 55+ fps on the desktop reference (design-feel 8.2.5).
- Sound (if FEEL sound is on): a soft tape-rewind tick on start and the existing `seal` thud on landing; nothing when muted.

### 3.5 Map key

- B: one bar: "Colour by [Blocs | Stability | Difficulty]", the ramp "Shaky to solid" (or bloc swatches), and "Outlines: NATO, Warsaw Pact..." with era names. Expands (chevron, as today's `MapKey`) to kinds, phases and lines.
- A: expanded by default on desktop: colour-by, era blocs, situation kinds present in this era, Brewing, Frozen, War front, Rivals ("relations -60 or worse"), Blockade.
- Flashpoint mode: today's key plus the Armed truce kind only if used.
- Phone: the colour-by row only (sits on the bottom of the globe band); the rest in the expanded sheet.

### 3.6 Breakpoints

| | 390 | 1024 | 1440 / 1920 |
|---|---|---|---|
| Globe | full-width band (D 382), dial above, era chips (4 x 44 px) below, key row on the band's bottom edge | desktop layout without the left inset; D about 560 | D 743 / 967 |
| Labels at fit | tiers 0 and 1 + situation sides | tiers 0 to 2 | tiers 0 to 2 (A: plus tier 3 at fit + 0.8) |
| Situations | B: 5 numbered pins + horizontal fire cards; A: pins without chips + situation strip | as desktop | as described |
| Card | bottom sheet (fixed, max 60vh) | A floats, B docks | A floats, B docks |
| Spin | first 8 s only, then still (battery) | until hover/touch or 20 s idle | same |
| Time travel | camera + cross-fade + 96 px stamp | full | full |

---

## 4. Data and API

### 4.1 What each scenario has today

| Field | 1960 | 1990 | 2025 | 2026 | Used by the map today |
|---|---|---|---|---|---|
| `leaders` | 25 of 41 | 26 | 25 (no Zelensky) | 41 | no |
| `countryOverrides.stability` | 16 | 9 | 0 | 12 | no |
| era names (`countryOverrides.name`) | Soviet Union, West Germany | same | none | none | no |
| `initialRelations` | 19 rows | 17 | 19 | 41 | no |
| `alliances` (unnamed arrays) | 9 | 6 | 8 | 10 | no |
| `startingWars` | 0 | 0 | 1 (RUS-UKR) | 5 | no |
| `borderDeployments` | 0 | 0 | 0 | 11 | no |
| `hotspots` | 0 | 2 (Intifada) | 2 | 2 | no |
| `briefing` | 0 | 0 | 0 | 8 lines | no |
| Named blocs, situations, era status of countries, map focus, era labels | missing | missing | missing | missing | |

Missing era leaders (generated names today), same 15 to 16 in each older era: AFG, ARE, BLR, CUB, DNK, ETH, IRQ (1960, 2025), LBN, PHL, PSX, SDN, SYR, TWN, UKR, VEN, YEM. For countries that did not exist (UKR and BLR before 1991, ARE before 1971, PSX) the leader stays generated and the nation row says "Alternate history" (the nation stays playable: rule "never remove").

### 4.2 Schema additions (all optional with defaults; display only, the engine ignores them)

In `src/core/data-loader.ts`:

```ts
const SituationSchema = z.object({
  id: z.string(),
  title: z.string().max(40),
  kind: z.enum(["WAR", "SEA", "REGIME", "NUCLEAR", "TRUCE"]),
  phase: z.enum(["ACTIVE", "BREWING", "FROZEN"]).default("ACTIVE"),
  at: z.tuple([z.number(), z.number()]),           // [lng, lat] of the pin
  countries: z.array(z.string()).default([]),     // roster ids (sides shown on the card)
  line: z
    .object({ from: z.string(), to: z.string(), style: z.enum(["front", "rival", "blockade"]) })
    .optional(),
  weight: z.number().int().min(1).max(5),          // the calm view shows the top 5
  blurb: z.string().max(160),
  since: z.string().regex(/^\d{4}(-\d{2})?$/).optional(),
  flashpointId: z.string().optional(),            // "Play it as a Flashpoint"
  codexId: z.string().optional(),                 // G12 situation briefing
  sources: z.array(z.string()).default([]),
});

const BlocSchema = z.object({
  id: z.string(),
  name: z.string(),
  side: z.enum(["WEST", "WEST2", "EAST", "EAST2", "NONALIGNED", "OTHER"]),
  members: z.array(z.string()),                   // ADM0_A3 codes, roster or not (CZE, HUN, DDR...)
  note: z.string().optional(),
});

// added to ScenarioSchema:
  blocs: z.array(BlocSchema).default([]),
  situations: z.array(SituationSchema).max(12).default([]),
  eraStatus: z
    .record(z.string(), z.object({
      status: z.enum(["PART_OF", "NOT_INDEPENDENT"]),
      partOf: z.string().optional(),
      label: z.string(),
      note: z.string(),
    }))
    .default({}),
  mapFocus: z.tuple([z.number(), z.number()]).optional(),
  mapLabels: z
    .array(z.object({ at: z.tuple([z.number(), z.number()]), name: z.string(), rank: z.number().int().min(2).max(3) }))
    .default([]),
  labelAllow: z.array(z.string()).optional(),     // pre-1992 eras: non-roster names allowed
```

Tests (`tests/core/era-map.spec.ts`): every scenario parses; every `startingWars` pair has a situation whose `countries` contain both ids; every `flashpointId` exists; `line.from`/`to` are roster ids; situation `at` is inside [-180, 180] x [-80, 80]; at most 12 situations; at least one situation per era.

Static shapes for borders Natural Earth does not have: `ui/public/era/shapes.geojson` (< 10 KB) with `DDR` (East Germany, 1960 and 1990) and `YMD` (South Yemen, 1960 as Aden, 1990 as PDRY); drawn above `land` only when a bloc or `eraStatus` names them. The concept uses a 24-point DDR polygon.

### 4.3 Era map payload

New pure builder `src/core/era-map.ts`: `buildEraMap(scenario, profiles): EraMap` (no RNG, no I/O; stability uses the same expression as `DataLoader` lines 489 to 492, factored into a shared `initialStability(profile, override, multipliers)` so the map cannot drift from the game). New route `GET /api/scenarios/:id/map` in `src/api/routes/game.ts`, `Cache-Control: public, max-age=3600`.

```ts
interface EraMap {
  scenarioId: string; year: number; month: number; name: string; tension: number;
  focus: [number, number];
  countries: Array<{ id: string; name: string; leader?: { name: string; title: string; sinceDate?: string };
    stability: number; bloc?: string; status: "STATE" | "PART_OF" | "NOT_INDEPENDENT"; partOf?: string;
    note?: string; nuclear: string }>;
  blocs: Bloc[]; situations: Situation[];
  rivals: Array<{ a: string; b: string; relation: number }>;   // top 8, relation <= -60, not at war
  hotspots: Array<{ id: string; name: string; center: [number, number]; phase: string }>;
  labels: Array<{ at: [number, number]; name: string; rank: number }>; labelAllow?: string[];
}
```

About 6 KB per era gzipped. `TitleScreen` fetches the selected era on first Term/Legacy view and prefetches the other three in `requestIdleCallback`, so a switch never waits on the network (the transition starts at once; if the payload is late, layers stay faded until it lands). Types mirrored in `ui/src/store/gameStore.ts` (types are duplicated, not shared) with `fetchEraMap(id)` and an in-memory cache.

### 4.4 Content to author (data WP-W4; the concept's set, with sources to add)

| Era | Five fires (weight order) | Also |
|---|---|---|
| 1960 (Jan) | Divided Berlin (TRUCE), Algerian War (WAR), Taiwan Strait shelling (SEA), Castro's Cuba (REGIME), Korean armistice line (TRUCE, frozen) | France's first atomic test (NUCLEAR, brewing), Laos and Vietnam insurgency, Congo independence (brewing) |
| 1990 (Jan) | German reunification (REGIME), Soviet republics break away (REGIME), Kashmir uprising (NUCLEAR), Iraq eyes Kuwait (WAR, brewing), Afghan civil war (WAR) | Apartheid's endgame, US invasion of Panama, Lebanese civil war, Korea (frozen), Intifada (hotspot) |
| 2025 (Jan) | War in Ukraine (front), Gaza war, Iran at the threshold, Red Sea blockade, Taiwan Strait | Syria after Assad, Sudan civil war, Korean peninsula |
| 2026 (Nov) | Ceasefire or Collapse, Hormuz Convoy, Bab al-Mandab Burning, Quarantine, Water War (each with `flashpointId`) | Fire on the Nile, Caracas After Maduro, Pakistan-Afghanistan war, Scarborough Line, Gaza ceasefire |

Blocs: 1960 NATO (15), US treaty allies (SEATO, CENTO, bilateral), Warsaw Pact (with DDR, CZE, SVK, HUN, ROU, BGR, ALB and the Soviet republics), Sino-Soviet alliance (cracking), Non-aligned (India, Indonesia, Egypt with Syria as the UAR, Yugoslavia...). 1990: Warsaw Pact (dissolving). 2025/2026: NATO (32), US treaty allies, Russia and Belarus, China and North Korea; 2026 adds the Saudi-Pakistani defence pact. Era status: UKR, BLR as SSRs (1960, 1990); SYR in the UAR, ARE as the Trucial States, NGA British until October, PSX under Jordan (1960); North Yemen, PSX occupied (1990). The exact draft JSON the concepts use (blocs, era status, labels, focus, situations with coordinates, per era) is `concepts/worldmap-era-data.json`, the starting point for WP-W4 (add `sources`, `since`, `labelAllow`); the content consultant reviews dates and wording (backlog entries B-xx as in iteration 1).

---

## 5. Component spec

- `ui/src/lib/globeFit.ts` (new): `freeBox(kind: 'title' | 'title-phone' | 'game', el, insets)`, `measureDiameter(map)`, `fitZoom(map, box, fill)`, `useGlobeFit(map, getBox)` (ResizeObserver, debounce, `userZoomed`).
- `ui/src/lib/mapLabels.ts` (new, pure): `labelFeatures(geo, { names, eraStatus, mapLabels, labelAllow, situations, selected, player }) => GeoJSON.Feature[]` with properties `name`, `tier`, `sort`, `italic`, `muted`; area from the polygons once per session (memoized). Unit tested.
- `ui/src/components/globe/eraLayers.ts` (new, pure): `eraFills(era, colourBy)` (feature-state map), `eraLines(era, density, selected)`, `eraPins(era, density)` (with rank, phase, cluster groups), `rimMarkers(...)` helpers.
- `ui/src/components/globe/EraCard.tsx` (new): the situation card (floating, docked or sheet by prop).
- `TitleGlobe.tsx`: props gain `era?: EraMap | null`, `colourBy`, `density`, `labels: GeoJSON.Feature[]`, `onSituation(id)`; layers `labels` (symbol), `pin-reserve`, `era-shapes`, `era-outline`, `era-lines`; spin rewritten (30 fps, paused on hover, hidden tab, `.wc-idle`, phones after 8 s); ring animation finite.
- `TitleScreen.tsx`: era map fetch and prefetch; Flashpoint vs era wiring; "This era's five fires" and the density switch; phone era chips row; card placement.
- `MapKey.tsx`: `mode: 'crisis' | 'era'`, era blocs, colour-by control, density-aware rows.
- `crisisKind.ts`: `TRUCE` kind.

## 6. Acceptance criteria (numbered, observable; QA at 390x844, 1024x768, 1440x900, 1920x1080)

Fit
1. On the title screen (Term mode, 2026) the globe disc's horizontal diameter, measured by projecting `[center.lng +- 90, 0]`, is within 4 percent of `min(freeW x 0.98, freeH x 1.02)` for the free box in 3.1, and its centre is within 8 px of the free box centre. At 390 the diameter is at least 370 px.
2. After resizing the window from 1440x900 to 1024x768 and to 1920x1080, criterion 1 holds again within 300 ms of the last resize event. After the player zooms with the wheel, a resize keeps their zoom offset (fit + delta within 0.05).
3. In game at 1920x1080 the globe diameter at load is at least 900 px (today 745) and the player's capital is on the visible side; pressing "Whole world" restores the fit after a manual zoom.
4. Picking a situation on the title globe leaves its pin inside the free box (not under the dossier, the key or the phone sheet) when the camera settles.
5. No horizontal page scroll at 390 (`scrollWidth === 390`); no pin card or chip extends past the viewport edge.

Names
6. At fit on desktop the title globe shows at least 12 country names; on phone at least 6; every visible name has a computed size of 13 px or more (MapLibre `text-size` evaluated at the current zoom).
7. No country label box overlaps any pin box or chip box on the title globe and in game (the FEEL-7 check 26 extended to the title globe, in all four eras).
8. In 1960 and 1990 no modern non-roster name outside `labelAllow` is rendered (for example "Kazakhstan", "Ukraine" as a state, "Czechia"); "Soviet Union", "West Germany", "Ukrainian SSR" are rendered or appear on hover.
9. Labels never change during a camera move other than MapLibre placement (no `setData` on the label source between era changes: instrumented `setData` count is 1 per era change).

Eras and modes
10. Switching era in Term mode changes: the header year, the fill colours of at least 10 roster countries (Blocs or Stability), the situation pins (ids differ), and the key's bloc names. Switching back restores them exactly.
11. 1960 Blocs mode: the United States and West Germany share the West colour; the Soviet Union (and Ukraine, Belarus as part of it) and Poland share the East colour; Czechoslovakia (CZE + SVK polygons) is East; East Germany's shape is East and West Germany's is West.
12. Every `startingWars` pair of the selected era is drawn as a front line when both ends are visible; every situation has a pin or a rim marker; in B exactly 5 numbered pins or rim markers show with the switch off, all situations with it on.
13. Hovering a roster country shows its era leader and title (or "Leader invented for this era"), stability word and number, and bloc; on touch, long-press shows the same.
14. Flashpoint mode shows the 8 flashpoint pins and no era control; Term and Legacy show the same era world for the same era.
15. "Play it as a 15-minute Flashpoint" on a 2026 situation with a `flashpointId` switches the mode to Flashpoint and selects that flashpoint; "Lead <country>" selects that nation in the list.

Time travel and budget
16. An era switch completes in 1000 ms or less (last pin settled), holds 55+ fps on the desktop reference in a performance trace, and makes no network request if the eras were prefetched.
17. With `prefers-reduced-motion`, an era switch has no camera move and no year stamp and completes in 200 ms or less.
18. Idle title screen for 10 s at 1440 after 20 s of no input: no running infinite CSS animation on title pins, and fewer than 2 MapLibre repaints per second (spin paused).

Data
19. `npm run test` passes the era map tests in 4.2; `GET /api/scenarios/1960/map` returns at least 5 situations, at least 4 blocs, and `countries` for all 41 roster ids with `status`.
20. No visible text on the globe, key or card contains an em dash character (repo-style test covers the JSON).

## 7. Build plan (work packages)

FEEL-7 owns `MapView.tsx`, `mapMarkers.ts` and the `wcm-*` rules until it merges. Nothing here touches those files before FEEL-7 lands; WP-W2 then edits only the lines named.

| WP | Scope | Files | Depends on | Coordinates with |
|---|---|---|---|---|
| **WP-W1 Title globe foundation** | Fit (3.1 title), self-hosted glyphs, label layer and `pin-reserve` on the title globe, spin and ring budget (M9), phone globe band | new `ui/src/lib/globeFit.ts`, new `ui/src/lib/mapLabels.ts` (+ `tests/ui/mapLabels.spec.ts`), new `ui/public/glyphs/**`, `ui/src/components/TitleGlobe.tsx` (camera, style glyphs, labels, spin), `ui/src/styles/title.css` (globe band, `.tg-pin-ring` finite) | none | can start now, parallel to FEEL-7 (different files) |
| **WP-W2 In-game fit and labels** | Fit and framing in game (3.1), label tiers (3.2), "Whole world" control | `ui/src/components/MapView.tsx`: only the map constructor options (`zoom`, `glyphs`), the "Open on the player's own country" effect, the `country-labels` layer block and its `icons` label feature properties, the selection `flyTo` (line ~906), the NavigationControl area | FEEL-7 merged; WP-W1 (`globeFit.ts`, `mapLabels.ts`) | FEEL-7 engineer: rebase on its `pin-reserve` and anchor changes, keep them |
| **WP-W3 Era map backend** | Schema (4.2), `initialStability` helper, `buildEraMap`, route, tests; mirrored types and `fetchEraMap` | `src/core/data-loader.ts` (schema block and the stability expression only), new `src/core/era-map.ts`, `src/api/routes/game.ts` (one new route after `/scenarios`), new `tests/core/era-map.spec.ts`, `ui/src/store/gameStore.ts` (era map types and fetch only, appended block) | none | month WP-0 and learn WP3 also touch `gameStore.ts` and `routes/game.ts`: append-only blocks, merge after them if open |
| **WP-W4 Era content** | Situations, blocs, era status, focus, labels, `labelAllow`, missing leaders where real (AFG, CUB, DNK, ETH, IRQ, LBN, PHL, SDN, SYR, TWN, VEN, YEM per era; UKR 2025 Zelensky), sources; DDR and South Yemen shapes | `data/scenarios/1960.json`, `1990.json`, `2025.json`, `2026.json`, new `ui/public/era/shapes.geojson` | authoring now; merge after WP-W3 (schema) | content consultant (dates, names); run `npm run sim` once, since new leaders change AI styles in old eras |
| **WP-W5 Era overlays and time travel** | 3.3 to 3.5 on the title: colour-by, situations, phases, rim markers, clusters, lines, hover leaders, era ink, card, five fires, density switch, mode wiring, transition | new `ui/src/components/globe/eraLayers.ts` (+ unit test), new `ui/src/components/globe/EraCard.tsx`, `ui/src/components/TitleGlobe.tsx` (era layers, transition), `ui/src/components/TitleScreen.tsx` (globe wiring, era section, phone era chips), `ui/src/components/MapKey.tsx`, `ui/src/lib/crisisKind.ts` (TRUCE), `ui/src/styles/title.css` (era rules) | WP-W1, WP-W3 (WP-W4 for real content; stub data works) | month WP-G edits the title's preselect line (B-12) and learn WP8 wraps title text nodes: keep W5's `TitleScreen.tsx` diff to the globe props, the era block and the new rows |
| **WP-W6 QA scenario** | Criteria 1 to 20 with screenshots per breakpoint and era, label-overlap check, idle repaint count, transition trace | new `devloop/instances/world-conflict/scenarios/worldmap.mjs` | WP-W1 to WP-W5 | QA engineer |

Merge order: WP-W1 and WP-W3 now (parallel), WP-W4 after WP-W3, WP-W5 after WP-W1 and WP-W3, WP-W2 after FEEL-7 and WP-W1, WP-W6 last. Run `tests/core/determinism.spec.ts` after WP-W3 and WP-W4 (the schema is display-only, but WP-W4 adds leaders, which feed the AI).

## 8. Open questions

- Natural Earth borders are modern. The DDR and South Yemen shapes cover the big gaps; the Soviet Union is painted by merging the republics. A full historical border set (CShapes) is out of scope for iteration 1.
- Should the in-game map also show the era's blocs (a "Blocs" layer next to Relations)? Proposed for iteration 2 once WP-W3's payload exists; the game state already has alliances.
- Whether a 1960 Ukrainian SSR start should be offered at all is a game design question: this spec keeps it playable and labels it "Alternate history".

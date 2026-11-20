# Release-candidate playtest: game feel (globe menu, month debrief, paper)

Date: 2026-11-20. Build: `364c876` (turn stamp) on top of `ba5ae05` (globe menu), `30126b4` (debrief + paper), `e244daf` (engine outcomes).
Method: Playwright (headless Chromium, software WebGL) against the dev servers. 4 sessions, 3 months each:
Maya (1440x900, Flashpoint "Ceasefire or Collapse" as Ukraine, picked from the globe), Henrik (1920x1080, One Term as Israel seed 11, then as the United States seed 3), Jo (390x844 touch, Flashpoint "Hormuz Convoy" as the United States, picked from a globe pin).
Screenshots: `dev_plan/reviews/game-feel/playtest/`. Console: across all sessions only `ERR_TUNNEL_CONNECTION_FAILED` (external font host, proxy). No `pageerror`.

## Maya, newcomer (1440x900)

> "Oh, a spinning globe with fires on it, that's a game. I clicked the red dot on Ukraine, it flew there and told me the story. The month recap is way better than a slide show: big picture, what Trump thought, numbers going up. But why does it say 'Zelensky chooses to only by referendum'? And the war bar is a black box."

- Main page reads as a game, not a dashboard: dark globe, pins, serif "Pick a fire. Put it out, or don't.", gold daily pin, scene art in the dossier (`maya-01-title.png`). Clicking a pin flies to it, tints the sides, fills the dossier (`maya-02-pin.png`).
- The **Take office** button is half below the dossier's bottom edge at 1440x900: the dossier scrolls internally (scrollHeight 774 > clientHeight 751, button bottom 868 > panel bottom 860) (`maya-01-title.png`, `maya-02-pin.png`). The main CTA of the page looks cut off.
- Pins float in empty space beyond the globe's limb (two to the right of the disc in `maya-01-title.png`, one in `maya-03-side.png`), and after choosing a side the globe keeps turning so the selected pin slides under the "Today's crisis" card (`maya-03-side.png`, label reads "...ollapse").
- Debrief page 1 is attractive: big scene, kicker, headline, quote, before -> after bars, five stat tiles, "Also this month" chips (`maya-m1-debrief-1.png`). Diplomacy with the summit scene and both flags (`maya-m1-debrief-2.png`).
- The war card's front bar is broken: a black box with the dot at the far left and "LOSINGSTALEMATEWINNING" run together (`maya-m1-debrief-3.png`, `maya-m3-debrief-3.png`).
- Copy breaks the spell on the most visible lines: "Zelensky chooses to only by referendum" (headline and paper), "1 decisions", "United States's capital", "in United States", "The front moves 0 in your favour" (`maya-m3-debrief-3.png`).
- The paper now leads with a real story, scene, pull quote and "Your month" band (`maya-m1-paper.png`), but the lead body says "Zelensky also chose to ordered: court united kingdom, and ordered: national address." (all 3 months, and in every other session).
- Gaza and West Bank hot-zone cards sit on Ukraine's "Home and security" page every month (`maya-m1-debrief-3.png`): irrelevant to her country and they push her own items down.
- She never saw the "Orders sent" stamp in screenshots; a DOM probe shows it is just the loading overlay: on screen 1.75 s once, 0.44 s the next month (`stamp-probe-0.png`, `stamp-probe-1.png`).

## Henrik, strategy veteran (1920x1080)

> "Grouping by country is right, the Table is what I want and the keys work. But it lies to me in places: the UAE 'moves against you' by courting me, Iran 'vows a response' on a card where Iran's view of me went up, and when the US-Iran war ended it was buried on page 3 as 'The guns fall silent', with a broken bar."

- Keys: Ctrl+Enter executes, `2` jumps to Diplomacy, Right arrow to page 3, Left arrow back, Esc closes the debrief and opens the paper. All worked in 6 of 6 months.
- Table view is dense and scannable, rows colour-coded, reply tone printed ("angry: ...", "warm: ...") (`henrik-m1-table.png`, `henrikusa-m1-table.png`).
- AI moves against him do appear: Egypt denounces, Syria and Lebanon mass troops, Turkey spies, each with a map and the month's change in their view (`henrik-m1-d2.png`, `henrik-m2-d1.png`).
- **Wrong label**: any country with moves but no player action gets the headline "X moves against you" and a red verdict, even when the move is friendly. Seen 4 times: "United Arab Emirates moves against you / They: Court Israel / view 46 -> 50 (+4)" (Israel months 2 and 3), "Egypt moves against you / They: Court United States" and "Mexico moves against you / They: Court United States" (US month 3). Source: `countryCard()` fallback in `ui/src/lib/debrief.ts:103`.
- **Tone vs numbers**: the grouped Iran card pairs the crisis reaction "Iran vows a response 'at a time of our choosing'" (red, angry) with "Iran's view of you (month) -100 -> -96 (+4)" in green (`henrik-m1-d2.png`). The reaction belongs to the crisis, the relation fact to the whole month (call included). In the US game the Iran card's only quote is "Finally, someone in charge who listens. / On the street" (a domestic crisis line on a foreign card), so Khamenei's reply to the call is lost.
- **Biggest event buried**: US month 3, Iran proposed a ceasefire and the war ended (a Term statecraft goal). The debrief highlight was a Khamenei call; the war ending is the last card on page 3, "The guns fall silent", front 66 -> 66, with the broken bar (`henrikusa-m3-d3.png`). The paper does lead with "The war with Iran is over", so debrief and paper disagree on the month's story.
- Same metric, two numbers on one page: NSA card "Gaza: aid getting in 38.5 -> 46.5" and the hot-zone card "Aid getting in 39 -> 45" (Israel month 2, page 3).
- Highlight is repeated: the first "Also this month" chip is the highlight itself (`henrik-m1-d1.png`), and the Table has the same item twice (The month + Diplomacy).
- The highlight page auto-advances after 7 s unless you touch a key; reading without input loses the page (happened to every scripted capture that took longer than 7 s).
- Calls render as an in-person red-carpet handshake with both flags (`henrik-m1-meeting.png`, `henrik-m2-d1.png`): both leaders are there, as asked, but a "Secure line" call looks like a state visit, and Israeli and Iranian leaders shaking hands mid-war reads as a gag.
- Count-up numbers: when frames are scarce the before -> after shows "77.2 -> 77.2 +3" until the animation runs (`maya-m2-stamp.png`, `maya-m3-debrief-3.png`). Seen under headless software rendering only (unconfirmed on real hardware), but the value rendered before the animation is the *before* value.

## Jo, phone (390x844)

> "The globe on my phone is gorgeous and tapping a fire works. Then the recap is cut off on the right: I can see 'Iran's view of you' and a bar, but not the numbers. That is the whole point of the screen."

- Main page stacks well: title, mode dial, globe, daily, dossier, sticky Take office (`jo-01-title.png`). Tapping the Hormuz pin selects it (`jo-02-pin.png`).
- Dossier frame: the rounded panel ends mid-list and the side cards spill out below its border; the "LIVE" ticker tag floats over the first side card after scrolling (`jo-03-dossier.png`).
- **Debrief overflows horizontally on the phone** (P0): `.debrief` scrollWidth 629 vs 387 client, every month (3 of 3, plus a 4th repro). Headline, quote and every before -> after number are cut off on the right; tabs show "3 Home anc" (`jo-m1-d1.png`, `jo-m1-d2.png`, `jo-m1-table.png`). Cause: `.db-head` is 615 px wide because `.db-tabs` is `nowrap` (debrief.css:104) inside the `.debrief` grid, which has no `grid-template-columns: minmax(0, 1fr)`, so the single column grows to the tabs' width.
- Footer next button sits mid-screen rather than right-aligned (consequence of the same overflow).
- Paper on phone is readable and handsome (`jo-m1-paper.png`), same "chose to ordered:" sentence.
- Desk on phone still works (bottom sheet, Approve 3, Execute) (`jo-m1-desk.png`); HUD runs "$31.00T◆ 1" together.

## Designer and art director pass

- The direction is right: the title is a place, the turn boundary is a moment, the debrief is grouped, visual and short (3 pages), the paper tells a story. It now feels like a game.
- What still undercuts it is trust: the debrief's job is to tell the truth about the month, and the label bug, the tone/number pairing, the buried ceasefire and the template grammar each make a veteran doubt the numbers.
- The stamp is a spinner with a label; to be a beat it needs a minimum on-screen time (about 1.2 s) independent of the API.
- Scenes are strong (nuclear hall, summit, studio) but the cabinet-table scene carries a lot of unrelated crises (US referendum demand, midterm clock), and figures are near-identical across leaders.
- Hot zones belong on the World page or footnotes unless the player's country is involved.

## Issues (prioritized)

### P0
1. **Phone: debrief cut off on the right.** Did: Execute on 390x844. Got: page 629 px wide, numbers, quotes and tabs clipped (3/3 months + separate repro). Expected: one column at 390. Fix: `grid-template-columns: minmax(0, 1fr)` on `.debrief` and/or `min-width: 0` on `.db-head`/`.db-stage`. File: `ui/src/scenes/debrief.css` (lines 2, 4, 104).
2. **Friendly moves labelled "moves against you".** Did: Israel and US Terms. Got: "United Arab Emirates moves against you / They: Court Israel" with view +4, "Egypt/Mexico moves against you / They: Court United States", red verdict (4 repros, 2 games). Expected: headline and verdict from the move type (e.g. "X reaches out"). File: `ui/src/lib/debrief.ts` `countryCard()` line ~103.

### P1
3. **Front bar visual broken** on every war card: black box, dot at the left, "LOSINGSTALEMATEWINNING" (5 repros, 1440 and 1920). `.db-front` collapses to ~36 px; give it `width: 100%`. Files: `ui/src/scenes/debrief.css:61-67`, `OutcomeCard.tsx`.
4. **Paper lead grammar**: "Zelensky also chose to ordered: court united kingdom, and ordered: national address" (every month, every session). Same template gives headlines "chooses to only by referendum". Likely `src/core/turn.ts` newspaper lead / `src/core/reactions.ts`.
5. **Reaction tone contradicts card numbers** in grouped cards: angry crisis quote next to a +4 relation fact (Israel m1, `henrik-m1-d2.png`); US: domestic "On the street" quote on the Iran card, the leader's call reply dropped. Pick the reaction that matches the card's headline fact, or show both. Files: `ui/src/lib/debrief.ts` `countryCard()`, `src/core/reactions.ts`.
6. **War ending not the highlight**: US-Iran ceasefire shown last on page 3 as "The guns fall silent, 66 -> 66", while the paper leads with it (1 occurrence, seed 3 US Term; unconfirmed as a rule but `highlight` selection in `src/core/turn.ts` should rank war end above a call).
7. **Take office half hidden** at 1440x900 inside the scrolling dossier (2/2 loads). Make the launch row sticky at the dossier bottom like on the phone. `ui/src/styles/title.css`, `TitleScreen.tsx`.
8. **Globe pins detach from the globe** (in space past the limb, or offset from their country while turning; 4 screenshots at both sizes; unconfirmed on GPU hardware, may be software-render lag) and the globe resumes spinning after a selection so the chosen pin slides under the daily card. `ui/src/components/TitleGlobe.tsx` (hide far-side markers, hold rotation while a pin is selected).
9. **Phone dossier frame**: side cards overflow the panel border, LIVE ticker tag floats over content (`jo-03-dossier.png`). `ui/src/styles/title.css`.
10. **Copy defects in debrief text**: "1 decisions", "United States's capital" / "United Arab Emirates's view" (mixed with "United States' view"), "in United States", "travel fast in West Bank", "The front moves 0 in your favour", nested quote loses its closing mark ("'A gesture we will answer in kind." because `OutcomeCard` strips a trailing `'`). Use `possessive()`/`withArticle()`. Files: `src/core/outcomes.ts`, `src/core/reactions.ts`, `ui/src/lib/debrief.ts`, `ui/src/scenes/MonthDebrief.tsx`, `OutcomeCard.tsx`.
11. **Irrelevant hot zones** (Gaza, West Bank) on Ukraine's and the US's Home page every month. Show only when involved; else footnote. `ui/src/lib/debrief.ts`.

### P2
12. "Orders sent" stamp is the loading overlay, 0.4 to 1.8 s, sometimes invisible; give it a minimum duration. `ui/src/App.tsx` `TurnStamp`.
13. Highlight auto-advances after 7 s even while the player is reading (MonthDebrief.tsx).
14. Highlight duplicated in "Also this month" and twice in the Table.
15. Same metric with two values on one page (NSA card vs hot-zone card, Gaza aid).
16. Count-up shows before == after with a non-zero delta until frames arrive (headless only, unconfirmed); render the final value when motion is slow or after a timeout. `ui/src/lib/useCountUp.ts`.
17. Phone call depicted as an in-person red-carpet summit; consider a split-screen phone scene.
18. Narration lines cited as a leader's quote ("Crowds gather outside the embassy of Ukraine in United States." / President Donald Trump) in the debrief and as the paper's pull quote.
19. Paper section tags: a US demand and a war ending filed under "DOMESTIC"; oil-shock story flagged AFG/ARE for "turmoil in Iran".
20. Debrief Diplomacy page is heavy (17 fps vs 55 on the desk in headless; two 120 s screenshot timeouts at 1920 with 8 cards). Check on a mid-range laptop.
21. Phone HUD "$31.00T◆ 1" collision; 1960 era lists the UAE and Belarus as playable (pre-existing data).

## What works well

- The main page finally sells the game: globe, pins, daily in gold, scene art, side cards with difficulty pips, era stamps for Term and Legacy with tinted nations (`maya-term-israel.png`).
- Debrief structure: 3 pages, grouped by country, several cards per page, with scene/map/front visual, what you did, a reply, numbers, a watch line; footnotes for staff-handled meetings, "also changed their view" and "meanwhile abroad". Far better than one slide per item.
- Table view and keys (1-4, arrows, Esc, Ctrl+Enter) are exactly what a veteran wants.
- Most reactions match their numbers (Trump warm +4, Xi angry -32 after a blown spy op, Erdogan warm +3, UN coordinator angry on outposts).
- The AI's moves against you are visible for the first time, with maps.
- The paper's lead story with scene, pull quote, "Your month" band and "What next" reads like a front page.
- No runtime errors in about 20 game months across 4 sessions.

## Verdict

**No, not as it stands; it becomes a yes once the two P0s and the P1 list are fixed.** The redesign hits the brief (game-like menu, grouped visual debrief, story-led paper), but the phone debrief is unreadable and the "moves against you" label says the opposite of what happened; both are small, local fixes, and the P1 copy and visual defects (front bar, "chose to ordered", tone pairing, buried ceasefire, half-hidden CTA) sit on the most visible lines of the new screens.

## Fixed after this playtest

- P0-1: the debrief grid has a `minmax(0, 1fr)` column and its header shrinks, so the phone debrief fits 390 px (verified: 390-debrief-1..3 in after/).
- P0-2: a country card is "moves against you" only for hostile moves; friendly moves read "reaches out to you", moves at your allies show the move itself, and the verdict follows their view of you.
- P1-3: the front bar fills its card (verified on the Iran war card).
- P1-4: the lead reads "On <crisis>, <leader> decided: <option>" and "Elsewhere, <leader> took a call from Iran (...) and ordered "...""; crisis headlines quote the option instead of forcing a verb.
- P1-5: grouped cards show their view of you over the whole month, prefer the counterpart's own reply, and drop any reply whose tone contradicts that change; calls and visits lead a country's card.
- P1-6: a war that ends is the month's highlight.
- P1-7: Take office is sticky at the bottom of the dossier.
- P1-8: pins hide on the far side of the globe, and the globe stops turning once you pick a crisis or nation (drift while turning is likely software rendering).
- P1-9: phone dossier contents stay inside the frame; the ticker is hidden on phones.
- P1-10: plurals, articles ("the United States"), "The front holds" for no move, quotes only unwrapped when fully quoted, possessives in nuclear aftermath and courting stories.
- P1-11: Gaza and West Bank cards only for Israel, the West Bank, Egypt and the United States, and only for moves of 5+.
- P2: the highlight page no longer advances by itself.

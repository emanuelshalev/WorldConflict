# Changelog

## Unreleased: visual overhaul (2026-11-02)

- **A desk that fits on one screen:** two modes, **Map** (the full globe, layers and legend, with a command strip at the bottom) and **Desk** (key M). The desk lists everything this month on the left, shows the item in focus in the middle, and keeps on the right a 2D map of the subject, four budgets (political capital, defense budget, orders 0-6, meetings in person 0-3), the selection ("This month you will"), a readiness check, Approve all and Execute, with no scrolling from 1280x720 up. Crises start on the staff pick, the staff queue up to three safe orders (Settings toggle), meetings are suggested and wait for approval. Going over a budget disables Execute with the reason. Picks are saved per save and month. Phones get a chip navigator and a bottom sheet. The previous split layout is kept as the git tag `classic-split-layout`. Design spec and persona feedback: `dev_plan/reviews/desk-redesign/`.
- **News ticker:** its own row at the bottom, never over controls; hide or show it from the HUD, its Hide button or key N (remembered; off by default on phones); it pauses on hover and stands still with reduced motion.
- **Gaza and the West Bank:** "Palestine" is now the **West Bank**, and Gaza is on the map with its own outline (the base map had drawn it as sea). Both are hot zones with their own state (violence, humanitarian need, aid, civil order, ground held or settled), a phase (fragile ceasefire, war, uprising), a monthly incident in the news, a ceasefire that can break, and effects on Israel, the West Bank, Egypt and world opinion (`src/core/systems/hotspots.ts`, scenario `hotspots`). Twelve new crisis cards for Israel, Egypt, the United States, the West Bank, troop contributors, donors and UN voters; a standing staff meeting; a beacon and a clickable zone card on the map; advisors (with or without AI) know the situation. Balance re-checked: Term smart 94% pooled (Israel 96%), random 21%, none 0%.
- **The world answers big events:** a nuclear strike leaves fallout that keeps damaging the target's economy, health and stability for months, spills refugees and contamination into its neighbours, shocks every market and breaks the target's war effort; aftermath news runs for months. Shocks put emergency meetings on the calendar (the cabinet the day after, a great power on the line demanding a ceasefire that really ends the war, a war cabinet on day one). Advisors lead with the strike; the desk suggests a ceasefire.
- **More turning points:** a coup, revolution or assassination in a country that matters to you, a state that collapses, and an ally you lose all open emergency meetings (recognise or condemn the new regime; seal the border or open a corridor; reassure the remaining allies, court a new partner, and take the former ally's call).
- **Map fidelity:** every layer colours the current state with colour-blind-safe scales that match the legend: the Economic layer shows health (real growth, embargo, fallout), not size; struck countries and nuclear users get their own treatment. Animated markers come from the state: strike sites with fallout halos and plumes, war fronts, refugees, coups and elections, airstrikes, unrest, collapsing economies, embargoes.
- **The leader's calendar:** every month brings calls from other leaders, a staff meeting, and a state visit or an interview (`src/core/meetings.ts`). You attend three in person; deputies take the rest, and skipped callers remember. Answers are quick choices with visible effects. Balance re-checked: Term smart 94% pooled, random 18%, none 0%.
- **Consult your staff:** a Consult button on every crisis and meeting opens the right minister with the question asked. Full chat with an AI key; without one, tap-to-ask questions answered from the game state. Fixed: "Can you?" no longer reads as Canada.
- **Fixed:** AI pact offers to the player now respect the same 9-month cooldown as other crises.
- **Broadcast scenes:** every order, crisis and news story is staged as one of 20 animated SVG scenes (cabinet, TV interview, press room, parliament, markets TV, field visit, summit, treaty signing, executive order, address, war room, convoy, airstrike, nuclear, covert ops, protest, election night, disaster, ceasefire talks, UN vote), dressed in the real flags of the countries involved and lit by the outcome.
- **Outcome reel:** after Execute, each order and crisis answer plays as a news shot with an animated verdict stamp and a dispatch panel: a varied story, the numbers it moved (before and after), an outcome map on real borders, and a trend line of that order type across the term (`src/core/outcomes.ts`, `director.ledger`). Failed orders get their own story.
- **Map:** a 3D globe under a glass HUD and desk; a click menu to give orders straight from a country; troop markers on borders; arrows for queued orders; alliance links; animated war arcs with the front marked; pulses on countries whose relations with you moved.
- **Look:** Geist, Geist Mono and Instrument Serif replace the old fonts; sentence-case headings; scene headers on crisis cards, advisor suggestions, the Chronicle and the end screen.
- **Landing page:** unchanged on purpose (the dark version stays live). Footage tools record frame by frame on a virtual clock (`site/tools/framecap.cjs`), and the scenes export as standalone SVGs.

## 2.0.0-rc.2: 2026-11-01

Fixes from the four-persona confirmation playtest of rc.1 (`dev_plan/reviews/round3-confirm/`).

- **Statecraft goal:** a Term's third star now needs foreign policy: end the war you inherited, or mend ties with your worst-placed rival. Good domestic management still keeps you in office.
- **Reform:** wins no votes, gives diminishing returns when repeated within six months (Term and Legacy), and lifts the economy's long-run growth trend, so the economic score has a real lever.
- **Realism:** pact offers follow the same rules as AI pacts (none while at war, at most 4). Term limits cover 12 countries. There are no general strikes where strikes are banned, typhoons happen only where they really do, juntas aren't toppled within 18 months, and consolidated democracies never have coups. Bab al-Mandab's war crises are skipped after a ceasefire.
- **Robustness:**
  - A ceasefire can't crash global tension.
  - The server refuses a duplicate turn (409), and the UI retries rate-limited turns.
  - Malformed requests get a 400 instead of a 500, and unknown countries are refused.
  - Deployments are bounded by manpower, and nuclear strikes ask for confirmation.
- **Isolation fix:** new games no longer share objects with the data loader's cache, which had let one game's events leak into the next within a process.
- **Balance:**
  - Term: smart 89% pooled, random 16%, none 0%.
  - Flashpoints: smart 92% pooled (every seat at 65% or more over 24 games), random 15%, none 0%.
  - Greedy no-orders play in Terms falls from about 75% to about 60% for Taiwan and Germany (27% pooled).


## 2.0.0-rc.1: 2026-11-01

The engagement overhaul: World Conflict becomes a session-based game with clear goals, a living November 2026 world, and a simulation tuned by headless playtests and four rounds of persona and expert reviews.

### Play
- **Three modes:** Flashpoint (12 months, one clear mission, a verdict and a real-world debrief), One Term (48 months, then the voters or the Party) and Legacy (120-month sandbox). There is also a **daily crisis** with a streak counter.
- **The world of November 2026:** 41 playable nations with real leaders, real election dates, and 8 flashpoints (Hormuz, Taiwan quarantine, Bab al-Mandab, Ukraine ceasefire, Sudan, Caracas, Scarborough Shoal, Indus waters).
- **A desk instead of menus:** each month brings a crisis card with options that show the direction of consequences, advisors who read your mission, orders that cost scarce political capital (2◆ a month, 3 in Flashpoints), and a monthly report on what moved and why.
- **Telegraphed danger:** coups, revolutions, impeachments and no-confidence votes arrive as crisis cards before they strike.
- **Verdicts that fit what you did:** an archetype read from your actions, a grade, stars, a month-by-month strip, and a share card (text and PNG).

### Simulation
- **Honest economics:** the growth you see is real growth, including war damage, crisis hits and reparations. War damage depends on geography (a ground war on your soil versus a distant air campaign) and on the enemy's economic reach. Oil shocks come from new wars, not old ones, and defence budgets rise with threats only up to a ceiling.
- **Diplomacy:** denunciations rally voters only against adversaries. Defence pacts are rare and deliberate, never signed with a belligerent, and offered to you as a crisis card, never signed for you. Allies go home when the war they joined ends. A clearly winning side can accept a peace on its terms.
- **Politics:** incumbency fatigue, term limits (USA, France, Mexico, South Korea, Philippines, Brazil), impeachment and no-confidence votes for democracies, and coups that rarer AI regimes suffer realistically rather than monthly.
- **Covert war:** a spy hunt foils most foreign operations for three months, and the monthly report says when you're being targeted.
- **Tension that breathes:** standing garrisons no longer pin the world at 85+.

### Interface and accessibility
- Map-first HUD with real Natural Earth borders and six layers. The phone layout has a compact HUD, a sticky Execute button and a bottom-sheet dossier.
- **Keyboard:** Escape closes the topmost layer, and dialogs manage and trap focus. Small text and the map popup meet WCAG AA contrast.
- One order vocabulary across the desk, dossier and previews. Previews show the real effect, including diminishing returns, and the ◆ cost.

### Fixes from playtests
- Closed exploits: denounce spam, duplicate orders (now one per target per month, at most 6), and negative purchase values (the world state is also validated before every save).
- Many realism fixes: no Macron third term, no mass defence pacts, no annual lifting of North Korea's embargo, correct leader titles, "the Philippines", air-war vocabulary where no border is shared, and intelligence estimates capped at 100%.

See `dev_plan/reviews/round3/README.md` for the full triage and `dev_plan/HANDOFF.md` for measured balance and known issues.

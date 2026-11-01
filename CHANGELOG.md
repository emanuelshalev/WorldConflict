# Changelog

## 2.0.0-rc.2 — 2026-11-01

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


## 2.0.0-rc.1 — 2026-11-01

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

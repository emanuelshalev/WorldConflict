# Round 3: UX / Visual Release Review

Captured with Playwright at 1440×900, 1024×768 and 390×844. Screenshots are in `/tmp/claude-0/round3/ux/shots/`, cited below as `S/…`. Three 12-month games reached the end screen.

**Progress since round 1:** the login wall is gone, the map renders, the focus ring is consistent, the Chronicle leads with the player's decision, and nothing scrolls horizontally.

## Issues

### Layout
1. **P1 · HUD collapses at 1024.** The leader block shrinks to the letter "I", and the stat labels overlap "United States · Nov 2026 · month 1/12". Evidence: `S/tab/09-desk.png`. Fix: in `Hud.tsx` / `wc.css .hud-who`, set `min-width:180px` and switch to the short labels (`lbl-short`) below 1200px, not only below 900px.
2. **P1 · Mobile HUD overlap.** GDP "$31.00T 2.0%" draws on top of CAP "◆3/6". Evidence: `S/mob/09-desk.png`, `S/mob-extra/21-target-selected.png`. Fix: hide the growth `<small>` under 600px, or make the `.hud-stats` grid columns `minmax(0,1fr)` with ellipsis.
3. **P1 · Title launch bar covers content.** On 390 the sticky bar covers about 45% of the screen (poem and mode cards). At 1024 it covers the mode descriptions. Evidence: `S/mob/01-title.png`, `S/tab/01-title.png`. Fix: in `TitleScreen.tsx` / `.launch-bar`, collapse to one row (flag, name, TAKE OFFICE) on mobile and put the blurb behind a "details" toggle.
4. **P1 · The map is squeezed.** At 1440×900 the desk leaves the map 373px of height, and the dossier needs internal scrolling. On mobile the dossier shows only "Government". Evidence: `S/desk/13-dossier.png`, `S/mob/13-dossier.png`. Fix: collapse the desk by default once a crisis is answered. On mobile, render `CountryDetailPanel` as a bottom sheet.
5. **P2.** Long leader titles are truncated ("MOHAMMED BIN S…"; `S/desk-extra/01-all-orders.png`). The mobile drawer clips its "Mission" tab (`S/mob/15-drawer-world.png`).

### Contrast (WCAG AA)
6. **P1 · Map hover popup is unreadable.** It has a white background with light text, about 1.3:1. Still open from round 1. Evidence: `S/desk-extra/22-dossier-iran.png`, `S/tab/13-dossier.png`. Fix: in `App.css .maplibregl-popup-content`, use `background: var(--surface-2)`.
7. **P1 · Small text fails AA.** The `.delta-down` red `#e5383b` at 11px on the crisis cards measures 3.6:1. `--text-3 #6f7b8d` at 10–10.5px (`.backers`, `.who`, HUD labels) measures 3.6–4.47:1. Fix in `wc.css`: use `--bad-text:#ff6b6e` for text and raise `--text-3` to `#8693a6`.

### Keyboard
8. **P0 · Escape closes nothing.** Tested on every overlay, drawer and modal; `ui/src` has no keydown handler. Fix: add one `useEffect` in `App.tsx` that calls `closeModal()` / `setDrawer(null)` / `selectCountry(null)`.
9. **P1 · Modals don't trap focus.** Opening the action preview leaves focus on the dossier button behind it, and Tab walks the page underneath (`S/desk-extra/23-preview.png`). Drawers have `role="dialog"` but no `aria-modal` and don't move focus. Fix: add a shared focus-trap hook and `aria-modal="true"` in `ActionPreviewModal.tsx`, `Drawers.tsx`, `SettingsModal.tsx`, `SaveLoadModal.tsx` and `Chronicle.tsx`.
10. **P2 · Tab order.** The order runs HUD → map zoom → 7 layer buttons → desk, so Execute comes late. Crisis options don't expose `aria-pressed`. Fix: add a skip link and an Enter shortcut for "Execute month".

### Consistency and correctness
11. **P1 · Advisor suggests targeting yourself.** It offers "Mediate peace for United States" (`S/desk/09-desk.png`). In `Desk.tsx:193`, when `c.targetId === me.id`, suggest a ceasefire with the opponent instead.
12. **P1 · Two action vocabularies.** The dossier says "Court them / Propose military pact / Gather intelligence / Deploy troops to border". All orders says "Court Iran / Offer defense pact / Spy on / Mass troops facing". Only the dossier opens a preview. The preview shows "Cost: $0M" and omits the ◆ cost. It uses an off-palette blue button, and a backdrop click silently cancels the order. Fix: share one action table, show ◆ in `ActionPreviewModal.tsx`, use `wc-btn primary`, and make backdrop clicks close, not cancel.
13. **P2 · Numbers disagree.**
    - Save list "month 0" vs HUD "month 1/12".
    - Chronicle "DEC 2026 · MONTH 1/12".
    - Tension 78 in the HUD vs 80 in the Chronicle; at 1440 the number is hidden entirely.
    - "Relations: SATISFACTORY (-15)".
    - Difficulty "Story/Normal/Hard" vs "STATESMAN" (`S/desk/17-drawer-mission.png`).
    -
14. **P2.** The briefing repeats the mission text twice, and the Mission drawer repeats it twice more. Typo: "President of United States" (`S/desk/08-briefing.png`, `BackstoryModal.tsx`).
15. **P2 · React warning.** "Encountered two children with the same key: Airstrike". The crisis arrows use `key={a.label}` (`Desk.tsx:114`).

### End screen and share card
16. **P1 · Opaque failure.** The Egypt daily met all 5 concrete goals but failed "Leadership score 107+" and got **D, 0 stars, MISSION FAILED** (`S/mob-extra/40-end.png`). Meanwhile an autoplayer picking the first options got A★★★ twice. Fix: show the score target live in the HUD, or demote the score to a bonus.
17. **P1 · Share card is not shareable yet.** Evidence: `S/desk/share-card.png`, `S/mob-extra/share-card-daily.png`.
    - It prints "localhost:5173".
    - The bottom 35% is empty.
    - The quoted headline is the player's own action, truncated mid-word with nested quotes.
    - The top 8-segment bar and the month grid have no legend; the daily grid shows a 13th cell.
    - It shows no leader, no flashpoint title and no one-line story.

    Fix in `EndScreen.tsx` `drawCard`: use a configured public URL; use the space for "3 key moments" and a mini-map of the region; define the grid legend; drop the self-headline.

## Top 10 (priority order)
1. Global Escape handling (#8)
2. Focus trap and `aria-modal` (#9)
3. Hover popup contrast (#6)
4. HUD overlap at 1024 and 390 (#1, #2)
5. Self-target suggestion (#11)
6. Share card: URL, layout, legend (#17)
7. Score-only failure / grade clarity (#16)
8. Mobile launch bar and dossier sheet (#3, #4)
9. Unify the action vocabulary and preview (#12)
10. Small-text contrast tokens (#7)

## Release-readiness scores
- **Visual polish: 7/10.** The art direction is strong and consistent; it is let down by the HUD overlaps and the white popup.
- **Usability: 6/10.** The core loop is clear. The confusion comes from inconsistent numbers and terms, and from the opaque score failure.
- **Accessibility: 3/10.** Focus rings are visible, but there is no Escape handling, no focus management, and small text fails contrast.

# Landing page: visual and motion review

Reviewed 2026-11-01 at 1440, 1024 and 390 px (recordings in `/tmp/claude-0/site-review/design/`).

## Scorecard

| Area | Score |
|---|---|
| First impression (0 to 5 s) | 5 |
| Art direction | 7 |
| Motion | 6 |
| Real-vs-game parallel clarity | 5 |
| Game footage visual quality | 5 |
| Mobile | 5 |
| **Overall** | **6** |

Coherent and tasteful, but the intro hides the promise for 46 s and the footage reads as a dashboard, not "super cool".

## Top 8 changes, ranked by impact

1. **Say the promise in second one** (`index.html` `.hero-copy`, `main.js` `runIntro`). Now: 0.6 s blank, a dim unreadable wall until 4.2 s, headline and CTA at 46 s. Show the cold-open line from the intro script ("You read the headlines.") over the wall at 0.3 s. Keep a lower-third with the H1 and CTA visible throughout. Cut the run to 4 pairs × ~4.5 s (about 20 s).
2. **Make each parallel one shot, not two** (`main.js` `runIntro`/`tileTransform`). The camera zooms out and back in 8 times, which feels repetitive. Frame **both** adjacent tiles of a pair, then do the script's "invert": the paper card flips to dark and the pin morphs into the highlighted country. Promote the 13 px `cam-label` to a large top-left slate: `REAL · 28 FEB 2026 → IN GAME · NOV 2026`.
3. **Re-capture wall clips to match `gameVisual`** (`assets/video/wall-*`). The Hormuz clip opens on Africa, not Iran. Open every clip on the pinned country. Clips are 720p at about 320 kbps and soft when zoomed; serve 1080p at 2 to 3 Mbps on desktop.
4. **Shoot beauty passes, not desk text.** At wall scale, card body copy is grey noise. Record map-led shots: pulsing war borders, the nuclear layer over Iran, the Chronicle masthead. Add a light grade to `.tile.game` (bloom on war lines, vignette). Apply the CRT scanlines in `.tile::after` to game tiles only, because paper cards should read as crisp print.
5. **Fix the mobile intro kill** (`main.js` resize handler). Before `ended`, any resize event calls `buildWall` + `endIntro`. Mobile Chrome fires one at 0.5 s with an unchanged size, so the intro ended at 0.6 s in 3 of 3 runs. Ignore resizes under 40 px. On phones, use one column of 4:5 tiles so the zoomed card fills the screen, not 30% of it.
6. **Portrait crops for phones** (`<picture>` in the timeline, `.step-media`, gallery). At 390 px, full-UI captures are illegible; serve tight crops of the card or the map region.
7. **Gallery and lightbox** (`styles.css` `.gal-grid`, `main.js` `setupGallery`). At 1440, rows leave an empty box under the narrow card. Recrop the mostly black `gal-briefing.jpg`; `gal-crisis.jpg` is cut at its right edge. Add next and previous buttons and arrow keys.
8. **Reduced motion, a11y and cost.** With `prefers-reduced-motion`, "Watch the intro" is hidden entirely, so offer a manual step-through of the pairs. Put Skip intro before the nav, with `aria-label="Skip intro"`. Four clips keep playing invisibly behind the blurred ended wall: pause them and drop the filter on the animated layer.

## Excellent, keep

- Token parity with `ui/src/styles/wc.css`: the same palette, Barlow Condensed, Plex Mono and Playfair. The page and the game read as one product.
- The two visual languages: off-white wire-bulletin paper cards against the dark situation-room UI. The pin drop with its ring pulse is a lovely detail.
- The final hero typography and the glitch burst on the H1, plus the kicker, H2 and teletype hierarchy in every section.
- The timeline pairs: the paper card beside the game card on a filling rail, with honest fiction notes.
- Zero layout shift (CLS 0 to 0.001), a skip button plus Escape, visible amber focus rings, alt text on every image, and the layer viewer as a proper tablist.

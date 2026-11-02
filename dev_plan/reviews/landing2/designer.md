# Landing v3: senior designer review of the three directions

Reviewer role: senior web designer (games and entertainment, Awwwards jury experience). Date: 2 Nov 2026.
Material: the three 1440x1900 still renders (hero plus one section), their HTML sources, and `research.md`. Renders are still frames, so I judge motion from the source (`@keyframes`) and the brief, and composition from the stills.

Measuring stick: the owner's rejection list (text-heavy, dark and grey, square cards, numbered stat tiles, dashboard, "clearly AI"). My own test on top: at 1440x900, what does the eye land on first, second and third, and is the game's name, its promise and the button all above the fold? None of the three passes that test today.

---

## Scores at a glance

| Direction | Visual quality | Feels hand-made, not AI/template | One-line verdict |
|---|---|---|---|
| B "Late Edition" | 7.5 / 10 | 8 / 10 | The only one with a real idea and real craft signals; hero needs re-staging, it is too beige for this owner |
| C "Prime Time" | 6.5 / 10 | 4.5 / 10 | Most colourful and the best single image (the rising globe), but the parallelogram panels are an esports template |
| A "Red Wedge" | 6.5 / 10 | 6 / 10 | Boldest poster, but the game's name is unreadable and the shapes are scattered like stickers |

---

## Direction B, "Late Edition" (Main.png)

**Scores:** visual quality 7.5, hand-made 8.

### The 3 strongest things

1. **The masthead.** Fraunces 900 at 214px, cropped by the left edge, with the fluorescent pink misregistration shadow (`text-shadow: 5px 3px 0 #FF4F7B`). It is a logo, a headline and a texture at once. Nobody would mistake it for a template.
2. **The torn lead photo on a riso-blue under-sheet.** The jagged clip plus the second, counter-rotated blue sheet is exactly the "print layers" signal from the research. The airstrike scene looks like a press photo, not a thumbnail, and the dark art reads brighter on newsprint than it ever did on the dark page.
3. **The photo desk section.** Four clippings at four sizes and four rotations, hung from four different left edges, with italic Newsreader captions and a hand-drawn dashed red arrow. It replaces the five-step timeline with pictures and six words per step. This is the section that most directly kills "organised square cards".

Honourable mention: the "POSTMARKED: THE WORLD, TODAY" label and the "REAL WIRE" ticker are voice, not features.

### The 5 most important problems, with fixes

1. **The promise and the button are below the fold.** At 1440x900 the viewport ends at y=900; "The next move is yours." sits at 900 to 1080 and TAKE OFFICE at 960. First screen = masthead + dark photo + grey globe. Fix: masthead 214px to 168px (about 11.7vw), `top: 40px`; double rule at 214; lead photo 780x440 at `left: 48px; top: 262px`; headline block at `top: 600px` so its first line overlaps the photo's bottom edge by 60px (see problem 2); deck and CTA in the right column at `top: 560px` and `top: 700px`. Everything important ends by y=840.
2. **"The news is real." collides with the photo and dies.** Black 92px type sits on the black bottom of the scene and on the blue sheet; the words fuse with the skyline. Overlap is right in principle, wrong in execution. Fix: paste the first line onto its own torn strip of newsprint (`background: #F4EEE1`, torn clip, `rotate(-1.2deg)`, padding 4px 18px, soft shadow `0 2px 0 rgba(28,27,25,.15)`), so it reads as a headline cut out and glued over the photo. The pink italic line stays on bare paper below it. Drop the size to 84px / 0.92 line-height so the two lines are 6 words and 160px tall in total.
3. **The pen circle misses its target.** It loops "move is" and runs into the Taiwan stamp, which reads as a layout bug, not a gesture. Fix: redraw the path around "yours." only (a box of roughly 250x90 at the word's position), stroke 4px `#E63B2E`, start and end overlapping by 30px like a real ballpoint loop, `stroke-dasharray` set to the true path length (measure with `getTotalLength()`), draw 900ms starting 300ms after the headline lands. Move the Taiwan stamp out of the pen's path: tuck it under the photo's bottom-right corner (`left: 700px; top: 560px`, 180x124, `rotate(7deg)`, below the photo in z-order so the photo overlaps 30px of it).
4. **The globe stamp is grey, not yellow, and it misses the masthead.** The `globe.jpg` fills the whole yellow disc, the cream halo plus the 50% dot screen turn it into a pale grey-blue blob; the design's loudest colour does not appear. It also sits on the double rule rather than on the masthead letters, so the "slammed postmark" idea is lost. Fix: yellow disc 420px at `left: 980px; top: 70px`, overlapping the "ict" of the masthead and drawn above it with `mix-blend-mode: multiply` (black letters show through the yellow, which is how a real stamp looks). Globe inside at 80% of the disc (`inset: 10%`, `clip-path: circle(50%)`), so a 42px pure `#FFD23F` ring always shows; dot screen opacity .5 to .22 and coloured pink `rgba(255,79,123,.5)` instead of black. Add a circular Space Mono legend on a `textPath` around the ring ("POSTMARKED THE WORLD 2 NOV 2026") rotating with the globe at 1/3 speed; delete the separate black postmark label.
5. **Too beige, too monochrome for this owner, and the CTA is the weakest object on the page.** Area count of the hero: roughly 70% beige, 20% near-black photo, under 6% pink and yellow combined. The research guardrail was 15%. TAKE OFFICE is a thin red outline at the far right edge, the fifth thing the eye reaches. Fix: (a) colour by area: the blue under-sheet grows to show 28px on two sides, the yellow stamp as above, the REAL WIRE ticker becomes riso pink `#FF4F7B` with ink text (not black), and the red tape becomes a translucent pink tape strip with ragged ends (`rgba(255,79,123,.8)`, torn clip on its short ends); (b) CTA becomes a filled stamp: `#E63B2E` fill, cream Space Mono 700 24px, letter-spacing .16em, ink-texture `mask-image` (SVG noise), 300x76, `rotate(-5deg)`, placed so it overlaps the photo's bottom-right corner by 40px, directly after "yours." in the reading path.

Also fix in the photo desk: the arrow currently runs across the middle of the cabinet photo (scribble on a picture). Route it over paper only, passing under clipping 2 and emerging at its right edge. And vary the shapes: today all four are 16:9 torn rectangles, which, rotated, is still "four cards". Make one a tall 3:4 crop (cabinet), one a circular wire-photo crop (signing, 260px), keep two as wide clippings, and add one bright clipping that is not a dark scene: `chronicle.jpg` (the in-game paper) pinned under step 4. Replace the yellow sticky "20 broadcast scenes" (a number tile in disguise) with a pink sticky that says "Every order airs tonight." Mobile is unplanned: every element is absolutely positioned at 1440 px values and the masthead is `nowrap` at 214px, so at 390px the page is broken; see the mobile plan below.

---

## Direction C, "Prime Time" (PrimeTime.png)

**Scores:** visual quality 6.5, hand-made 4.5.

### The 3 strongest things

1. **The globe as a rising planet.** A 1180px circle bleeding off the right and bottom with a coral rim glow is the single most striking image across all three renders. It is our Plague Inc red map moment.
2. **Real, saturated colour.** Ultramarine to violet, signal yellow, coral, and a yellow and coral diagonal second section. This is the only render that would make the owner say "colour" without being asked.
3. **Broadcast lower-thirds.** The yellow `TAIPEI · QUARANTINE` tags in JetBrains Mono are legible, on-theme and short. The coral BREAKING crawl reads as TV instantly.

### The 5 most important problems, with fixes

1. **The war-room panel eats the logo.** It covers "NFL" so the name reads "CON ... ICT". Fix: move the panel to `left: 470px; top: 330px` (overlapping only the bottom 20px of "CONFLICT"'s cap height) or put the word above the panel in z-order with a 3px ultramarine knock-out stroke; never cover more than one letter.
2. **Five identical parallelograms with identical yellow tags.** Same 9% skew, same tag, same black frame: this is the Valorant/Overwatch template and reads as "skewed cards", which is the owner's complaint wearing a disguise. Fix: one hero panel only (war room, 600x340) plus one circular "satellite feed" inset (summit, 220px) on the globe's limb; delete the third. Vary tags (one lower-third, one LIVE bug top-left, one timestamp).
3. **No message and no CTA above the fold.** Slogan at y=990, GO LIVE at 1110. Fix: slogan at `top: 470px` under the logo, CTA at `top: 600px`; scale the logo to 128px so it fits two lines in 230px.
4. **The globe is soft and the cream disc swamps the colour.** The JPG is upscaled to 1180px and visibly blurred; its cream land and the white limb make a 40%-of-hero off-white blob that fights the ultramarine. Fix: render the globe live (d3-geo orthographic on canvas from `world.geojson`, crisp at any size) with ocean `#2A3BE0`, land in three tones, so the planet is colour, not a white plate.
5. **The second section is chaos and the screenshot is illegible.** Yellow field, coral wedge, dark airstrike panel, tilted 9px-text crisis card cut off at the bottom, and the card touching "ANSWERS.". Three loud colours plus a dark image plus small text. Fix: one field colour per section (yellow only), drop the coral wedge to a 12px coral rule; render the crisis card as live HTML at readable size (title 28px, two choices as buttons) rather than a screenshot.

Also: the purple-blue diagonal gradient plus scanlines is close to the "AI gradient" look; flatten to solid `#2230D9` with a hard-edged violet diagonal shape instead. There is no texture, no imperfection, no hand mark anywhere, which is why the hand-made score is the lowest.

---

## Direction A, "Red Wedge" (RedWedge.png)

**Scores:** visual quality 6.5, hand-made 6.

### The 3 strongest things

1. **A real poster composition.** The red wedge at about 31 degrees, a vertical "WORLD" at 300px and big flat fields of red, cream and cobalt: confident, graphic, nothing like a SaaS page.
2. **Shapes that carry meaning.** Globe in a black-ringed circle with a cobalt eclipse disc behind it, a triangle crop, a parallelogram, a mustard "41 NATIONS" seal. The masks are not rectangles.
3. **Flat colour by area.** Red and cobalt cover well over half the canvas; colour is fields, not borders. This is the most "colourful by area" of the three after C.

### The 5 most important problems, with fixes

1. **The game's name cannot be read.** "WORLD" runs bottom to top (you read it by tilting your head) and "CONFLICT" is cut to "CONF" by the globe. Fix: set "WORLD CONFLICT" as one line along the wedge's hypotenuse, 150px cream on red, fully visible, and move the globe right (`left: 960px`) so it overlaps at most the final "T".
2. **The shards are scattered stickers, not a composition.** The airstrike parallelogram collides with the base of "CON", the protest triangle shows mostly black crowd, the summit circle crowds the nav. Fix: align every shard to the 31 degree axis (their long edges parallel to the wedge), stack them in a descending diagonal from the globe to the bottom-right, and crop the triangle around the lit placards, not the dark crowd.
3. **Copy and CTA are tiny and orphaned below the fold.** A 22px line and the button at y=980 to 1135, on bare cream, disconnected from the wedge. Fix: put the CTA on the wedge's edge at about y=700, nine-word line beside it.
4. **Section 2 is a row of three equal circles.** Same 220px, same border, evenly spaced: three cards made round. And the first circle covers "S." of "YOURS." Fix: three different sizes (320, 200, 140), staggered vertically, the largest overlapping the band's top edge; keep "YOURS." whole.
5. **Loaded vocabulary, shouty type.** Constructivist red wedges in a game with Russia and Ukraine reads as Soviet nostalgia to exactly the players we court; Big Shoulders condensed caps for every line plus Rubik Mono One makes the whole page shout at one volume. Fix (if kept at all): steal only the diagonal for one band, not the whole identity.

---

## The pick: Direction B, "Late Edition", made louder

B is the only direction with an idea that belongs to this game (every turn already ends with the in-game paper, the Chronicle), and the only one whose hand-made signals (tears, tape, misregistration, ballpoint, rotations) make card grids structurally impossible. Its weaknesses are fixable staging and colour, not concept. I take two things from the others: **C's colour saturation and the globe at planet scale** (in the finale), and **A's single hard diagonal** (one riso-red wedge in the finale, nowhere else).

The owner's risk with B is "beige newspaper". The rule that prevents it: **newsprint is the paper, not the palette.** Riso pink, blue and yellow must cover at least 25% of every viewport, as big flat printed shapes.

### Global rules

- Palette: newsprint `#F4EEE1`, ink `#1C1B19`, riso pink `#FF4F7B`, riso blue `#2B59C3`, riso yellow `#FFD23F`, alarm red `#E63B2E`. No grey text anywhere; body text is ink at 100%.
- Type: Fraunces (opsz 144, 800 to 900, SOFT 50, WONK 1) for masthead and headlines; Newsreader italic 20 to 24px for decks and captions; Space Mono 12 to 14px caps for datelines and the stamp. Nothing between 32px and 64px except section headlines, to keep scale contrast violent.
- Every clipping rotated between -5 and +6 degrees, never 0; no two adjacent objects share a left edge; one element per section crosses into the next section.
- Under 30 words on any screen except the parallels (one dateline and two sentences).
- Scenes: use `s-<kind>.jpg` as posters and `p-*.mp4` for motion until the SVG export bug (40 copies of the cabinet scene) is fixed; then swap in live SVG.

### Section 1: Front page (hero), 100vh, max 900px at desktop

- Dateline nav at `top: 24px`: "Vol. 1 · Monday 2 November 2026" (JS-dated) left; three underlined Space Mono links right.
- Masthead "World Conflict", Fraunces 900, 11.7vw (168px at 1440), cropped 14px by the left edge, pink misregistration shadow 5px 3px. Double rule under it with one Space Mono line: "A geopolitical simulation · 41 nations · You are the leader".
- Lead clipping 780x440 at left 48, top 262, `rotate(-1.6deg)`, torn on four sides, playing `hero.mp4` (or `p-iran.mp4`); riso-blue under-sheet offset 28px down-left, `rotate(1.8deg)`; translucent pink tape on its top-left corner.
- Globe postmark: yellow disc 420px at left 980, top 70, multiplied over the masthead's "ict"; globe at 80% inside; rotating ring legend.
- Headline: "The news is real." on a pasted newsprint strip overlapping the photo's bottom by 60px; "The next move is yours." in Fraunces italic 800, pink, on paper; the ballpoint circle draws around "yours.".
- Right column (left 1080, width 300): deck in Newsreader italic 22px, 18 words max ("Pick a country. Become its leader. Every month a crisis lands on your desk."); red filled stamp CTA TAKE OFFICE overlapping the photo's corner.
- Bottom edge: pink REAL WIRE ticker, 44px tall, ink Space Mono 14px, crawling at 40px/s, pausing on hover. It crosses into section 2 by sitting on the boundary.

### Section 2: The photo desk, one month in office (about 1.3 viewports)

- Headline top-left, two lines: "A crisis. Your orders." (ink) / "The world answers." (blue italic). 64px.
- Five clippings on the desk, five shapes and sizes: war room (wide, 560px, torn), cabinet (tall 3:4, 300px), signing (circular wire photo, 260px, with a halftone dot edge), streets (wide, 480px), and `chronicle.jpg` as a bright newsprint clipping (pinned with pink tape, overlapping streets by 60px). Each has a 3 to 5 word italic caption numbered by hand ("1. The crisis lands.").
- The red dashed ballpoint arrow draws on scroll from clipping 1 to 5, over paper only.
- Colour: a riso-yellow torn sheet (about 40% of the section's width) lies under clippings 2 and 3 as the desk blotter; one pink sticky "Every order airs tonight."
- Each clipping plays its clip when 60% in view, poster otherwise.

### Section 3: Then and now (the parallels), pinned, 9 pairs

- Full-bleed riso-blue field (the colour moment of the middle of the page), cream type on it.
- Left: torn newsprint locator map (`maps/p-*.svg`, 460px, `rotate(-3deg)`) with Space Mono dateline "28 FEB 2026 · TEHRAN" and one real-event sentence under it (under 20 words).
- Right: the matching `p-*.mp4` in a torn clipping (620px, `rotate(2.5deg)`) with one game sentence in Newsreader italic.
- On scroll, the next pair is pasted over the previous (slides in 40px, rotates from 6 to final angle, 450ms, slight overshoot), the old pair stays visible underneath as a growing stack edge on the left. A small date rail (Space Mono, 9 dates) at the right edge shows progress. Fiction disclaimer as a 12px footnote.

### Section 4: Choose your edition (modes)

- Three papers of very different sizes stacked like a pile, not a row: a pink tabloid "FLASHPOINT · 12 months" (smallest, 320px, on top, `rotate(-6deg)`), a blue broadsheet "ONE TERM · 4 years" (largest, 620px, `rotate(2deg)`), a yellow weekly "LEGACY · 10 years" (440px, `rotate(-2deg)`, half under the broadsheet). Each has a mini Fraunces masthead, one scene still as its front photo, five words, and a country flag stamped on (random per load).
- Hover lifts a paper to the top of the pile (translateY -12px, rotate toward 0 by 2 degrees, shadow grows). Click starts that mode.

### Section 5: Finale, "Tomorrow's paper is unwritten."

- One riso-red wedge from the bottom-left corner to the top-right (A's diagonal), covering about half the section, newsprint above it.
- The globe at planet scale (C's idea): 110vw disc, centred below the fold so only its top third rises out of the red, crisp live render, slow turn.
- "Tomorrow's paper is unwritten." Fraunces 900 at 9vw in ink on newsprint, its last word crossing onto the red in cream (split colour along the wedge edge with two stacked copies and `clip-path`).
- The stamp CTA, 1.3x the hero's size, centred on the wedge edge. Under it, a tiny repeat of the masthead and the footer links. No waitlist coupon unless there is a real backend.

### Motion plan

- **Load (hero, total under 1.6s):** paper grain present at 0; masthead slides down 12px and the pink shadow "registers" from 14px offset to 5px (500ms, ease-out); blue sheet then lead clipping drop in with 80ms stagger (scale 1.04 to 1, rotate from +3 degrees, overshoot `cubic-bezier(.2,1.4,.4,1)`, 420ms); tape lands last (120ms); headline strip pastes at 700ms; pink line types in by words at 850ms; ballpoint circle draws at 1100ms (900ms); stamp CTA thumps at 1400ms (scale 1.15 to 1, 140ms, with a 2px ink spread). Globe turns continuously (60s per revolution).
- **Ambient:** ticker crawl; globe; video loops muted. Nothing else moves at rest.
- **Scroll:** clippings parallax at three speeds (0.92, 1, 1.06) with `animation-timeline: view()` and an IntersectionObserver fallback; arrow in section 2 draws with scroll progress; section 3 pins and pastes; section 5 globe rises 15vh as it enters. No scroll hijacking, no smooth-scroll library.
- **Hover juice:** clippings straighten 1.5 degrees and lift 6px; stamp presses (scale .96, 100ms) and springs back; papers in section 4 come to the top.
- **Reduced motion:** everything in final position, circle and arrow pre-drawn, videos show posters with a play button, ticker static and scrollable, section 3 becomes a vertical stack of pairs.

### Mobile plan (390px)

- 16px side gutters, no horizontal scroll: clippings may bleed off the right edge visually but the page wrapper has `overflow-x: clip`.
- **Hero (one screen, 390x844):** masthead set in two lines "World / Conflict" at 24vw (about 94px), left-cropped 6px; postmark globe 180px top-right overlapping "World"'s last letters; lead clipping full width minus 8px, 16:10, `rotate(-1.5deg)`, blue sheet peeking 12px; headline strip 40px type over the photo's bottom; pink line 40px; stamp CTA full width minus 48px, 64px tall, `rotate(-3deg)`, ending by y=760. Deck sentence dropped on mobile (the headline carries it). Ticker under the fold edge.
- **Photo desk:** a single column zig-zag: clippings alternate left-hung (80% width) and right-hung (70%), rotations alternating -3/+3, each overlapping the previous by 24px; the arrow becomes a short hand-drawn connector between each pair; captions under each.
- **Parallels:** no pinning; a horizontal swipe deck (scroll-snap) of pairs, map clipping stacked on top of the video clipping in each card, dateline above, two sentences below; dots replaced by the Space Mono date rail scrolling with it.
- **Editions:** the pile becomes a fanned stack, tap to bring a paper forward; each paper 85% width.
- **Finale:** wedge steeper (bottom-left to 60% of the right edge), globe 160vw, headline 14vw over three lines, stamp full width.
- Performance: only the hero video autoplays on mobile; others play when 60% in view and pause when out; posters are `s-*.jpg` under 80KB; fonts subset to Latin, `font-display: swap`.

### Top changes, in order of impact

1. Re-stage the hero so masthead, promise and CTA all sit above y=840 at 1440x900 (masthead 168px, photo 780x440 at top 262).
2. Paste "The news is real." on a torn newsprint strip so it reads over the photo; redraw the ballpoint circle around "yours." only.
3. Make the globe a real yellow postmark slammed over the masthead (42px yellow ring always visible, multiply, rotating ring legend).
4. Colour by area: at least 25% riso pink, blue and yellow per viewport (pink ticker, bigger blue sheet, yellow blotter, blue parallels section, red wedge finale).
5. Filled red stamp CTA in the reading path, overlapping the photo's corner, not an outline in the margin.
6. Break the photo desk out of "four rotated 16:9 cards": tall, circular and wide crops plus the bright Chronicle clipping, arrow over paper only.
7. Build a real 390px layout (two-line masthead, zig-zag desk, swipe parallels) instead of shrinking absolute 1440 positions.

# Landing page v3: research and creative brief

Author role: senior web designer and game-marketing researcher. Date: 2 Nov 2026.
Inputs: the current `site/index.html` (light "dashboard" version), `site/main.js` (`PARALLELS`), the assets in `site/assets/`, the owner's two rejections, and a survey of game and editorial websites.

**Method note.** Web search worked; direct page fetching did not (every official game domain failed DNS in this sandbox, so `frostpunk2.com`, `playbalatro.com`, `civilization.2k.com`, `supergiantgames.com` and others would have to be allowed in the session's network settings to be re-checked live). The site descriptions below therefore combine search results, published case studies and my own working knowledge of these sites as they stood at my last review. Treat specific details (exact fonts, exact section order) as observations to re-verify in a browser before quoting them to anyone; the patterns themselves are robust across the set.

**Asset finding that affects every direction.** All 40 files in `site/assets/scenes/` are byte-identical (same MD5, every one has `class="art art-cabinet"`): the exporter wrote the cabinet scene 40 times. The 20 distinct scene stills exist as `site/assets/clips/s-<kind>.jpg` and the 9 captioned clips as `p-*.mp4`, so nothing is lost, but the scene SVG export must be re-run before any design that masks individual live SVG scenes can be built. The art itself (seen in the stills) is night-lit, moody flat vector: dusk purples, sodium-orange windows, red alarm light, warm spotlights. That matters: the scenes are dark, so a colourful page has to put them inside bright colour fields as windows, not use them as full-bleed dark backgrounds (which is how the rejected dark page happened).

---

## 0. The survey (14 sites + 3 editorial references)

| Site | Hero | Text around visuals | Type | Colour | Motion | Text per screen | What makes it feel hand-made |
|---|---|---|---|---|---|---|---|
| **Hades II**, [supergiantgames.com/games/hades-ii](https://www.supergiantgames.com/games/hades-ii/) | Full-bleed key art by Jen Zee, characters cropped by the viewport edge, logo laid over the art rather than beside it | Short blurbs set off-axis next to big character renders that break out of their panels | Custom display logo, classical serif headings, small caps labels | Saturated violet, ember orange, bone white, gold | Subtle parallax of art layers, embers loop | One headline + 1 to 3 short lines | Illustration leads; characters overlap section boundaries so nothing reads as a box |
| **Balatro**, [playbalatro.com](https://www.playbalatro.com/) | The game's own swirling psychedelic background shader plus tilted, wobbling playing cards | Text sits on cards that are rotated a few degrees; nothing is perfectly level | Chunky pixel font from the game | Red, teal, gold on a bottle-green felt | Constant idle wobble, cards jiggle on hover | Very low: a tagline and store buttons | It uses the game's own juice (wobble, CRT warp) as page motion |
| **Cult of the Lamb**, [cultofthelamb.com](https://www.cultofthelamb.com/) | Big character art, cute lamb against ritual reds | Characters and props spill over section edges; sticker-like badges | Custom hand-drawn wordmark, rounded display type | Blood red, cream, black, candle yellow | Idle character animation, hover bounces | Low | "Whiplash juxtaposition" of cute and creepy ([Fonts in Use](https://fontsinuse.com/uses/77885/cult-of-the-lamb-video-game)); hand-drawn everything |
| **Disco Elysium**, [discoelysium.com](https://discoelysium.com/) | Oil-painted key art, cropped hard, the painting is the page | Text set in narrow columns beside large painted figures, generous empty paint | Painterly custom logotype, condensed italic display ([madegooddesigns](https://madegooddesigns.com/disco-elysium-font/)), book serif body | Teal, ochre, bruised pink, rust | Mostly static; slow fades | Medium, but literary quotes, not feature lists | Brush texture and real painting; the page looks authored by an artist |
| **Inscryption**, [inscryption.com](https://www.inscryption.com/) | Dark cabin, a card and a pair of eyes in candlelight | Content presented as cards on a table; ARG-like hidden bits | Distressed serif, typewriter | Near-black, candle amber, blood red | Flicker, grain | Very low, mystery-first | It treats the site as part of the game (secrets) |
| **Frostpunk 2**, [frostpunk2.com](https://www.frostpunk2.com/) | Cinematic trailer loop of the frozen city, generator glow centre | Short lines laid on the video, left aligned, big negative space of snow | Condensed industrial sans, wide letterspaced caps | Ice white, steel blue, generator orange | Video loop, snow particles, scroll reveals | Low | Atmosphere (snow, steam) overlaps text; the orange heat is the single accent |
| **Civilization VII**, [civilization.2k.com/civ-vii](https://civilization.2k.com/civ-vii/) | Huge cinematic key art of leaders and an era, gold ornament | Leader portraits cut out and layered over landscapes; text in a column on one side | Elegant serif display (gold), clean sans body | Navy, gold, parchment | Parallax on cut-out figures, ages carousel | Medium, split into many short sections | Cut-out figures overlapping their frames; the "ages" device structures the scroll |
| **Victoria 3**, [victoria3game.com](https://www.victoria3game.com/) | Painted 19th-century city / ministers in oil, then gameplay | Period posters, map crops and portraits used as collage | Victorian serif, small caps | Burgundy, parchment, ink, brass | Light parallax | Medium | Period print vocabulary (posters, engravings) instead of UI chrome |
| **Manor Lords**, [manorlords.com](https://www.manorlords.com/) | Painterly medieval landscape, trailer embed | Text over sky areas of the painting | Blackletter-flavoured logo, book serif | Autumn ochre, moss, sky blue | Minimal | Low, very indie | One great painting does the whole job |
| **Papers, Please**, [papersplea.se](https://papersplea.se/) | Pixel booth, stamp, the Arstotzka seal | Tiny site, documents and stamps as the visual language | Pixel type, Soviet-bureaucratic caps | Drab olive, stamp red, paper beige | Static | Minimal | Bureaucratic ephemera (stamps, passports) as layout, perfect thematic fit for a political game |
| **Return of the Obra Dinn**, [obradinn.com](https://obradinn.com/) | 1-bit dithered ship, one colour on black or cream | Almost no layout; the image is everything | Old-style serif | 1-bit: two colours only | GIF loops | Minimal | Radical restraint; the art style is the brand ([PlayStation Blog](https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style)) |
| **Arcane** (Riot/Netflix), [arcane.com](https://www.arcane.com/), brand by [COLLINS](https://www.wearecollins.com/work/arcane) | Painterly character art, graffiti paint splashes | Text inside paint strokes and torn shapes; masks are brush strokes | Custom angular display + graffiti accents | Hextech blue vs Zaun pink/green, gold | Paint-reveal transitions, scroll-scrubbed video | Low | Brush-stroke masks and spray paint, not rectangles |
| **Valorant**, [playvalorant.com](https://playvalorant.com/) | Agent art cropped huge, giant condensed type behind the character | Characters overlap giant type; diagonal cuts; text at angles | Tall condensed display (Tungsten-like), tracked caps labels ([3rd-party analysis](https://www.webdesignhot.com/design.md/valorant/)) | Signal red `#ff4655`, off-white, near-black | Slanted buttons, glitch wipes, video loops | Low | Type as image: a word 40vw tall with a figure in front of it |
| **Sea of Stars**, [seaofstarsgame.co](https://seaofstarsgame.co/) | Pixel-art vista, sun and moon | Text sits in sky gradients | Retro serif logo | Dawn pink, deep blue, gold | Gentle animated pixel loops | Low | Day/night gradient is the colour story |
| **Ink Games** (Awwwards SOTD Oct 2025), [awwwards.com/sites/ink-games](https://www.awwwards.com/sites/ink-games) | Bold illustrated characters, oversized type | Characters burst out of colour blocks | Heavy geometric display | Flat brights: pink, yellow, cobalt | Scroll-triggered pops, hover squash and stretch | Very low | Colour blocks are irregular blobs; objects break them |
| **Zentry** (Awwwards SOTD 2024), [awwwards.com/sites/zentry](https://www.awwwards.com/sites/zentry) | Video inside a shape that expands to full screen on scroll | Huge display headline with a few letters swapped to another face | Mixed-weight display, mono labels | Lilac, black, yellow | Clip-path morphs, 3D tilt on hover, scroll-pinned video | Very low | Letter-level type play and morphing masks |
| **Plague Inc**, [ndemiccreations.com](https://www.ndemiccreations.com/en/22-plague-inc) | The red-spread world map | Simple, map-led | Clean sans | Biohazard red, black, white | Minimal | Low | The single iconic image (red spreading over the world) does the marketing; relevant because our globe can do the same |

Editorial and news references (relevant because the hook is "the news is real"):

- **NYT "Snow Fall"**, [nytimes.com/projects/2012/snow-fall](https://www.nytimes.com/projects/2012/snow-fall/): the origin of scrollytelling, media unfolding as the reader scrolls ([Nieman Storyboard](https://niemanstoryboard.org/?p=1009)). Lesson: let the scroll *trigger* the visuals, keep the words sparse between them.
- **The Pudding**, [pudding.cool](https://pudding.cool/): award-winning visual essays (SND Best in Show, Peabody). Visuals are the argument; each screen carries one sentence and one picture ([Storybench](https://www.storybench.org/?p=8613)).
- **Guardian / NYT front-page interactives**: masthead scale, column rules, kicker labels, photo captions. The print vocabulary reads as "crafted" because real people designed it for a century.
- Awwwards' [Games & Entertainment](https://www.awwwards.com/websites/games-entertainment/) listing and [Games collection](https://www.awwwards.com/awwwards/collections/games/) were used to sanity-check current trends (morphing masks, giant type, scroll-pinned video).

Not covered in depth: Crusader Kings III, Hearts of Iron IV, Stellaris, Humankind, Terra Invicta, Democracy 4, Suzerain. The Paradox sites follow the Civ/Victoria template (key art, store buttons, feature rows). Suzerain and Democracy 4 lean on store pages and press kits ([Fellow Traveller](https://www.fellowtraveller.games/)) and have no standalone landing worth copying; they are the closest genre peers, which is itself a finding: **the political-sim genre has no great landing page yet, so the bar to stand out is low and the opening is real.**

---

## 1. Patterns that recur in the best sites

1. **One iconic image, enormous.** The hero is one picture, not a collage of UI: Hades' key art, Plague Inc's red map, Obra Dinn's dithered ship, Frostpunk's generator. It fills 80 to 100% of the first viewport and is cropped by the edges (the viewport is a frame, not a container). Examples: Hades II, Frostpunk 2, Manor Lords, Plague Inc.
2. **Figures break their frames.** Characters, props and cut-outs overlap section edges, sit in front of headlines and cross from one band into the next. This single trick kills the "boxed" look. Examples: Civ VII leader cut-outs, Valorant agents in front of giant type, Cult of the Lamb, Ink Games.
3. **Type as image, with violent scale contrast.** A headline 15 to 40vw tall next to 14px labels; nothing in the middle. Words are cropped, stacked, rotated or placed behind a figure. Examples: Valorant, Zentry, Frostpunk 2.
4. **Masks that are not rectangles.** Brush strokes (Arcane), circles and morphing blobs (Zentry, Ink Games), stamps and documents (Papers, Please), diagonal cuts (Valorant). The shape itself carries the theme.
5. **A borrowed, thematic print vocabulary.** The best sites look like an object from the game's world: Papers, Please looks like border paperwork, Victoria 3 like a Victorian poster, Inscryption like a card on a table. Nothing looks like a SaaS product.
6. **The game's own motion as page motion.** Balatro's wobble, Frostpunk's snow, Hades' embers. Loops are slow, ambient and continuous; interaction adds a small "juice" response (tilt, squash, jiggle). Scroll triggers reveal, they do not hijack.
7. **Very little text, and it is voice, not features.** A tagline, a one-line hook per section, store/play button. Feature lists, where they exist, are 3 to 5 words each. Disco Elysium is the exception that proves the rule: its text is literary quotes, i.e. tone, not specification.
8. **Asymmetric rhythm.** Sections alternate weight: a full-bleed image band, then a narrow off-centre column, then a pinned/scrubbed sequence, then a big colour slab with the CTA. Left edges are not shared; elements hang from different verticals.
9. **A limited palette with one hot accent.** Three base colours plus one shouting accent (Frostpunk's orange in ice, Valorant's red, Plague's red). Colour is applied in big flat fields, not as thin borders.
10. **The CTA is a thing with personality.** Slanted (Valorant), a stamp (Papers, Please), a card (Balatro). Repeated once mid-page and once at the end, never a row of three equal buttons.
11. **Texture and imperfection.** Grain, halftone, paper fibre, misregistration, paint edges, slight rotations (1 to 4 degrees). This is the single biggest "made by a human" signal.

## 2. Anti-patterns (what reads as generic or AI-made)

Mapped to the owner's complaints and to what the current page does:

| Anti-pattern | Why it reads as generic | In the current page |
|---|---|---|
| Equal-sized card grids (3 or 4 columns, same radius, same shadow) | It is the default output of every template and every LLM; it signals "product page" | Modes, timeline, parallels tabs |
| Numbered stat tiles ("41 countries / 8 crises / 3 modes / 40 AIs") | Pure SaaS dashboard trope; numbers without image say nothing to a player | `.hero-facts` |
| Everything in rounded rectangles (`--r:16px` on every surface) | Softens everything into the same lozenge; no shape carries meaning | Global `--r` |
| Numbered step timelines ("five steps") with bullet lists | Explains instead of shows; looks like onboarding docs | `#how` timeline, ~350 words |
| Centred-everything symmetry | Static, ceremonial, template; no tension | Section heads are kicker + h2 + lede, all aligned the same |
| Eyebrow + H1 + subhead + second subhead + slogan + 3 buttons + status line | Seven text objects before any picture; the "AI hero" stack | Hero has 4 paragraphs and 3 equal CTAs |
| Dark page with grey text (`#a9b3c4` on `#05070d`) | Low energy, "developer tool" look; the scenes are already dark, so they vanish into it | v1 |
| Gradient blobs / glow orbs behind content | The default "modern" decoration; meaningless | `.hero-glow` |
| Tabs and carousels as the main way to see content | Hides the best material behind clicks | Parallels tab strip |
| Pill badges, live dots, status chips everywhere | Dashboard chrome | `.status`, `.live-dot`, legends |
| Generic sans for everything (Geist/Inter) | Zero personality; the font of a thousand startups | Geist UI |
| Uniform section padding and identical section anatomy | No rhythm; every scroll stop feels the same | All sections |
| Emoji and icon rows as decoration | Instant AI tell | (avoid) |

Rule of thumb for review: if a section could be screenshotted and dropped into a fintech landing page without looking odd, it fails.

---

## 3. Three creative directions

All three share hard constraints: only local assets plus CSS/SVG, Google Fonts only, max 5 sections, colourful, visual-first, total copy under ~220 words above the footer, motion respects `prefers-reduced-motion`, works at 375px.

Shared technical toolkit (so the directions are buildable):
- **Globe on colour**: `globe.mp4` has a light cream background (~`#f7f4ee`). With `mix-blend-mode: multiply` on a light colour field the cream disappears and the globe floats on the field; on a dark field, mask it with `clip-path: circle(41% at 50% 50%)` instead.
- **Non-rectangular masks**: `clip-path: polygon()` for diagonals and wedges; an inline SVG `<mask>` or CSS `mask-image: url(#torn)` with a jagged path for torn paper; `clip-path: circle()` for portholes; `mask-image` with a hand-drawn brush SVG for paint strokes.
- **Scenes**: use `s-<kind>.jpg` stills (distinct, small) as posters and the `p-*.mp4` clips for motion; switch to inline live SVGs once the scene export bug is fixed.
- **Scroll motion**: CSS `animation-timeline: view()` where supported, IntersectionObserver class toggles as fallback. No scroll hijacking.

### Direction A: "Red Wedge"

**Concept:** A constructivist propaganda poster that assembles itself: the world's crises cut into geometric shards and hurled at you on a diagonal.

**Hero composition** (desktop 1440x900; mobile stacks top to bottom in the same order):
- Layer 0, field: flat cream `#F3EBDD` with a faint paper grain (SVG `feTurbulence` noise at 6% opacity).
- Layer 1, the wedge: a giant red triangle (`#E2231A`) whose tip enters at the bottom-left corner and whose base spans the right 55% of the top edge, angled about 28 degrees. On load it slides in along its own axis (600ms, ease-out) like El Lissitzky's "Beat the Whites with the Red Wedge".
- Layer 2, the globe: `globe.mp4` in a perfect circle 46vw wide, centred at 70% x / 46% y, sitting *on* the wedge, with a black ring (6px) and a cobalt half-disc (`#1F3FBF`) offset behind it like an eclipse. Turns continuously.
- Layer 3, shards: three scene stills masked into shapes that orbit the globe: `airstrike` in a thin parallelogram crossing the globe's lower-left, `summit` in a small circle at the top-right edge, `streets` in a tall triangle bleeding off the right. Each drifts 8 to 12px on scroll (parallax) and swaps to its `-alert` red version on hover.
- Layer 4, type: "WORLD" set vertically, rotated -90 degrees, 22vh tall letters running up the left edge in black; "CONFLICT" horizontal along the wedge's slope, rotated -28 degrees, white on red, 11vw. The date stamp "NOV 2026" sits in a mustard (`#F2B705`) circle like a seal, overlapping the globe's edge.
- Layer 5, CTA: a black slab-parallelogram button "TAKE OFFICE" placed on the wedge's hypotenuse, skewed -12 degrees, with a mustard arrow. One line under it, 9 words, small caps.

**Typography:** `Big Shoulders Display` (800 to 900, all caps, tight tracking) for display; `Rubik Mono One` for stamps, seals and labels (used sparingly, never more than 3 words); `Space Grotesk` 400/500 for the few body lines.

**Palette:**
| Role | Hex |
|---|---|
| Revolution red (wedge, CTA field) | `#E2231A` |
| Poster cream (base) | `#F3EBDD` |
| Ink black (type, rings) | `#141414` |
| Cobalt (secondary shapes, friendly nations) | `#1F3FBF` |
| Mustard (seals, accents) | `#F2B705` |
| Teal (rare, for "peace" scenes like ceasefire) | `#0F8C7E` |

**Sections (5):**
1. Hero poster (above).
2. "Choose your flag": a horizontal run of big flag circles and cut-out scene shards on a cobalt band, cropped off both edges; one line: "41 nations. One desk. Yours." The flags slide past on scroll like a marching column.
3. "One month, one order": a diagonal split screen. Left (red) triangle holds the crisis card still (`briefing.jpg`) tilted 4 degrees; right (cream) triangle plays `execute.mp4` in a circle; a black arrow shape links them. Three words per side ("The crisis lands." / "You decide." / "The world answers.").
4. "This happened. Now it's yours": the PARALLELS as a stack of poster shards; each real event is a newsprint locator map (`maps/p-*.svg`) torn into a triangle, paired with its `p-*.mp4` in a circle; tap to cycle. 1 date + 1 sentence each.
5. Finale: full red field, the globe huge and cropped at the bottom, "THE NEXT MOVE IS YOURS" in 14vw cream, slanted black CTA.

**Assets used:** globe.mp4 (hero, finale), s-*.jpg shards (hero, flags band), briefing.jpg, execute.mp4, maps/p-*.svg, p-*.mp4.

**Copy budget:** hero 14 words, flags 8, loop 12, parallels 9 x 25 (only one visible at a time, ~25 on screen), finale 6. About 65 words on screen at any time.

**Risk:** Soviet constructivism is loaded imagery for a game featuring Russia-Ukraine; Ukrainian and Baltic players may read it as nostalgia. Mitigate by keeping the vocabulary purely geometric (Bauhaus/Swiss rather than hammer-and-sickle, no Cyrillic pastiche) and rotating which country the red stands for. Also: red-on-cream poster can feel hostile if overused; the cobalt and mustard must carry half the area.

### Direction B: "Late Edition"

**Concept:** A living front page, printed this morning: torn clippings, riso-printed colour and locator maps, where every photo is actually a moving scene from the game.

**Hero composition:**
- Layer 0, field: warm newsprint `#F4EEE1` with paper fibre grain and two faint column rules running the full height at 38% and 71% (the page is a broadsheet, but the content refuses to stay in the columns).
- Layer 1, masthead: "World Conflict" across the full width in a high-contrast display serif at 13vw, slightly cropped by the left edge, with a thin double rule under it carrying three tiny fields: "Vol. 1 · Monday 2 November 2026 · Price: your conscience" (dated by JS to today). The masthead prints in ink black but its shadow is a riso misregistration in fluorescent pink offset 3px right, 2px down.
- Layer 2, the lead photo: a large torn-edge clipping (jagged SVG mask on all four sides, about 58vw wide) positioned left of centre, rotated -2 degrees, holding the `hero.mp4` montage (or `p-iran.mp4`). The tear reveals a riso-blue (`#2B59C3`) sheet underneath, offset like a second print layer.
- Layer 3, the globe as a halftone stamp: `globe.mp4` multiplied onto a fluorescent yellow (`#FFD23F`) circle at top-right, overlapping the masthead's last letters and the photo's corner, as if a postmark had been slammed on the paper. A dot-screen overlay (CSS radial-gradient pattern) gives it a halftone feel.
- Layer 4, the headline: set in heavy condensed serif across the photo's lower edge, partly on the photo, partly on paper: "The news is real." then, in italic and riso pink, "The next move is yours." Max 8 words.
- Layer 5, clutter that sells hand-made: a strip of red tape (rotated 6 degrees) pinning the photo's top corner; a small newsprint locator map (`maps/p-taiwan.svg`) torn into a stamp and tucked under the photo's right edge; a hand-drawn red ballpoint circle (SVG path, animated `stroke-dashoffset`) that draws itself around "yours".
- Layer 6, CTA: a rubber-stamp button "TAKE OFFICE" in riso red, rotated -4 degrees, with an ink-texture mask; on hover it "stamps" (scale 1.08 to 1.0, 120ms).
- Motion: on load the clippings drop in one after another (40ms stagger, slight overshoot), the pen circle draws, the globe turns, the video plays. On scroll the clippings drift at different parallax speeds (paper on a desk).

**Typography:** `Fraunces` (variable, opsz 144, weight 800 to 900, with SOFT 50 / WONK 1 for character) for masthead and headlines; `Newsreader` italic for decks and captions (already the game's Chronicle serif, which ties site to game); `Space Mono` for datelines, kickers and the stamp.

**Palette** (newsprint plus three riso inks; colour lives in big printed shapes, never in thin UI chrome):
| Role | Hex |
|---|---|
| Newsprint (base) | `#F4EEE1` |
| Ink black (type) | `#1C1B19` |
| Riso fluorescent pink (accents, misregistration, emphasis) | `#FF4F7B` |
| Riso blue (under-sheets, friendly nations) | `#2B59C3` |
| Riso yellow (globe stamp, highlights) | `#FFD23F` |
| Alarm red (CTA stamp, breaking tags, alert scenes) | `#E63B2E` |

**Sections (5):**
1. Front page hero (above).
2. "Photo desk: one month in office": a contact-sheet style but *not* a grid: five scene clippings of different sizes and rotations (`cabinet`, `war_room`, `signing`, `streets`, `election` stills, each playing its clip on hover/in view), loosely arranged like prints dropped on a desk, linked by a hand-drawn red ballpoint arrow that draws on scroll from "crisis" to "orders" to "consequences". Each clipping has a 3 to 5 word caption in Newsreader italic. This replaces the five-step timeline entirely.
3. "Then and now" (the PARALLELS): pinned scroll. Left: a torn real-world locator map (`maps/p-*.svg`) with a Space Mono dateline ("28 FEB 2026 · TEHRAN"). Right: the matching `p-*.mp4` in a torn clipping, rotated the other way. As you scroll, the next pair is "pasted" over the previous one (slide + rotate), 9 pairs. One sentence of real event, one sentence of game. The fiction disclaimer as a footnote in small type.
4. "Choose your edition" (modes): three mastheads of very different sizes stacked asymmetrically, like three papers on a pile: a tabloid in riso pink "FLASHPOINT: 12 months", a broadsheet in blue "ONE TERM: 4 years", a thick weekly in yellow "LEGACY: 10 years". The flag of a random country stamps onto each. Five words each.
5. Finale: the globe stamp enlarged to fill most of the screen, cropped at the bottom; the masthead repeats tiny; a big Fraunces line "Tomorrow's paper is unwritten." and the stamp CTA. Optional waitlist field styled as a "Letters to the editor" coupon with a dashed scissor border.

**Assets used:** everything, and in their natural role: scene stills/clips as press photos, maps as clippings, chronicle.jpg as a clipped front page of the in-game paper (tucked in section 2), globe as postmark, `-alert` scenes for "breaking" tags.

**Copy budget:** hero 22 words (masthead line included), photo desk 25, parallels ~30 visible at a time, editions 15, finale 12. About 100 words visible at the busiest moment; most screens under 30.

**Risk:** Newspaper can slide back into "text-heavy" if anyone adds body copy to look authentic. Enforce: no fake lorem columns, no paragraph over 25 words, every clipping is a picture. The riso inks must stay loud (fluorescent pink and yellow in large areas), otherwise it becomes beige.

### Direction C: "Prime Time"

**Concept:** The evening-news title sequence of the world's biggest night: saturated broadcast colour, diagonal split screens and a globe the size of the sky.

**Hero composition:**
- Layer 0, field: not black. A saturated ultramarine (`#1D2BD8`) to violet (`#5B1FD1`) diagonal gradient, with a slow-moving scan-line texture at 4%.
- Layer 1, the globe: a giant circle, 120vh in diameter, centred off-screen to the bottom-right so only its upper-left quadrant shows, like a planet rising. `globe.mp4` inside a circular clip, with a coral (`#FF5A4E`) atmospheric rim glow. It rotates; on scroll it rises a further 15vh.
- Layer 2, diagonal panels: three parallelogram windows (`clip-path` skewed 14 degrees) stacked in a staggered column across the left-centre, overlapping the globe's limb: top `war_room` (largest, 34vw), middle `summit`, bottom `streets`. Each plays its clip; each panel has a lower-third strip in signal yellow with a 3-word caption in mono ("TEHRAN · STRIKES", "BRUSSELS · SUMMIT", "PARIS · STRIKE"). Panels slide in from the left edge in sequence (like a news open), then idle.
- Layer 3, type: "WORLD CONFLICT" in an ultra-wide black grotesque (Archivo expanded), 9vw, white, set across the top-left, the second word dropping behind the top panel so the panel overlaps it. Under it the slogan in two short lines.
- Layer 4, ticker: a bottom crawl band in coral running real-vs-game headlines from `PARALLELS` (`BREAKING · Coast guard begins "customs inspections" · ...`), continuous marquee.
- Layer 5, CTA: a yellow parallelogram button "GO LIVE" with a pulsing red ON-AIR dot, docked at the end of the ticker, plus the same in the header.

**Typography:** `Archivo` (variable width; display at wdth 125, weight 900, caps) for titles; `Archivo Narrow` or `Barlow Condensed` 600 for lower-thirds; `JetBrains Mono` for tickers, timestamps and labels.

**Palette:**
| Role | Hex |
|---|---|
| Ultramarine (base field) | `#1D2BD8` |
| Electric violet (gradient end, depth) | `#5B1FD1` |
| Coral red (rim glow, ticker, alerts) | `#FF5A4E` |
| Signal yellow (lower-thirds, CTA) | `#FFD000` |
| Studio white (type) | `#F7F5FF` |
| Mint (friendly/peace accents, ceasefire) | `#3CE6B0` |

**Sections (5):**
1. Cold open (above).
2. "Tonight's top story": pinned split screen at a 14 degree diagonal: top-left the crisis card (`briefing.jpg`) on yellow, bottom-right the outcome `reel.mp4` on coral; the diagonal seam wipes across on scroll from "decision" to "consequence". 10 words.
3. "Around the world": the PARALLELS as a channel-surf. A big skewed screen shows one `p-*.mp4`; a vertical stack of channel numbers (dates) on the right; scroll or tap changes channel with a static-glitch wipe. Locator map (`maps/p-*.svg`) appears as a picture-in-picture inset in the corner.
4. "Your programme" (modes) as three different broadcast formats: a breaking-news flash (Flashpoint), a season of episodes (Term), a decade documentary (Legacy). Each is a tilted TV panel of a different size with a scene still; 6 words each.
5. Finale: the globe now fully risen and centred, filling the screen, with "THE NEXT MOVE IS YOURS" running around its circumference as text-on-a-path (SVG `textPath`, slowly rotating), and the yellow GO LIVE button in the middle.

**Assets used:** globe.mp4 (huge, hero and finale), p-*.mp4 and s-*.jpg in panels, reel.mp4, briefing.jpg, maps as PiP insets, ticker from PARALLELS.

**Copy budget:** hero 16 plus ticker (ambient, unread by design), section 2 10, section 3 ~25 per channel, modes 18, finale 6. About 50 words on any one screen.

**Risk:** Closest to a conventional "gamer" site and to the rejected dark page if the blue drifts toward navy. Keep the field genuinely saturated ultramarine and never put grey text on it. Diagonal panels are a known esports trope (Valorant, Overwatch), so the uniqueness comes only from the globe scale and the news language.

---

## 4. Recommendation: Direction B, "Late Edition"

Why:

1. **It is the product's own hook made visible.** The game's promise is "the news is real, the next move is yours": real November 2026 events, a crisis on your desk, a month that plays out as broadcast scenes and ends in an in-game newspaper (the Chronicle). A front page is the one metaphor that holds all of it. Direction A borrows a mood; C borrows a format; B *is* the format the game already ends each turn with.
2. **It answers the owner's complaints most directly.** Torn paper, tape, rotated clippings, riso misregistration and a ballpoint circle are the strongest "made by a human" signals in the survey (pattern 11), and they make card grids and stat tiles structurally impossible: a clipping cannot be a rounded rectangle.
3. **It is colourful without fighting the art.** The scenes are dark, night-lit illustrations. On a dark page (v1) they disappeared; inside small rectangles on beige (v2) they looked like thumbnails. As big torn "press photos" on bright newsprint, framed by fluorescent pink, blue and yellow print layers, they become the brightest-feeling things on the page by contrast.
4. **It uses every asset in its natural role**, including the two the other directions struggle with: the newsprint locator maps (already drawn in a print style with Georgia italic labels) and the Chronicle still.
5. **It owns an empty niche.** Political sims (Suzerain, Democracy 4, Paradox) have no memorable sites; Papers, Please proved that a political game's site works best when it looks like the world's paperwork. Nobody has done the living front page.
6. **It is politically safe** (unlike A's Soviet poster vocabulary in a game featuring Russia-Ukraine) and distinctive (unlike C's esports-adjacent diagonals).

Borrow from the others: A's single bold diagonal for the finale CTA band (a riso-red wedge cutting across the last section gives B the energy it can lack), and C's coral breaking-news ticker as a thin strip under the masthead running the PARALLELS headlines.

Guardrails for the build:
- Max 5 sections; max 25 words per paragraph; max ~100 words visible on any screen; no bullet lists, no numbers-in-tiles, no tabs.
- Every section has one dominant visual over 50% of the viewport, and at least one element crossing a section boundary.
- No two adjacent elements share a left edge; rotations between -4 and +6 degrees, never 0 on clippings.
- Fluorescent pink and yellow must cover at least 15% of the hero area.
- Fix the scene SVG export first (all 40 files are the cabinet scene); until then, use `s-*.jpg` and `p-*.mp4`.
- `prefers-reduced-motion`: clippings appear in place, pen circle drawn, videos show posters.

# Publishing notes

## Before anything: the build question
The game is a Fastify server with SQLite plus a Vite client, so it is not a static HTML5 bundle. Pick one path and say it on every page:
- **Hosted web build** (recommended for launch): the "Take office" CTA opens it directly. This is what makes "No account. 10 minutes." true, and it suits HN, Reddit and the Daily Flashpoint.
- **Desktop build** (needed for Steam, and optional for itch): wrap it with Electron or Tauri, with the server bundled and offline by default.

## Where to publish, in order

| Channel | Fit | Notes |
|---|---|---|
| **Own landing page + hosted build** | Essential | The canonical URL for every post, the share card and the trailer end slate. |
| **Hacker News, "Show HN"** | Strong | The angles are the deterministic engine, belief-filtered fog of war, optional bring-your-own-key LLM with cost metering, and seeded daily challenges. Post Tue–Thu, 8–10 am US Eastern. Title: *Show HN: World Conflict, a geopolitical sim of Nov 2026 where every country plays from bad intel*. Stay in the thread for 3 hours, link the repo, and don't ask for upvotes. |
| **itch.io** | Good | A web or embedded build if hosted, otherwise downloads. Tags: strategy, simulation, political, turn-based, singleplayer. Use itch devlogs for each new flashpoint. Put the content disclaimer in the description. |
| **Steam "Coming Soon"** | Good, later | Only once a desktop build exists. Checklist below. |
| **r/strategygames** | Strong | Read the sidebar: most strategy subs allow self-promotion only with real participation and within a ratio, roughly 1 in 10 posts. Post a GIF of the desk and a short "I made this" text. |
| **r/grandstrategy, r/paradoxplaza** | Medium | Frame it as "a 15-minute alternative to a 40-hour campaign". Check each sub's rules on self-promotion first, and use a weekly thread where one exists. |
| **r/WebGames, r/playmygame, r/IndieGaming** | Good | WebGames needs a playable link with no download, which the hosted build provides. |
| **r/gamedev (Screenshot Saturday, Feedback Friday)** | For feedback | Not a launch channel. |
| **r/geopolitics, r/worldnews, r/CredibleDefense** | **Don't post** | Strictly news and analysis, so game promotion gets removed or reads as trivialising. You may reply only if a mod-sanctioned thread asks. |
| **r/incremental_games** | **No fit** | This is not an idle or incremental game. |
| **Product Hunt** | Weak to medium | The audience is tech, not gamers. Worth a Tuesday 12:01 am PT launch only if you have 20 or more people ready to comment. The AI-tier angle fits best. |
| **Fans of *Conflict: Middle East Political Simulator* (1990)** | Strong niche | Abandonware forums and retro-strategy YouTubers. "A spiritual successor" is fair; don't use the original's name or art in the title. |

**Timing guardrail:** have a pause plan. If a flashpoint in the game turns lethal in real life during launch week (for example, a deadly incident at Scarborough), pause promoted posts about that flashpoint, and don't post opportunistically into breaking news.

## Steam "Coming Soon" checklist
- [ ] Steamworks account, app fee paid, tax and bank info done (review takes days).
- [ ] Store page live **at least 2 weeks** before release (Steam's minimum; aim for 3–6 months to build wishlists).
- [ ] Capsules: header 920×430, small 462×174, main 1232×706, vertical 748×896, page background 1438×810, library capsule 600×900, library hero 3840×1240, logo 1280×720 (transparent PNG). The logo and title must be readable at small capsule size, with no real leaders' faces.
- [ ] At least 5 screenshots at 1920×1080 (desk, Chronicle, map layers, end screen, title). Use real UI only.
- [ ] Trailer: the 60 s cut of `intro-script.md`, with gameplay within the first 10 s for the store version (open on beat 4, not the cold open).
- [ ] Short description (≤300 chars): *Lead one of 41 nations through the real crises of November 2026. Each month a crisis lands on your desk; every government acts on its own history and half-wrong intelligence about you. Flashpoints in 15 minutes, a full term in an evening.*
- [ ] Content survey: answer honestly (depictions of real-world violence and political content); add the disclaimer to "About this game".
- [ ] AI disclosure: Steam requires disclosing live-generated AI content, so describe the optional LLM tiers and the guardrails (the engine validates every proposal).
- [ ] Tags: Strategy, Political Sim, Turn-Based Strategy, Geopolitics, Simulation, Singleplayer, Choices Matter, Short.
- [ ] Next Fest demo (one Flashpoint and the Daily) if timing allows.

## Press kit checklist (`/press`)
- [ ] Fact sheet: developer, release date or status, platforms, price, website, contact email, languages.
- [ ] 150-word and 50-word descriptions (reuse the subhead and SEO description).
- [ ] Feature list (6 bullets from copy section 5).
- [ ] The trailer as an embed plus a downloadable MP4, and a 15 s vertical cut.
- [ ] 8 to 10 screenshots, full resolution and unwatermarked, plus 2 GIFs (Execute → Chronicle; coup plot card).
- [ ] Logo in light and dark, icon, key art without text.
- [ ] Short dev story: a remake of the 1990 *Conflict*, for 2026.
- [ ] The parallels timeline (from `parallels.json`, real column only, with sources available on request).
- [ ] The disclaimer and a statement on approach to real events (below).
- [ ] Contact and a request for keys or early access; mailing-list link.

## Legal and ethical guardrails
*This is practical guidance, not legal advice. Have a lawyer review the store text and disclaimer before any paid release.*

**Disclaimer (use on the site footer, store page, title screen and trailer end):**
> World Conflict is a work of fiction and a political simulation. It draws on public reporting up to October 2026 and portrays real public figures in an alternate history. Their in-game words and decisions are invented and imply no endorsement. It is not affiliated with any government, leader or news organisation.

**Real people**
- Use names and titles in game text only. Don't use photos, caricatures or likenesses of real leaders in marketing, capsules or thumbnails: that is where right-of-publicity and false-endorsement risk lives.
- Never write a quote, real or invented, from a real person in marketing. In-game LLM statements stay in the game, labelled as simulated.
- Don't make a real leader the "villain" in ad copy. The player faces situations, not caricatures.
- Satire defences differ by country. The game is a serious simulation, so describe it that way and don't call it satire as a shield.

**Real events and victims**
- Never use images of real victims, casualties, funerals or refugees. The same goes for real broadcast or agency footage: it is copyrighted, and using it trivialises.
- Don't use casualty numbers as "stakes" in marketing copy, and don't make the scroll gamify atrocities (no "Can you save El Fasher?"). Sudan, Kashmir and Gaza-adjacent material get the most restraint.
- Keep fact separate from fiction: REAL cards carry only verified facts, and invented scenario events are never dated or framed as news.
- Every flashpoint already ends with "What really happened". Keep it: it is the ethical counterweight and the best press angle.

**Brands and maps**
- Use no outlet names, logos, mastheads or chyron styling. *The World Chronicle* is fictional; keep its design distinct from any real paper.
- Don't use military insignia or unit patches in key art.
- Disputed borders: Natural Earth's default view will be unacceptable in some markets. India regulates map depictions of Kashmir, and China will object to Taiwan as a playable nation. Decide whether to localise or accept regional restrictions, and say "borders shown are not an endorsement" in the credits.
- The 1990 original: don't use its name, art or music; "inspired by" in the dev story is fine.

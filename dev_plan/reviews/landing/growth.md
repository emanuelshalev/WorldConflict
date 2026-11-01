# Landing page review: growth and conversion

Tested at 1440×900 and 390×844, intro watched to the end. Screenshots: `/tmp/claude-0/site-review/growth/`.

## Scorecard

| | Score | Why |
|---|---|---|
| Hook | 4 | The intro autoplays and hides the headline and CTAs for **46 s on desktop, ~35 s on mobile**. First frame: a "REAL EVENT" card with no "this is a game" context. |
| Clarity | 6 | Once visible, eyebrow + headline + subhead explain it well. Subhead is 4 sentences long. |
| CTA | 2 | All three "Coming soon" buttons are non-clickable spans. The only active action replays the intro the visitor just sat through. Zero capture. |
| Persuasion | 7 | Real-vs-game pairing is a strong, novel angle, with real UI. |
| Trust | 4 | No quotes, no repo link (`repoUrl` is null), no devlog, no maker. |
| **Overall** | **5** | A beautiful page with no funnel. |

## Top 8 changes, ranked by impact

1. **Add email capture everywhere "Coming soon" sits.** Use a Buttondown embed form (free tier, double opt-in); Tally or Formspree also work. Replace the span with an inline input + button:
   - Button: **Get early access**
   - Under it: **One email when the first Flashpoint is playable. No spam, unsubscribe anytime.**
   - Header button: **Join the waitlist** (scrolls to the form).
   - Success state: **You're on the list. Want to shape it? Join the playtest Discord.**
2. **Show the hero copy first; make the intro opt-in.** Load into the ended state (headline, subhead, form), with the wall drifting behind it. Keep **▶ Watch the 45-second intro** as the secondary button. If you insist on autoplay, cap it at ~12 s and keep a one-line brand bar visible throughout: **WORLD CONFLICT · a strategy game where real crises become your turn.**
3. **Tighten the subhead to two sentences and name the differentiator:**
   > Lead one of 41 nations through the real crises of November 2026. Every rival is an AI with its own agenda and half-wrong intelligence about you, and a Flashpoint takes 15 minutes.
4. **Cut the parallels section to 3 pairs plus "See all 8".** It is 5,600 px on desktop and 9,400 px on mobile, about 40% of the page, and pushes "How it plays" past most scroll depths. Keep Iran, Ukraine, Taiwan; collapse the rest behind a button. Move **How a month plays** directly after the hook.
5. **Add a mid-page capture block after "How a month plays"**, where intent peaks: **Playtest the first Flashpoints. Waitlist members get in first.** + the same form.
6. **Turn on secondary channels.** Set `repoUrl` (GitHub star/watch: **Star on GitHub to follow development**), add a Discord invite, and an RSS/devlog link.
7. **Add social proof before launch.** 3 playtester one-liners with first name and context, a "Built by [name], solo dev" line with photo or handle, the heritage hook **A spiritual successor to the 1990 classic Conflict**, and a live waitlist count once it passes ~200.
8. **Fix metadata.** Add `<link rel="canonical">`, `og:url`, `og:site_name`, `VideoGame` JSON-LD, `robots.txt`, `sitemap.xml`, a 404 page. "Credits" links to raw `CREDITS.md`; render it as HTML.

## Analytics

Use **GoatCounter** (free, cookieless, no consent banner, works on GitHub Pages) or Plausible if you want funnels. Track: `intro_play`, `intro_skip` (with second), `intro_complete`, `waitlist_submit` (with location: header/hero/mid/footer), `waitlist_success`, `github_click`, `discord_click`, `parallels_expand`, `gallery_open`, scroll depth at 25/50/75/100. UTM-tag every Reddit/X/HN link (`?utm_source=reddit&utm_campaign=prelaunch`). Target: 8 to 15% visitor-to-waitlist from Reddit.

## Pre-launch checklist

- [ ] Waitlist form live, double opt-in tested, welcome email written
- [ ] Hero copy visible at first paint on both viewports
- [ ] `repoUrl` and Discord set; buttons visible
- [ ] Parallels trimmed; mid-page form added
- [ ] Canonical, og:url, JSON-LD, robots, sitemap, 404
- [ ] GoatCounter installed; events fire (check in devtools)
- [ ] 3 playtester quotes collected after the local test
- [ ] Pause plan if a flashpoint turns lethal in real life during launch week

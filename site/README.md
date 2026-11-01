# World Conflict landing page

A self-contained static page: `index.html`, `styles.css`, `main.js` and `assets/`. No build step, no framework, no third-party scripts (fonts come from Google Fonts).

## Preview

```bash
npx serve site          # then open the printed URL (http://localhost:3000)
# or: python3 -m http.server -d site 8000
```

Opening `site/index.html` directly from disk also works; the page has no `fetch()` calls.

## Editing content

- **Reality vs game:** the `PARALLELS` table at the top of `main.js` (real event, date, place, game moment, fiction note). `content/parallels.json` keeps the sources and verification notes for each real event; keep both in step. Locator maps come from `node site/tools/locator-maps.mjs` (Natural Earth borders, newsprint style).
- **Scene and game footage:** recorded from the running game. Start the dev servers (`npm run dev`), then `node site/tools/record-clips.cjs` (the 9 parallel clips and 20 scene tiles, from the UI's `#clip` route) and `node site/tools/record-game.cjs` (the globe and the outcome reel, plus the desk, scoreboard and Chronicle stills). Needs ffmpeg. Output: `assets/clips/` and `assets/img/`.
- **Page copy:** written straight into `index.html`, taken from `content/copy.md`.
- **Launch config:** one object at the top of `main.js`:

  ```js
  const SITE = { playUrl: null, signupUrl: null, signupField: 'email', repoUrl: null,
                 siteUrl: 'https://emanuelshalev.github.io/WorldConflict/' };
  ```

  - `signupUrl`: shows the "Get early access" email form and posts to that URL (Buttondown, Formspree, Tally...); `signupField` is the field name the provider expects.
  - While `playUrl` is null, the CTAs show an "In development" status line. Setting it adds "Take office" links; `repoUrl` shows "Follow development".
- **Absolute URLs:** canonical, `og:url`, `og:image`, `twitter:image` and the JSON-LD in `index.html` (marked with a `SITE_URL` comment), plus `robots.txt` and `sitemap.xml`, point at `https://emanuelshalev.github.io/WorldConflict/`. Change them together if the site moves.
- **Press kit:** `press.html` (pitch, boilerplate, facts, screenshots, logo, contact).

All asset paths are relative, so the page works under a GitHub Pages project path (`https://USER.github.io/REPO/`).

## Deploy

**GitHub Pages:** branch deploys only serve `/` or `/docs`, so publish `site/` on its own branch:

```bash
git subtree push --prefix site origin gh-pages
```

then in *Settings → Pages* choose "Deploy from a branch", `gh-pages`, `/ (root)`. Alternatively, use the "Static HTML" GitHub Actions Pages workflow with `path: site`.

**itch.io:** zip the *contents* of `site/` (so `index.html` is at the zip root), create an HTML project, upload the zip, tick "This file will be played in the browser", and set the viewport to 1280×720 with "Fullscreen button" and "Mobile friendly" enabled. The page also works as the itch project page's external link.

## Assets

All game imagery is captured from the real game UI with Playwright (1920×1080). Videos are short muted loops (WebM VP9 + MP4 H.264) with JPEG posters. Locator maps on the "real event" cards are drawn from Natural Earth (public domain). See `CREDITS.md`.

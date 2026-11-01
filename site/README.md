# World Conflict landing page

A self-contained static page: `index.html`, `styles.css`, `main.js` and `assets/`. No build step, no framework, no third-party scripts (fonts come from Google Fonts).

## Preview

```bash
npx serve site          # then open the printed URL (http://localhost:3000)
# or: python3 -m http.server -d site 8000
```

Opening `site/index.html` directly from disk also works. Browsers block `fetch()` on `file://`, so the page then falls back to the copy of `content/parallels.json` embedded at the bottom of `index.html`.

## Editing content

- **Parallels (intro wall + timeline):** `content/parallels.json` is the source of truth, in its `order`. The footage, short wall line and game caption for each entry are in the `MEDIA` table at the top of `main.js`, keyed by `flashpointId` (`europe-unrest` for the One Term France entry). After editing the JSON, refresh the `file://` fallback with `node site/tools/embed-parallels.mjs` (optional when served over HTTP).
- **Page copy:** written straight into `index.html`, taken from `content/copy.md`.
- **Launch config:** one object at the top of `main.js`:

  ```js
  const SITE = { playUrl: null, dailyUrl: null, repoUrl: null, siteUrl: null };
  ```

  While `playUrl` is `null`, every CTA reads **Coming soon** and **Watch the intro** is the active action. Set `playUrl` to the hosted game and the CTAs become **Take office ▸** links (plus "Try today's Daily Flashpoint", using `dailyUrl` or `playUrl`). Set `repoUrl` to show "Follow development" / "Source on GitHub".
- **OG image:** `assets/og-image.jpg` (1200×630). Crawlers need an absolute URL: at deploy time edit the `og:image` and `twitter:image` tags in `index.html` (marked with a `SITE_URL` comment) to `https://USER.github.io/REPO/assets/og-image.jpg`, and set `SITE.siteUrl` to the same base.

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

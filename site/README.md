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
- **Play links:** every "Take office" button has the class `js-play` and points at the GitHub repo for now. Replace the `href`s with the hosted build URL when there is one (and `js-daily` with the Daily Flashpoint URL).
- **OG image:** `assets/og-image.jpg` (1200×630). For correct previews on social sites, change the `og:image` and `twitter:image` URLs to absolute URLs once the domain is known.

## Deploy

**GitHub Pages:** branch deploys only serve `/` or `/docs`, so publish `site/` on its own branch:

```bash
git subtree push --prefix site origin gh-pages
```

then in *Settings → Pages* choose "Deploy from a branch", `gh-pages`, `/ (root)`. Alternatively, use the "Static HTML" GitHub Actions Pages workflow with `path: site`.

**itch.io:** zip the *contents* of `site/` (so `index.html` is at the zip root), create an HTML project, upload the zip, tick "This file will be played in the browser", and set the viewport to 1280×720 with "Fullscreen button" and "Mobile friendly" enabled. The page also works as the itch project page's external link.

## Assets

All game imagery is captured from the real game UI with Playwright (1920×1080). Videos are short muted loops (WebM VP9 + MP4 H.264) with JPEG posters. Locator maps on the "real event" cards are drawn from Natural Earth (public domain). See `CREDITS.md`.

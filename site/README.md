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
  const SITE = { playUrl: null, dailyUrl: null, signupUrl: null, signupType: 'form', signupField: 'email',
                 repoUrl: null, siteUrl: 'https://emanuelshalev.github.io/WorldConflict/', pressEmail: null };
  ```

  - `signupUrl` + `signupType: 'form'`: shows the "Get early access" email form (hero and closing CTA) and posts to that URL (Buttondown, Formspree, Tally...). Use `signupField` if the provider wants another field name. `signupType: 'link'` turns the form into a button that opens the URL.
  - While `signupUrl` and `playUrl` are null, the CTA area shows an "In development" status line and "Watch the intro (20s)".
  - `playUrl` adds "Take office ▸" links (and the Daily Flashpoint link, from `dailyUrl` or `playUrl`); `repoUrl` shows "Follow development"; `pressEmail` fills the contact line on `press.html`.
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

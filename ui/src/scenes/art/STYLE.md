# Scene art style guide

Every scene is one React component, `export default function X({ a, b, mood }: SceneArtProps)`, returning a single inline SVG:

```tsx
<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="art art-<kind>" aria-hidden>
```

## Look
- **Modern editorial flat illustration with depth**, like a premium news-explainer or prestige-TV title card: layered planes (background, midground, foreground), soft gradients (`linearGradient`/`radialGradient`), atmospheric haze and light shafts, rim light on silhouettes. Not pixel art, not clip art, not retro.
- **People are stylised silhouettes**: clean geometric shapes (rounded-rect torsos, circle heads, simple suit lapels, ties, hair masses), shading via a darker gradient, a rim highlight on one edge. No facial features beyond an optional hint. Never a recognisable real person.
- **Palette**: a dark, rich base (navy, charcoal, deep teal, warm wood tones for interiors), plus one strong light source. The nation's flag colours `a` (home side) and, where there is a counterpart, `b` dress flags, podium crests, desk flags, backdrops and placards. Use them as accents, not as fills that flatten the image.
- **Mood** (`'good' | 'bad' | 'neutral'`) shifts lighting: good = warm gold key light; bad = red/amber emergency or cold blue; neutral = balanced. Switch a few gradient stops or overlay opacities on it. The frame adds its own vignette and grade on top, so do not add heavy vignettes yourself.
- **Composition**: 16:9 at 640x360, but the frame also crops it to 21:9 (`xMidYMid slice` cuts about 46px off top and bottom), so keep the subject in the middle 640x260 band. The bottom 90px gets a lower-third caption over it: keep that area darker/quieter, put the subject's heads/key shapes in the upper two thirds.
- Each scene must be instantly readable at thumbnail size (200px wide): one bold, iconic composition per kind.

## Motion
- Subtle looping CSS animation, 4 to 14 s cycles, making it feel like live footage: camera flashes popping, screens flickering, a ticking chart line drawing, flags rippling (skewY / scaleX on a group), crowd bobbing, light sweeps, smoke drifting, blinking radar.
- Put keyframes and classes in the group's CSS file (named in your brief), and **prefix every class and keyframe name with the kind** (`.art-press .flash`, `@keyframes press-flash`) so groups never clash. Import that CSS file from each of your components.
- Use `transform-box: fill-box; transform-origin: center;` on animated SVG elements.
- Add `@media (prefers-reduced-motion: reduce) { .art-<kind> * { animation: none !important; } }` in your CSS file.

## Technical
- Gradient/filter/clipPath ids must be unique per kind: prefix them, e.g. `id="press-key"`. Several scenes render on one page at once.
- No external images, no fonts in the art (text in art only as simple shapes, or a few short words with `font-family: var(--font-display)`), no `Math.random()` (use fixed arrays or a tiny seeded loop), no new npm dependencies.
- Keep each component under about 250 lines. TypeScript strict, React 19, ESLint must pass (`cd ui && npx eslint src/scenes`).
- No em dash characters anywhere (code, comments, text). Use commas, colons or hyphens.

## SVG ids
Prefixing ids per kind is not enough: one kind can render several times on a page with different flag colours. Read the per-instance suffix with `const uid = useSceneUid()` (from `./uid`, provided by SceneFrame) or React `useId()`, and build every id and `url(#...)` from it.

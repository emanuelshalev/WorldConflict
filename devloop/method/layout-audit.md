# Layout audit (version 1.0)

A screenshot review at one or two sizes misses what a real player sees on their own screen: a fixed centre column with empty sides on a large monitor, the month's items continuing below the fold in a scroll nobody discovers, a panel of important state scrolling inside a small box. The layout audit measures these things at every viewport, so "uses the space, hides nothing" becomes a number a guard can check instead of a judgment made on the reviewer's laptop.

Kit: `kit/layout-audit.mjs` (generic). Config: one per instance (selectors and thresholds). Guards call it after driving the product into a state.

## When to use it
- **Any work package that changes a screen's layout** (columns, panels, rails, sheets, breakpoints): run the instance's layout guard before asking for the design review, and attach its `layout-audit.json` and screenshots as the `design-review` evidence (`controller.md`).
- **A real signal or finding about space, scrolling or hidden content**: turn it into a guard on the audit with the rule it breaks, registered as an open finding (`status: open` in the regression registry) until the fixing build makes it pass.
- **Before a customer round on a new layout**: personas play at a few sizes; the audit covers the sizes nobody on the panel uses (large monitors, short laptops).
- Not for visual polish (alignment, colour, type): that is the visual regression suite and the design review.

## What it measures (per viewport)
| Measure | Meaning | Typical rule |
|---|---|---|
| Inner scroll regions | elements with `overflow: auto/scroll` whose content is taller than their box (more than 2 px) and that hold a control or a listed region | none at laptop size or larger (1366x768 and up), except declared `exempt` scrollers (a log, a long list by design) |
| Below the fold | controls and listed regions out of view in the page or in their scroll container | none at laptop size or larger |
| Page scroll | the document is taller than the viewport | none on a screen built to fit (a game desk); allowed on documents |
| Used width | the union of the content boxes' horizontal extents divided by the viewport width (gaps between columns are not used), plus the empty left and right margins | at least 0.85 at 1920 and wider |
| Cut off | a control whose centre is clipped by a non-scrolling ancestor or the viewport, or that is more than a quarter hidden | none |
| Covered | another element sits on a control's centre (`elementFromPoint`) | none |
| Region state | each listed region is `expanded` (on screen), `collapsed` (a visible summary whose text has a count), `below` (exists, out of view) or `missing` | at phone and tablet sizes every region expanded or collapsed (collapsed, not hidden); state and the main action always expanded |

## Config
Regions are what the player must see or act on (state, the month's items, actions), each with an optional `summary` selector: the visible, counted stand-in a small screen may show instead ("Review 7 recommended", "3 left, 2 decided"). `content` lists the boxes whose union is the used width: the panels, not a full-width wrapper, and not a banner that stretches with its text. `ignore` removes subtrees (a marquee, a map canvas); `root` limits the measure to a dialog. Rules pick a check (`inner-scroll`, `below-fold`, `page-scroll`, `used-width`, `collapsed-not-hidden`, `occluded`, `cutoff`) and a `when` (`minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `widths`), optionally limited to some `regions` and with an allowed `max` count. Viewports may carry a `label` (for example the owner's own screen) that the table and screenshots show.

## Rules of use
1. Measure the first view: the audit scrolls the page and every scroller to the top, because that is what a player sees before deciding whether there is more.
2. Fix the layout, not the config. Adding a scroller to `exempt` or a panel to `ignore` needs a reason a player would accept (a log is meant to scroll), written next to the entry.
3. Report the owner's screen first when one is known (a labelled viewport); a baseline is recorded on the build the owner rejected, so the fixing build shows the change in the same numbers.
4. An audit run is evidence, not a verdict on taste: a design review still looks at the screenshots.

## Commands
```
node devloop/kit/layout-audit.mjs <url> --config <config.json|.mjs> [--viewports 1366x768,1920x1080] [--out dir]
```
exits 1 on any rule violation and writes `layout-audit.json` (every measurement), `layout-audit.txt` (the table) and one screenshot per viewport. For a state that needs driving (a game month, a result dialog), import `auditViewports(page, { config, viewports, out, name })` and `printAudit(rows)` in a guard script.

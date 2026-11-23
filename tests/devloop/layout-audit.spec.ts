// Layout audit (devloop/kit/layout-audit.mjs, devloop/method/layout-audit.md): the measurement runs
// in a real browser on static fixtures (a scroll box holding controls, a fixed centre column, a
// collapsed summary, a covered control, a clipped control, a long page) and the rules turn the
// measurements into violations per viewport.
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import * as la from "../../devloop/kit/layout-audit.mjs";

type Any = Record<string, any>;

let browser: Browser;
let page: Page;
beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
}, 60_000);
afterAll(async () => {
  await browser?.close();
});

const BASE = "<style>*{box-sizing:border-box}body{margin:0;font:16px sans-serif}button{display:block;height:40px;margin:5px}</style>";

async function measure(html: string, cfg: Any, viewport = { width: 1366, height: 768 }) {
  await page.setViewportSize(viewport);
  await page.setContent(`<!doctype html><html><head>${BASE}</head><body>${html}</body></html>`);
  return page.evaluate(la.measureLayout, cfg) as Promise<Any>;
}

const buttons = (n: number, cls = "b") => Array.from({ length: n }, (_, i) => `<button class="${cls}">Item ${i + 1}</button>`).join("");

describe("layout audit: measurements in the browser", () => {
  it("finds a scroll box that hides controls, and the controls below its fold", async () => {
    const html = `<div style="display:flex;height:100vh"><main style="flex:1">${buttons(2, "m")}</main>
      <aside class="rail" style="width:300px;height:300px;overflow:auto">${buttons(12)}</aside></div>`;
    const m = await measure(html, { regions: [{ id: "rail", selector: ".rail .b" }], content: ["main", ".rail"] });
    expect(m.scrollers).toHaveLength(1);
    const s = m.scrollers[0];
    expect(s.label).toMatch(/^aside\.rail/);
    expect(s.interactive).toBe(12);
    expect(s.hiddenInteractive).toBeGreaterThanOrEqual(5);
    expect(s.hiddenPx).toBeGreaterThan(200);
    expect(s.regions).toEqual(["rail"]);
    expect(m.hidden.filter((h: Any) => h.where === "container").length).toBe(s.hiddenInteractive);
    expect(m.page.scrolls).toBe(false);
    const v = la.evaluateRules(m, la.DEFAULT_RULES);
    expect(v.map((x: Any) => x.rule)).toEqual(expect.arrayContaining(["no-inner-scroll", "no-hidden-items"]));
    // An exempt scroller is reported but never ruled
    const ex = await measure(html, { exempt: [".rail"], content: ["main", ".rail"] });
    expect(ex.scrollers[0].exempt).toBe(true);
    expect(la.evaluateRules(ex, [{ id: "x", check: "inner-scroll" }])).toEqual([]);
  });

  it("measures a fixed centre column's used width and empty sides", async () => {
    const html = `<div class="col" style="width:800px;margin:0 auto;height:200px"></div>`;
    const m = await measure(html, { content: [".col"] }, { width: 1920, height: 1080 });
    expect(m.width.ratio).toBeCloseTo(800 / 1920, 2);
    expect(m.width.left).toBe(560);
    expect(m.width.right).toBe(560);
    const v = la.evaluateRules(m, la.DEFAULT_RULES);
    expect(v.map((x: Any) => x.rule)).toEqual(["use-the-width"]);
    expect(v[0].message).toMatch(/used width 0\.42 < 0\.85/);
    // A layout that grows with the screen passes; a gap between two columns does not count as used
    const fluid = await measure(`<div style="display:flex;gap:40px;padding:0 16px"><section class="c" style="flex:2;height:50px"></section><section class="c" style="flex:1;height:50px"></section></div>`, { content: [".c"] }, { width: 1920, height: 1080 });
    expect(fluid.width.ratio).toBeGreaterThan(0.95);
    expect(fluid.width.largestGap).toBe(40);
    expect(la.evaluateRules(fluid, la.DEFAULT_RULES)).toEqual([]);
  });

  it("tells expanded, collapsed (a visible counted summary) and missing regions apart", async () => {
    const regions = [{ id: "items", selector: ".items li", summary: ".summary" }];
    const collapsed = await measure(`<button class="summary" aria-expanded="false">Items (5)</button><ul class="items" style="display:none"><li>a</li></ul>`, { regions }, { width: 390, height: 844 });
    expect(collapsed.regions[0]).toMatchObject({ id: "items", state: "collapsed", present: false, summary: { counted: true } });
    expect(la.evaluateRules(collapsed, la.DEFAULT_RULES)).toEqual([]);

    const uncounted = await measure(`<button class="summary">Items</button><ul class="items" style="display:none"><li>a</li></ul>`, { regions }, { width: 390, height: 844 });
    expect(uncounted.regions[0].state).toBe("missing");
    expect(la.evaluateRules(uncounted, la.DEFAULT_RULES).map((x: Any) => x.rule)).toEqual(["collapsed-not-hidden"]);

    const below = await measure(`<div style="height:2000px"></div><ul class="items"><li>a</li></ul>`, { regions }, { width: 1024, height: 768 });
    expect(below.regions[0].state).toBe("below");
    expect(below.page.scrolls).toBe(true);
    expect(below.hidden).toEqual([expect.objectContaining({ where: "page", region: true, regions: ["items"] })]);

    const expanded = await measure(`<ul class="items"><li>a</li></ul>`, { regions }, { width: 1024, height: 768 });
    expect(expanded.regions[0].state).toBe("expanded");
  });

  it("finds a covered control (elementFromPoint) and a clipped one", async () => {
    const html = `<div style="position:relative"><button class="under">Under</button>
      <div class="cover" style="position:absolute;inset:0;height:60px;background:#000"></div></div>
      <div class="clip" style="height:60px;overflow:hidden;position:relative">${buttons(1, "ok")}<button class="lost" style="position:absolute;top:200px">Lost</button></div>`;
    const m = await measure(html, {});
    expect(m.occluded).toEqual([expect.objectContaining({ label: 'button.under "Under"', by: "div.cover" })]);
    expect(m.cutoff).toEqual([expect.objectContaining({ label: 'button.lost "Lost"', where: "clipped", by: expect.stringMatching(/^div\.clip/) })]);
    expect(la.evaluateRules(m, [{ id: "c", check: "occluded" }, { id: "k", check: "cutoff" }]).map((x: Any) => x.rule)).toEqual(["c", "k"]);
  });

  it("measures only inside a root (a dialog over the page) and ignores listed subtrees", async () => {
    const html = `<div class="behind" style="height:200px;overflow:auto">${buttons(10)}</div>
      <div class="dialog" style="position:fixed;inset:100px">${buttons(2, "d")}</div><div class="ticker">${buttons(1, "t")}</div>`;
    const m = await measure(html, { root: ".dialog" });
    expect(m.scrollers).toEqual([]);
    expect(m.interactive.total).toBe(2);
    const ig = await measure(html, { ignore: [".behind", ".ticker"] });
    expect(ig.scrollers).toEqual([]);
    expect(ig.interactive.total).toBe(2);
  });

  it("auditViewports resizes, measures, screenshots and evaluates per viewport", async () => {
    await page.setContent(`<!doctype html><html><head>${BASE}</head><body><div class="col" style="max-width:900px;margin:0 auto;height:100px"></div></body></html>`);
    const rows = await la.auditViewports(page, {
      config: { content: [".col"], rules: [{ id: "w", check: "used-width", when: { minWidth: 1920 }, min: 0.85 }] },
      viewports: [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }],
      settleMs: 0,
    });
    expect(rows.map((r: Any) => r.viewport)).toEqual(["1366x768", "1920x1080"]);
    expect(rows[0].violations).toEqual([]);
    expect(rows[1].violations.map((v: Any) => v.rule)).toEqual(["w"]);
    const lines: string[] = [];
    expect(la.printAudit(rows, (l: string) => lines.push(l))).toBe(1);
    expect(lines.join("\n")).toMatch(/1920x1080 .* w: used width/s);
  });
});

describe("layout audit: rules", () => {
  it("applies a rule by viewport (min/max sizes, exact widths)", () => {
    expect(la.applies(undefined, { width: 390, height: 844 })).toBe(true);
    expect(la.applies({ minWidth: 1366, minHeight: 768 }, { width: 1366, height: 768 })).toBe(true);
    expect(la.applies({ minWidth: 1366, minHeight: 768 }, { width: 1440, height: 700 })).toBe(false);
    expect(la.applies({ widths: [390, 1024] }, { width: 1024, height: 768 })).toBe(true);
    expect(la.applies({ widths: [390, 1024] }, { width: 1366, height: 768 })).toBe(false);
    expect(la.applies({ maxWidth: 1024 }, { width: 1366, height: 768 })).toBe(false);
  });

  it("parses viewports and rejects a bad one", () => {
    expect(la.parseViewports("390x844, 1920x1080")).toEqual([{ width: 390, height: 844 }, { width: 1920, height: 1080 }]);
    expect(() => la.parseViewports("1920")).toThrow(/bad viewport/);
  });

  it("limits a check to some regions and allows a count", () => {
    const m = {
      viewport: { width: 1440, height: 900 },
      page: { scrolls: false, overflowPx: 0 },
      scrollers: [],
      hidden: [{ label: "a", where: "container", regions: ["log"] }],
      cutoff: [],
      occluded: [],
      width: { ratio: 1, left: 0, right: 0, largestGap: 0 },
      regions: [{ id: "state", state: "below" }, { id: "log", state: "missing" }],
    };
    expect(la.evaluateRules(m, [{ id: "f", check: "below-fold", regions: ["state"] }])).toEqual([]);
    expect(la.evaluateRules(m, [{ id: "f", check: "below-fold", max: 1 }])).toEqual([]);
    expect(la.evaluateRules(m, [{ id: "s", check: "collapsed-not-hidden", regions: ["state"] }])[0].message).toMatch(/state \(below\)/);
    expect(() => la.evaluateRules(m, [{ id: "z", check: "nope" }])).toThrow(/unknown layout check/);
    expect(la.summarize(m)).toMatchObject({ viewport: "1440x900", belowFold: 1, usedWidth: 1, regions: "state:b log:m" });
  });
});

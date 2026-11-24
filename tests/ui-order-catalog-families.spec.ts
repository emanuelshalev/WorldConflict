import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "../ui/node_modules/react/index.js";
import { renderToStaticMarkup } from "../ui/node_modules/react-dom/server.node.js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ORDER_FAMILY_WORDS } from "../ui/src/lib/glossary.js";
import { FAMILIES, FAMILY_WORD, ORDERS, ORDERS_BY_FAMILY } from "../ui/src/lib/orders.js";

// The store reads window and localStorage when it loads: stub them, then import the catalogue
type Catalog = typeof import("../ui/src/components/orders/OrderCatalog.js").OrderCatalog;
let OrderCatalog: Catalog;
beforeAll(async () => {
  vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  ({ OrderCatalog } = await import("../ui/src/components/orders/OrderCatalog.js"));
});

/**
 * DR-OC-2 (design review of build-order-cards, required change 2): one vocabulary on the All orders
 * screen. The catalogue grouped by the old categories ("Intelligence" above COVERT cards,
 * "Domestic" above HOME and ECONOMY cards, Declare war under "Diplomacy", nuclear orders under
 * "Military") while each card's chip named its family. The groups are now the families, in
 * `FAMILIES` order, headed by the glossary's family word, so heading and chip always match.
 */
const ROOT = join(__dirname, "..");
const unescape = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

describe("All orders is grouped by family, under the family words (DR-OC-2)", () => {
  it("files every order exactly once, under its own family, in FAMILIES order", () => {
    expect(Object.keys(ORDERS_BY_FAMILY)).toEqual([...FAMILIES]);
    const grouped = Object.values(ORDERS_BY_FAMILY).flat();
    expect(grouped).toHaveLength(ORDERS.length);
    expect(new Set(grouped.map((o) => o.id)).size).toBe(ORDERS.length);
    for (const f of FAMILIES) for (const o of ORDERS_BY_FAMILY[f]) expect(o.family, o.id).toBe(f);
    // The cases the review found filed under another name
    const famOf = (id: string) => FAMILIES.find((f) => ORDERS_BY_FAMILY[f].some((o) => o.id === id));
    expect(famOf("declare-war")).toBe("mil");
    expect(famOf("fund-nuclear")).toBe("nuke");
    expect(famOf("nuclear-strike")).toBe("nuke");
    expect(famOf("reform")).toBe("econ");
    expect(famOf("spy")).toBe("intel");
  });

  it("renders one group per family, headed by the chip word of every card in it (phone: every family in the page)", () => {
    // Phones list every family in the page's own scroll, each under its heading
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 390, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
    const html = unescape(renderToStaticMarkup(createElement(OrderCatalog, { target: "", setTarget: () => undefined })));
    vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
    const sections = [...html.matchAll(/<section[^>]*data-order-family="(\w+)"[^>]*>([\s\S]*?)<\/section>/g)];
    expect(sections.map((m) => m[1])).toEqual(FAMILIES.filter((f) => ORDERS_BY_FAMILY[f].length));
    let cards = 0;
    for (const [, fam, body] of sections) {
      const word = FAMILY_WORD[fam as keyof typeof FAMILY_WORD];
      expect(word).toBe(ORDER_FAMILY_WORDS[fam as keyof typeof ORDER_FAMILY_WORDS]);
      expect(body, fam).toContain(`data-family-heading="${word}"`);
      const chips = [...body.matchAll(/data-family-word="([^"]+)"/g)].map((m) => m[1]);
      expect(chips.length, fam).toBe(ORDERS_BY_FAMILY[fam as keyof typeof ORDERS_BY_FAMILY].length);
      for (const c of chips) expect(c, `${fam} group`).toBe(word);
      cards += chips.length;
    }
    // Every order is still reachable from the catalogue
    expect(cards).toBe(ORDERS.length);
    for (const o of ORDERS) expect(html, o.id).toContain(`data-order-id="${o.id}"`);
    // The old category names never head a group
    const headings = [...html.matchAll(/data-family-heading="([^"]+)"/g)].map((m) => m[1]);
    for (const old of ["Intelligence", "Domestic"]) expect(headings).not.toContain(old);
  });

  it("wider than a phone, one tab per family (its word and count, FAMILIES order) and the chosen family's cards under its own word (design review S1-1)", () => {
    const html = unescape(renderToStaticMarkup(createElement(OrderCatalog, { target: "", setTarget: () => undefined })));
    const tabs = [...html.matchAll(/data-family-tab="([^"]+)"[^>]*>[\s\S]*?<span class="ord-tab-n num">(\d+)<\/span>/g)].map((m) => [m[1], Number(m[2])]);
    expect(tabs).toEqual(FAMILIES.filter((f) => ORDERS_BY_FAMILY[f].length).map((f) => [FAMILY_WORD[f], ORDERS_BY_FAMILY[f].length]));
    const panel = [...html.matchAll(/<section[^>]*data-order-family="(\w+)"[^>]*>([\s\S]*?)<\/section>/g)];
    expect(panel).toHaveLength(1);
    const [, fam, body] = panel[0];
    const chips = [...body.matchAll(/data-family-word="([^"]+)"/g)].map((m) => m[1]);
    expect(chips.length).toBe(ORDERS_BY_FAMILY[fam as keyof typeof ORDERS_BY_FAMILY].length);
    for (const c of chips) expect(c).toBe(FAMILY_WORD[fam as keyof typeof FAMILY_WORD]);
  });

  it("the old categories are retired from the UI registry and the catalogue", () => {
    const orders = readFileSync(join(ROOT, "ui/src/lib/orders.ts"), "utf8");
    expect(orders).not.toMatch(/\bcategory\s*:/);
    expect(orders).not.toMatch(/OrderCategory|ORDERS_BY_CATEGORY|CATEGORIES/);
    const catalog = readFileSync(join(ROOT, "ui/src/components/orders/OrderCatalog.tsx"), "utf8");
    expect(catalog).toMatch(/FAMILIES\.(map|filter)/);
    expect(catalog).toMatch(/FAMILY_WORD\[f(am)?\]/);
    expect(catalog).not.toMatch(/'(Intelligence|Domestic)'/);
  });
});

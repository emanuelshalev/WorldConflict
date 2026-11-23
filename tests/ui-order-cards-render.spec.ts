import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "../ui/node_modules/react/index.js";
import { renderToStaticMarkup } from "../ui/node_modules/react-dom/server.node.js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAMILY_WORD, ORDERS, orderLabel } from "../ui/src/lib/orders.js";

// The store reads window and localStorage when it loads: stub them, then import the cards
type Card = typeof import("../ui/src/components/orders/OrderCard.js").OrderCard;
type Face = typeof import("../ui/src/components/orders/ConfirmFace.js").ConfirmFace;
let OrderCard: Card;
let ConfirmFace: Face;
beforeAll(async () => {
  vi.stubGlobal("window", { location: { search: "" }, innerWidth: 1440, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  ({ OrderCard } = await import("../ui/src/components/orders/OrderCard.js"));
  ({ ConfirmFace } = await import("../ui/src/components/orders/ConfirmFace.js"));
});

/**
 * Order cards on every surface (design-order-cards.md section 6, D-75): each of the 28 orders
 * renders its pictogram plate, its title and its family word as the desk catalog tile, the map
 * menu tile and phone row, and the dossier row; every danger order confirms on a face that
 * shows its pictogram, title and family word. Rendered with react-dom/server (no game loaded:
 * cards fall back to the registry cost and the "Pick a country first." block).
 */
const ROOT = join(__dirname, "..");

const SURFACES = {
  "desk catalog": { variant: "tile", compact: false },
  "map menu": { variant: "tile", compact: true },
  "map menu (phone rows)": { variant: "row", compact: true },
  dossier: { variant: "row", compact: true },
} as const;

const unescape = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

describe("order cards on every surface", () => {
  for (const [surface, props] of Object.entries(SURFACES)) {
    it(`${surface}: all 28 orders show their icon, title and family word`, () => {
      expect(ORDERS).toHaveLength(28);
      for (const def of ORDERS) {
        const html = unescape(renderToStaticMarkup(createElement(OrderCard, { def, ...props })));
        expect(html, def.id).toContain(`data-order-id="${def.id}"`);
        expect(html, `${def.id}: plate`).toContain(`data-plate="${def.id}"`);
        expect(html, `${def.id}: pictogram`).toMatch(new RegExp(`data-pictogram="${def.id}"[^>]*>\\s*<`));
        expect(html, `${def.id}: pictogram body`).toMatch(/<(path|g|rect|circle|ellipse)\b/);
        expect(html, `${def.id}: title`).toContain(`>${orderLabel(def)}</h3>`);
        expect(html, `${def.id}: family word`).toContain(`data-family-word="${FAMILY_WORD[def.family]}"`);
      }
    });
  }

  it("the three surfaces use the one OrderCard with those props", () => {
    const read = (f: string) => readFileSync(join(ROOT, "ui/src/components", f), "utf8");
    expect(read("orders/OrderCatalog.tsx")).toMatch(/<OrderCard[\s\S]*?def=\{def\}/);
    expect(read("MapActionMenu.tsx")).toMatch(/<OrderCard[\s\S]*?variant=\{rows \? 'row' : 'tile'\}[\s\S]*?compact/);
    expect(read("CountryDetailPanel.tsx")).toMatch(/<OrderCard[^>]*variant="row" compact/);
  });

  it("every danger order confirms first (D-75), and the face shows title, family word and icon", () => {
    const card = readFileSync(join(ROOT, "ui/src/components/orders/OrderCard.tsx"), "utf8");
    expect(card).toMatch(/entry\?\.missionWarning \|\| def\.danger\)/);
    expect(card).toMatch(/order=\{\{ id: def\.id, family: fam, title: label \}\}/);
    const danger = ORDERS.filter((o) => o.danger);
    expect(danger.map((o) => o.id).sort()).toEqual(
      ["airstrike-military", "airstrike-nuclear", "arm-rebels", "assassinate", "break-pact", "coup", "declare-war", "deploy-border", "fund-nuclear", "nuclear-strike", "policing-hard"].sort(),
    );
    for (const def of danger) {
      const title = orderLabel(def, "India");
      const kind = def.type === "NUCLEAR_STRIKE" ? "nuclear" : def.irreversible ? "war" : "danger";
      const html = unescape(
        renderToStaticMarkup(
          createElement(ConfirmFace, {
            kind,
            question: `${title}?`,
            lines: [],
            confirmText: "Give the order",
            cancelText: "Cancel",
            onConfirm: () => undefined,
            onCancel: () => undefined,
            order: { id: def.id, family: def.family, title },
          }),
        ),
      );
      expect(html, def.id).toContain(`data-confirm="${kind}"`);
      expect(html, `${def.id}: title`).toContain(`data-confirm-title="">${title}<`);
      expect(html, `${def.id}: family word`).toContain(`data-family-word="${FAMILY_WORD[def.family]}"`);
      expect(html, `${def.id}: pictogram`).toContain(`data-pictogram="${def.id}"`);
      expect(html, `${def.id}: safe answer`).toContain("data-confirm-cancel");
      if (def.irreversible) expect(html, `${def.id}: no undo`).toContain("No undo");
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDER_FAMILY_WORDS } from "../ui/src/lib/glossary.js";
import { FAMILIES, FAMILY_WORD, ORDERS } from "../ui/src/lib/orders.js";
import { FAMILY_COLOR, actionFamily } from "../ui/src/scenes/actionIcons.js";

/**
 * Order families (design-order-cards.md section 4 and 8): every order has a family with a word,
 * and every colour pair on the shipped tokens meets WCAG AA (text 4.5:1, graphics 3:1),
 * computed from the CSS values in ui/src/styles/orders.css and wc.css.
 */
const ROOT = join(__dirname, "..");
const css = readFileSync(join(ROOT, "ui/src/styles/orders.css"), "utf8") + readFileSync(join(ROOT, "ui/src/styles/wc.css"), "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const card = token("ord-card-top");
const cardBot = token("ord-card-bot");
const desk = token("bg-0");
const plateInk = token("plate-ink");

describe("order families", () => {
  it("files every order under one of the six families", () => {
    for (const o of ORDERS) expect(FAMILIES, o.id).toContain(o.family);
    expect(new Set(ORDERS.map((o) => o.family))).toEqual(new Set(FAMILIES));
    expect(ORDERS.find((o) => o.id === "reform")?.family).toBe("econ");
  });

  it("gives every family a glossary word", () => {
    expect(FAMILY_WORD).toEqual(ORDER_FAMILY_WORDS);
    for (const f of FAMILIES) expect(ORDER_FAMILY_WORDS[f]).toMatch(/^[A-Z][a-z]+$/);
  });

  it("keeps the map colours and the action families in step with the card tokens", () => {
    for (const f of FAMILIES) expect(FAMILY_COLOR[f].toLowerCase(), f).toBe(token(`fam-${f}`).toLowerCase());
    for (const o of ORDERS) expect(actionFamily(o.type), o.id).toBe(o.family);
  });

  for (const f of ["diplo", "mil", "nuke", "intel", "econ", "home"] as const) {
    it(`${f}: every pair meets WCAG AA`, () => {
      const accent = token(`fam-${f}`);
      const ink = token(`fam-${f}-ink`);
      const chip = token(`fam-${f}-chip`);
      // The pictogram on its plate is held to the text bar (4.5:1), stricter than graphics (3:1)
      expect(contrast(accent, plateInk), "pictogram on plate").toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent, card), "edge vs card").toBeGreaterThanOrEqual(3);
      expect(contrast(accent, desk), "edge vs desk").toBeGreaterThanOrEqual(3);
      expect(contrast(ink, chip), "family word on chip").toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, card), "family ink on card").toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, cardBot), "family ink on card bottom").toBeGreaterThanOrEqual(4.5);
    });
  }

  it("keeps the card text and the invalid plate readable on the lighter paper", () => {
    expect(contrast(token("text-1"), card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("text-2"), card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("ord-plate-off"), plateInk)).toBeGreaterThanOrEqual(4.5);
  });
});

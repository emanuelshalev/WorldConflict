import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDERS } from "../ui/src/lib/orders.js";
import { PICTOGRAM_SOURCE } from "../ui/src/components/orders/pictogramData.js";
// @ts-expect-error: plain ESM script without types
import { buildSource } from "../ui/scripts/build-order-pictograms.mjs";

/**
 * Order pictograms (design-order-cards.md section 3 and 8, D-66, D-75): every registry order has
 * its own signed-off icon, the generated UI module matches the SVG sources, and the markup stays
 * monochrome with mask ids that the component scopes per instance.
 */
const ROOT = join(__dirname, "..");

describe("order pictograms", () => {
  it("gives each of the 28 registry orders an icon of its own", () => {
    expect(ORDERS).toHaveLength(28);
    const bodies = new Map<string, string>();
    for (const o of ORDERS) {
      const p = PICTOGRAM_SOURCE[o.id];
      expect(p, `${o.id} has no pictogram`).toBeTruthy();
      expect(p.body.length, o.id).toBeGreaterThan(100);
      expect(bodies.has(p.body), `${o.id} shares its picture with ${bodies.get(p.body)}`).toBe(false);
      bodies.set(p.body, o.id);
    }
  });

  it("draws each icon for the order's own family", () => {
    for (const o of ORDERS) expect(PICTOGRAM_SOURCE[o.id].family, o.id).toBe(o.family);
  });

  it("matches the signed-off SVGs (regenerate with node ui/scripts/build-order-pictograms.mjs)", () => {
    const onDisk = readFileSync(join(ROOT, "ui/src/components/orders/pictogramData.ts"), "utf8");
    expect(onDisk).toBe(buildSource());
  });

  it("is monochrome: only currentColor, plus black and white inside masks", () => {
    for (const [id, p] of Object.entries(PICTOGRAM_SOURCE)) {
      const colours = [...p.body.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1].toLowerCase());
      for (const c of colours) expect(["#000", "#fff", "#000000", "#ffffff"], `${id} uses ${c}`).toContain(c);
      expect(p.body, id).not.toMatch(/<(linear|radial)Gradient|<text\b|style=/);
    }
  });

  it("names every mask and clipPath oi-*, and the component rewrites them from useId", () => {
    for (const [id, p] of Object.entries(PICTOGRAM_SOURCE)) {
      for (const m of p.body.matchAll(/\bid="([^"]+)"/g)) expect(m[1], id).toMatch(/^oi-/);
      for (const m of p.body.matchAll(/url\(#([^)]+)\)/g)) expect(m[1], id).toMatch(/^oi-/);
    }
    const src = readFileSync(join(ROOT, "ui/src/components/orders/OrderPictogram.tsx"), "utf8");
    expect(src).toMatch(/useId\(\)/);
    expect(src).toMatch(/scopeIds\(src\.body, scope\)/);
  });

  it("keeps plates at 34 px or more, so the SITES tag of Strike nuclear sites stays legible", () => {
    const src = readFileSync(join(ROOT, "ui/src/components/orders/OrderPictogram.tsx"), "utf8");
    expect(src).toMatch(/MIN_PLATE_PX = 34/);
    expect(src).toMatch(/Math\.max\(MIN_PLATE_PX, size\)/);
    const card = readFileSync(join(ROOT, "ui/src/components/orders/OrderCard.tsx"), "utf8");
    const plate = card.match(/const PLATE = \{([^}]+)\}/)?.[1] ?? "";
    const sizes = [...plate.matchAll(/\d+/g)].map((m) => Number(m[0]));
    expect(sizes.length).toBeGreaterThanOrEqual(4);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(34);
  });
});

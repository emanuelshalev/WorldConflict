import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * B-22: the main UI chunk grew past the 1,100 kB warning. Rarely opened surfaces load on first
 * use and React ships in its own vendor chunk. These checks fail if a surface is imported
 * statically again (which pulls it back into the main chunk) or if the vendor split stops
 * catching the `react-dom/client` and `react-dom/server` subpaths.
 */

const app = readFileSync(join(process.cwd(), "ui/src/App.tsx"), "utf-8");

const LAZY = [
  "SaveLoadModal",
  "AdvisorModal",
  "SettingsModal",
  "LoginScreen",
  "EndScreen",
  "MomentGallery",
];

describe("main bundle split (B-22)", () => {
  it.each(LAZY)("App loads %s on demand, never with a static import", (name) => {
    expect(app).not.toMatch(new RegExp(`^import [^\\n]*from '\\./components/${name}'`, "m"));
    expect(app).toContain(`import('./components/${name}')`);
  });

  it("the vendor split catches React subpaths and the map engine", async () => {
    const { default: config } = await import("../../ui/vite.config.ts");
    const output = config.build?.rollupOptions?.output;
    const chunk = (Array.isArray(output) ? output[0] : output)?.manualChunks;
    expect(typeof chunk).toBe("function");
    const call = (id: string) =>
      (chunk as (id: string, meta: unknown) => string | undefined)(id, {});
    expect(call("/x/ui/node_modules/react-dom/cjs/react-dom-client.production.js")).toBe("react");
    expect(call("/x/ui/node_modules/react-dom/server.browser.js")).toBe("react");
    expect(call("/x/ui/node_modules/react/index.js")).toBe("react");
    expect(call("/x/ui/node_modules/maplibre-gl/dist/maplibre-gl.js")).toBe("maplibre");
    expect(call("/x/ui/src/App.tsx")).toBeUndefined();
    expect(call("/x/ui/node_modules/@tabler/icons-react/dist/esm/icons/IconX.mjs")).toBeUndefined();
  });
});

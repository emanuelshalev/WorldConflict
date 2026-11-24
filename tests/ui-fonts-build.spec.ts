import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * QA4-S2-1 (runs/iter-04/qa-verify.md): the game's fonts never loaded. ui/src/styles/fonts.css
 * points at @fontsource packages that were in ui/package.json and the lock but not installed; Vite
 * only warned "didn't resolve at build time", shipped no .woff2, and every screen fell back to
 * system fonts with nothing failing. Now (a) the UI build fails on a font file that does not
 * resolve, and (c) `npm run dev` stops on a dependency that is not installed, naming the command.
 * The browser half (b), the four families loaded and no Google Fonts request, is QA4-S2-1.mjs and
 * the smoke playtest.
 */

const tmp = mkdtempSync(join(tmpdir(), "wc-fonts-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("QA4-S2-1: a stale install fails loudly", () => {
  it("the build's font check finds every font file installed here, and fails the build when one is missing", async () => {
    const { missingFontFiles, shippedFonts } = await import("../ui/vite.config.ts");
    expect(missingFontFiles()).toEqual([]);
    // A node_modules without the @fontsource packages (the QA machine)
    const empty = join(tmp, "node_modules");
    mkdirSync(empty, { recursive: true });
    const missing = missingFontFiles(undefined, empty);
    expect(missing.length).toBeGreaterThanOrEqual(20);
    expect(missing.every((m) => m.startsWith("@fontsource"))).toBe(true);
    for (const command of ["build", "serve"] as const) {
      const plugin = shippedFonts({ modules: empty }) as unknown as {
        configResolved: (c: { command: string }) => void;
        buildStart: (this: unknown) => void;
      };
      plugin.configResolved({ command });
      const said: string[] = [];
      const ctx = {
        error: (m: string) => {
          throw new Error(m);
        },
        warn: (m: string) => said.push(m),
      };
      if (command === "build") expect(() => plugin.buildStart.call(ctx)).toThrow(/npm install" in ui/);
      else {
        plugin.buildStart.call(ctx);
        expect(said.join(" ")).toMatch(/not installed/);
      }
    }
  });

  it("the predev check names a package that is not installed and the command to run", async () => {
    const { checkDeps } = await import("../ui/scripts/check-deps.mjs");
    expect(checkDeps(join(process.cwd(), "ui")).missing).toEqual([]);
    const dir = join(tmp, "pkg");
    mkdirSync(join(dir, "node_modules", "present"), { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { present: "1.0.0", "@fontsource/absent": "5.3.0" } }));
    writeFileSync(join(dir, "node_modules", "present", "package.json"), JSON.stringify({ version: "0.9.0" }));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({ packages: { "node_modules/present": { version: "1.0.0" } } }));
    const r = checkDeps(dir);
    expect(r.missing).toEqual(["@fontsource/absent"]);
    expect(r.stale).toEqual(["present 0.9.0 (lock: 1.0.0)"]);
  });

  it("npm run dev runs the check first, in the root and in ui/", async () => {
    const { readFileSync } = await import("node:fs");
    expect(JSON.parse(readFileSync("package.json", "utf-8")).scripts.predev).toBe("node ui/scripts/check-deps.mjs . ui");
    expect(JSON.parse(readFileSync("ui/package.json", "utf-8")).scripts.predev).toBe("node scripts/check-deps.mjs");
  });
});

// Unit tests for the generic devloop kit pieces used by the verify gate.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import { checkRegistry, globToRegExp, loadRegistry, parseYaml, printTable, runGuards, testNames } from "../devloop/kit/regressions.mjs";

describe("regressions registry kit", () => {
  it("parses the YAML subset the registry uses", () => {
    const doc = parseYaml(
      [
        "# comment",
        "backlog:",
        "  - file: runs/b.md",
        "findings:",
        "  - id: F-1",
        '    title: "Quoted: with colon"',
        "    covers: [src/a.ts, 'ui/**']",
        "    guards:",
        "      - vitest: tests/a.spec.ts",
        "        name: does a thing # trailing comment",
        "      - script: x.mjs",
        "  - id: F-2",
        "    title: bare words, here",
        "    guards:",
        "      - vitest: tests/b.spec.ts",
      ].join("\n"),
    );
    expect(doc.backlog).toEqual([{ file: "runs/b.md" }]);
    expect(doc.findings[0]).toEqual({
      id: "F-1",
      title: "Quoted: with colon",
      covers: ["src/a.ts", "ui/**"],
      guards: [{ vitest: "tests/a.spec.ts", name: "does a thing" }, { script: "x.mjs" }],
    });
    expect(doc.findings[1].title).toBe("bare words, here");
  });

  it("matches globs like git paths", () => {
    expect(globToRegExp("ui/src/**").test("ui/src/a/b.tsx")).toBe(true);
    expect(globToRegExp("ui/src/**/*.tsx").test("ui/src/b.tsx")).toBe(true);
    expect(globToRegExp("src/core/*.ts").test("src/core/x/y.ts")).toBe(false);
  });

  it("finds literal test names", () => {
    expect(testNames("describe(\"A\", () => { it(`b c`, () => {}); test.skip('d', f) })")).toEqual(["A", "b c", "d"]);
  });

  describe("open findings (status: open)", () => {
    const root = mkdtempSync(join(tmpdir(), "devloop-open-"));
    afterAll(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "g"));
    writeFileSync(join(root, "g/fail.mjs"), "process.exit(1);\n");
    writeFileSync(join(root, "g/pass.mjs"), "process.exit(0);\n");
    const registry = (status: string) => {
      const file = join(root, `reg-${status}.yaml`);
      writeFileSync(
        file,
        [
          "findings:",
          "  - id: A-1",
          "    title: fixed",
          "    source: t",
          "    guards:",
          "      - script: g/pass.mjs",
          "  - id: RS-9",
          "    title: not fixed yet",
          "    source: t",
          `    status: ${status}`,
          "    guards:",
          "      - script: g/fail.mjs",
          "",
        ].join("\n"),
      );
      return loadRegistry(file);
    };
    const table = (rows: unknown[]) => {
      const lines: string[] = [];
      const spy = vi.spyOn(console, "log").mockImplementation((l: string) => void lines.push(l));
      const failed = printTable(rows);
      spy.mockRestore();
      return { failed, text: lines.join("\n") };
    };

    it("runs an open finding's guard and reports it without failing the gate", () => {
      const reg = registry("open");
      expect(checkRegistry(reg, root)).toEqual([]);
      const rows = runGuards(reg, { root, out: join(root, "out") });
      expect(rows.find((r: { id: string }) => r.id === "RS-9")).toMatchObject({ ok: false, open: true });
      const { failed, text } = table(rows);
      expect(failed).toEqual([]);
      expect(text).toMatch(/RS-9 .* OPEN /);
      expect(text).toMatch(/1\/1 findings guarded and passing/);
      expect(text).toMatch(/RS-9 still failing as expected/);
    });

    it("says when an open finding's guard passes, and gates once status: open is removed", () => {
      writeFileSync(join(root, "g/fail.mjs"), "process.exit(0);\n");
      const { failed, text } = table(runGuards(registry("open"), { root, out: join(root, "out") }));
      expect(failed).toEqual([]);
      expect(text).toMatch(/NOW PASSING: RS-9: remove `status: open`/);
      writeFileSync(join(root, "g/fail.mjs"), "process.exit(1);\n");
      const reg = registry("open");
      reg.findings[1].status = undefined;
      expect(table(runGuards(reg, { root, out: join(root, "out") })).failed).toEqual(["RS-9"]);
    });

    it("rejects an unknown status", () => {
      expect(checkRegistry(registry("fixed"), root)).toEqual(['RS-9: status must be "open" or absent (got "fixed")']);
    });
  });
});

// Unit tests for the generic devloop kit pieces used by the verify gate.
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import { globToRegExp, parseYaml, testNames } from "../devloop/kit/regressions.mjs";

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
});

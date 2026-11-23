// devloop/kit/progress.mjs: iteration focus, closing earlier iterations, unit counts.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const SCRIPT = join(__dirname, "../../devloop/kit/progress.mjs");
const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function fixture(events: object[]) {
  const dir = mkdtempSync(join(tmpdir(), "progress-"));
  dirs.push(dir);
  writeFileSync(
    join(dir, "config.json"),
    JSON.stringify({ stages: ["Plan", "Build", "Gate"], log: "stages.jsonl", estimates: "estimates.jsonl" }),
  );
  writeFileSync(join(dir, "stages.jsonl"), `${events.map((e) => JSON.stringify(e)).join("\n")}\n`);
  const run = (...a: string[]) =>
    execFileSync(process.execPath, [SCRIPT, join(dir, "config.json"), ...a, "--no-usage", "--no-record"], {
      encoding: "utf8",
    });
  const log = () =>
    readFileSync(join(dir, "stages.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
  return { run, log };
}

const T = (m: number) => new Date(Date.UTC(2026, 0, 1, 0, m)).toISOString();
const iter3Open = [
  { t: T(0), iteration: 3, stage: "Plan", kind: "start" },
  { t: T(10), iteration: 3, stage: "Plan", kind: "end" },
  { t: T(10), iteration: 3, stage: "Gate", kind: "start" },
];

describe("progress.mjs", () => {
  it("starting a new iteration closes the open stages of earlier ones", () => {
    const f = fixture(iter3Open);
    f.run("--start", "Plan", "--at", T(60));
    const ends = f.log().filter((e) => e.kind === "end" && e.iteration === 3 && e.stage === "Gate");
    expect(ends).toHaveLength(1);
    expect(ends[0].t).toBe(T(60));
    expect(ends[0].note).toMatch(/iteration 4 started/);
    expect(JSON.parse(f.run("--json")).iteration).toBe(4);
  });

  it("focus is the newest iteration with an open stage", () => {
    const f = fixture([...iter3Open, { t: T(30), iteration: 4, stage: "Plan", kind: "start" }]);
    expect(JSON.parse(f.run("--json")).iteration).toBe(4);
  });

  it("--done adds, --done-set sets", () => {
    const f = fixture([
      { t: T(0), iteration: 1, stage: "Build", kind: "start" },
      { t: T(0), iteration: 1, stage: "Build", kind: "unit-total", units: 9 },
    ]);
    const total = () =>
      f
        .log()
        .filter((e) => e.kind === "unit-done")
        .reduce((n, e) => n + e.units, 0);
    f.run("--done", "2");
    f.run("--done", "2");
    expect(total()).toBe(4);
    f.run("--done-set", "3");
    expect(total()).toBe(3);
    f.run("--done-set", "3");
    expect(total()).toBe(3);
  });

  it("--end-all ends everything up to the iteration", () => {
    const f = fixture(iter3Open);
    f.run("--end-all", "--iteration", "3");
    expect(f.log().filter((e) => e.kind === "end" && e.stage === "Gate")).toHaveLength(1);
  });
});

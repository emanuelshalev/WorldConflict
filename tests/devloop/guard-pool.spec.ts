// The regressions runner's guard pool (devloop/kit/regressions.mjs): script guards run a bounded
// number at a time, results come back in registry order, --jobs 1 is one after another, a guard
// marked serial runs alone, a failing guard and a timed-out guard are reported. Plain node scripts
// stand in for browser guards.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  checkRegistry,
  guardJobs,
  loadRegistry,
  printTable,
  runGuards,
  runPool,
  scriptOrder,
  // @ts-expect-error: plain ESM module without type declarations
} from "../../devloop/kit/regressions.mjs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("runPool", () => {
  it("keeps at most `jobs` running and returns results in input order", async () => {
    let running = 0;
    let peak = 0;
    const finished: number[] = [];
    const delays = [60, 10, 40, 5, 30];
    const res = await runPool(delays, {
      jobs: 2,
      run: async (ms: number, i: number) => {
        running++;
        peak = Math.max(peak, running);
        await sleep(ms);
        running--;
        return { ok: true, i };
      },
      onDone: (_r: unknown, _item: number, i: number) => finished.push(i),
    });
    expect(peak).toBe(2);
    expect(res.map((r: { i: number }) => r.i)).toEqual([0, 1, 2, 3, 4]);
    expect(finished).not.toEqual([0, 1, 2, 3, 4]); // printed as they end, not in input order
    expect([...finished].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("with jobs 1 runs one after another in input order", async () => {
    const events: string[] = [];
    await runPool(["a", "b", "c"], {
      jobs: 1,
      run: async (x: string) => {
        events.push(`start ${x}`);
        await sleep(x === "a" ? 30 : 5);
        events.push(`end ${x}`);
        return { ok: true };
      },
    });
    expect(events).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
  });

  it("runs a serial item alone", async () => {
    const events: string[] = [];
    await runPool(["a", "b", "S", "c", "d"], {
      jobs: 3,
      isSerial: (x: string) => x === "S",
      run: async (x: string) => {
        events.push(`start ${x}`);
        await sleep(20);
        events.push(`end ${x}`);
        return { ok: true };
      },
    });
    const at = (e: string) => events.indexOf(e);
    // S starts after a and b end; c and d start after S ends
    expect(at("start S")).toBeGreaterThan(Math.max(at("end a"), at("end b")));
    expect(Math.min(at("start c"), at("start d"))).toBeGreaterThan(at("end S"));
  });

  it("turns a throw into a failed result and resolves an empty list", async () => {
    const res = await runPool([1, 2], {
      jobs: 2,
      run: async (n: number) => {
        if (n === 2) throw new Error("boom");
        return { ok: true };
      },
    });
    expect(res).toEqual([{ ok: true }, { ok: false, detail: "boom" }]);
    expect(await runPool([], { jobs: 4, run: async () => ({ ok: true }) })).toEqual([]);
  });

  it("orders script guards: registry order one at a time; slowest first and serial last in parallel", () => {
    const scripts = ["a", "b", "c", "d", "e"];
    const times = { a: 10, b: 50, c: 30, e: 99 };
    expect(scriptOrder(scripts, new Set(["e"]), 1, times)).toEqual(scripts);
    // d has no time yet (a new guard): it counts as slowest; e is serial: last
    expect(scriptOrder(scripts, new Set(["e"]), 4, times)).toEqual(["d", "b", "c", "a", "e"]);
    expect(scriptOrder(scripts, new Set(), 4, {})).toEqual(scripts);
  });

  it("reads the concurrency from the option, then DEVLOOP_GUARD_JOBS, else 1", () => {
    expect(guardJobs(null, {})).toBe(1);
    expect(guardJobs(null, { DEVLOOP_GUARD_JOBS: "4" })).toBe(4);
    expect(guardJobs("2", { DEVLOOP_GUARD_JOBS: "4" })).toBe(2);
    expect(guardJobs("0", {})).toBe(1);
    expect(guardJobs("x", {})).toBe(1);
  });
});

describe("runGuards with script guards", () => {
  const root = mkdtempSync(join(tmpdir(), "devloop-pool-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "g"));
  const events = join(root, "events.log");
  // A guard: appends "start <name>" / "end <name>" to events.log, waits, exits with `code`
  const script = (name: string, ms: number, code = 0, say = "") =>
    writeFileSync(
      join(root, `g/${name}.mjs`),
      [
        "import fs from 'node:fs';",
        `fs.appendFileSync(${JSON.stringify(events)}, 'start ${name}\\n');`,
        `setTimeout(() => { fs.appendFileSync(${JSON.stringify(events)}, 'end ${name}\\n');${say ? ` console.log(${JSON.stringify(say)});` : ""} process.exit(${code}); }, ${ms});`,
        "",
      ].join("\n"),
    );
  script("slow", 400);
  script("fast", 50);
  script("bad", 50, 1, "bad FAIL: the thing is wrong");
  script("mid", 150);
  script("alone", 50);
  writeFileSync(join(root, "g/hang.mjs"), "setInterval(() => {}, 1000);\n");
  const registry = (extra: string[] = []) => {
    const file = join(root, "reg.yaml");
    const f = (id: string, s: string, more: string[] = []) => [`  - id: ${id}`, `    title: ${id}`, "    source: t", "    guards:", `      - script: g/${s}.mjs`, ...more];
    writeFileSync(
      file,
      ["findings:", ...f("A-1", "slow"), ...f("A-2", "fast"), ...f("A-3", "bad"), ...f("A-4", "mid"), ...f("A-5", "alone", ["        serial: true"]), ...extra, ""].join("\n"),
    );
    return loadRegistry(file);
  };
  const read = () => readFileSync(events, "utf8").trim().split("\n");
  const run = async (opts: Record<string, unknown>) => {
    writeFileSync(events, "");
    const lines: string[] = [];
    const rows = await runGuards(registry(), { root, out: join(root, "out"), times: join(root, "times.json"), log: (l: string) => lines.push(l), ...opts });
    return { rows, lines, ev: read() };
  };
  const table = (rows: unknown[]) => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((l: string) => void lines.push(l));
    const failed = printTable(rows);
    spy.mockRestore();
    return { failed, text: lines.join("\n") };
  };

  it("accepts serial: true on a script guard and rejects it elsewhere", () => {
    expect(checkRegistry(registry(), root)).toEqual([]);
    const bad = registry(["  - id: A-6", "    title: x", "    source: t", "    guards:", "      - vitest: g/fast.mjs", "        serial: yes"]);
    expect(checkRegistry(bad, root)).toEqual(['A-6: serial must be true or false (got "yes")', "A-6: serial applies to script guards only"]);
  });

  it("--jobs 1 runs the guards one after another in registry order", async () => {
    rmSync(join(root, "times.json"), { force: true });
    const { rows, ev } = await run({ jobs: 1 });
    expect(ev).toEqual(["slow", "fast", "bad", "mid", "alone"].flatMap((n) => [`start ${n}`, `end ${n}`]));
    expect(rows.map((r: { id: string; ok: boolean }) => [r.id, r.ok])).toEqual([
      ["A-1", true],
      ["A-2", true],
      ["A-3", false],
      ["A-4", true],
      ["A-5", true],
    ]);
  });

  it("in parallel gives the same rows in registry order, the slowest of the last run first and the serial guard alone at the end", async () => {
    const serial = await run({ jobs: 1 });
    const { rows, lines, ev } = await run({ jobs: 3 });
    expect(rows).toEqual(serial.rows);
    // The serial guard last, alone; three at once before it
    expect(ev.at(-2)).toBe("start alone");
    expect(ev.slice(0, 3).every((e) => e.startsWith("start"))).toBe(true);
    // The slowest of the last run (times.json) started first
    const times = JSON.parse(readFileSync(join(root, "times.json"), "utf8"));
    expect(times["g/slow.mjs"]).toBeGreaterThan(times["g/fast.mjs"]);
    expect(ev.at(-1)).toBe("end alone");
    // One line per guard as it ends, the failing one with its last output line
    expect(lines.filter((l) => /^\[\s*\d\/5\]/.test(l))).toHaveLength(5);
    expect(lines.find((l) => l.includes("g/bad.mjs"))).toMatch(/FAIL .*bad FAIL: the thing is wrong/);
    expect(lines[0]).toBe("running 5 script guards, 3 at a time (1 alone)");
    const { failed, text } = table(rows);
    expect(failed).toEqual(["A-3"]);
    expect(text).toMatch(/\n4\/5 findings guarded and passing; REGRESSED: A-3$/);
    expect(text.indexOf("A-1 ")).toBeLessThan(text.indexOf("A-2 "));
  });

  it("stops a guard at the timeout and reports it", async () => {
    const file = join(root, "reg-hang.yaml");
    writeFileSync(file, ["findings:", "  - id: H-1", "    title: hangs", "    source: t", "    guards:", "      - script: g/hang.mjs", ""].join("\n"));
    const t0 = Date.now();
    const rows = await runGuards(loadRegistry(file), { root, out: join(root, "out"), times: join(root, "times.json"), jobs: 2, timeoutMs: 1000, log: () => {} });
    expect(Date.now() - t0).toBeLessThan(15_000);
    expect(rows).toEqual([{ id: "H-1", guard: "g/hang.mjs", ok: false, detail: "timed out after 1 s" }]);
    expect(readFileSync(join(root, "out/hang/guard.log"), "utf8")).toMatch(/timed out after 1 s/);
  });
});

// devloop/kit/customer-record.mjs: the linked customer record (method/customer-advocate.md) on a
// throwaway instance, and the World Conflict record itself being up to date.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import * as cr from "../../devloop/kit/customer-record.mjs";

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

const score = (value: number) => ({ value, reason: `because ${value}` });
const scores = (recommend: number) =>
  Object.fromEntries(
    ["fun", "clarity", "visual", "feels_like_a_game", "agency", "realism", "replay"].map((k) => [k, score(6)]),
  ) as Record<string, unknown>;

function session(persona: string, iteration: number, recommend: number, extra: Record<string, unknown> = {}) {
  return {
    persona,
    variant: `${persona}-phone`,
    panel_version: "1.0",
    build: `b${iteration}`,
    iteration,
    scenarios: [{ id: "S1", outcome: "achieved", steps: ["played"], turns: 12 }],
    friction: [{ where: "Desk", expected: "one thing", happened: "seven things", kind: "hesitation" }],
    bugs: [{ title: "Wrong number", steps: ["open"], expected: "20%", actual: "2000%", severity: "S2" }],
    suggestions: [{ what: "Fewer cards", goal_served: "clarity" }],
    delight: ["The globe"],
    scores: { ...scores(recommend), recommend: score(recommend) },
    quit_point: null,
    verbatim: "I liked the map.",
    ...extra,
  };
}

function instance() {
  const root = mkdtempSync(join(tmpdir(), "customer-record-"));
  made.push(root);
  mkdirSync(join(root, "panel"), { recursive: true });
  writeFileSync(
    join(root, "panel", "panel.yaml"),
    "personas:\n  - { id: ann, file: ann.yaml, weight: 0.75, kind: core }\n  - { id: bob, file: bob.yaml, weight: 0.25, kind: core }\n",
  );
  const put = (iter: number, name: string, data: unknown) => {
    const dir = join(root, "runs", `iter-0${iter}`, "sessions");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(data));
  };
  put(1, "ann-phone", session("ann", 1, 4));
  put(1, "bob-phone", session("bob", 1, 8));
  put(
    2,
    "ann-phone",
    session("ann", 2, 6, {
      device: "390x844 phone",
      tasks: { end_reached: true },
      liked: [{ what: "The plan panel", where: "Desk, month 2", why: "I knew what would happen", strength: 4, would_miss: true }],
      would_miss_most: "The plan panel",
      pull_to_continue: "The result card after month 1",
    }),
  );
  writeFileSync(join(root, "runs", "iter-01", "patterns.json"), JSON.stringify({ loved: ["The map"], patterns: [{ id: "F-01-1", title: "Too dense", who: ["ann"], tone: "bad" }] }));
  writeFileSync(
    join(root, "runs", "iter-02", "findings.json"),
    JSON.stringify([{ id: "F-02-1", title: "Wrong debt", severity: "S2", weight: 0.75, personas: ["ann"], decision: "fix now", status: "REPRODUCED" }]),
  );
  writeFileSync(join(root, "runs", "iter-02", "triage.md"), "# triage\n");
  return root;
}

describe("customer record", () => {
  it("links every round to its project state and weighs recommend by the panel", () => {
    const record = cr.buildRecord(instance());
    expect(record.states.map((s: { iteration: number }) => s.iteration)).toEqual([1, 2]);
    const [s1, s2] = record.states;
    expect(s1.weighted_recommend).toBe(5);
    expect(s1.builds_played).toEqual(["b1"]);
    expect(s1.end_reached).toBeNull();
    expect(s1.loved).toEqual(["The map"]);
    expect(s2.end_reached).toBe(1);
    expect(s2.triage).toBe("../runs/iter-02/triage.md");
    expect(s2.clusters).toBe("../runs/iter-02/findings.json");
    expect(s2.forecast).toBeNull();
  });

  it("keeps one history per customer: scores as numbers, positives, clusters with their decision", () => {
    const record = cr.buildRecord(instance());
    const ann = record.personas.ann;
    expect(ann.weight).toBe(0.75);
    expect(ann.rounds.map((r: { scores: { recommend: number } }) => r.scores.recommend)).toEqual([4, 6]);
    expect(ann.rounds[0].clusters).toEqual([expect.objectContaining({ id: "F-01-1", title: "Too dense" })]);
    const r2 = ann.rounds[1];
    expect(r2.device).toBe("390x844 phone");
    expect(r2.liked[0]).toMatchObject({ what: "The plan panel", strength: 4, would_miss: true });
    expect(r2.liked[1]).toMatchObject({ what: "The globe" });
    expect(r2.would_miss_most).toBe("The plan panel");
    expect(r2.clusters[0]).toMatchObject({ id: "F-02-1", decision: "fix now", severity: "S2" });
    expect(record.personas.bob.rounds).toHaveLength(1);
  });

  it("writes the files once, then reports nothing stale; a changed session makes it stale", () => {
    const root = instance();
    const first = cr.writeRecord(root);
    expect(first.files).toEqual(expect.arrayContaining(["record.json", "INDEX.md", "liked.md", "ann.md", "bob.md"]));
    expect(cr.writeRecord(root, { check: true }).stale).toEqual([]);
    const liked = readFileSync(join(root, "customer-record", "liked.md"), "utf8");
    expect(liked).toMatch(/Would miss most: The plan panel/);
    expect(liked).toMatch(/The plan panel \(where: Desk, month 2; why: I knew what would happen; strength 4; would miss: yes\)/);
    const ann = readFileSync(join(root, "customer-record", "ann.md"), "utf8");
    expect(ann).toMatch(/\| 2 \| ann-phone \| b2 \| 6 \|/);
    expect(ann).toMatch(/F-02-1 Wrong debt \(S2\), decision: fix now/);
    const file = join(root, "runs", "iter-02", "sessions", "ann-phone.json");
    const s = JSON.parse(readFileSync(file, "utf8"));
    s.verbatim = "Changed my mind.";
    writeFileSync(file, JSON.stringify(s));
    expect(cr.writeRecord(root, { check: true }).stale).toEqual(expect.arrayContaining(["record.json", "ann.md"]));
  });

  it("the World Conflict customer record is up to date with its session reports", () => {
    const r = cr.writeRecord(join(__dirname, "../../devloop/instances/world-conflict"), { check: true });
    expect(r.stale).toEqual([]);
  });
});

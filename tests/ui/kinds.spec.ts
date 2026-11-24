import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTION_SCENE_TABLE,
  CELEBRATORY_SCENES,
  MILITARY_SCENES,
  OPTION_KEYWORDS,
  SCENE_KINDS,
  actionFamily,
  avoidRepeat,
  guardFamily,
  moodForVerdict,
  optionKeyword,
  sceneForAction,
  sceneForChoice,
  sceneForCrisis,
  sceneForDecision,
  sceneForOutcome,
} from "../../ui/src/scenes/kinds";
import { COUNCIL, COUNCIL_SEATS, councilTally } from "../../ui/src/scenes/art/unTally";

// Art matches outcome (design-feel.md section 7, rules R1 to R7)

/** Every crisis option label in the engine's templates, as [templateId, label]. */
function engineOptions(): Array<[string, string]> {
  const src = readFileSync("src/core/crises.ts", "utf8");
  const out: Array<[string, string]> = [];
  let template = "";
  const re = /id: "([a-z_]+)"|opt\(\s*"[^"]+",\s*["`]([^"`]+)["`]/g;
  for (const m of src.matchAll(re)) {
    if (m[1]) template = m[1];
    else if (m[2]) out.push([template, m[2]]);
  }
  return out;
}

/** Every scripted flashpoint option label, as [crisis title, label]. */
function flashpointOptions(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (o: unknown, title: string) => {
    if (Array.isArray(o)) for (const v of o) walk(v, title);
    else if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      const t = typeof rec.title === "string" ? rec.title : title;
      if (Array.isArray(rec.options))
        for (const op of rec.options as Array<{ label?: string }>) if (op.label) out.push([t, op.label]);
      for (const v of Object.values(rec)) walk(v, t);
    }
  };
  for (const f of readdirSync("data/flashpoints")) if (f.endsWith(".json")) walk(JSON.parse(readFileSync(`data/flashpoints/${f}`, "utf8")), "");
  return out;
}

const DIPLOMACY_WORDS = /back ?channel|\btalks?\b|ceasefire|truce|mediat|negotiat|\bcall (them|[a-z]+ quietly)/i;

describe("R1: the picture follows the choice", () => {
  it("finds options to check", () => {
    expect(engineOptions().length).toBeGreaterThan(100);
    expect(flashpointOptions().length).toBeGreaterThan(100);
  });

  it("Back channel via Muscat shows the ceasefire scene even in a strike crisis", () => {
    expect(sceneForChoice(undefined, "After the Riyadh airport strike", "Back channel via Muscat")).toBe("ceasefire");
    expect(sceneForChoice("military_incident", "Incident with Iran", "Call them quietly")).toBe("summit");
  });

  it("an explicit scene on the option wins, then keywords, then the crisis", () => {
    expect(sceneForChoice("military_incident", "x", "Call them quietly", { scene: "press" })).toBe("press");
    expect(sceneForChoice("military_incident", "x", "Some unknown words")).toBe(sceneForCrisis("military_incident"));
    expect(sceneForChoice("military_incident", "x", "Call them quietly", { scene: "not-a-scene" })).toBe("summit");
  });

  it("labour strikes and calls for unity are not air strikes or phone calls", () => {
    expect(optionKeyword("Break the strike")?.scene).toBe("streets");
    expect(optionKeyword("Call for national unity")?.scene).toBe("address");
    expect(optionKeyword("Call it a foreign forgery")?.scene).toBe("press");
  });

  it("no option with a diplomacy keyword renders a military scene (acceptance 19)", () => {
    const all = [...engineOptions(), ...flashpointOptions()];
    const offenders = all
      .filter(([, label]) => DIPLOMACY_WORDS.test(label))
      .map(([t, label]) => [t, label, sceneForChoice(t, t, label)] as const)
      .filter(([, , scene]) => MILITARY_SCENES.has(scene));
    expect(offenders).toEqual([]);
  });

  it("the desk thumbnail and the debrief card use the same scene (acceptance 21)", () => {
    for (const [t, label] of engineOptions()) {
      const desk = sceneForDecision({ kind: "CRISIS", templateId: t, title: t, label });
      const debrief = sceneForDecision({ kind: "CRISIS", templateId: t, title: t, label: `${label} (no decision taken)` });
      expect(debrief).toBe(desk);
    }
  });

  it("meetings fall back to their room", () => {
    expect(sceneForDecision({ kind: "STAFF", title: "Defence Minister", label: "Hear them out" })).toBe("cabinet");
    expect(sceneForDecision({ kind: "PRESS", title: "Interview", label: "Stay vague" })).toBe("tv_interview");
    expect(sceneForDecision({ kind: "CALL", title: "Call", label: "Ask for a ceasefire" })).toBe("ceasefire");
  });
});

describe("R2 and R3: mood and scene follow the verdict", () => {
  it("never a good mood on a failure", () => {
    expect(moodForVerdict("good")).toBe("good");
    expect(moodForVerdict("good", false)).toBe("bad");
    expect(moodForVerdict("bad")).toBe("bad");
    expect(moodForVerdict("mixed")).toBe("neutral");
    expect(moodForVerdict("neutral")).toBe("neutral");
  });

  it("celebratory scenes never illustrate a failure", () => {
    for (const kind of SCENE_KINDS) {
      expect(CELEBRATORY_SCENES.has(sceneForOutcome(kind, "bad"))).toBe(false);
      expect(CELEBRATORY_SCENES.has(sceneForOutcome(kind, "good", false))).toBe(false);
    }
    expect(sceneForOutcome("summit", "bad")).toBe("press");
    expect(sceneForOutcome("exec_order", "bad")).toBe("parliament");
    expect(sceneForOutcome("un_vote", "bad")).toBe("un_vote");
    expect(sceneForOutcome("airstrike", "bad")).toBe("airstrike");
    expect(sceneForOutcome("summit", "good")).toBe("summit");
  });
});

describe("R4: families do not cross", () => {
  it("option keyword families stay in their scenes", () => {
    for (const k of OPTION_KEYWORDS) {
      if (k.family === "diplomacy" || k.family === "domestic") expect(MILITARY_SCENES.has(k.scene), String(k.re)).toBe(false);
      if (k.family === "military") expect(CELEBRATORY_SCENES.has(k.scene), String(k.re)).toBe(false);
    }
  });

  it("action scenes stay in their family", () => {
    for (const [type, scene] of Object.entries(ACTION_SCENE_TABLE)) {
      const fam = actionFamily(type);
      if (fam === "diplomacy" || fam === "domestic") expect(MILITARY_SCENES.has(scene), type).toBe(false);
      if (fam === "military") expect(CELEBRATORY_SCENES.has(scene), type).toBe(false);
      expect(sceneForAction(type)).toBe(scene);
    }
  });

  it("the guard swaps a scene that left its family", () => {
    expect(guardFamily("airstrike", "diplomacy")).toBe("press");
    expect(guardFamily("deployment", "domestic")).toBe("cabinet");
    expect(guardFamily("signing", "military")).toBe("war_room");
    expect(guardFamily("summit", "diplomacy")).toBe("summit");
  });
});

describe("R7: no repeat backdrop", () => {
  it("swaps a repeat for a room of the same family unless it is a follow-up", () => {
    for (const kind of SCENE_KINDS) {
      const alt = avoidRepeat(kind, kind);
      expect(alt).not.toBe(kind);
      expect(MILITARY_SCENES.has(alt)).toBe(MILITARY_SCENES.has(kind));
      expect(avoidRepeat(kind, kind, true)).toBe(kind);
    }
    expect(avoidRepeat("war_room", "summit")).toBe("war_room");
  });

  it("the assassination attempt has its own frame", () => {
    expect(sceneForCrisis("assassination_attempt")).toBe("cabinet");
    expect(sceneForCrisis("assassination_attempt")).not.toBe(sceneForCrisis("refugee_wave"));
  });
});

// QA3R-3c: the UN board listed 18 delegates and counted YES 14 NO 2 on a 15-seat council
describe("the UN vote board is a 15-seat council (QA3R-3c)", () => {
  it("every mood tallies to 15 and both boards list the 15 seats once", () => {
    for (const mood of ["good", "bad", "neutral", undefined]) {
      const t = councilTally(mood);
      expect(t.yes + t.no + t.abstain).toBe(COUNCIL_SEATS);
    }
    expect(COUNCIL.length).toBe(COUNCIL_SEATS);
    expect(new Set(COUNCIL).size).toBe(COUNCIL_SEATS);
    for (const p5 of ["USA", "GBR", "FRA", "RUS", "CHN"]) expect(COUNCIL).toContain(p5);
    const src = readFileSync("ui/src/scenes/art/UnVote.tsx", "utf8");
    expect(src).not.toMatch(/const CODES = \[/);
    expect(src).toContain("COUNCIL.slice(");
  });
});

/**
 * F-04-8 (iteration 4 customer round, REGRESSED QA1-S3-1 and F-00-5): Marcus's call answer
 * "Promise full support" was drawn as election night, "377 SEATS MAJORITY WON"; Priya saw one UN
 * vote tallied YES 11 NO 2 on the result card and YES 8 NO 5 in the paper (the tally came from the
 * scene's mood). Art that states a fact must come from the game's data or state no number.
 */
describe("F-04-8: art never states a result that did not happen", () => {
  /** Every meeting answer label in src/core/meetings.ts (calls, visits, staff, press). */
  function meetingAnswers(): string[] {
    const src = readFileSync("src/core/meetings.ts", "utf8");
    return [...src.matchAll(/^\s+"([A-Z][^"]{3,80})",?$/gm)].map((m) => m[1]);
  }

  it("F-04-8: no crisis, flashpoint or meeting answer draws election night unless it is about an election", () => {
    const labels = [...engineOptions().map(([, l]) => l), ...flashpointOptions().map(([, l]) => l), ...meetingAnswers()];
    expect(labels).toContain("Promise full support");
    const wrong = labels.filter(
      (l) => optionKeyword(l)?.scene === "election" && !/\belect|\bcampaign|\bballot|\bpolls?\b|run on/i.test(l),
    );
    expect(wrong).toEqual([]);
    expect(sceneForDecision({ kind: "CALL", title: "Phone call", label: "Promise full support" })).not.toBe("election");
  });

  it("F-04-8: the election and UN vote art print no seat count, tally or result banner (every mood)", async () => {
    const { createElement } = await import("../../ui/node_modules/react/index.js");
    const { renderToStaticMarkup } = await import("../../ui/node_modules/react-dom/server.node.js");
    const Election = (await import("../../ui/src/scenes/art/Election")).default;
    const UnVote = (await import("../../ui/src/scenes/art/UnVote")).default;
    for (const mood of ["good", "bad", "neutral"] as const)
      for (const [name, Art] of [["Election", Election], ["UnVote", UnVote]] as const) {
        const svg = renderToStaticMarkup(createElement(Art as never, { a: "USA", b: "RUS", mood } as never));
        const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
        const at = `${name} ${mood}: ${texts.join(" | ")}`;
        expect(texts.filter((t) => /\d/.test(t)), at).toEqual([]);
        expect(texts.filter((t) => /MAJORITY|YES|NO\b|WON|LOST/.test(t)), at).toEqual([]);
      }
  });
  it("F-04-8: the parliament division and the markets screen state no count or figure of their own", async () => {
    const { createElement } = await import("../../ui/node_modules/react/index.js");
    const { renderToStaticMarkup } = await import("../../ui/node_modules/react-dom/server.node.js");
    const Parliament = (await import("../../ui/src/scenes/art/Parliament")).default;
    const EconTv = (await import("../../ui/src/scenes/art/EconTv")).default;
    const texts = (el: unknown) => [...renderToStaticMarkup(el as never).matchAll(/<text[^>]*>([^<]*)</g)].map((m) => m[1]);
    for (const mood of ["good", "bad", "neutral"] as const) {
      const parl = texts(createElement(Parliament as never, { a: ["#fff", "#00f", "#f00"], b: ["#fff", "#00f", "#f00"], mood } as never));
      expect(parl.filter((t) => /\d/.test(t)), `Parliament ${mood}`).toEqual([]);
      const econ = texts(createElement(EconTv as never, { a: ["#fff", "#00f", "#f00"], b: ["#fff", "#00f", "#f00"], mood } as never));
      for (const fake of ["-2.4%", "+1.8%", "+0.3%"]) expect(econ, `EconTv ${mood}`).not.toContain(fake);
    }
    const real = texts(createElement(EconTv as never, { a: ["#fff", "#00f", "#f00"], b: ["#fff", "#00f", "#f00"], mood: "bad", figure: "-1.2%" } as never));
    expect(real).toContain("-1.2%");
  });
});

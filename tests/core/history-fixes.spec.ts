import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { CRISIS_TEMPLATE_IDS } from "../../src/core/crises.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { type DecisionChoice, TurnEngine } from "../../src/core/turn.js";

const loader = createDataLoader();
const scenarioDir = join(process.cwd(), "data", "scenarios");

describe("B-19: scenario briefings match the opening date", () => {
  it("no scenario says 'This week' (the opening day is not fixed) or schedules past events ahead", () => {
    for (const f of readdirSync(scenarioDir).filter((x) => x.endsWith(".json"))) {
      const s = JSON.parse(readFileSync(join(scenarioDir, f), "utf-8"));
      const text = [s.description ?? "", ...(s.briefing ?? [])].join(" ");
      expect(text, f).not.toMatch(/\bthis week\b/i);
    }
  });

  it("2026 opens after the 3 November midterms and tells them as done", () => {
    const s = loader.loadScenario("2026");
    const text = [s.description, ...s.briefing].join(" ");
    expect(text).not.toMatch(/midterms[^.]*land in your first month/i);
    expect(text).toMatch(/3 November midterms gave Democrats/);
  });
});

describe("B-18: the 1990 Soviet review", () => {
  it("judges Gorbachev on holding the Union together (score par 90), other reviews keep 100", () => {
    const ussr = loader.newGame({ scenarioId: "1990", playerCountryId: "RUS", seed: 1, mode: "TERM" });
    expect(ussr.objective?.title).toBe("Hold the Union together");
    const par = ussr.objective?.primary.find((c) => c.kind === "SCORE_PAR");
    expect(par?.min).toBe(90);
    expect(par?.label).toBe("Score of 90+ at the review");
    const china = loader.newGame({ scenarioId: "1990", playerCountryId: "CHN", seed: 1, mode: "TERM" });
    expect(china.objective?.primary.find((c) => c.kind === "SCORE_PAR")?.min).toBe(100);
  });
});

describe("Ceasefire or Collapse: the real talks in the middle months", () => {
  const fp = loader.loadAvailableFlashpoints().find((f) => f.id === "ceasefire-or-collapse");
  const NEW = {
    UKR: ["ua_article5_like", "ua_donbas_for_nato", "ua_znpp"],
    USA: ["us_article5_like", "us_europe_seat"],
  };

  it("adds the guarantee, territory, plant and Europe crises with valid options and follow-ups", () => {
    expect(fp).toBeDefined();
    for (const [side, ids] of Object.entries(NEW)) {
      const list = fp?.scripted[side] ?? [];
      // The originals are kept
      expect(list.length).toBe(5 + ids.length);
      for (const id of ids) {
        const c = list.find((x) => x.templateId === id);
        expect(c, id).toBeDefined();
        if (!c) continue;
        expect(c.turn).toBeGreaterThan(2);
        expect(c.turn).toBeLessThan(10);
        expect(c.requiresWar).toEqual(["RUS", "UKR"]);
        const options = c.decision.options.map((o) => o.id);
        expect(options).toHaveLength(3);
        expect(options).toContain(c.decision.defaultOptionId);
        for (const o of c.decision.options)
          if (o.followUp) expect(CRISIS_TEMPLATE_IDS, id).toContain(o.followUp.templateId);
      }
    }
    expect(fp?.sources.some((s) => s.includes("kushner-says-russia-ok"))).toBe(true);
  });

  it("delivers them in play, and exploring the Donetsk trade schedules the Rada's revenge", () => {
    let w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "UKR",
      seed: 3,
      flashpointId: "ceasefire-or-collapse",
    });
    const engine = new TurnEngine();
    const seen = new Set<string>();
    let scheduledOuster = false;
    let warEndedAt: number | null = null;
    for (let i = 0; i < 11 && !w.gameOver; i++) {
      const choices: DecisionChoice[] = w.pendingDecisions.map((d) => ({
        decisionId: d.id,
        optionId:
          d.templateId === "ua_donbas_for_nato" ? "explore" : (d.defaultOptionId ?? d.options[0].id),
      }));
      for (const d of w.pendingDecisions) seen.add(d.templateId);
      w = engine.executeTurn(w, [], generateDeterministicIntents(w), choices).newState;
      if (w.director.scheduled.some((s) => s.templateId === "ouster_vote")) scheduledOuster = true;
      for (const d of w.pendingDecisions) seen.add(d.templateId);
      const atWar = w.wars.some((x) => x.attackerId === "RUS" && x.defenderId === "UKR");
      if (!atWar && warEndedAt === null) warEndedAt = w.turn;
    }
    // Each talks crisis lands while the war is on; requiresWar skips it after a ceasefire
    for (const c of fp?.scripted.UKR ?? []) {
      if (!NEW.UKR.includes(c.templateId)) continue;
      if (warEndedAt === null || c.turn < warEndedAt) expect(seen, c.templateId).toContain(c.templateId);
      else expect(seen, c.templateId).not.toContain(c.templateId);
    }
    expect(seen).toContain("ua_article5_like");
    expect(seen).toContain("ua_donbas_for_nato");
    expect(scheduledOuster).toBe(true);
  }, 30_000);
});

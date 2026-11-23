import { describe, expect, it } from "vitest";
import {
  CRISIS_TEMPLATE_IDS,
  flashpointTheatre,
  OFF_THEATRE_MAX,
  raiseCrisis,
} from "../../src/core/crises.js";
import { anachronismsIn } from "../../src/core/era.js";
import { buildReveal } from "../../src/core/reveal.js";
import { SeededRandom } from "../../src/core/seed.js";
import {
  CONTROL_SEEDS,
  type ControlGame,
  FLASHPOINT_CONTROL,
  newControlWorld,
  playControl,
} from "../fixtures/control.js";

/**
 * F-01-7 class (D-76): crises must fit the seat, the flashpoint and the era. QA3R-3e: Russia was
 * offered the Gaza reconstruction conference, and a Scarborough game got Afghan refugees, an Iran
 * sanctions vote and Gaza. QA3R-3a: 1990 got "a novel respiratory virus" and a global vaccine effort.
 */

/** Raised by what other countries do (a pact offer, meddling), not the director's world pick. */
const REACTIVE = /^(pact_offer|foreign_interference|coup_plot|streets_boiling|election_campaign|shock_)/;

const offered =(g: ControlGame) =>
  g.months.flatMap((m) =>
    m.after.pendingDecisions.map((d) => ({ month: m.after.turn, d, world: m.after })),
  );

describe("world crises fit the seat and the flashpoint (QA3R-3e)", () => {
  it("Russia is never offered the Gaza reconstruction conference (control seeds and policies)", () => {
    for (const policy of ["staff", "picks", "none"] as const)
      for (const code of CONTROL_SEEDS.filter((c) => c.includes("-RUS-"))) {
        const ids = offered(playControl(code, policy, 24)).map((x) => x.d.templateId);
        expect(ids, `${code} ${policy}`).not.toContain("gaza_reconstruction");
      }
  });

  it(`a flashpoint gets at most ${OFF_THEATRE_MAX} off-theatre world crisis in 12 months`, () => {
    for (const policy of ["staff", "staffswitch", "picks"] as const)
      for (const code of FLASHPOINT_CONTROL) {
        const g = playControl(code, policy);
        const off = g.months.flatMap((m) => {
          const cast = flashpointTheatre(m.before);
          return m.after.pendingDecisions
            .filter((d) => d.turn === m.before.turn)
            .filter((d) => {
              const other = d.affectedCountries.find((id) => id !== m.before.playerCountryId);
              return !!other && !cast.has(other);
            })
            .filter((d) => !m.before.director.scheduled.some((s) => s.templateId === d.templateId))
            .filter((d) => !REACTIVE.test(d.templateId))
            .map((d) => `m${m.before.turn + 1} ${d.templateId}: ${d.title}`);
        });
        expect(off.length, `${code} ${policy}: ${off.join("; ")}`).toBeLessThanOrEqual(
          OFF_THEATRE_MAX,
        );
      }
  });
});

describe("crises fit the era on the 1990 control seed (QA3R-3a)", () => {
  it("every crisis template raised in 1960 and 1990 has no anachronism (shocks included)", () => {
    for (const code of ["T1990-USA-MARC1"]) {
      for (const scenario of ["1960", "1990"]) {
        const leaks: string[] = [];
        for (const id of CRISIS_TEMPLATE_IDS) {
          const w = structuredClone(newControlWorld(code));
          if (scenario === "1960") w.date = "1960-06";
          const year = Number(w.date.slice(0, 4));
          const e = raiseCrisis(w, id, new SeededRandom(3));
          const d = e?.decision;
          if (!e) continue;
          const texts = [
            e.title,
            e.description,
            d?.title ?? "",
            d?.situation ?? "",
            ...(d?.options ?? []).flatMap((o) => [o.label, o.description]),
          ];
          for (const t of texts) for (const a of anachronismsIn(t, year)) leaks.push(`${id} ${a}: ${t}`);
        }
        // Shocks bypass the weights (other templates are kept out of an era by their weight)
        expect(leaks.filter((l) => l.startsWith("shock_")), scenario).toEqual([]);
      }
    }
  });

  it("T1990-USA-MARC1, 24 months: no anachronism in any crisis, option or reveal text", () => {
    for (const policy of ["staff", "picks"] as const) {
      const g = playControl("T1990-USA-MARC1", policy, 24);
      const year = Number(g.months[0].before.date.slice(0, 4));
      const leaks: string[] = [];
      for (const { month, d } of offered(g)) {
        const texts = [
          d.title,
          d.situation,
          ...d.options.flatMap((o) => [o.label, o.description]),
        ];
        for (const t of texts)
          for (const a of anachronismsIn(t ?? "", year)) leaks.push(`m${month} ${a}: ${t}`);
      }
      for (const m of g.months)
        for (const e of m.after.turnReport?.decisions ?? [])
          for (const t of [e.title, e.choice, e.headline ?? ""])
            for (const a of anachronismsIn(t, year)) leaks.push(`report ${a}: ${t}`);
      if (g.final.gameOver) {
        const r = JSON.stringify(buildReveal(g.final));
        for (const a of anachronismsIn(r, year)) leaks.push(`reveal ${a}`);
      }
      expect(leaks, policy).toEqual([]);
    }
  });
});

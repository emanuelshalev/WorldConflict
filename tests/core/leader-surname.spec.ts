import { describe, expect, it } from "vitest";
import { outcomeHeadline } from "../../src/core/reactions.js";

/** QA4-S3-12 (iter-04 qa-verify): "General Secretary Un agrees to keep talking" (Kim Jong Un). */
describe("QA4-S3-12: a leader is named by the family name", () => {
  const line = (name: string, title: string) =>
    outcomeHeadline("CALL", "neutral", { them: { name: "X", leader: { name, title } }, player: { leader: { name: "Donald Trump" } }, title: "t", choice: "c" } as never, 1);
  it("family name first for Korean and Chinese leaders, last for the others", () => {
    expect(line("Kim Jong Un", "General Secretary")).toMatch(/^General Secretary Kim /);
    expect(line("Xi Jinping", "General Secretary")).toMatch(/^General Secretary Xi /);
    expect(line("Lai Ching-te", "President")).toMatch(/^President Lai /);
    expect(line("Emmanuel Macron", "President")).toMatch(/^President Macron /);
    expect(line("Martin Luther King Jr.", "Reverend")).toMatch(/^Reverend King /);
  });
});

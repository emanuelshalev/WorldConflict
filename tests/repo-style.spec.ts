import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Built from its code point so this file never contains the character itself
const EM_DASH = String.fromCharCode(0x2014);

// House style: no em dashes anywhere in the repository (docs, site, game text, code).
describe("Repository style", () => {
  it("contains no em dash characters", () => {
    const files = execSync("git ls-files -z", { encoding: "utf8" })
      .split("\0")
      .filter((f) => f && !/\.(png|jpe?g|webp|gif|mp4|webm|ico|woff2?|db|lock)$/i.test(f));
    const offenders = files.filter((f) => {
      try {
        return readFileSync(f, "utf8").includes(EM_DASH);
      } catch {
        return false;
      }
    });
    expect(offenders).toEqual([]);
  });
});

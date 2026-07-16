import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const repoRoot = join(import.meta.dir, "..", "..");

describe("volunteer QA onboarding docs (#226)", () => {
  test("campus_qa.yml template includes required reporter fields", () => {
    const template = readFileSync(
      join(repoRoot, ".github/ISSUE_TEMPLATE/campus_qa.yml"),
      "utf8",
    );

    for (const field of [
      "device",
      "url",
      "steps",
      "expected",
      "actual",
      "screenshots",
    ]) {
      expect(template).toContain(`id: ${field}`);
    }
    expect(template).toContain("labels:");
    expect(template).toContain("- qa");
  });

  test("CONTRIBUTING.md documents campus QA screenshot capture", () => {
    const contributing = readFileSync(
      join(repoRoot, "CONTRIBUTING.md"),
      "utf8",
    );

    expect(contributing).toContain("campus_qa.yml");
    expect(contributing).toContain("### Screenshots");
    expect(contributing).toMatch(/Android|iPhone/i);
    expect(contributing).toMatch(/Attach|drag/i);
  });
});

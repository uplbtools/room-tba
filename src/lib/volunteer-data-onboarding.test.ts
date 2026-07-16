import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const repoRoot = join(import.meta.dir, "..", "..");

const PIN_AUDIT_CSV_HEADERS = [
  "building_name",
  "pin_status",
  "app_lat",
  "app_lon",
  "verified_lat",
  "verified_lon",
  "verified_how",
  "notes",
];

describe("volunteer DATA onboarding (#228)", () => {
  test("pin_audit_batch.yml template includes required reporter fields", () => {
    const template = readFileSync(
      join(repoRoot, ".github/ISSUE_TEMPLATE/pin_audit_batch.yml"),
      "utf8",
    );

    for (const field of [
      "batch_name",
      "rows_completed",
      "spreadsheet_link",
      "summary",
      "verified",
    ]) {
      expect(template).toContain(`id: ${field}`);
    }
    expect(template).toContain("labels:");
    expect(template).toContain("- data");
    expect(template).toContain("building-pin-audit-template.csv");
  });

  test("building-pin-audit-template.csv has expected columns and examples", () => {
    const csv = readFileSync(
      join(repoRoot, "data/building-pin-audit-template.csv"),
      "utf8",
    );
    const [headerLine, ...rows] = csv.trimEnd().split("\n");
    const headers = headerLine.split(",");

    expect(headers).toEqual(PIN_AUDIT_CSV_HEADERS);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(csv).toContain("AMPED Building");
    expect(csv).toMatch(/pin_status.*ok\|wrong/i);
  });

  test("CONTRIBUTING.md documents batch pin audit spreadsheet workflow", () => {
    const contributing = readFileSync(
      join(repoRoot, "CONTRIBUTING.md"),
      "utf8",
    );

    expect(contributing).toContain("pin_audit_batch.yml");
    expect(contributing).toContain("building-pin-audit-template.csv");
    expect(contributing).toMatch(/Google Sheets|Google Sheet/i);
    expect(contributing).toMatch(/Batch building pin audit/i);
  });
});

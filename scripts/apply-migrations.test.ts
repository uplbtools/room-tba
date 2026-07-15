import { describe, expect, it } from "bun:test";
import { listMigrationFiles } from "./apply-migrations";

describe("listMigrationFiles", () => {
  it("returns sorted sql files and skips the commented bootstrap dump", () => {
    const files = listMigrationFiles();
    expect(files.length).toBeGreaterThan(10);
    expect(files).not.toContain("0000_smooth_spitfire.sql");
    expect(files[0]).toMatch(/^0001_/);
    const sorted = [...files].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    expect(files).toEqual(sorted);
  });

  it("includes recent directory and transit migrations", () => {
    const files = listMigrationFiles();
    expect(files).toContain("0029_add_college_division_websites.sql");
    expect(files).toContain("0032_add_jeepney_transit.sql");
  });
});

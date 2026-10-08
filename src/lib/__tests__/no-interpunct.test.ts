import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// UI copy separates parts with commas, parentheses, "and" or a slash, never a
// middle dot. Scans every source file so a new one fails here first.
const SRC = join(import.meta.dir, "..", "..");
// Entities are split so this file does not match itself.
const INTERPUNCT = new RegExp(`\u00b7|&${"middot"};|&#${"183"};`);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(svelte|astro|ts|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("no interpuncts in src", () => {
  it("has no middle dot in any source file", () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      INTERPUNCT.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

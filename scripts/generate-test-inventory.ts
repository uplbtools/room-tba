#!/usr/bin/env bun
/**
 * Generate docs/test-inventory.md — running list of all automated tests.
 * Usage: bun run generate:test-inventory
 *        bun run check:test-inventory  (--check: fail if docs/test-inventory.md is stale)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  renderTestInventoryMarkdown,
  scanTestInventory,
} from "./lib/test-inventory.ts";

const ROOT = path.join(import.meta.dir, "..");
const OUT = path.join(ROOT, "docs/test-inventory.md");

/** Drop the volatile "Last generated" line so freshness ignores the date. */
function stripGeneratedLine(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !line.startsWith("**Last generated:**"))
    .join("\n");
}

async function main() {
  const check = process.argv.includes("--check");
  const inv = await scanTestInventory(ROOT);
  const rendered = renderTestInventoryMarkdown(inv);

  if (check) {
    const current = readFileSync(OUT, "utf8");
    if (stripGeneratedLine(current) !== stripGeneratedLine(rendered)) {
      console.error(
        `${OUT} is stale. Run \`bun run generate:test-inventory\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(`${OUT} is up to date (${inv.total} spec files)`);
    return;
  }

  writeFileSync(OUT, rendered);
  console.log(`Wrote ${OUT} (${inv.total} spec files)`);
}

main();

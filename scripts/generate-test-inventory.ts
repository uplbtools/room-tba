#!/usr/bin/env bun
/**
 * Generate docs/test-inventory.md — running list of all automated tests.
 * Usage: bun run generate:test-inventory
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  renderTestInventoryMarkdown,
  scanTestInventory,
} from "./lib/test-inventory.ts";

const ROOT = path.join(import.meta.dir, "..");
const OUT = path.join(ROOT, "docs/test-inventory.md");

async function main() {
  const inv = await scanTestInventory(ROOT);
  writeFileSync(OUT, renderTestInventoryMarkdown(inv));
  console.log(`Wrote ${OUT} (${inv.total} spec files)`);
}

main();

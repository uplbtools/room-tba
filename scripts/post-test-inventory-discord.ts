#!/usr/bin/env bun
/**
 * Regenerate test inventory and POST to uplbtools-discord-bot (#test-suite).
 * Usage: GATEWAY_URL=… SECRET=… bun run scripts/post-test-inventory-discord.ts
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
  const gatewayUrl = process.env.GATEWAY_URL?.trim();
  const secret = process.env.SECRET?.trim();
  if (!gatewayUrl || !secret) {
    throw new Error("GATEWAY_URL and SECRET are required");
  }

  const inv = await scanTestInventory(ROOT);
  const markdown = renderTestInventoryMarkdown(inv);
  writeFileSync(OUT, markdown);

  const repo = process.env.GITHUB_REPOSITORY ?? "uplbtools/room-tba";
  const branch = process.env.GITHUB_REF_NAME ?? "staging";
  const sha = process.env.GITHUB_SHA ?? "local";
  const commitUrl =
    process.env.GITHUB_SERVER_URL && sha !== "local"
      ? `${process.env.GITHUB_SERVER_URL}/${repo}/commit/${sha}`
      : `https://github.com/${repo}/commit/${sha}`;
  const docUrl = `https://github.com/${repo}/blob/${branch}/docs/test-inventory.md`;
  const workflowUrl = process.env.GITHUB_WORKFLOW_URL ?? null;
  const idempotencyKey =
    process.env.IDEMPOTENCY_KEY ??
    `test-inventory:${branch}:${sha.slice(0, 12)}`;

  const payload = {
    schemaVersion: 1 as const,
    type: "ci.test_inventory.updated" as const,
    source: "github" as const,
    occurredAt: new Date().toISOString(),
    idempotencyKey,
    payload: {
      repo,
      branch,
      commitSha: sha,
      commitUrl,
      docUrl,
      workflowUrl,
      generated: inv.generated,
      total: inv.total,
      unit: inv.unit.length,
      vitest: inv.store.length + inv.component.length,
      integration: inv.integration.length,
      e2eBlocking: inv.e2eBlocking.length,
      e2eAdvisory: inv.e2eAdvisory.length,
      e2eStaging: inv.e2eStaging.length,
      markdown,
    },
  };

  const res = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-notification-secret": secret,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord notify failed (${res.status}): ${text}`);
  }

  console.log(
    `Posted test inventory to Discord (${inv.total} specs, branch ${branch})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

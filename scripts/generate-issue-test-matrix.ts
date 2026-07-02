#!/usr/bin/env bun
/**
 * Generate docs/issue-test-matrix.md from GitHub issues export.
 * Usage: gh issue list --repo uplbtools/room-tba --state all --limit 500 --json number,title,labels,state,body > /tmp/all-issues.json
 *        bun run scripts/generate-issue-test-matrix.ts /tmp/all-issues.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Issue = {
  number: number;
  title: string;
  state: string;
  body: string;
  labels: { name: string }[];
};

type TestTier =
  | "none"
  | "verify-existing"
  | "unit"
  | "integration"
  | "component"
  | "e2e-blocking"
  | "e2e-advisory"
  | "staging-smoke"
  | "manual-only";

type Row = {
  number: number;
  title: string;
  state: string;
  labels: string[];
  tiers: TestTier[];
  spec: string;
  notes: string;
};

const HUMAN_COORDINATION =
  /partnership|MOU|volunteer onboarding|stakeholder review|human coordination/i;
const NO_AUTO =
  /prettier|eslint|biome|semantic-release|dependabot|changelog only|documentation only|README only/i;
const RELEASED = /released/i;

function labelNames(issue: Issue): string[] {
  return issue.labels.map((l) => l.name);
}

function hasLabel(labels: string[], ...names: string[]): boolean {
  return names.some((n) => labels.includes(n));
}

function inferTiers(issue: Issue): {
  tiers: TestTier[];
  spec: string;
  notes: string;
} {
  const labels = labelNames(issue);
  const text = `${issue.title}\n${issue.body ?? ""}`.toLowerCase();
  const tiers = new Set<TestTier>();
  let spec = "";
  let notes = "";

  if (hasLabel(labels, "parent issue")) {
    return {
      tiers: ["none"],
      spec: "Roll up from linked sub-issues",
      notes: "Epic — add tests on child PRs, not the parent",
    };
  }

  if (HUMAN_COORDINATION.test(text)) {
    return {
      tiers: ["manual-only"],
      spec: "Human coordination checklist",
      notes: "Do not auto-close with code",
    };
  }

  if (
    NO_AUTO.test(text) &&
    !/api|auth|route|map|panel|editor/i.test(issue.title)
  ) {
    return {
      tiers: ["none"],
      spec: "CI/tooling change only",
      notes: "Verify existing workflow scripts",
    };
  }

  if (hasLabel(labels, "released") && issue.state === "CLOSED") {
    tiers.add("verify-existing");
    notes = "Shipped — confirm regression exists in pyramid; add if gap found";
  }

  if (hasLabel(labels, "qa")) {
    tiers.add("e2e-blocking");
    spec = spec || "Playwright repro of reporter steps + no pageerror";
  }

  if (hasLabel(labels, "data")) {
    tiers.add("unit");
    tiers.add("integration");
    spec =
      spec || "Fixture/import unit test; optional staging data-fidelity smoke";
    notes = notes || "No live AMIS fetch in CI";
  }

  if (hasLabel(labels, "bug")) {
    tiers.add("unit");
    tiers.add("e2e-blocking");
    spec = spec || "Regression: unit for pure logic; E2E for UI repro";
  }

  if (
    /security|rate.?limit|pagination|auth|turnstile|captcha|csrf|upload/i.test(
      text,
    )
  ) {
    tiers.add("unit");
    tiers.add("integration");
    spec = spec || "HTTP integration + unit for guards/helpers";
  }

  if (
    /api\/|patch |409|conflict|optimistic|merge |proposal|admin\//i.test(text)
  ) {
    tiers.add("integration");
    spec = spec || "integration/services or integration/http";
  }

  if (/amis|import.*class|schedule import|term_id|1252|1253/i.test(text)) {
    tiers.add("unit");
    spec = spec || "Fixture JSON unit tests in src/lib/amis or schedule-import";
    notes = notes
      ? `${notes}; AMIS --fetch manual only`
      : "AMIS --fetch manual only";
  }

  if (/a11y|accessibility|axe|contrast|screen reader/i.test(text)) {
    tiers.add("e2e-advisory");
    spec = spec || "e2e/advisory/a11y.spec.ts target surface";
  }

  if (/seo|og:|canonical|sitemap|meta/i.test(text)) {
    tiers.add("e2e-blocking");
    spec = spec || "e2e/browse/entity-seo.spec.ts pattern";
  }

  if (/offline|pwa|service worker|pglite|sync/i.test(text)) {
    tiers.add("unit");
    tiers.add("e2e-advisory");
    spec = spec || "sync-keys/store unit; advisory offline-boot";
  }

  if (
    /map|side panel|side-panel|drawer|chrome|flyout|320|768|mobile|search|browse chip/i.test(
      text,
    )
  ) {
    tiers.add("component");
    tiers.add("e2e-blocking");
    spec = spec || "Vitest layout @320px + Playwright browse/admin spec";
  }

  if (
    /editor|pin drag|undo|redo|map edit|contributor|3d room|building 3d/i.test(
      text,
    )
  ) {
    tiers.add("e2e-blocking");
    tiers.add("integration");
    spec = spec || "e2e/admin/* + integration 409/version";
  }

  if (/jeepney|transit|terrain|map tools/i.test(text)) {
    tiers.add("e2e-blocking");
    tiers.add("e2e-advisory");
    spec = spec || "e2e/browse/map-tools + advisory transit";
  }

  if (
    /design improvement|whimsical|visual polish|animation feel|subjective/i.test(
      text,
    )
  ) {
    tiers.add("e2e-advisory");
    tiers.add("manual-only");
    spec = spec || "Layout overflow/component width; human visual sign-off";
  }

  if (/performance|slow|latency|bundle|cache/i.test(text)) {
    tiers.add("e2e-advisory");
    tiers.add("manual-only");
    spec = spec || "check:bundle advisory; manual timing on staging";
  }

  if (hasLabel(labels, "enhancement") && tiers.size === 0) {
    tiers.add("unit");
    tiers.add("e2e-blocking");
    spec = "Default: unit for new lib logic; E2E for user-visible AC";
  }

  if (tiers.size === 0) {
    tiers.add("e2e-blocking");
    spec = "Default: at least one automated test for acceptance criteria";
  }

  if (issue.state === "CLOSED" && !hasLabel(labels, "released")) {
    notes = notes
      ? `${notes}; closed — audit only`
      : "Closed — audit coverage before new work";
  }

  return {
    tiers: [...tiers],
    spec: spec || "See issue AC",
    notes,
  };
}

function tierSort(a: TestTier, b: TestTier): number {
  const order: TestTier[] = [
    "verify-existing",
    "unit",
    "integration",
    "component",
    "e2e-blocking",
    "e2e-advisory",
    "staging-smoke",
    "manual-only",
    "none",
  ];
  return order.indexOf(a) - order.indexOf(b);
}

function main() {
  const input = process.argv[2] ?? "/tmp/all-issues.json";
  const issues = JSON.parse(readFileSync(input, "utf8")) as Issue[];
  const rows: Row[] = issues.map((issue) => {
    const labels = labelNames(issue);
    const { tiers, spec, notes } = inferTiers(issue);
    tiers.sort(tierSort);
    return {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels,
      tiers,
      spec,
      notes,
    };
  });

  const open = rows.filter((r) => r.state === "OPEN");
  const needsWork = open.filter(
    (r) => !r.tiers.includes("none") && !r.tiers.includes("verify-existing"),
  );
  const verifyOnly = open.filter((r) => r.tiers.includes("verify-existing"));
  const noTest = open.filter(
    (r) => r.tiers.includes("none") || r.tiers.includes("manual-only"),
  );

  const byTier = (tier: TestTier) =>
    open
      .filter((r) => r.tiers.includes(tier))
      .sort((a, b) => a.number - b.number);

  const lines: string[] = [
    "# Issue → test matrix",
    "",
    "Generated audit of GitHub issues vs the [testing pyramid](testing.md).",
    "Regenerate:",
    "",
    "```sh",
    "gh issue list --repo uplbtools/room-tba --state all --limit 500 \\",
    "  --json number,title,labels,state,body > /tmp/all-issues.json",
    "bun run scripts/generate-issue-test-matrix.ts /tmp/all-issues.json",
    "```",
    "",
    "**Agent rule:** when implementing an issue, add or extend tests in the **same PR** per the tiers column. See [AGENTS.md § Tests with issues](../AGENTS.md#tests-with-github-issues).",
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| ------ | ----- |`,
    `| Total issues | ${rows.length} |`,
    `| Open | ${open.length} |`,
    `| Open — add/extend tests on implement | ${needsWork.length} |`,
    `| Open — verify existing coverage only | ${verifyOnly.length} |`,
    `| Open — manual / no automation | ${noTest.length} |`,
    "",
    "## Priority open issues (automation required)",
    "",
    "| Issue | Tiers | Test spec |",
    "| ----- | ----- | --------- |",
  ];

  for (const r of needsWork
    .filter((r) =>
      r.labels.some((l) => l.startsWith("priority/high") || l === "bug"),
    )
    .sort((a, b) => a.number - b.number)) {
    lines.push(
      `| [#${r.number}](https://github.com/uplbtools/room-tba/issues/${r.number}) | ${r.tiers.join(", ")} | ${r.spec} |`,
    );
  }

  lines.push(
    "",
    "## Open bugs (regression tests mandatory)",
    "",
    "| Issue | Tiers | Test spec |",
    "| ----- | ----- | --------- |",
  );
  for (const r of open
    .filter((r) => r.labels.includes("bug"))
    .sort((a, b) => a.number - b.number)) {
    lines.push(
      `| [#${r.number}](https://github.com/uplbtools/room-tba/issues/${r.number}) | ${r.tiers.join(", ")} | ${r.spec} |`,
    );
  }

  for (const [heading, tier] of [
    ["E2E blocking backlog", "e2e-blocking"],
    ["Integration backlog", "integration"],
    ["Unit backlog", "unit"],
    ["Component backlog", "component"],
    ["Advisory backlog", "e2e-advisory"],
  ] as const) {
    lines.push(
      "",
      `## ${heading}`,
      "",
      "| Issue | State | Tiers | Test spec | Notes |",
      "| ----- | ----- | ----- | --------- | ----- |",
    );
    for (const r of byTier(tier)) {
      lines.push(
        `| [#${r.number}](https://github.com/uplbtools/room-tba/issues/${r.number}) ${r.title.slice(0, 60)} | ${r.state} | ${r.tiers.join(", ")} | ${r.spec} | ${r.notes} |`,
      );
    }
  }

  lines.push(
    "",
    "## Full open issue index",
    "",
    "| Issue | Labels | Tiers | Test spec |",
    "| ----- | ------ | ----- | --------- |",
  );
  for (const r of open.sort((a, b) => a.number - b.number)) {
    const lbl = r.labels.slice(0, 4).join(", ") || "—";
    lines.push(
      `| [#${r.number}](https://github.com/uplbtools/room-tba/issues/${r.number}) | ${lbl} | ${r.tiers.join(", ")} | ${r.spec} |`,
    );
  }

  lines.push(
    "",
    "## Closed issues (coverage audit)",
    "",
    "| Issue | Tiers | Notes |",
    "| ----- | ----- | ----- |",
  );
  for (const r of rows
    .filter((r) => r.state === "CLOSED")
    .sort((a, b) => b.number - a.number)
    .slice(0, 80)) {
    lines.push(
      `| [#${r.number}](https://github.com/uplbtools/room-tba/issues/${r.number}) | ${r.tiers.join(", ")} | ${r.notes || r.spec} |`,
    );
  }
  lines.push(
    "",
    "_Showing 80 most recent closed; regenerate for full list._",
    "",
  );

  const out = path.join(import.meta.dir, "..", "docs", "issue-test-matrix.md");
  writeFileSync(out, lines.join("\n"));
  console.log(`Wrote ${out} (${rows.length} issues)`);
}

main();

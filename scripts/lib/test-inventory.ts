import path from "node:path";
import { Glob } from "bun";

const IGNORE_DIRS = new Set([
  "node_modules",
  "playwright-report",
  "test-results",
  "dist",
  ".git",
]);

export type TestInventory = {
  generated: string;
  total: number;
  unit: string[];
  store: string[];
  component: string[];
  integration: string[];
  e2eBlocking: string[];
  e2eAdvisory: string[];
  e2eStaging: string[];
};

export async function scanTestInventory(root: string): Promise<TestInventory> {
  const glob = new Glob("**/*.{test,spec}.ts");
  const allTests: string[] = [];
  for await (const file of glob.scan({ cwd: root, onlyFiles: true })) {
    const normalized = file.split(path.sep).join("/");
    if (normalized.split("/").some((part) => IGNORE_DIRS.has(part))) continue;
    allTests.push(normalized);
  }
  allTests.sort();

  const store = allTests.filter((f) => f.endsWith(".store.test.ts"));
  const component = allTests.filter((f) => f.endsWith(".component.test.ts"));
  const unit = allTests.filter(
    (f) =>
      f.startsWith("src/") &&
      f.endsWith(".test.ts") &&
      !f.endsWith(".store.test.ts") &&
      !f.endsWith(".component.test.ts"),
  );
  const integration = allTests.filter((f) => f.startsWith("integration/"));
  const e2eAdvisory = allTests.filter((f) => f.startsWith("e2e/advisory/"));
  const e2eStaging = allTests.filter((f) => f.startsWith("e2e/staging/"));
  const e2eBlocking = allTests.filter(
    (f) =>
      f.startsWith("e2e/") &&
      !f.startsWith("e2e/advisory/") &&
      !f.startsWith("e2e/staging/"),
  );

  return {
    generated: new Date().toISOString().slice(0, 10),
    total: allTests.length,
    unit,
    store,
    component,
    integration,
    e2eBlocking,
    e2eAdvisory,
    e2eStaging,
  };
}

function mdList(files: string[]): string {
  if (files.length === 0) return "_None_\n";
  return files.map((f) => `- \`${f}\``).join("\n") + "\n";
}

function mdTable(rows: [string, string, number | string][]): string {
  const lines = [
    "| Command | Config / runner | Files |",
    "| ------- | ---------------- | ----- |",
    ...rows.map(([cmd, runner, n]) => `| \`${cmd}\` | ${runner} | ${n} |`),
  ];
  return lines.join("\n") + "\n";
}

export function renderTestInventoryMarkdown(inv: TestInventory): string {
  return `# Test inventory

Running list of **automated** tests in this repo. Regenerate after adding or moving specs:

\`\`\`sh
bun run generate:test-inventory
\`\`\`

**Last generated:** ${inv.generated}  
**Total spec files:** ${inv.total}

See [testing.md](testing.md) for commands, CI gates, and databases. Issue-linked expectations: [issue-test-matrix.md](issue-test-matrix.md).

## Summary by tier

${mdTable([
  ["bun test src", "Bun — unit (`src/lib`, `src/constants`)", inv.unit.length],
  [
    "bun run test:components",
    "Vitest — stores + Svelte @320px",
    inv.store.length + inv.component.length,
  ],
  [
    "bun run test:integration",
    "Bun — HTTP + services (E2E DB)",
    inv.integration.length,
  ],
  [
    "bun run e2e",
    "Playwright blocking — local preview",
    inv.e2eBlocking.length,
  ],
  [
    "bun run e2e:advisory",
    "Playwright advisory — non-blocking CI",
    inv.e2eAdvisory.length,
  ],
  [
    "bun run e2e:staging",
    "Playwright — live staging URL",
    inv.e2eStaging.length,
  ],
  [
    "bun run check:migrations",
    "Schema table guard (not a spec file)",
    "1 script",
  ],
])}

## CI mapping

| Workflow | What runs |
| -------- | --------- |
| [ci.yml](../.github/workflows/ci.yml) | \`bun test src\`, \`test:components\`, lint, prod build |
| [ci.yml](../.github/workflows/ci.yml) migrations job | \`check:migrations\` on E2E DB |
| [e2e.yml](../.github/workflows/e2e.yml) | reset DB → build:e2e → integration → Playwright blocking |
| [e2e-advisory.yml](../.github/workflows/e2e-advisory.yml) | Playwright advisory |
| [e2e-staging.yml](../.github/workflows/e2e-staging.yml) | Same blocking stack on \`staging\` branch + nightly |
| [staging-smoke.yml](../.github/workflows/staging-smoke.yml) | Read-only staging Playwright (subset) |
| [bundle-advisory.yml](../.github/workflows/bundle-advisory.yml) | JS bundle budget |
| [discord-test-inventory.yml](../.github/workflows/discord-test-inventory.yml) | Refresh #test-suite on Discord |

Playwright **blocking** uses [playwright.config.ts](../playwright.config.ts) (\`testDir: e2e\`, ignores \`advisory/\` + \`staging/\`). Projects: **desktop-chrome**, **mobile-chrome** (skips \`@desktop-only\`).

## Unit tests (Bun) — ${inv.unit.length} files

\`bun test src/lib src/constants\` (excludes \`*.store.test.ts\`).

${mdList(inv.unit)}

## Store tests (Vitest) — ${inv.store.length} files

Included in \`bun run test:components\`.

${mdList(inv.store)}

## Component tests (Vitest) — ${inv.component.length} files

Layout guards at 320px / 768px where noted. Included in \`bun run test:components\`.

${mdList(inv.component)}

## Integration tests — ${inv.integration.length} files

\`bun run test:integration\` (E2E Supabase; HTTP suites need preview — use \`test:integration:live\`).

${mdList(inv.integration)}

## E2E blocking (Playwright) — ${inv.e2eBlocking.length} files

\`bun run e2e\` — smoke, browse, admin.

### Smoke (${inv.e2eBlocking.filter((f) => f.includes("/smoke/")).length})

${mdList(inv.e2eBlocking.filter((f) => f.includes("/smoke/")))}

### Browse (${inv.e2eBlocking.filter((f) => f.includes("/browse/")).length})

${mdList(inv.e2eBlocking.filter((f) => f.includes("/browse/")))}

### Admin / editor (${inv.e2eBlocking.filter((f) => f.includes("/admin/")).length})

${mdList(inv.e2eBlocking.filter((f) => f.includes("/admin/")))}

## E2E advisory (Playwright) — ${inv.e2eAdvisory.length} files

\`bun run e2e:advisory\` — a11y, offline, touch, cross-browser, etc.

${mdList(inv.e2eAdvisory)}

## E2E staging (Playwright) — ${inv.e2eStaging.length} files

\`bun run e2e:staging\` — read-only against \`staging.room-tba.uplbtools.me\`.

${mdList(inv.e2eStaging)}

## Other checks

| Script | Purpose |
| ------ | ------- |
| \`bun run check:migrations\` | Required Postgres tables exist |
| \`bun run check:readme\` | README onboarding facts |
| \`bun run check:pwa-legal\` | PWA legal routes |
| \`bun run check:bundle\` | Client JS budget (advisory CI) |

## Manual only (not in this list)

Subjective UX, AMIS live \`--fetch\`, prod data spot-checks — [testing.md § Manual only](testing.md#manual-only).
`;
}

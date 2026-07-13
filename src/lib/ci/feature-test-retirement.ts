export type ChangedFile = {
  status: string;
  path: string;
};

const TEST_FILE = /(?:\.test|\.spec)\.ts$/;

function isFeatureEntrypoint(path: string): boolean {
  return path.startsWith("src/pages/") && !path.endsWith(".d.ts");
}

/**
 * A deleted page is a feature retirement. Its automated coverage must be
 * removed or repurposed in the same change, and the public inventory must
 * follow suit.
 */
export function featureTestRetirementFailures(
  changedFiles: ChangedFile[],
): string[] {
  const retiredPages = changedFiles
    .filter((file) => file.status === "D" && isFeatureEntrypoint(file.path))
    .map((file) => file.path);

  if (retiredPages.length === 0) return [];

  const testChanged = changedFiles.some((file) => TEST_FILE.test(file.path));
  const inventoryChanged = changedFiles.some(
    (file) => file.path === "docs/test-inventory.md",
  );
  const failures: string[] = [];

  if (!testChanged) {
    failures.push(
      `Retired page coverage was not updated: ${retiredPages.join(", ")}. Remove or repurpose its automated test in the same PR.`,
    );
  }
  if (!inventoryChanged) {
    failures.push(
      "Retired page coverage changed without regenerating docs/test-inventory.md (run bun run generate:test-inventory).",
    );
  }
  return failures;
}

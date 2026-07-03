import { describe, expect, test } from "bun:test";
import {
  type TestInventory,
  testInventoryDiscordTiers,
} from "./test-inventory.ts";

function sampleInventory(
  overrides: Partial<TestInventory> = {},
): TestInventory {
  return {
    generated: "2026-07-03",
    total: 6,
    unit: ["src/lib/foo.test.ts"],
    store: ["src/lib/bar.store.test.ts"],
    component: ["src/test/layout.component.test.ts"],
    integration: ["integration/http/public.integration.test.ts"],
    e2eBlocking: [
      "e2e/smoke/boot.spec.ts",
      "e2e/browse/search-flow.spec.ts",
      "e2e/admin/auth.spec.ts",
      "e2e/helpers/db.ts",
    ],
    e2eAdvisory: ["e2e/advisory/a11y.spec.ts"],
    e2eStaging: ["e2e/staging/live-boot.spec.ts"],
    ...overrides,
  };
}

describe("testInventoryDiscordTiers", () => {
  test("splits blocking E2E by smoke, browse, and admin folders", () => {
    const tiers = testInventoryDiscordTiers(sampleInventory());

    expect(tiers.unit).toEqual(["src/lib/foo.test.ts"]);
    expect(tiers.store).toEqual(["src/lib/bar.store.test.ts"]);
    expect(tiers.component).toEqual(["src/test/layout.component.test.ts"]);
    expect(tiers.integration).toEqual([
      "integration/http/public.integration.test.ts",
    ]);
    expect(tiers.e2eBlockingSmoke).toEqual(["e2e/smoke/boot.spec.ts"]);
    expect(tiers.e2eBlockingBrowse).toEqual(["e2e/browse/search-flow.spec.ts"]);
    expect(tiers.e2eBlockingAdmin).toEqual([
      "e2e/admin/auth.spec.ts",
      "e2e/helpers/db.ts",
    ]);
    expect(tiers.e2eAdvisory).toEqual(["e2e/advisory/a11y.spec.ts"]);
    expect(tiers.e2eStaging).toEqual(["e2e/staging/live-boot.spec.ts"]);
  });

  test("returns empty arrays when a tier has no files", () => {
    const tiers = testInventoryDiscordTiers(
      sampleInventory({
        store: [],
        component: [],
        e2eAdvisory: [],
        e2eStaging: [],
      }),
    );

    expect(tiers.store).toEqual([]);
    expect(tiers.component).toEqual([]);
    expect(tiers.e2eAdvisory).toEqual([]);
    expect(tiers.e2eStaging).toEqual([]);
  });
});

import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openSettingsModal } from "../helpers/map-tools";

const PLANNER_LS_KEY = "room-tba-planner";
const PLAN = JSON.stringify({
  v: 1,
  plans: [{ id: "e2e-plan", label: "E2E plan", termId: 1252, sections: [] }],
  activePlanIdByTerm: { "1252": "e2e-plan" },
});

/**
 * #865 — clearing cached data must not take the user's plans with it.
 *
 * The plan is seeded *after* boot, on purpose: an `addInitScript` seed would
 * be re-applied by the reload and would hide exactly the bug this guards.
 */
test.describe("Settings → Storage: clear cached data", () => {
  test("clears and reboots without losing the saved plan", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await page.evaluate(
      ([key, value]) => {
        localStorage.setItem(key, value);
        localStorage.setItem("hideLandingModal", "true");
        (window as unknown as { __preReload?: boolean }).__preReload = true;
      },
      [PLANNER_LS_KEY, PLAN],
    );

    const settings = await openSettingsModal(page);
    await expect(settings).toBeVisible();

    await settings.getByRole("button", { name: "Reset offline data" }).click();
    await expect(
      settings.getByText(/Downloaded offline maps will be removed/),
    ).toBeVisible();
    await settings.getByRole("button", { name: "Reset and reload" }).click();

    // The reload is the success signal — wait for the marker to disappear.
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as { __preReload?: boolean }).__preReload ===
              undefined,
          ),
        { timeout: 60_000 },
      )
      .toBe(true);

    await waitForAppBoot(page);

    expect(
      await page.evaluate((key) => localStorage.getItem(key), PLANNER_LS_KEY),
    ).toBe(PLAN);
    expect(
      await page.evaluate(() => localStorage.getItem("hideLandingModal")),
    ).toBe("true");
  });
});

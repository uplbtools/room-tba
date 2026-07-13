import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("schedule route from planner @advisory", () => {
  test("planner plan drives day stops in settings", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await page.evaluate(
      (planner) => localStorage.setItem("room-tba-planner", planner),
      JSON.stringify({
        v: 1,
        plans: [
          {
            id: "e2e-plan",
            label: "A",
            termId: E2E_FIXTURES.termId,
            sections: [
              {
                courseCode: "E2E 101",
                section: "AB",
                type: "LEC",
                schedule: ["MWF 08:00AM-09:00AM"],
                roomCode: E2E_FIXTURES.roomCode,
                courseTitle: "E2E Course",
              },
            ],
          },
        ],
        activePlanIdByTerm: { [String(E2E_FIXTURES.termId)]: "e2e-plan" },
      }),
    );
    await page.reload();
    await waitForAppBoot(page);

    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name: "Help & settings" }).click();
    await sidebar
      .getByRole("button", { name: "Settings", exact: true })
      .click();

    const settings = page.getByRole("dialog", { name: "Settings" });
    await expect(settings.locator(".schedule-import-panel")).toBeVisible();
    await expect(
      settings.locator(".schedule-import-panel__plan"),
    ).toContainText("1 section");
    await settings.getByRole("button", { name: "Mon" }).click();
    await expect(page.locator(".schedule-route-stop-pin")).toHaveCount(1, {
      timeout: 15_000,
    });
  });
});

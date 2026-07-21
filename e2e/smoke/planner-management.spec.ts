import { expect, test, type Page } from "@playwright/test";
import { suppressLandingModal } from "../helpers/app";

async function waitForPlannerBoot(page: Page) {
  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout: 120_000 });
  }
}

test("planner manages plans and exports a scheduled plan", async ({ page }) => {
  await suppressLandingModal(page);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:4321",
  });
  await page.route("**/api/classes?*", (route) => route.abort());
  await page.addInitScript(() => {
    const plan = {
      id: "e2e-planner-management",
      label: "Plan 1",
      termId: 1252,
      sections: [
        {
          courseCode: "ZZZ 1",
          section: "A",
          type: "LEC",
          schedule: ["M 08:00AM-09:00AM"],
          roomCode: "E2E Hall",
          courseTitle: "Planner QA",
        },
      ],
    };
    localStorage.setItem(
      "room-tba-planner",
      JSON.stringify({
        v: 1,
        plans: [plan],
        activePlanIdByTerm: { "1252": plan.id },
      }),
    );
  });

  await page.goto("/planner?term=1252");
  await waitForPlannerBoot(page);

  const planner = page.getByRole("dialog", { name: "Class Planner" });
  await expect(planner).toBeVisible();
  await expect(
    planner.getByRole("button", { name: "Share plan" }),
  ).toBeEnabled();
  await expect(
    planner.getByRole("button", { name: "Add to Google Calendar" }),
  ).toBeEnabled();
  await expect(
    planner.getByRole("button", { name: "Save image" }),
  ).toBeEnabled();

  await planner.getByRole("button", { name: "Share plan" }).click();
  await expect(page.getByText("Share link copied")).toBeVisible();
  await expect(
    page.evaluate(() => navigator.clipboard.readText()),
  ).resolves.toContain("?plan=");

  const downloadPromise = page.waitForEvent("download");
  await planner.getByRole("button", { name: "Add to Google Calendar" }).click();
  const download = await downloadPromise;
  await expect(download.suggestedFilename()).toMatch(/plan-1-1252\.ics$/);

  // createPlan() labels new tabs "Untitled Plan N" (see planner-store), not "Plan 2".
  await planner.getByRole("button", { name: "New plan" }).click();
  await expect(
    planner.getByRole("tab", { name: "Untitled Plan 1" }),
  ).toHaveAttribute("aria-selected", "true");
  await planner.getByRole("button", { name: "Rename Untitled Plan 1" }).click();
  await planner.getByRole("textbox", { name: "Rename plan" }).fill("QA plan");
  await planner.getByRole("textbox", { name: "Rename plan" }).press("Enter");
  await expect(planner.getByRole("tab", { name: "QA plan" })).toBeVisible();

  await planner.getByRole("button", { name: "Duplicate QA plan" }).click();
  await expect(
    planner.getByRole("tab", { name: "QA plan copy" }),
  ).toHaveAttribute("aria-selected", "true");
  await planner.getByRole("button", { name: "Delete QA plan copy" }).click();
  await expect(planner.getByRole("tab", { name: "QA plan copy" })).toHaveCount(
    0,
  );
});

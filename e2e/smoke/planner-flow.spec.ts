import { test, expect, type Page } from "@playwright/test";
import { suppressLandingModal } from "../helpers/app";

// Planner interactions, decoupled from the map: search -> add -> remove, and the
// conflict badge. The planner is a full-screen dialog over the map chrome, so we
// wait on the loading shell detaching (not waitForAppBoot, which needs the map).
async function waitForPlannerBoot(page: Page) {
  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout: 120_000 });
  }
}

function plannerDialog(page: Page) {
  return page.getByRole("dialog", { name: "Class Planner" });
}

test.describe("planner interactions", () => {
  test("searching a course adds an offering to the plan, then removes it", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/planner?term=1252");
    await waitForPlannerBoot(page);

    const planner = plannerDialog(page);
    await expect(planner).toBeVisible();

    // "E2E 101" is the seeded class in the default term (scripts/e2e-reset-db.ts).
    // Wait for the prefix search (not the initial unfiltered browse fetch).
    const classesResponse = page.waitForResponse(
      (res) => {
        if (!res.url().includes("/api/classes") || !res.ok()) return false;
        try {
          return new URL(res.url()).searchParams.get("course_code") === "E2E";
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    );
    await page.locator("#planner-course-search").fill("E2E");
    await classesResponse;

    const courseHeader = planner.getByRole("button", { name: /E2E 101/ });
    await expect(courseHeader).toBeVisible({ timeout: 30_000 });
    await courseHeader.click(); // expand the section list

    await planner
      .getByRole("button", { name: "Add", exact: true })
      .first()
      .click();

    // The Sections side panel appears and lists the added offering.
    const offering = planner.getByText(/E2E 101\s*·\s*AB/);
    await expect(offering).toBeVisible();
    await expect(
      planner.getByRole("heading", { name: /Sections \(1\)/ }),
    ).toBeVisible();

    await planner.getByRole("button", { name: "Remove" }).first().click();
    await expect(offering).toHaveCount(0);
  });

  test("two overlapping sections show the conflict badge; removing one clears it", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    // Seed a plan with two overlapping sections. The schedule strings overlap on
    // Monday 9:00-9:30, so the store derives exactly one conflict. Abort their
    // refresh requests: a successful empty response correctly marks persisted
    // sections stale, which would hide them from the current-offerings list.
    // This keeps the fixture independent of e2e DB contents.
    await page.route("**/api/classes?*", (route) => route.abort());
    await page.addInitScript(() => {
      const plan = {
        id: "e2e-conflict-plan",
        label: "Plan 1",
        termId: 1252,
        sections: [
          {
            courseCode: "ZZZ 1",
            section: "A",
            type: "LEC",
            schedule: ["MW 08:00AM-09:30AM"],
            roomCode: null,
            courseTitle: "Conflict A",
          },
          {
            courseCode: "ZZZ 2",
            section: "B",
            type: "LEC",
            schedule: ["M 09:00AM-10:00AM"],
            roomCode: null,
            courseTitle: "Conflict B",
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

    const planner = plannerDialog(page);
    await expect(planner).toBeVisible();

    // Both seeded offerings render, and the badge reports the conflict.
    await expect(
      planner.locator(".planner-offering", { hasText: "ZZZ 1" }),
    ).toBeVisible();
    const conflictBadge = planner.locator(".planner-conflict-badge");
    await expect(
      conflictBadge.filter({ hasText: /^1 conflict$/ }),
    ).toBeVisible();

    // Remove one side of the clash -> no more overlap -> "All clear".
    await planner
      .locator(".planner-offering", { hasText: "ZZZ 2" })
      .getByRole("button", { name: "Remove" })
      .click();

    await expect(
      conflictBadge.filter({ hasText: /^All clear$/i }),
    ).toBeVisible();
    await expect(
      conflictBadge.filter({ hasText: /\d+ conflict/i }),
    ).toHaveCount(0);
  });
});

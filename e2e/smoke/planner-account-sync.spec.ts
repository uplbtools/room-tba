import { expect, test, type Page } from "@playwright/test";
import { suppressLandingModal } from "../helpers/app";

async function waitForPlannerBoot(page: Page) {
  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout: 120_000 });
  }
}

test("a direct planner visit enables account sync for a signed-in user", async ({
  page,
}) => {
  await suppressLandingModal(page);
  let accountPlansRead = false;
  let savedProfessorNote: string | null = null;
  await page.route("**/api/admin/auth", (route) =>
    route.fulfill({
      json: {
        loggedIn: true,
        username: "planner-qa",
        displayName: "Planner QA",
        role: "contributor",
        canPublish: false,
        canReview: false,
      },
    }),
  );
  await page.route("**/api/account/plans", (route) => {
    if (route.request().method() === "GET") {
      accountPlansRead = true;
    } else {
      const body = route.request().postDataJSON() as {
        data?: { plans?: { sections?: { note?: string }[] }[] };
      };
      savedProfessorNote = body.data?.plans?.[0]?.sections?.[0]?.note ?? null;
    }
    return route.fulfill({ json: { data: null } });
  });
  await page.addInitScript(() => {
    const plan = {
      id: "e2e-account-sync",
      label: "Plan 1",
      termId: 1252,
      sections: [
        {
          courseCode: "ZZZ 1",
          section: "A",
          type: "LEC",
          schedule: ["M 08:00AM-09:00AM"],
          roomCode: null,
          courseTitle: "Account sync QA",
          note: "Dr. Santos",
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
  await expect(planner.locator(".planner-save-note")).toContainText(
    "sync to your account",
  );
  await expect.poll(() => accountPlansRead).toBe(true);
  await expect.poll(() => savedProfessorNote).toBe("Dr. Santos");
});

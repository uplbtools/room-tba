import { expect, test, type Page } from "@playwright/test";
import { suppressLandingModal } from "../helpers/app";

async function waitForPlannerBoot(page: Page) {
  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout: 120_000 });
  }
}

test("planner switches a section when a mouse drag ends on its first target move", async ({
  page,
}) => {
  await suppressLandingModal(page);
  const rows = [
    {
      id: 1,
      termId: 1252,
      courseCode: "ZZZ 1",
      section: "A",
      type: "LEC",
      schedule: ["M 08:00AM-09:00AM"],
      roomCode: "E2E Hall",
      courseTitle: "Drag QA",
      directions: null,
      roomId: null,
    },
    {
      id: 2,
      termId: 1252,
      courseCode: "ZZZ 1",
      section: "B",
      type: "LEC",
      schedule: ["M 10:00AM-11:00AM"],
      roomCode: "E2E Hall",
      courseTitle: "Drag QA",
      directions: null,
      roomId: null,
    },
  ];
  await page.route("**/api/classes?*", (route) =>
    route.fulfill({ json: { rows, total: rows.length } }),
  );
  await page.addInitScript(() => {
    const plan = {
      id: "e2e-planner-drag",
      label: "Plan 1",
      termId: 1252,
      sections: [
        {
          courseCode: "ZZZ 1",
          section: "A",
          type: "LEC",
          schedule: ["M 08:00AM-09:00AM"],
          roomCode: "E2E Hall",
          courseTitle: "Drag QA",
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
  const source = planner.getByRole("button", { name: /ZZZ 1\s+LEC\s+·\s+A/ });
  await expect(source).toBeVisible();
  const sourceBox = await source.boundingBox();
  expect(sourceBox).not.toBeNull();

  // Start the drag with exactly one pointer move. Before the regression fix,
  // that first move only created ghosts; pointerup saw no hover target.
  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2 + 80,
    { steps: 1 },
  );

  const target = planner.locator('[data-ghost="B"]');
  await expect(target).toBeVisible();
  // The pointer is already over B at this point. Do not emit another move:
  // pointerup itself must resolve the target under the final pointer position.
  await page.mouse.up();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("room-tba-planner");
        return raw ? JSON.parse(raw).plans[0]?.sections[0]?.section : null;
      }),
    )
    .toBe("B");
});

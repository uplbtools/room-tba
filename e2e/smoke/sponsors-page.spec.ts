import { expect, test } from "@playwright/test";

test.describe("sponsors page", () => {
  test("/sponsors renders the showcase and funding model", async ({ page }) => {
    await page.goto("/sponsors");
    await expect(
      page.getByRole("heading", { name: "Room TBA is supported by" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Where the money goes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Become a sponsor" }),
    ).toBeVisible();
  });

  test("footer on legal pages links to /sponsors", async ({ page }) => {
    await page.goto("/privacy");
    const link = page.getByRole("link", { name: "Sponsors", exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/sponsors\/?$/);
  });

  test("/donate renders the donation form", async ({ page }) => {
    await page.goto("/donate");
    await expect(
      page.getByRole("heading", { name: "Buy the volunteers a kape" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "₱100" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Donate" })).toBeVisible();
  });

  test("POST /api/donate rejects invalid amounts", async ({ request }) => {
    const res = await request.post("/api/donate", {
      data: { amount: 1 },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/sponsor-event accepts a beacon", async ({ request }) => {
    const res = await request.post("/api/sponsor-event", {
      data: {
        sponsorId: "sample-sponsor",
        zone: "status_bar",
        eventType: "impression",
        pagePath: "/",
      },
    });
    expect(res.status()).toBe(200);
  });
});

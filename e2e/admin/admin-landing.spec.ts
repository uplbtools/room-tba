import { test, expect } from "@playwright/test";
import { loginViaApi } from "../helpers/auth";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

// /admin used to be an ISR-cached redirect to the map for everyone. It is now
// a real page: a dashboard for staff, a roles explainer with an in-app access
// request for everyone else (auth audit item 15).
test.describe("admin landing page", () => {
  test("signed out: roles explainer, sign-in link, never cached", async ({
    page,
    request,
  }) => {
    const res = await request.get("/admin", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Editing Room TBA" }),
    ).toBeVisible();
    await expect(page.getByText("Who can do what")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/?editor=login",
    );
  });

  test("admin: dashboard with review queue, accounts and audit log", async ({
    page,
  }) => {
    await page.goto("/");
    await loginViaApi(page, E2E_FIXTURES.users.admin);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Editor dashboard" }),
    ).toBeVisible();
    await expect(page.getByTestId("pending-reviews")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open review queue" }),
    ).toHaveAttribute("href", "/?review=1");
    await expect(
      page.getByRole("link", { name: "Manage users" }),
    ).toBeVisible();
    // The sign-in this test just did is the newest audit entry.
    await expect(
      page
        .getByRole("list", { name: "Audit log entries" })
        .getByText("Signed in")
        .first(),
    ).toBeVisible();
  });

  test("admin: the review queue deep link opens the queue on the map", async ({
    page,
  }) => {
    await page.goto("/");
    await loginViaApi(page, E2E_FIXTURES.users.admin);
    await page.goto("/?review=1");
    await expect(
      page.getByRole("region", { name: "Edit proposals review queue" }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("contributor: requests editor access in the app", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, E2E_FIXTURES.users.contributor);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Editing Room TBA" }),
    ).toBeVisible();
    const pending = page.getByText(/Request sent/);
    const box = page.getByLabel("What would you like to edit?");
    await expect(pending.or(box)).toBeVisible();
    if (await box.isVisible()) {
      await box.fill("Rooms in the CEM building and their schedules.");
      await page.getByRole("button", { name: "Send request" }).click();
    }
    await expect(pending).toBeVisible();
  });
});

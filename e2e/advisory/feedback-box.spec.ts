import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppMenu } from "../helpers/map-tools";

/**
 * In-app feedback box (#881). Advisory: the endpoint is stubbed via routing, so
 * this covers the UI contract (entry point, attached-context note, failure
 * handling) without depending on the shared E2E database.
 */
test.describe("feedback box @advisory", () => {
  // Send feedback lives in one place: You, under Help & feedback.
  async function openFeedback(page: import("@playwright/test").Page) {
    await page.goto("/");
    await waitForAppBoot(page);
    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: "Send feedback" }).click();
    const dialog = page.getByRole("dialog", { name: "Send feedback" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test("You opens the box, both community links, and the attached note", async ({
    page,
  }) => {
    const dialog = await openFeedback(page);

    await expect(
      dialog.getByRole("heading", { name: "Send feedback" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Your message")).toBeVisible();
    await expect(dialog.getByLabel("Contact (optional)")).toBeVisible();
    await expect(dialog.getByText(/Sent with your message/i)).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Messenger" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Discord" })).toBeVisible();
  });

  test("a failed send keeps the typed message so it can be retried", async ({
    page,
  }) => {
    // The Discord webhook has 500'd in CI; the endpoint failing must never eat
    // what the user wrote.
    await page.route("**/api/feedback", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Could not send your message." }),
      }),
    );

    const dialog = await openFeedback(page);
    const box = dialog.getByLabel("Your message");
    await box.fill("advisory spec: the map is blank");
    await dialog.getByRole("button", { name: "Send feedback" }).click();

    await expect(dialog.getByRole("alert")).toContainText(/could not send/i);
    await expect(box).toHaveValue("advisory spec: the map is blank");

    await page.unroute("**/api/feedback");
    await page.route("**/api/feedback", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );
    await dialog.getByRole("button", { name: "Send feedback" }).click();
    await expect(dialog.getByText(/Sent\. Thank you/i)).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import {
  openAppSidebar,
  openHelpSettingsSection,
  clickSidebarNav,
} from "../helpers/map-tools";

/**
 * In-app feedback box (#881). Advisory: the endpoint is stubbed via routing, so
 * this covers the UI contract (entry point, attached-context note, failure
 * handling) without depending on the shared E2E database.
 */
test.describe("feedback box @advisory", () => {
  async function openFeedback(page: import("@playwright/test").Page) {
    await page.goto("/");
    await waitForAppBoot(page);
    const sidebar = await openAppSidebar(page);
    await openHelpSettingsSection(sidebar);
    await clickSidebarNav(sidebar, "Settings", { exact: true });
    const settings = page.getByRole("dialog", { name: "Settings" });
    await expect(settings).toBeVisible();
    return settings;
  }

  test("settings exposes the box, both community links, and the attached note", async ({
    page,
  }) => {
    const settings = await openFeedback(page);

    await expect(
      settings.getByRole("heading", { name: "Feedback" }),
    ).toBeVisible();
    await expect(settings.getByLabel("Your message")).toBeVisible();
    await expect(settings.getByLabel("Contact (optional)")).toBeVisible();
    await expect(settings.getByText(/Sent with your message/i)).toBeVisible();
    await expect(
      settings.getByRole("link", { name: "Messenger" }),
    ).toBeVisible();
    await expect(settings.getByRole("link", { name: "Discord" })).toBeVisible();
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

    const settings = await openFeedback(page);
    const box = settings.getByLabel("Your message");
    await box.fill("advisory spec: the map is blank");
    await settings.getByRole("button", { name: "Send feedback" }).click();

    await expect(settings.getByRole("alert")).toContainText(/could not send/i);
    await expect(box).toHaveValue("advisory spec: the map is blank");

    await page.unroute("**/api/feedback");
    await page.route("**/api/feedback", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );
    await settings.getByRole("button", { name: "Send feedback" }).click();
    await expect(settings.getByText(/Sent\. Thank you/i)).toBeVisible();
  });
});

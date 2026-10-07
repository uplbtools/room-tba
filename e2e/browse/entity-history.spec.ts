import { test, expect } from "@playwright/test";
import {
  campusSearchBox,
  expandDetailsSheet,
  waitForAppBoot,
} from "../helpers/app";
import { searchSuggestions } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

// Seeded in scripts/e2e-reset-db.ts: an import row, then an approved
// suggestion by "E2E Contributor" whose approver login is an email address.
test.describe("public edit history", () => {
  test("a place card credits its editors and opens the edit history", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await campusSearchBox(page).fill(E2E_FIXTURES.placeName);
    const suggestion = searchSuggestions(page)
      .locator("button.suggestion")
      .filter({ hasText: new RegExp(E2E_FIXTURES.placeName, "i") })
      .first();
    await suggestion.waitFor({ state: "visible", timeout: 30_000 });
    await suggestion.click({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: E2E_FIXTURES.placeName }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(
        /Added by Room TBA team, last edited by E2E Contributor on/,
      ),
    ).toBeVisible({ timeout: 10_000 });

    // The phone sheet peeks at the title and actions; history sits below.
    await expandDetailsSheet(page);
    await page.getByRole("button", { name: "Edit history" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit history" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("by E2E Contributor")).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByText("8 AM to 5 PM")).toBeVisible();
    await expect(dialog.getByText("by Room TBA team")).toBeVisible();

    const text = (await dialog.textContent()) ?? "";
    expect(text).not.toContain("@example.com");
  });
});

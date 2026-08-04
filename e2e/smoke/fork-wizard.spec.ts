import { expect, test } from "@playwright/test";

// /fork is a prerendered static page; the wizard island needs no DB or
// MapTiler key. Do NOT wait for networkidle here — the map keeps fetching
// OSM tiles and never settles.
test.describe("fork wizard", () => {
  test("filling the form generates a config and Vercel deploy link", async ({
    page,
  }) => {
    await page.goto("/fork", { waitUntil: "domcontentloaded" });

    // Defaults are fine for everything except the campus name.
    const nameInput = page.getByLabel("Campus name");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Sample State University");

    // Slug auto-fills from the name.
    await expect(page.getByLabel("Short name (slug)")).toHaveValue(
      "sample-state-university",
    );

    const config = page.getByTestId("fork-config");
    await expect(config).toContainText("Sample State University");
    await expect(config).toContainText("export const campusSite");

    const deployLink = page.getByTestId("fork-deploy-link");
    await expect(deployLink).toHaveAttribute(
      "href",
      /project-name=sample-state-university-room-tba/,
    );
  });

  test("empty campus name blocks the output with a visible error", async ({
    page,
  }) => {
    await page.goto("/fork", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Campus name")).toBeVisible();
    await expect(page.getByText("Campus name is required.")).toBeVisible();
    await expect(page.getByTestId("fork-config")).toHaveCount(0);
  });
});

import { expect, test } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

test("external community links stay inside the 320px sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await suppressLandingModal(page);
  await page.goto("/");
  await waitForAppBoot(page);

  const sidebar = await openAppSidebar(page);
  await sidebar.getByRole("button", { name: "Contributors" }).click();

  const sidebarBox = await sidebar.boundingBox();
  if (!sidebarBox) throw new Error("sidebar is not visible");
  for (const link of await sidebar.locator("a.nav-link").all()) {
    const box = await link.boundingBox();
    expect(box?.x + (box?.width ?? 0)).toBeLessThanOrEqual(
      sidebarBox.x + sidebarBox.width,
    );
  }
});

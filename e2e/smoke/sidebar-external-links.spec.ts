import { expect, test } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";
import { openAppMenu } from "../helpers/map-tools";

test("external community links stay inside the 320px App Menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await suppressLandingModal(page);
  await page.goto("/");
  await waitForAppBoot(page);

  const menu = await openAppMenu(page);
  await menu.locator("summary").filter({ hasText: "Community" }).click();

  const menuBox = await menu.boundingBox();
  if (!menuBox) throw new Error("App Menu is not visible");
  for (const link of await menu.locator("a.status-bar__nav-link").all()) {
    const box = await link.boundingBox();
    expect(box?.x + (box?.width ?? 0)).toBeLessThanOrEqual(
      menuBox.x + menuBox.width,
    );
  }
});

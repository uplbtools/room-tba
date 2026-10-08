import { expect, test } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";
import { openAppMenu } from "../helpers/map-tools";

test("external community links stay inside the 320px You sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await suppressLandingModal(page);
  await page.goto("/");
  await waitForAppBoot(page);

  const menu = await openAppMenu(page);

  const menuBox = await menu.boundingBox();
  if (!menuBox) throw new Error("You sheet is not visible");
  const external = await menu.locator('a[target="_blank"]').all();
  expect(external.length).toBeGreaterThan(0);
  for (const link of external) {
    const box = await link.boundingBox();
    expect(box?.x + (box?.width ?? 0)).toBeLessThanOrEqual(
      menuBox.x + menuBox.width,
    );
  }
});

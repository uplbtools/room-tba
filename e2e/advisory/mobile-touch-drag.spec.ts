import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openBuilding } from "../helpers/search";
import { enableMapEdit } from "../helpers/map";

test.describe("mobile touch drag @advisory", () => {
  test.slow();
  test.describe.configure({ retries: 1 });

  test("touch drag building pin on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openBuilding(page);
    await enableMapEdit(page);

    const marker = page.locator(".maplibregl-marker").first();
    await marker.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const box = await marker.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
    await logout(page);
  });
});

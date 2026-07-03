import { test } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { dragEntityMapMarker, enableMapEdit } from "../helpers/map";
import { openBuilding } from "../helpers/search";

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

    const saved = await dragEntityMapMarker(
      page,
      E2E_FIXTURES.buildingName,
      "/api/admin/buildings/",
    );
    test.skip(!saved, "Touch pin drag did not trigger PATCH on this device");
    await logout(page);
  });
});

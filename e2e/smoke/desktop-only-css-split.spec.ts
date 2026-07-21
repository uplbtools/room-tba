import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// #716: the <html> device class and the desktop-only.css fetch are both
// driven by the same viewport check (no server User-Agent sniffing, no
// separate SSG fallback), so the project's mobile-chrome/desktop-chrome
// viewport matrix is exactly what exercises the two branches — this also
// guards against the split-brain regression where server (UA) and client
// (viewport) detection disagreed.
test.describe("desktop-only CSS split", () => {
  test("html device class matches this project's viewport", async ({
    page,
    isMobile,
  }) => {
    const requests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("desktop-only")) requests.push(req.url());
    });

    await page.goto("/");
    await waitForAppBoot(page);

    const html = page.locator("html");
    if (isMobile) {
      await expect(html).toHaveClass(/\bmobile\b/);
      await expect(html).not.toHaveClass(/\bdesktop\b/);
      expect(requests).toHaveLength(0);
    } else {
      await expect(html).toHaveClass(/\bdesktop\b/);
      await expect(html).not.toHaveClass(/\bmobile\b/);
      expect(requests.length).toBeGreaterThan(0);
    }
  });
});

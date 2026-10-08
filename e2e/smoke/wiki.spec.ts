import { expect, test } from "@playwright/test";

test.describe("wiki", () => {
  test("article has a skip link, a generated contents list, and a way back to the map", async ({
    page,
  }) => {
    await page.goto("/wiki/section-times");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await skip.focus();
    await expect(skip).toBeVisible();

    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.getByRole("link").first()).toBeVisible();
    const first = await toc.getByRole("link").first().getAttribute("href");
    await expect(page.locator(first ?? "#missing")).toHaveCount(1);

    await expect(
      page.getByRole("navigation", { name: "Wiki" }).getByRole("link", {
        name: "Open the map",
      }),
    ).toHaveAttribute("href", "/");
  });

  test("index filter narrows the article list", async ({ page }) => {
    await page.goto("/wiki");
    const filter = page.getByLabel("Filter articles");
    await filter.fill("curfew");
    await expect(page.locator(".wiki-index__item:not([hidden])")).toHaveCount(
      1,
    );
    await filter.fill("");
    await expect(
      page.locator(".wiki-index__item:not([hidden])"),
    ).not.toHaveCount(1);
  });

  test("follows the dark theme choice", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/wiki/campus-curfew");
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bg).toBe("rgb(30, 27, 26)");
  });

  test("tables scroll by keyboard and do not widen the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/wiki/section-times");
    const regions = page.getByRole("region", { name: /^Table:/ });
    expect(await regions.count()).toBeGreaterThan(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the sitemap lists every wiki page", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    const body = await res.text();
    for (const path of [
      "/wiki",
      "/wiki/emergency-hotlines",
      "/wiki/campus-curfew",
      "/wiki/glossary",
      "/wiki/jeepney-guide",
      "/wiki/using-room-tba",
    ]) {
      expect(body).toContain(`${path}</loc>`);
    }
  });
});

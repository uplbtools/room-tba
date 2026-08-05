import { test, expect, type Page } from "@playwright/test";
import { waitForAppBoot, dismissLandingIfPresent } from "../helpers/app";

/**
 * Re-establishes the four invariants that died with
 * e2e/browse/bottom-chrome-overflow.spec.ts (#944, #945).
 *
 * That spec was retired for the right reason, the redesign deleted the markup
 * it asserted against, but nothing replaced it and the new chrome has never
 * been held to any of them. #940 is what that costs: the browse chips shipped
 * at 34px and nobody noticed, because the assertion that would have caught it
 * lived in the spec that no longer runs.
 *
 * Two things this spec does deliberately.
 *
 * It hit-tests every control at its own centre with elementFromPoint, not just
 * measures boxes. Box geometry cannot see an invisible overlay: #893 shipped an
 * ::after that killed both attribution links while every control still measured
 * exactly the right size.
 *
 * It reports which element failed and where its edges are. "Expected 0,
 * received 1" costs an investigation before you can act on it.
 */

const CHROME_ROOTS = [
  ".desktop-top-bar",
  ".map-search-chrome",
  ".map-filter-chips",
  ".map-attrib-corner",
  ".mobile-map-controls",
  ".desktop-map-controls",
  ".mobile-bottom-nav",
];

type Report = {
  offscreen: string[];
  obscured: string[];
  small: string[];
  horizontalScroll: { scrollWidth: number; inner: number } | null;
  strayArtefacts: number;
  scrollersOffscreen: string[];
};

async function auditChrome(page: Page, roots: string[]): Promise<Report> {
  return page.evaluate((rootSelectors) => {
    // Subpixel layout lands controls on 43.99px. That is a 44px target, not a
    // violation, so compare with a tolerance rather than chasing rounding.
    const EPS = 0.5;
    const MIN = 44 - EPS;
    const offscreen: string[] = [];
    const obscured: string[] = [];
    const small: string[] = [];
    const scrollersOffscreen: string[] = [];

    const label = (el: Element) =>
      (el.getAttribute("aria-label") || el.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 32) || el.tagName.toLowerCase();

    const box = (r: DOMRect) =>
      `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;

    /**
     * The browse chips live in a horizontally scrollable strip, so chips past
     * the right edge are offscreen on purpose and correctly hit-test as null.
     * Judge those against the scroller's visible box instead of the viewport,
     * and hold the scroller itself to the viewport.
     */
    const scrollParent = (el: Element): Element | null => {
      let n = el.parentElement;
      while (n) {
        const s = getComputedStyle(n);
        if (
          (s.overflowX === "auto" || s.overflowX === "scroll") &&
          n.scrollWidth > n.clientWidth + 1
        ) {
          return n;
        }
        n = n.parentElement;
      }
      return null;
    };

    for (const sel of rootSelectors) {
      for (const root of Array.from(document.querySelectorAll(sel))) {
        const rootRect = root.getBoundingClientRect();
        if (rootRect.width > 0 || rootRect.height > 0) {
          if (
            rootRect.left < -EPS ||
            rootRect.right > window.innerWidth + EPS ||
            rootRect.top < -EPS ||
            rootRect.bottom > window.innerHeight + EPS
          ) {
            offscreen.push(`${sel} (container) at ${box(rootRect)}`);
          }
        }

        for (const control of Array.from(
          root.querySelectorAll("button, a[href], [role=button]"),
        )) {
          const r = control.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const style = getComputedStyle(control);
          if (style.visibility === "hidden" || style.display === "none")
            continue;

          const name = label(control);
          const scroller = scrollParent(control);

          // A control's own size is a real invariant wherever it sits, on
          // screen or scrolled out of view.
          if (r.width < MIN || r.height < MIN) {
            small.push(
              `${name} in ${sel} is ${Math.round(r.width)}x${Math.round(r.height)}, want >= 44x44`,
            );
          }

          if (scroller) {
            // Only the visible slice of a scroller is meaningfully on screen.
            const sr = scroller.getBoundingClientRect();
            if (
              sr.left < -EPS ||
              sr.right > window.innerWidth + EPS ||
              sr.top < -EPS ||
              sr.bottom > window.innerHeight + EPS
            ) {
              const already = scrollersOffscreen.some((s) => s.startsWith(sel));
              if (!already)
                scrollersOffscreen.push(`${sel} scroller at ${box(sr)}`);
            }
            // The centre must itself be inside the scroller, not merely
            // overlapping it. A chip straddling the edge is half clipped by
            // design, so its centre point legitimately hits the container.
            const mx = r.left + r.width / 2;
            const my = r.top + r.height / 2;
            const centreVisible =
              mx > sr.left + EPS &&
              mx < sr.right - EPS &&
              my > sr.top + EPS &&
              my < sr.bottom - EPS;
            if (!centreVisible) continue;
          } else if (
            r.left < -EPS ||
            r.right > window.innerWidth + EPS ||
            r.top < -EPS ||
            r.bottom > window.innerHeight + EPS
          ) {
            offscreen.push(`${name} in ${sel} at ${box(r)}`);
            continue;
          }

          // The one box geometry cannot see: something invisible on top.
          const cx = Math.round(r.left + r.width / 2);
          const cy = Math.round(r.top + r.height / 2);
          if (
            cx < 0 ||
            cy < 0 ||
            cx > window.innerWidth ||
            cy > window.innerHeight
          )
            continue;
          const hit = document.elementFromPoint(cx, cy);
          const reachesControl =
            hit === control || control.contains(hit as Node);
          if (!reachesControl) {
            const blocker = hit
              ? `${hit.tagName.toLowerCase()}.${String(
                  (hit as HTMLElement).className || "",
                )
                  .replace(/svelte-\w+/g, "")
                  .trim()
                  .slice(0, 40)}`
              : "nothing (no element at that point)";
            obscured.push(`${name} in ${sel} is covered by ${blocker}`);
          }
        }
      }
    }

    return {
      offscreen,
      obscured,
      small,
      horizontalScroll:
        document.documentElement.scrollWidth > window.innerWidth + EPS
          ? {
              scrollWidth: document.documentElement.scrollWidth,
              inner: window.innerWidth,
            }
          : null,
      // A probe left behind by an earlier step once inflated a measurement and
      // nearly caused a wrong revert. Refuse to trust a contaminated DOM.
      strayArtefacts: document.querySelectorAll(
        "[data-overflow-probe], style[data-fix]",
      ).length,
      scrollersOffscreen,
    };
  }, roots);
}

/** Blur the search so its suggestions overlay stops covering the map chrome. */
async function closeSearchOverlay(page: Page) {
  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page
    .locator(".map-search-chrome__suggestions")
    .waitFor({ state: "detached", timeout: 10_000 })
    .catch(() => {});
}

const WIDTHS = [320, 375, 414, 768];

for (const width of WIDTHS) {
  test.describe(`chrome layout invariants at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/");
      await waitForAppBoot(page);
      // Without this every chrome control hit-tests as dead, because the modal
      // legitimately covers them.
      await dismissLandingIfPresent(page);
      // Same trap, second source: waitForAppBoot ends with search.focus(), and
      // a focused search opens a full-screen suggestions overlay that covers
      // the map chrome on purpose. Measuring through it reports every control
      // as obscured. Blur before auditing.
      await closeSearchOverlay(page);
    });

    test("no chrome control is offscreen, obscured, or under 44px", async ({
      page,
    }) => {
      const report = await auditChrome(page, CHROME_ROOTS);

      expect(
        report.strayArtefacts,
        "test artefacts left in the DOM would make every measurement below untrustworthy",
      ).toBe(0);

      expect(report.offscreen, "chrome boxes outside the viewport").toEqual([]);
      expect(
        report.scrollersOffscreen,
        "scroll containers must themselves fit the viewport",
      ).toEqual([]);
      expect(
        report.obscured,
        "controls covered by another element (this is the #893 class of bug)",
      ).toEqual([]);
      expect(report.small, "touch targets under 44px (see #940)").toEqual([]);
      expect(report.horizontalScroll, "page scrolls horizontally").toBeNull();
    });
  });
}

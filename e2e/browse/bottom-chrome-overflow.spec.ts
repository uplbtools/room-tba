import { expect, test } from "@playwright/test";
import { gotoHome, waitForAppBoot } from "../helpers/app";

/**
 * The bottom chrome row used to lay out as one unwrappable line: a fixed-width
 * credits block plus a fixed-width action column. Below ~430px their sum ran
 * past the viewport (measured right edge 671px at 320px) and `overflow` on
 * .app-layout clipped the tail away, so the online counter, Map tools, legend,
 * propose and My Location controls were on-screen in the layout tree but
 * unreachable to a user.
 *
 * Geometry needs a real engine (component tests run in happy-dom, which has no
 * layout), so the overflow contract is asserted here.
 */

const WIDTHS = [320, 375, 414, 768] as const;

// Widest control the bar can gain: the sync-error "Retry" button. Nothing in
// app code calls setSyncError (the sync path swallows errors by design, #169),
// so the state is not reachable from the network. Injecting a probe of the same
// width proves the row reflows for *any* added control, which covers it.
const RETRY_PROBE_PX = 86;

type Box = {
  name: string;
  left: number;
  right: number;
  width: number;
  height: number;
  wrapped: boolean;
};

async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    const chrome = document.querySelector(".bottom-chrome");
    const boxes: Box[] = [];
    const seen = new Set<Element>();

    // True when the element's own text renders across more than one line box.
    // Counts text-node line boxes rather than element height, so icon-only
    // buttons (tall by design, no text) are not mistaken for wrapped labels.
    const labelWrapped = (el: Element) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const tops = new Set<number>();
      let node = walker.nextNode();
      while (node) {
        if ((node.textContent ?? "").trim()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width > 0 || rect.height > 0) {
              tops.add(Math.round(rect.top));
            }
          }
        }
        node = walker.nextNode();
      }
      return tops.size > 1;
    };

    const record = (name: string, el: Element | null) => {
      if (!el || seen.has(el)) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      boxes.push({
        name,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
        wrapped: labelWrapped(el),
      });
    };

    for (const sel of [
      ".bottom-chrome",
      ".bottom-chrome__bar",
      ".bottom-chrome__leading",
      ".bottom-chrome__status",
      ".bottom-chrome__actions",
      ".bottom-chrome__triggers",
      ".map-attribution",
      ".status-bar",
    ]) {
      record(sel, document.querySelector(sel));
    }

    const triggers: Box[] = [];
    if (chrome) {
      let i = 0;
      for (const el of chrome.querySelectorAll("button, a, [role='button']")) {
        const label =
          el.getAttribute("aria-label") ||
          (el.textContent || "").trim().slice(0, 30) ||
          `control-${i}`;
        record(`control: ${label}`, el);
        if (el.closest(".bottom-chrome__triggers")) {
          const r = el.getBoundingClientRect();
          triggers.push({
            name: `trigger: ${label}`,
            left: r.left,
            right: r.right,
            width: r.width,
            height: r.height,
            wrapped: false,
          });
        }
        i += 1;
      }
    }

    return {
      viewportWidth: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      boxes,
      triggers,
    };
  });
}

function assertInsideViewport(
  measured: Awaited<ReturnType<typeof measure>>,
  label: string,
) {
  const offscreen = measured.boxes
    .filter((b) => b.right > measured.viewportWidth + 0.5 || b.left < -0.5)
    .map((b) => `${b.name} [${Math.round(b.left)}..${Math.round(b.right)}]`);
  expect(
    offscreen,
    `${label}: elements outside the ${measured.viewportWidth}px viewport`,
  ).toEqual([]);
}

test.describe("bottom chrome fits the viewport", () => {
  // Viewports are driven explicitly below, so one project run is enough.
  test("@desktop-only no control is clipped at 320/375/414/768", async ({
    page,
  }) => {
    await gotoHome(page);
    await waitForAppBoot(page);
    await page.locator(".bottom-chrome").waitFor({ state: "attached" });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 780 });
      // Layout settles on the next frame; no networkidle on the map page.
      await page.waitForFunction((w) => window.innerWidth === w, width, {
        timeout: 10_000,
      });
      await expect
        .poll(async () => (await measure(page)).viewportWidth)
        .toBe(width);

      const measured = await measure(page);

      // 1. The page itself never scrolls sideways.
      expect(
        measured.scrollWidth,
        `${width}px: horizontal page scroll`,
      ).toBeLessThanOrEqual(measured.clientWidth);

      // 2. Every chrome box and control sits inside the viewport.
      assertInsideViewport(measured, `${width}px`);

      // 3. Trigger chips keep a 44px touch target.
      for (const trigger of measured.triggers) {
        expect(
          Math.min(trigger.width, trigger.height),
          `${width}px: ${trigger.name} touch target`,
        ).toBeGreaterThanOrEqual(43.5);
      }

      // 4. Clickable text stays on one line.
      const wrappedControls = measured.boxes
        .filter((b) => b.name.startsWith("control: ") && b.wrapped)
        .map((b) => b.name);
      expect(
        wrappedControls,
        `${width}px: control labels wrapped to two lines`,
      ).toEqual([]);
    }
  });

  test("@desktop-only row still fits when the bar gains a sync action", async ({
    page,
  }) => {
    await gotoHome(page);
    await waitForAppBoot(page);
    await page.locator(".bottom-chrome").waitFor({ state: "attached" });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 780 });
      await page.waitForFunction((w) => window.innerWidth === w, width, {
        timeout: 10_000,
      });

      await page.evaluate((px) => {
        document.querySelector("[data-overflow-probe]")?.remove();
        const bar = document.querySelector(".bottom-chrome__bar");
        if (!bar) throw new Error("bottom chrome bar missing");
        const probe = document.createElement("button");
        probe.type = "button";
        probe.setAttribute("data-overflow-probe", "");
        probe.textContent = "Retry";
        probe.style.cssText = `flex:0 0 auto;min-width:${px}px;min-height:2rem;`;
        bar.appendChild(probe);
      }, RETRY_PROBE_PX);

      await expect
        .poll(async () => {
          const m = await measure(page);
          return m.boxes.filter(
            (b) => b.right > m.viewportWidth + 0.5 || b.left < -0.5,
          ).length;
        })
        .toBe(0);

      const measured = await measure(page);
      expect(
        measured.scrollWidth,
        `${width}px + probe: horizontal page scroll`,
      ).toBeLessThanOrEqual(measured.clientWidth);
      assertInsideViewport(measured, `${width}px + sync action probe`);
    }
  });
});

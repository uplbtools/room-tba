import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import BottomSheetHost from "../../test/components/BottomSheetHost.svelte";

/**
 * Regression cover for #966: the sheet used to lay a full-bleed "Close
 * details" button across the whole root, so every tap, pan and pinch on the
 * map strip above the sheet hit that button instead of the map. Details were
 * readable but the map underneath was inert.
 */
describe("bottom sheet does not capture the map", () => {
  test("renders no full-bleed dismiss overlay over the map strip", () => {
    render(BottomSheetHost, { open: true });

    expect(screen.queryByRole("button", { name: "Close details" })).toBeNull();
    expect(document.querySelector(".bottom-sheet__scrim")).toBeNull();
  });

  test("the root lets pointer events through; only the sheet takes them", () => {
    const { container } = render(BottomSheetHost, { open: true });

    const root = container.querySelector(".bottom-sheet-root");
    const sheet = container.querySelector(".bottom-sheet");
    expect(root).not.toBeNull();
    expect(sheet).not.toBeNull();

    // Scoped <style> is not applied by happy-dom, so assert on the contract
    // that matters instead: nothing between the root and the sheet claims the
    // area above the sheet.
    const interactiveChildren = Array.from(root?.children ?? []).filter(
      (child) => !child.classList.contains("bottom-sheet"),
    );
    expect(interactiveChildren).toEqual([]);
  });

  test("dismissal is still reachable from the drag handle", () => {
    render(BottomSheetHost, { open: true });

    expect(
      screen.getByRole("button", { name: /Expand details|Collapse details/ }),
    ).toBeVisible();
  });

  test("renders nothing at all when closed", () => {
    const { container } = render(BottomSheetHost, { open: false });
    expect(container.querySelector(".bottom-sheet-root")).toBeNull();
  });

  test("a drag down past the dismiss threshold still dismisses", async () => {
    const onDismiss = vi.fn();
    const { container } = render(BottomSheetHost, { open: true, onDismiss });

    const sheet = container.querySelector(".bottom-sheet") as HTMLElement;
    const handle = container.querySelector(
      ".bottom-sheet__handle",
    ) as HTMLElement;

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientY: 100,
        bubbles: true,
        pointerId: 1,
      }),
    );
    sheet.dispatchEvent(
      new PointerEvent("pointermove", {
        clientY: 400,
        bubbles: true,
        pointerId: 1,
      }),
    );
    sheet.dispatchEvent(
      new PointerEvent("pointerup", {
        clientY: 400,
        bubbles: true,
        pointerId: 1,
      }),
    );

    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("bottom sheet peek fits its content", () => {
  const rect = (top: number, height: number) =>
    ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 390,
      width: 390,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;

  function stubLayout(container: HTMLElement, actionsBottom: number) {
    const root = container.querySelector(".bottom-sheet-root") as HTMLElement;
    const sheet = container.querySelector(".bottom-sheet") as HTMLElement;
    const actions = container.querySelector(".entity-actions") as HTMLElement;
    root.getBoundingClientRect = () => rect(0, 800);
    sheet.getBoundingClientRect = () => rect(0, 800);
    actions.getBoundingClientRect = () => rect(actionsBottom - 40, 40);
    window.dispatchEvent(new Event("resize"));
  }

  const translateOf = (container: HTMLElement) =>
    Number(
      /translate3d\(0, ([\d.]+)px/.exec(
        (container.querySelector(".bottom-sheet") as HTMLElement).style
          .transform,
      )?.[1],
    );

  test("ends just below the fitted element instead of at the ratio", async () => {
    const { container } = render(BottomSheetHost, {
      open: true,
      peekFitTo: ".entity-actions",
    });
    stubLayout(container, 200);
    // Mutation triggers a re-fit on the next frame.
    container.querySelector("p")?.append(" ");
    await vi.waitFor(() =>
      // 800 tall, actions end at 200 + 12px gap: 212 visible.
      expect(translateOf(container)).toBe(800 - 212),
    );
  });

  test("never shrinks below a quarter of the screen", async () => {
    const { container } = render(BottomSheetHost, {
      open: true,
      peekFitTo: ".entity-actions",
    });
    stubLayout(container, 60);
    container.querySelector("p")?.append(" ");
    await vi.waitFor(() => expect(translateOf(container)).toBe(800 - 200));
  });

  test("keeps the ratio without a fit target", async () => {
    const { container } = render(BottomSheetHost, { open: true });
    stubLayout(container, 200);
    await vi.waitFor(() =>
      expect(translateOf(container)).toBe(800 - Math.round(800 * 0.48)),
    );
  });
});

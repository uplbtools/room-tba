import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test } from "vitest";
import EditorAdditionModal from "@test/components/EditorAdditionModalHost.svelte";
import { editorChromeStore } from "@lib/store.svelte";

/**
 * #836: the "Add to map" popup stayed open when clicking outside it, unlike
 * every other map-chrome popover. The dismiss uses the shared window-level
 * pointerdown pattern (AppMenu / TermSelector / OfflineMaps /
 * KeyboardShortcutsPopup) rather than an onclick on the overlay div, which
 * would trip lint/a11y/useKeyWithClickEvents.
 */
describe("EditorAdditionModal click-outside dismiss", () => {
  afterEach(() => {
    editorChromeStore.closeAdditionModal();
  });

  test("pointerdown outside the dialog closes the modal", async () => {
    editorChromeStore.openAdditionModal();
    render(EditorAdditionModal);
    expect(screen.getByRole("dialog")).toBeVisible();

    await fireEvent.pointerDown(document.body);

    expect(editorChromeStore.additionModalOpen).toBe(false);
  });

  test("pointerdown inside the dialog keeps the modal open", async () => {
    editorChromeStore.openAdditionModal();
    render(EditorAdditionModal);
    const dialog = screen.getByRole("dialog");

    await fireEvent.pointerDown(dialog);

    expect(editorChromeStore.additionModalOpen).toBe(true);
  });

  test("the close button still dismisses the modal", async () => {
    editorChromeStore.openAdditionModal();
    render(EditorAdditionModal);

    await fireEvent.click(
      screen.getByRole("button", { name: /close add to map/i }),
    );

    expect(editorChromeStore.additionModalOpen).toBe(false);
  });

  test("the overlay carries no click handler (a11y: needs a key handler too)", () => {
    editorChromeStore.openAdditionModal();
    const { container } = render(EditorAdditionModal);
    const overlay = container.querySelector(".editor-addition-overlay");
    expect(overlay).not.toBeNull();
    // Svelte attaches delegated handlers as properties, not attributes.
    expect(overlay?.getAttribute("onclick")).toBeNull();
  });
});

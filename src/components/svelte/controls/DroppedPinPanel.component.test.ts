import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  additionProposalStore,
  directionsStore,
  editorChromeStore,
  toastStore,
} from "@lib/store.svelte";
import { droppedPinStore } from "@lib/dropped-pin.svelte";
import DroppedPinPanel from "./DroppedPinPanel.svelte";

const copy = vi.hoisted(() => vi.fn(async (_text: string) => {}));
vi.mock("@lib/clipboard", () => ({ copyTextToClipboard: copy }));

describe("DroppedPinPanel", () => {
  beforeEach(() => {
    droppedPinStore.drop(14.165123, 121.241384);
  });

  afterEach(() => {
    droppedPinStore.clear();
    directionsStore.close();
    editorChromeStore.closeAdditionModal();
    additionProposalStore.clearDraftPin();
    toastStore.clear();
    copy.mockClear();
  });

  test("names the spot and shows its coordinates", () => {
    render(DroppedPinPanel);
    expect(
      screen.getByRole("heading", { name: "Dropped pin" }),
    ).toBeInTheDocument();
    expect(screen.getByText("14.16512, 121.24138")).toBeInTheDocument();
  });

  test("copy coordinates puts lat, lng on the clipboard", async () => {
    render(DroppedPinPanel);
    await fireEvent.click(
      screen.getByRole("button", { name: /copy coordinates/i }),
    );
    expect(copy).toHaveBeenCalledWith("14.16512, 121.24138");
    await vi.waitFor(() =>
      expect(toastStore.message).toBe("Copied 14.16512, 121.24138."),
    );
  });

  test("add a missing place opens the form with the pin set here", async () => {
    render(DroppedPinPanel);
    await fireEvent.click(
      screen.getByRole("button", { name: /add a missing place here/i }),
    );
    expect(editorChromeStore.additionModalOpen).toBe(true);
    await vi.waitFor(() =>
      expect(additionProposalStore.draftPin).toEqual({
        lat: 14.165123,
        lon: 121.241384,
      }),
    );
  });

  test("directions to here plans a trip to the pin", async () => {
    render(DroppedPinPanel);
    await fireEvent.click(
      screen.getByRole("button", { name: /directions to here/i }),
    );
    expect(directionsStore.active).toBe(true);
    expect(directionsStore.destination).toMatchObject({
      lat: 14.165123,
      lng: 121.241384,
      label: "Dropped pin",
    });
  });

  test("closing the sheet lifts the pin", () => {
    const { unmount } = render(DroppedPinPanel);
    unmount();
    expect(droppedPinStore.at).toBeNull();
  });
});

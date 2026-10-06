import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import EntityHistoryModal from "./EntityHistoryModal.svelte";
import { modalStore } from "@lib/store.svelte";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

const entry = (id: number, name: string) => ({
  id,
  action: "update",
  by: "Stim",
  createdAt: "2026-09-08T16:57:21Z",
  changes: [
    { field: "buildingName", label: "Name", before: "Old", after: name },
  ],
});

afterEach(() => {
  vi.unstubAllGlobals();
  modalStore.closeModal();
});

describe("EntityHistoryModal", () => {
  test("names the entity and shows times in campus time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          entries: [entry(1, "LHKCB Building")],
          nextOffset: null,
        }),
      ),
    );
    modalStore.openModal("entity-history", {
      historyEntity: { entityType: "building", entityId: 30, name: "LHKCB" },
    });
    render(EntityHistoryModal);

    expect(screen.getByText("LHKCB")).toBeInTheDocument();
    expect(await screen.findByText("LHKCB Building")).toBeInTheDocument();
    expect(screen.getByText("Sep 9, 2026, 12:57 AM PHT")).toBeInTheDocument();
  });

  test("offers older edits when a page held only hidden ones", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ entries: [], nextOffset: 500 }))
      .mockResolvedValueOnce(
        jsonResponse({ entries: [entry(2, "Older name")], nextOffset: null }),
      );
    vi.stubGlobal("fetch", fetchMock);
    modalStore.openModal("entity-history", {
      historyEntity: { entityType: "building", entityId: 30 },
    });
    render(EntityHistoryModal);

    const more = await screen.findByRole("button", {
      name: "Show older edits",
    });
    expect(screen.queryByText("No recorded edits yet.")).toBeNull();
    await fireEvent.click(more);
    expect(await screen.findByText("Older name")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("offset=500");
  });

  test("ignores a slow response for the previous entity", async () => {
    let releaseFirst: (r: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          releaseFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [entry(3, "Second entity")],
          nextOffset: null,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    modalStore.openModal("entity-history", {
      historyEntity: { entityType: "building", entityId: 1 },
    });
    render(EntityHistoryModal);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    modalStore.openModal("entity-history", {
      historyEntity: { entityType: "building", entityId: 2 },
    });
    expect(await screen.findByText("Second entity")).toBeInTheDocument();

    releaseFirst(
      jsonResponse({ entries: [entry(4, "First entity")], nextOffset: null }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("First entity")).toBeNull();
    expect(screen.getByText("Second entity")).toBeInTheDocument();
  });
});

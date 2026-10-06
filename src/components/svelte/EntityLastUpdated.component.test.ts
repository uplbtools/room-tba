import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import EntityLastUpdated from "@ui/EntityLastUpdated.svelte";
import { modalStore } from "@lib/store.svelte";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  modalStore.closeModal();
});

describe("EntityLastUpdated", () => {
  test("credits who added and who last edited the entity", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          attribution: {
            addedBy: "Juan Dela Cruz",
            addedAt: "2026-07-01T00:00:00Z",
            lastEditedBy: "Room TBA team",
            lastEditedAt: "2026-09-08T08:57:22Z",
          },
        }),
      ),
    );

    render(EntityLastUpdated, {
      updatedAt: "2026-09-08T08:57:22Z",
      entityType: "place",
      entityId: 7,
    });

    expect(
      await screen.findByText(
        /Added by Juan Dela Cruz, last edited by Room TBA team on/,
      ),
    ).toBeInTheDocument();
  });

  test("keeps the plain timestamp and history link when the lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    render(EntityLastUpdated, {
      updatedAt: "2026-09-08T08:57:22Z",
      entityType: "place",
      entityId: 7,
    });

    expect(await screen.findByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.queryByText(/Added by|edited by/)).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "Edit history" }));
    expect(modalStore.type).toBe("entity-history");
    expect(modalStore.historyEntity).toEqual({
      entityType: "place",
      entityId: 7,
    });
  });
});

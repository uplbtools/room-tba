import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ProposalReviewPanelHost from "@test/components/ProposalReviewPanelHost.svelte";
import { adminAuthStore, proposalsStore } from "@lib/store.svelte";
import { EMPTY_REVIEW_FILTERS } from "@lib/proposals/review-queue-params";

function proposal(id: number, submitterName = "Yeyel") {
  return {
    id,
    entityType: "room",
    entityId: id,
    entityLabel: `Room ${id}`,
    status: "pending",
    submitterName,
    proposedPatch: { roomName: `Room ${id}` },
    adminNote: null,
    createdAt: new Date().toISOString(),
    baseVersion: 1,
    currentValues: { roomName: "Old" },
    currentVersion: 1,
  };
}

describe("review queue filters and paging (auth audit item 17)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.filters = { ...EMPTY_REVIEW_FILTERS };
    proposalsStore.pendingCount = 30;
    proposalsStore.matchCount = 30;
    proposalsStore.submitters = ["Yeyel", "Stimmie"];
    proposalsStore.proposals = [proposal(1), proposal(2)];
    proposalsStore.nextCursor = "cursor-1";
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("cursor=cursor-1")) {
        return new Response(
          JSON.stringify({
            proposals: [proposal(3)],
            nextCursor: null,
            pendingCount: 30,
          }),
        );
      }
      return new Response(
        JSON.stringify({
          proposals: [proposal(9, "Stimmie")],
          nextCursor: null,
          pendingCount: 30,
          matchCount: 1,
          submitters: ["Yeyel", "Stimmie"],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("choosing a submitter refetches with that filter", async () => {
    render(ProposalReviewPanelHost);
    await fireEvent.change(screen.getByLabelText("Submitter"), {
      target: { value: "Stimmie" },
    });
    await waitFor(() => expect(screen.getByText("Room 9")).toBeVisible());
    const url = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(url).toContain("submitter=Stimmie");
    expect(screen.getByRole("status").textContent).toMatch(/1 of 30 match/);
  });

  test("type and age filters go to the server", async () => {
    render(ProposalReviewPanelHost);
    await fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "create_room" },
    });
    await fireEvent.change(screen.getByLabelText("Waiting"), {
      target: { value: "7" },
    });
    await waitFor(() => {
      const url = String(fetchMock.mock.calls.at(-1)?.[0]);
      expect(url).toContain("entityType=create_room");
      expect(url).toContain("olderThanDays=7");
    });
  });

  test("Show more appends the next page", async () => {
    render(ProposalReviewPanelHost);
    await fireEvent.click(screen.getByRole("button", { name: /Show more/ }));
    await waitFor(() => expect(screen.getByText("Room 3")).toBeVisible());
    expect(screen.getByText("Room 1")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull();
  });

  test("filtered empty state says so and can be cleared", async () => {
    proposalsStore.filters = { ...EMPTY_REVIEW_FILTERS, q: "nothing" };
    proposalsStore.proposals = [];
    proposalsStore.nextCursor = null;
    render(ProposalReviewPanelHost);
    expect(
      screen.getByText("No suggestions match these filters."),
    ).toBeVisible();
    await fireEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );
    expect(proposalsStore.filters.q).toBeNull();
  });
});

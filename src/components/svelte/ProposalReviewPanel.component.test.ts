import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ProposalReviewPanelHost from "@test/components/ProposalReviewPanelHost.svelte";
import { adminAuthStore, proposalsStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";

function baseProposal() {
  return {
    id: 7,
    entityType: "building",
    entityId: 12,
    entityLabel: "Old Hall",
    status: "pending",
    submitterName: "Yeyel",
    proposedPatch: { directions: "Enter from the east gate" },
    adminNote: null,
    createdAt: new Date().toISOString(),
    baseVersion: 3,
    currentValues: { directions: "Enter from the west gate" },
    currentVersion: 3,
  };
}

describe("ProposalReviewPanel diffs", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
  });

  test("renders before and after for a changed field at 320px", () => {
    mountAtWidth(320);
    proposalsStore.proposals = [baseProposal()];
    render(ProposalReviewPanelHost);
    expect(screen.getByText("Directions")).toBeVisible();
    expect(screen.getByText("Enter from the west gate")).toBeVisible();
    expect(screen.getByText("Enter from the east gate")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("shows stale banner when published version moved past baseVersion", () => {
    proposalsStore.proposals = [{ ...baseProposal(), currentVersion: 5 }];
    render(ProposalReviewPanelHost);
    expect(screen.getByRole("alert").textContent).toMatch(
      /published data changed/i,
    );
  });

  test("create proposals show New entry as the before value", () => {
    proposalsStore.proposals = [
      {
        ...baseProposal(),
        entityType: "create_room",
        entityId: 0,
        baseVersion: 0,
        proposedPatch: { roomCode: "CEM 203" },
        currentValues: null,
        currentVersion: null,
      },
    ];
    render(ProposalReviewPanelHost);
    expect(screen.getByText("New entry")).toBeVisible();
    expect(screen.getByText("CEM 203")).toBeVisible();
  });
});

describe("ProposalReviewPanel batch approve", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 2;
    proposalsStore.refresh = vi.fn(() => Promise.resolve());
    proposalsStore.proposals = [
      { ...baseProposal(), id: 7, entityLabel: "Old Hall" },
      { ...baseProposal(), id: 8, entityLabel: "New Hall" },
    ];
  });

  test("select all then approve posts an approve for every selected proposal", async () => {
    // Response omits proposal.entityType so approveOne skips the
    // published-entity side effects (no app-context dependency in the test).
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);

    const approveBtn = screen.getByRole("button", {
      name: /approve 0 selected/i,
    });
    expect(approveBtn).toBeDisabled();

    await fireEvent.click(screen.getByLabelText(/select all/i));
    expect(
      screen.getByRole("button", { name: /approve 2 selected/i }),
    ).toBeEnabled();

    await fireEvent.click(
      screen.getByRole("button", { name: /approve 2 selected/i }),
    );

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).toContain("/api/admin/proposals/7/approve");
      expect(urls).toContain("/api/admin/proposals/8/approve");
    });

    vi.unstubAllGlobals();
  });
});

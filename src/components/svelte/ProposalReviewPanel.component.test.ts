import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
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

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

/** Rows start collapsed (#873), so open one before asserting on its body. */
async function expandFirstRow() {
  const summaries = document.querySelectorAll("summary");
  const first = summaries[0];
  if (!first) throw new Error("no proposal row rendered");
  await fireEvent.click(first);
}

describe("ProposalReviewPanel diffs", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
  });

  test("renders before and after for a changed field at 320px", async () => {
    mountAtWidth(320);
    proposalsStore.proposals = [baseProposal()];
    render(ProposalReviewPanelHost);
    await expandFirstRow();
    expect(screen.getByText("Directions")).toBeVisible();
    expect(screen.getByText("Enter from the west gate")).toBeVisible();
    expect(screen.getByText("Enter from the east gate")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("collapsed rows keep the diff body out of the DOM", () => {
    proposalsStore.proposals = [baseProposal()];
    render(ProposalReviewPanelHost);
    // The row is listed, but its diffs and buttons are not mounted yet.
    expect(screen.getByText("Old Hall")).toBeVisible();
    expect(screen.queryByText("Enter from the east gate")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  test("shows stale banner when published version moved past baseVersion", async () => {
    proposalsStore.proposals = [{ ...baseProposal(), currentVersion: 5 }];
    render(ProposalReviewPanelHost);
    await expandFirstRow();
    expect(screen.getByRole("alert").textContent).toMatch(
      /published data changed/i,
    );
  });

  test("create proposals show New entry as the before value", async () => {
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
    await expandFirstRow();
    expect(screen.getByText("New entry")).toBeVisible();
    expect(screen.getByText("CEM 203")).toBeVisible();
  });
});

describe("ProposalReviewPanel foreign keys (#873)", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
  });

  test("a building reassignment shows names, not raw row ids", async () => {
    // loadedAppContext() seeds building id 1 as "Class Hall".
    proposalsStore.proposals = [
      {
        ...baseProposal(),
        entityType: "room",
        proposedPatch: { buildingId: 1 },
        currentValues: { buildingId: 99 },
      },
    ];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(screen.getByText("Building")).toBeVisible();
    expect(screen.getByText("Class Hall")).toBeVisible();
    // The id stays available as secondary text next to the name.
    expect(screen.getByText("#1")).toBeVisible();
    // Unresolvable ids still fall back to the raw number rather than vanishing.
    expect(screen.getByText("99")).toBeVisible();
  });
});

describe("ProposalReviewPanel note flow (#873)", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
    proposalsStore.proposals = [baseProposal()];
  });

  test("the note field appears only after choosing reject", async () => {
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(screen.queryByLabelText(/note to yeyel/i)).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    const note = screen.getByLabelText(/note to yeyel/i);
    expect(note).toBeVisible();
    // The rule lives in visible hint text, not a placeholder that vanishes.
    expect(
      screen.getByText(/optional\. the contributor sees this/i),
    ).toBeVisible();
  });

  test("request changes keeps confirm disabled until a note is written", async () => {
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    await fireEvent.click(
      screen.getByRole("button", { name: "Request changes" }),
    );
    expect(
      screen.getByText(/required\. say what needs to change/i),
    ).toBeVisible();

    const confirm = screen.getByRole("button", {
      name: /confirm request changes/i,
    });
    expect(confirm).toBeDisabled();

    await fireEvent.input(screen.getByLabelText(/note to yeyel/i), {
      target: { value: "Please cite a source." },
    });
    expect(confirm).toBeEnabled();
  });

  test("shows the contributor's note to the reviewer", async () => {
    proposalsStore.proposals = [
      {
        ...baseProposal(),
        submitterNote: "You may opt to remove this room from the app.",
      },
    ];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(
      screen.getByText(/you may opt to remove this room from the app/i),
    ).toBeVisible();
  });
});

describe("ProposalReviewPanel bulk actions", () => {
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
      name: /approve selected/i,
    });
    // The disabled default reads as an action, not "Approve 0 selected".
    expect(approveBtn).toBeDisabled();

    await fireEvent.click(screen.getByLabelText(/^select all$/i));
    expect(approveBtn).toBeEnabled();
    expect(screen.getByText(/2 selected/)).toBeVisible();

    await fireEvent.click(approveBtn);

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).toContain("/api/admin/proposals/7/approve");
      expect(urls).toContain("/api/admin/proposals/8/approve");
    });

    vi.unstubAllGlobals();
  });

  test("bulk reject posts a reject with the shared note", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await fireEvent.click(screen.getByLabelText(/^select all$/i));
    await fireEvent.click(
      screen.getByRole("button", { name: /reject selected/i }),
    );

    await fireEvent.input(screen.getByLabelText(/note for 2 selected/i), {
      target: { value: "Duplicate of an existing entry." },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^reject 2$/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).toContain("/api/admin/proposals/7/reject");
      expect(urls).toContain("/api/admin/proposals/8/reject");
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.note).toBe("Duplicate of an existing entry.");

    vi.unstubAllGlobals();
  });

  test("groups a submitter's suggestions and selects them as a set", async () => {
    proposalsStore.proposals = [
      { ...baseProposal(), id: 7, submitterName: "Yeyel" },
      { ...baseProposal(), id: 8, submitterName: "Yeyel" },
      { ...baseProposal(), id: 9, submitterName: "Ana" },
    ];
    render(ProposalReviewPanelHost);

    await fireEvent.click(
      screen.getByLabelText(/select all 2 suggestions from yeyel/i),
    );
    expect(screen.getByText(/2 selected/)).toBeVisible();
  });
});

function pinProposal() {
  return {
    ...baseProposal(),
    proposedPatch: { lat: 14.1663, lon: 121.2412 },
    currentValues: { lat: 14.1661, lon: 121.241 },
  };
}

describe("ProposalReviewPanel map preview", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
  });

  test("offers a preview for a proposal that moves a pin", async () => {
    proposalsStore.proposals = [pinProposal()];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(
      screen.getByRole("button", { name: /show map preview/i }),
    ).toBeVisible();
  });

  // Each preview is a WebGL map and browsers cap live contexts, so it must stay
  // closed until asked for.
  test("the preview starts closed", async () => {
    proposalsStore.proposals = [pinProposal()];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    const toggle = screen.getByRole("button", { name: /show map preview/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  test("no preview for a proposal that does not move a pin", async () => {
    proposalsStore.proposals = [baseProposal()];
    render(ProposalReviewPanelHost);
    await expandFirstRow();

    expect(screen.queryByRole("button", { name: /map preview/i })).toBeNull();
  });
});

describe("ProposalReviewPanel undo after approve", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.canReview = true;
    proposalsStore.loading = false;
    proposalsStore.pendingCount = 1;
    proposalsStore.refresh = vi.fn(() => Promise.resolve());
    proposalsStore.proposals = [baseProposal()];
  });

  test("approve is held, not written, while undo is offered", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await expandFirstRow();
    await fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    // The recovery path is that the request has not left yet.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/publishing in/i);
    expect(screen.getByRole("button", { name: /^undo$/i })).toBeVisible();

    // Unmount flushes a held approve on purpose, so cleanup() would commit this
    // one after the stub is gone and post to a real localhost.
    await fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));
    vi.unstubAllGlobals();
  });

  test("undo restores the suggestion and never posts", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    const row = () => document.querySelector('[data-proposal-row="7"]');

    render(ProposalReviewPanelHost);
    await expandFirstRow();
    await fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    // Held rows leave the queue optimistically (the label survives in the
    // undo banner, so assert on the row itself, not the text).
    expect(row()).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(row()).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();

    vi.unstubAllGlobals();
  });

  test("publish now commits the held approve immediately", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await expandFirstRow();
    await fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await fireEvent.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.map((c) => String(c[0]))).toContain(
        "/api/admin/proposals/7/approve",
      );
    });

    vi.unstubAllGlobals();
  });
});

describe("ProposalReviewPanel keyboard shortcuts", () => {
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

  test("the shortcut hint is visible, not hidden in a help modal", () => {
    render(ProposalReviewPanelHost);
    expect(screen.getByText(/next \/ previous suggestion/i)).toBeVisible();
  });

  test("J focuses a row and A approves it", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await fireEvent.keyDown(window, { key: "j" });
    await fireEvent.keyDown(window, { key: "a" });

    expect(screen.getByRole("status").textContent).toMatch(/Old Hall/);

    // Same reason as the undo suite: release the hold before the stub goes.
    await fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));
    vi.unstubAllGlobals();
  });

  test("R opens the reject note step rather than rejecting outright", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await fireEvent.keyDown(window, { key: "j" });
    await fireEvent.keyDown(window, { key: "r" });

    expect(screen.getByLabelText(/note to yeyel/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  // The reason the typing guard exists: "a" and "r" are common letters.
  test("typing a note never triggers a review action", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(ProposalReviewPanelHost);
    await expandFirstRow();
    await fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    const note = screen.getByLabelText(/note to yeyel/i);
    await fireEvent.keyDown(note, { key: "a" });
    await fireEvent.keyDown(note, { key: "r" });
    await fireEvent.keyDown(note, { key: "j" });

    // No approve was held and no request was sent.
    expect(screen.queryByRole("status")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

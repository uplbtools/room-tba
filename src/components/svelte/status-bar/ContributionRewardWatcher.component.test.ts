import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { adminAuthStore, toastStore } from "@lib/store.svelte";
import ContributionRewardWatcher from "./ContributionRewardWatcher.svelte";

const CONTRIBUTOR_ID = "11111111-1111-4111-8111-111111111111";

function stubMe(recent: { id: number; points: number }[], total = 1) {
  const fetchMock = vi.fn(async () =>
    Response.json({
      me: {
        key: "cme",
        displayName: "Me",
        rank: 12,
        points: 5,
        contributionCount: 1,
        breakdown: { place: 1, rooms: 0, photo: 0, position: 0, text: 0 },
        toPass: null,
        optedOut: false,
        totalContributions: total,
        badges: [],
        recent: recent.map((item) => ({
          ...item,
          kind: "place",
          entityLabel: "Main Library",
          createdAt: "2026-10-01T00:00:00Z",
        })),
      },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  toastStore.clear();
  adminAuthStore.isLoggedIn = false;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ContributionRewardWatcher", () => {
  test("toasts points, rank and a new badge once after an approval", async () => {
    localStorage.setItem("room-tba-contributor-id", CONTRIBUTOR_ID);
    localStorage.setItem("room-tba-contribution-reward-seen", "0");
    stubMe([{ id: 41, points: 5 }]);

    render(ContributionRewardWatcher);
    await vi.advanceTimersByTimeAsync(5000);

    expect(toastStore.message).toBe(
      "+5, you're #12 this month. New badge: First edit",
    );
    expect(localStorage.getItem("room-tba-contribution-reward-seen")).toBe(
      "41",
    );
  });

  test("first check for an existing account only records where it is", async () => {
    adminAuthStore.isLoggedIn = true;
    stubMe([{ id: 90, points: 3 }], 30);

    render(ContributionRewardWatcher);
    await vi.advanceTimersByTimeAsync(5000);

    expect(toastStore.message).toBeNull();
    expect(localStorage.getItem("room-tba-contribution-reward-seen")).toBe(
      "90",
    );
  });

  test("people who never contributed cost no request", async () => {
    const fetchMock = stubMe([]);
    render(ContributionRewardWatcher);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

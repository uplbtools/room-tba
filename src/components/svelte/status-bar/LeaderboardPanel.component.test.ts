import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LeaderboardPanel from "./LeaderboardPanel.svelte";

const breakdown = (text: number, place = 0) => ({
  place,
  rooms: 0,
  photo: 0,
  position: 0,
  text,
});

const rows = [
  {
    rank: 1,
    key: "u1",
    displayName: "Ana Reyes",
    points: 5,
    contributionCount: 5,
    breakdown: breakdown(5),
    medal: 1,
    gettingStarted: false,
    lastContributionAt: "2026-10-01T00:00:00Z",
  },
  {
    rank: 1,
    key: "u2",
    displayName: "Ben Cruz",
    points: 5,
    contributionCount: 1,
    breakdown: breakdown(0, 1),
    medal: 1,
    gettingStarted: false,
    lastContributionAt: "2026-10-02T00:00:00Z",
  },
  {
    rank: 3,
    key: "cabc",
    displayName: "Cara Lim with a very long name that wraps",
    points: 3,
    contributionCount: 3,
    breakdown: breakdown(3),
    medal: 3,
    gettingStarted: false,
    lastContributionAt: "2026-10-03T00:00:00Z",
  },
  {
    rank: 4,
    key: "ndan",
    displayName: "Dan Uy",
    points: 1,
    contributionCount: 1,
    breakdown: breakdown(1),
    medal: null,
    gettingStarted: true,
    lastContributionAt: "2026-10-04T00:00:00Z",
  },
];

const CONTRIBUTOR_ID = "11111111-1111-4111-8111-111111111111";

function stubApi(overrides: { me?: unknown } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/contributors/leaderboard")) {
      return new Response(
        JSON.stringify({
          rows,
          period: url.includes("window=all")
            ? null
            : {
                label: "October 2026",
                endsAt: "2026-10-31T16:00:00Z",
                daysLeft: 24,
              },
          hallOfFame: [
            {
              label: "September 2026",
              winners: [{ key: "u9", displayName: "Gina Tan", points: 24 }],
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (url.startsWith("/api/contributors/me")) {
      return new Response(JSON.stringify({ me: overrides.me ?? null }), {
        status: 200,
      });
    }
    if (url.startsWith("/api/contributors/profile")) {
      return new Response(
        JSON.stringify({
          profile: {
            key: "u2",
            displayName: "Ben Cruz",
            avatarUrl: null,
            profileUrl: null,
            joinedAt: "2026-08-01T00:00:00Z",
            points: 5,
            contributionCount: 1,
            breakdown: breakdown(0, 1),
            badges: [
              { id: "first", label: "First edit", threshold: 1, earned: true },
              { id: "ten", label: "10 edits", threshold: 10, earned: false },
              { id: "fifty", label: "50 edits", threshold: 50, earned: false },
            ],
            recent: [
              {
                id: 7,
                kind: "place",
                entityLabel: "Main Library",
                href: "/building/main-library/",
                createdAt: "2026-10-02T00:00:00Z",
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    if (url.includes("/api/contributor-progress")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            topBuildings: [
              {
                buildingId: 5,
                buildingName: "Physical Sciences",
                roomTotal: 10,
                directions: { filled: 4, total: 10 },
                schedule: { filled: 10, total: 10 },
                position: { filled: 1, total: 10 },
                gapScore: 15,
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LeaderboardPanel", () => {
  test("ties share a rank, medals need the minimum, avatars differ", async () => {
    stubApi();
    const { container } = render(LeaderboardPanel);

    await screen.findByText("Ana Reyes");
    const items = Array.from(
      container.querySelectorAll<HTMLElement>("ol.lb-list > li"),
    );
    expect(items).toHaveLength(4);
    expect(screen.getAllByRole("img", { name: /^Rank 1, gold$/ })).toHaveLength(
      2,
    );
    expect(screen.getByRole("img", { name: "Rank 3, bronze" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: /Rank 2/ })).toBeNull();
    // Below the minimum: plain rank and "Getting started", no medal.
    expect(within(items[3]!).getByText("Getting started")).toBeTruthy();
    expect(items[3]?.textContent).toMatch(/1\s*point\s*$/);

    const colors = new Set(
      items.map(
        (item) =>
          (item.querySelector(".avatar") as HTMLElement).style.background,
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  test("period is a segmented control with the days left", async () => {
    const fetchMock = stubApi();
    render(LeaderboardPanel);

    const group = await screen.findByRole("radiogroup", { name: "Period" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.textContent?.trim())).toEqual([
      "This month",
      "This semester",
      "All time",
    ]);
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    expect(await screen.findByText("Ends in 24 days")).toBeTruthy();

    await fireEvent.click(radios[2]!);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("window=all"),
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(screen.queryByText("Ends in 24 days")).toBeNull(),
    );
  });

  test("tapping points shows the breakdown", async () => {
    stubApi();
    render(LeaderboardPanel);

    const score = await screen.findAllByRole("button", {
      name: /show breakdown/,
    });
    await fireEvent.click(score[1]!);
    const breakdownList = await screen.findByRole("list", {
      name: "Points breakdown",
    });
    expect(within(breakdownList).getByText("New places")).toBeTruthy();
    expect(score[1]?.getAttribute("aria-expanded")).toBe("true");
  });

  test("pins your rank with the gap to the next place", async () => {
    localStorage.setItem("room-tba-contributor-id", CONTRIBUTOR_ID);
    const fetchMock = stubApi({
      me: {
        key: "cme",
        displayName: "Me",
        rank: 34,
        points: 6,
        contributionCount: 3,
        breakdown: breakdown(6),
        toPass: { points: 3, rank: 33 },
        optedOut: false,
        totalContributions: 3,
        badges: [],
        recent: [],
      },
    });
    render(LeaderboardPanel);

    const mine = await screen.findByLabelText("Your rank");
    expect(within(mine).getByText("#34")).toBeTruthy();
    expect(within(mine).getByText("3 more to pass #33")).toBeTruthy();
    expect(within(mine).getByText("6")).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes(`contributorId=${CONTRIBUTOR_ID}`),
      ),
    ).toBe(true);
  });

  test("tapping a name opens the contributor profile", async () => {
    const fetchMock = stubApi();
    render(LeaderboardPanel);

    await fireEvent.click(
      await screen.findByRole("button", { name: "View profile of Ben Cruz" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Ben Cruz" }),
    ).toBeTruthy();
    expect(screen.getByText("Joined August 2026")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Main Library/ }).getAttribute("href"),
    ).toBe("/building/main-library/");
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).startsWith("/api/contributors/profile?key=u2"),
      ),
    ).toBe(true);

    await fireEvent.click(
      screen.getByRole("button", { name: "Back to leaderboard" }),
    );
    expect(
      await screen.findByRole("radiogroup", { name: "Period" }),
    ).toBeTruthy();
  });

  test("hall of fame and buildings needing work, with no interpuncts", async () => {
    stubApi();
    const { container } = render(LeaderboardPanel);

    expect(
      await screen.findByRole("heading", { name: "Hall of fame" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gina Tan" })).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "Buildings needing work" }),
    ).toBeTruthy();
    expect(screen.getByText("Missing 6 directions, 9 room pins")).toBeTruthy();
    expect(container.textContent).not.toContain("\u00b7");
  });
});

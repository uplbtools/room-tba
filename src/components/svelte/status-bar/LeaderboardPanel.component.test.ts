import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import LeaderboardPanel from "./LeaderboardPanel.svelte";

const rows = [
  { rank: 1, displayName: "Ana Reyes", contributionCount: 5 },
  { rank: 2, displayName: "Ben Cruz", contributionCount: 5 },
  { rank: 3, displayName: "Cara Lim", contributionCount: 2 },
  { rank: 4, displayName: "Dan Uy", contributionCount: 1 },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LeaderboardPanel", () => {
  test("ties share a rank, counts pluralize, and avatars differ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rows }),
        } as Response),
      ),
    );
    render(LeaderboardPanel);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(4);
    // Ana and Ben tie on 5: both first. Cara is third, not second.
    expect(screen.getAllByRole("img", { name: "Rank 1" })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Rank 3" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Rank 2" })).toBeNull();

    expect(items[3]?.textContent).toMatch(/1\s*edit$/);
    expect(items[0]?.textContent).toMatch(/5\s*edits$/);

    const colors = new Set(
      items.map(
        (item) =>
          (item.querySelector(".avatar") as HTMLElement).style.background,
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});

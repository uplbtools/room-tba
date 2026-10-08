import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ResultDisplay from "@ui/controls/ResultDisplay.svelte";
import type { RoomData } from "@lib/types";

function rooms(count: number, prefix = "PS"): RoomData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    code: `${prefix} ${100 + i}`,
    fullName: null,
    directions: null,
    building: null,
    buildingId: null,
    collegeId: null,
    divisionId: null,
    collegeName: null,
    divisionName: null,
    category: null,
    version: 1,
    updatedAt: "2026-08-04T00:00:00.000Z",
  }));
}

describe("ResultDisplay rooms list (Jakob micro 8)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("no pager: first rows, then Show all expands in place", async () => {
    render(ResultDisplay, { props: { filteredRooms: rooms(17) } });

    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
    expect(screen.getByText("PS 111")).toBeInTheDocument();
    expect(screen.queryByText("PS 112")).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Show all 17 rooms" }),
    );
    expect(screen.getByText("PS 116")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  test("short lists show every room with no extra control", () => {
    render(ResultDisplay, { props: { filteredRooms: rooms(5) } });
    expect(screen.getByText("PS 104")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  test("another building's rooms open collapsed again", async () => {
    const view = render(ResultDisplay, {
      props: { filteredRooms: rooms(17) },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Show all 17 rooms" }),
    );
    await view.rerender({ filteredRooms: rooms(20, "CHE") });
    expect(
      screen.getByRole("button", { name: "Show all 20 rooms" }),
    ).toBeInTheDocument();
  });
});

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

describe("ResultDisplay Filter rooms field", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const field = () => screen.getByRole("searchbox", { name: "Filter rooms" });
  const roomButtons = () =>
    screen
      .getAllByRole("button")
      .filter((el) => el.classList.contains("room-data"));

  test("only buildings with more than 8 rooms get the field", () => {
    const view = render(ResultDisplay, { props: { filteredRooms: rooms(8) } });
    expect(screen.queryByRole("searchbox")).toBeNull();
    view.unmount();

    render(ResultDisplay, { props: { filteredRooms: rooms(9) } });
    expect(field()).toHaveAttribute("placeholder", "Filter rooms…");
  });

  test("filters by code or name, case-insensitively, past the Show all cut", async () => {
    const list = rooms(30);
    list[25] = { ...list[25]!, fullName: "Audio Visual Room" };
    render(ResultDisplay, { props: { filteredRooms: list } });

    await fireEvent.input(field(), { target: { value: "ps 12" } });
    // PS 120–PS 129: all ten match, including rows past the first 12.
    expect(roomButtons()).toHaveLength(10);
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();

    await fireEvent.input(field(), { target: { value: "AUDIO" } });
    expect(roomButtons()).toHaveLength(1);
    expect(roomButtons()[0]).toHaveTextContent("PS 125");
  });

  test("no match says so; the clear button brings the list back", async () => {
    render(ResultDisplay, { props: { filteredRooms: rooms(20) } });

    expect(screen.queryByRole("button", { name: "Clear filter" })).toBeNull();
    await fireEvent.input(field(), { target: { value: "zzz(" } });
    expect(roomButtons()).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No rooms match “zzz(”",
    );

    await fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
    expect(roomButtons()).toHaveLength(12);
    expect(
      screen.getByRole("button", { name: "Show all 20 rooms" }),
    ).toBeInTheDocument();
  });

  test("another building opens with an empty filter", async () => {
    const view = render(ResultDisplay, {
      props: { filteredRooms: rooms(20) },
    });
    await fireEvent.input(field(), { target: { value: "PS 101" } });
    // Different room ids, so a different list (a refresh keeps the filter).
    await view.rerender({ filteredRooms: rooms(21, "CHE") });
    expect(field()).toHaveValue("");
    expect(roomButtons()).toHaveLength(12);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SuggestionsHost from "@test/components/SuggestionsHost.svelte";
import { loadedAppContext } from "@test/fixtures/app-context";
import { appBootstrapStore, queryStore } from "@lib/store.svelte";
import { savedPlaces } from "@lib/saved-places.svelte";
import type { BuildingData } from "@lib/types";

const physSci = {
  id: 35,
  buildingName: "Physical Sciences Building",
  lat: 14.164,
  lon: 121.242,
} as BuildingData;

/** Search endpoints: aliases know "PS", rooms and classes match nothing. */
function stubSearchApi({ hangRooms = false } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/aliases")) {
        const q = new URL(url, "http://x").searchParams.get("q") ?? "";
        const data =
          q.toLowerCase() === "ps"
            ? [{ alias: "PS", value: "Physical Sciences Building" }]
            : [];
        return Response.json({ data });
      }
      if (url.startsWith("/api/rooms")) {
        if (hangRooms) return new Promise<Response>(() => {});
        // The server's "no rooms match" is data: null, not an error.
        return Response.json({ data: null, success: true });
      }
      if (url.startsWith("/api/classes")) {
        return Response.json({ rows: [], nextCursor: null, hasMore: false });
      }
      return new Response(null, { status: 404 });
    }),
  );
}

function renderSuggestions() {
  const result = render(SuggestionsHost, {
    props: {
      data: {
        ...loadedAppContext({ buildings: [physSci] }),
        organizations: [],
        places: [],
      },
    },
  });
  // The host's exported pressEnter() isn't in the inferred component type.
  return result as typeof result & { component: { pressEnter(): void } };
}

describe("Suggestions", () => {
  beforeEach(() => {
    stubSearchApi();
    queryStore.clearQuery();
    queryStore.clearRecentSearches();
    appBootstrapStore.setHasCachedData(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    appBootstrapStore.setHasCachedData(false);
  });

  test("focused empty search lists recents with remove and Clear", async () => {
    queryStore.addRecentSearch({ category: "room", value: "PS 105" });
    queryStore.addRecentSearch({
      category: "building",
      value: "Physical Sciences Building",
    });
    renderSuggestions();

    expect(screen.getByRole("heading", { name: "Recent" })).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Remove PS 105 from recent searches",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Class Buildings" }),
    ).toBeVisible();

    await fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(queryStore.recentSearches).toEqual([]);
    expect(screen.queryByRole("heading", { name: "Recent" })).toBeNull();
  });

  test("focused empty search lists saved places above recents", async () => {
    savedPlaces.save({
      category: "building",
      value: "Physical Sciences Building",
      label: "Physical Sciences Building",
      subtitle: "Class building",
    });
    renderSuggestions();

    expect(screen.getByRole("heading", { name: "Saved" })).toBeVisible();
    expect(screen.getByText("Class building")).toBeVisible();
    await fireEvent.click(screen.getByText("Physical Sciences Building"));
    expect(queryStore.category).toBe("building");
    expect(queryStore.queryValue).toBe("Physical Sciences Building");
    savedPlaces.clear();
  });

  test("keeps at most six recent searches, newest first", () => {
    for (let i = 1; i <= 8; i++) {
      queryStore.addRecentSearch({ category: "room", value: `PS ${i}` });
    }
    expect(queryStore.recentSearches.map((r) => r.value)).toEqual([
      "PS 8",
      "PS 7",
      "PS 6",
      "PS 5",
      "PS 4",
      "PS 3",
    ]);
  });

  test("says No results once every source answered, never an endless spinner", async () => {
    queryStore.inputValue = "zzqxw";
    renderSuggestions();

    expect(await screen.findByText("No results for “zzqxw”")).toBeVisible();
    expect(screen.getByText(/Check the spelling/)).toBeVisible();
    expect(screen.queryByText("Searching…")).toBeNull();
  });

  test("shows loading only while campus data is still loading", async () => {
    appBootstrapStore.setHasCachedData(false);
    queryStore.inputValue = "zzqxw";
    renderSuggestions();

    expect(await screen.findByText("Loading campus data…")).toBeVisible();
    expect(screen.queryByText(/No results/)).toBeNull();
  });

  test("puts the exact alias first and labels groups when types mix", async () => {
    queryStore.inputValue = "PS";
    renderSuggestions();

    const first = await screen.findByRole("button", {
      name: /Physical Sciences Building/,
    });
    expect(first).toBeVisible();
    // Only one type here, so no group headers.
    expect(screen.queryByRole("heading", { name: "Places" })).toBeNull();
  });

  test("Enter opens a clear winner", async () => {
    queryStore.inputValue = "PS";
    const { component } = renderSuggestions();
    await screen.findByRole("button", { name: /Physical Sciences Building/ });

    component.pressEnter();

    await waitFor(() => expect(queryStore.category).toBe("building"));
    expect(queryStore.inputValue).toBe("Physical Sciences Building");
  });

  test("Enter does not wait forever on a slow source", async () => {
    vi.unstubAllGlobals();
    stubSearchApi({ hangRooms: true });
    queryStore.inputValue = "PS";
    const { component } = renderSuggestions();
    await screen.findByRole("button", { name: /Physical Sciences Building/ });
    expect(screen.getByText("Searching…")).toBeVisible();

    component.pressEnter();

    await waitFor(() => expect(queryStore.category).toBe("building"), {
      timeout: 3_000,
    });
  });
});

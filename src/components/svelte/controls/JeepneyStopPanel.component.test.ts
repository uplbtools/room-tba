import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import JeepneyStopPanel from "./JeepneyStopPanel.svelte";
import { jeepneyStore, transitStore } from "@lib/store.svelte";
import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import { transitStopKey } from "@lib/transit-reports";
import {
  CROWDING_ESTIMATE_NOTE,
  CROWDING_REPORTS_NOTE,
} from "@lib/transit-crowding";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

const kaliwaKanan = JEEPNEY_ROUTES.find((r) => r.id === "kaliwa-kanan")!;
const libraryIndex = kaliwaKanan.stops.findIndex(
  (s) => s.name === "Main Library",
);

afterEach(() => {
  transitStore.setReversed("kaliwa-kanan", false);
  jeepneyStore.clearRoute();
});

describe("JeepneyStopPanel", () => {
  test("lists every route serving the stop, with its direction", () => {
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(libraryIndex);
    mountAtWidth(320);
    const { container } = render(JeepneyStopPanel);

    const current = screen.getByRole("link", { name: /Kaliwa \/ Kanan/ });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent("Kanan · Kaliwa");
    const loop = screen.getByRole("link", { name: /SNODLOB/ });
    expect(loop).toHaveAttribute("href", "/transit/snodlob/");
    expect(loop).toHaveTextContent("One-way loop");
    expectNoHorizontalOverflow(container);
  });

  test("a route chip opens that route", async () => {
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(libraryIndex);
    render(JeepneyStopPanel);

    screen.getByRole("link", { name: /SNODLOB/ }).click();
    await tick();
    expect(jeepneyStore.selectedRouteId).toBe("snodlob");
    expect(jeepneyStore.selectedStopIndex).toBeNull();
  });

  test("follows the picked direction", () => {
    transitStore.setReversed("kaliwa-kanan", true);
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(1);
    render(JeepneyStopPanel);

    expect(
      screen.getByRole("heading", { name: "Carabao Park / Landbank" }),
    ).toBeVisible();
    expect(screen.getByText(/Stop 2 of 19 on the loop · Kaliwa/)).toBeVisible();
  });
});

describe("JeepneyStopPanel jeep reports", () => {
  const MIN = 60_000;
  // Thursday 8 October 2026, 10:03 AM in Los Baños (UTC+8).
  const NOW = Date.UTC(2026, 9, 8, 2, 3);
  const library = kaliwaKanan.stops[libraryIndex]!;
  const libraryKey = transitStopKey(library);

  type Stub = {
    reports?: unknown[] | null;
    peaks?: unknown;
    post?: { status: number; body: unknown };
  };

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  function stubApi({ reports = [], peaks = null, post }: Stub) {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/transit/reports") && init?.method === "POST") {
          return jsonResponse(post?.body ?? { ok: true }, post?.status ?? 201);
        }
        if (url.startsWith("/api/transit/reports")) {
          return reports === null
            ? jsonResponse({ error: "down" }, 503)
            : jsonResponse({ now: new Date(NOW).toISOString(), reports });
        }
        if (url.startsWith("/api/transit/stop-peaks") && peaks) {
          return jsonResponse(peaks);
        }
        return new Response(null, { status: 404 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const at = (minutesAgo: number) =>
    new Date(NOW - minutesAgo * MIN).toISOString();

  function openLibrary() {
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(libraryIndex);
    return render(JeepneyStopPanel);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("says no recent reports for each route and direction", async () => {
    stubApi({ reports: [] });
    openLibrary();

    expect(
      await screen.findByRole("button", {
        name: "Jeep is here: Kaliwa / Kanan (Kanan)",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Jeep is here: Kaliwa / Kanan (Kaliwa)",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /^Jeep is here: .*SNODLOB/ }),
    ).toBeVisible();
    await vi.waitFor(() =>
      expect(screen.getAllByText("No recent reports")).toHaveLength(3),
    );
  });

  test("shows the last report and a frequency from real reports only", async () => {
    stubApi({
      reports: [32, 24, 16, 4].map((minutesAgo) => ({
        routeId: "kaliwa-kanan",
        stopKey: libraryKey,
        direction: "forward",
        full: false,
        at: at(minutesAgo),
      })),
    });
    openLibrary();

    expect(
      await screen.findByText("Last jeep reported 4 min ago"),
    ).toBeVisible();
    expect(screen.getByText("About every 8 min lately")).toBeVisible();
    // The Kaliwa direction and SNODLOB had no reports of their own.
    expect(screen.getAllByText("No recent reports")).toHaveLength(2);
  });

  test("shows no status at all when reports cannot load", async () => {
    const fetchMock = stubApi({ reports: null });
    openLibrary();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await tick();

    expect(screen.queryByText("No recent reports")).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /^Jeep is here/ }),
    ).toHaveLength(3);
  });

  test("one tap sends the route, stop and direction", async () => {
    const fetchMock = stubApi({ reports: [] });
    openLibrary();

    const button = await screen.findByRole("button", {
      name: "Jeep is here: Kaliwa / Kanan (Kaliwa)",
    });
    button.click();

    expect(await screen.findByText("Thanks, reported.")).toBeVisible();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Reported");
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    );
    const body = JSON.parse(String(post?.[1]?.body));
    expect(body).toMatchObject({
      routeId: "kaliwa-kanan",
      stopKey: libraryKey,
      direction: "reverse",
      full: false,
    });
    expect(typeof body.deviceId).toBe("string");
    expect(body).not.toHaveProperty("lat");
  });

  test("shows the server's reason when a report is refused", async () => {
    stubApi({
      reports: [],
      post: {
        status: 429,
        body: {
          error: "You just reported this jeep. Try again in a few minutes.",
        },
      },
    });
    openLibrary();

    (
      await screen.findByRole("button", { name: /^It was full: .*SNODLOB/ })
    ).click();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You just reported this jeep",
    );
  });

  test("labels the class-change hint as an estimate", async () => {
    stubApi({
      reports: [],
      peaks: {
        termWindow: { startsOn: "2026-08-17", endsOn: "2026-12-18" },
        peaks: [{ day: 3, minute: 600, ends: 12, starts: 0 }],
        buildings: 2,
      },
    });
    openLibrary();

    expect(
      await screen.findByText("Likely busy now: classes just ended nearby"),
    ).toBeVisible();
    expect(screen.getByText(CROWDING_ESTIMATE_NOTE)).toBeVisible();
  });

  test("three full reports make the stop read busy", async () => {
    const snodlob = JEEPNEY_ROUTES.find((r) => r.id === "snodlob")!;
    stubApi({
      reports: [3, 8, 12].map((minutesAgo) => ({
        routeId: "snodlob",
        stopKey: transitStopKey(snodlob.stops[0]!),
        direction: null,
        full: true,
        at: at(minutesAgo),
      })),
    });
    openLibrary();

    expect(
      await screen.findByText("Busy: many jeeps reported full"),
    ).toBeVisible();
    expect(screen.getByText(CROWDING_REPORTS_NOTE)).toBeVisible();
  });

  test("shows nothing when it is quiet", async () => {
    stubApi({ reports: [] });
    openLibrary();
    await screen.findAllByText("No recent reports");

    expect(screen.queryByText(/busy/i)).toBeNull();
  });
});

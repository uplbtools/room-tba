import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import BuildingPhoto from "@ui/controls/BuildingPhoto.svelte";
import { resetStreetViewLookupCache } from "@lib/street-view-lookup";

// "building:Veterinary Teaching Hospital" ships in the committed manifest (three Street View
// headings plus Commons photos), so the real manifest is the fixture. Street
// View stays off: PUBLIC_GOOGLE_MAPS_API_KEY is not set in vitest, which is
// also the keyless production behavior the gallery must survive.
const VET_HOSPITAL = {
  name: "Veterinary Teaching Hospital",
  lat: 14.1617660159005,
  lon: 121.241457649492,
  panoId: "pano",
};

describe("BuildingPhoto", () => {
  test("renders nothing when no source has an image", () => {
    const { container } = render(BuildingPhoto, {
      props: { name: "Ghost Hall", panoId: null },
    });
    expect(container.querySelector("img")).toBeNull();
  });

  test("contributor-only building keeps the single plain image", () => {
    render(BuildingPhoto, {
      props: {
        name: "Ghost Hall",
        panoId: null,
        imageUrl: "https://r2.example/ghost.jpg",
      },
    });
    expect(screen.getByRole("img", { name: "Ghost Hall" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /next photo/i })).toBeNull();
  });

  test("multi-image gallery cycles and credits each photo", async () => {
    render(BuildingPhoto, {
      props: {
        ...VET_HOSPITAL,
        imageUrl: "https://r2.example/freedom-park.jpg",
      },
    });

    // Contributor photo first, uncredited.
    const first = screen.getByRole("img", {
      name: "Veterinary Teaching Hospital",
    });
    expect(first.getAttribute("src")).toContain("r2.example");

    await fireEvent.click(
      screen.getByRole("button", {
        name: /next photo of Veterinary Teaching Hospital/i,
      }),
    );

    // Commons photo second (no Street View without a key), with attribution
    // linking to the file page.
    const commons = screen.getByRole("img", { name: /Wikimedia Commons/i });
    expect(
      new URL(commons.getAttribute("src") ?? "").hostname.endsWith(
        ".wikimedia.org",
      ),
    ).toBe(true);
    const credit = screen.getByRole("link");
    expect(credit.getAttribute("href")).toContain("commons.wikimedia.org");

    // Wraps back around to the contributor photo.
    await fireEvent.click(
      screen.getByRole("button", {
        name: /previous photo of Veterinary Teaching Hospital/i,
      }),
    );
    expect(
      screen
        .getByRole("img", { name: "Veterinary Teaching Hospital" })
        .getAttribute("src"),
    ).toContain("r2.example");
  });

  test("dots show where you are, jump to a photo, and replace the counter", async () => {
    const { container } = render(BuildingPhoto, {
      props: {
        ...VET_HOSPITAL,
        imageUrl: "https://r2.example/freedom-park.jpg",
      },
    });

    expect(container.querySelector(".building-photo__counter")).toBeNull();
    const dots = screen.getAllByRole("button", {
      name: /^Photo \d+ of \d+$/,
    });
    expect(dots.length).toBeGreaterThan(1);
    expect(dots[0]?.getAttribute("aria-current")).toBe("true");

    await fireEvent.click(dots[1] as HTMLElement);
    expect(dots[1]?.getAttribute("aria-current")).toBe("true");
    expect(dots[0]?.getAttribute("aria-current")).toBeNull();
  });

  test("tapping the photo opens a full-screen viewer that can be closed", async () => {
    render(BuildingPhoto, {
      props: {
        name: "Ghost Hall",
        panoId: null,
        imageUrl: "https://r2.example/ghost.jpg",
      },
    });

    const trigger = screen.getByRole("button", {
      name: /view ghost hall photo full screen/i,
    });
    await fireEvent.click(trigger);
    const close = await screen.findByRole("button", {
      name: /close photo viewer/i,
      hidden: true,
    });
    expect(close).toBeTruthy();
    await fireEvent.click(close);
    await vi.waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: /close photo viewer/i,
          hidden: true,
        }),
      ).toBeNull(),
    );
  });

  test("Esc in the viewer does not reach the app's window Esc handler", async () => {
    render(BuildingPhoto, {
      props: {
        name: "Ghost Hall",
        panoId: null,
        imageUrl: "https://r2.example/ghost.jpg",
      },
    });
    await fireEvent.click(
      screen.getByRole("button", {
        name: /view ghost hall photo full screen/i,
      }),
    );
    const dialog = document.querySelector(
      "dialog.building-photo__viewer",
    ) as HTMLElement;
    const windowKey = vi.fn();
    window.addEventListener("keydown", windowKey);
    try {
      await fireEvent.keyDown(dialog, { key: "Escape" });
      expect(windowKey).not.toHaveBeenCalled();
      // Other keys still travel as usual.
      await fireEvent.keyDown(dialog, { key: "a" });
      expect(windowKey).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("keydown", windowKey);
    }
  });

  test("a sideways swipe changes photo and does not open the viewer", async () => {
    render(BuildingPhoto, {
      props: {
        ...VET_HOSPITAL,
        imageUrl: "https://r2.example/freedom-park.jpg",
      },
    });
    const trigger = screen.getByRole("button", {
      name: /view veterinary teaching hospital photo full screen/i,
    });
    await fireEvent.pointerDown(trigger, { clientX: 300 });
    await fireEvent.pointerUp(trigger, { clientX: 120 });
    await fireEvent.click(trigger);

    expect(
      screen
        .getByRole("img", { name: /Wikimedia Commons/i })
        .getAttribute("src"),
    ).toContain("wikimedia.org");
    expect(
      screen.queryByRole("button", {
        name: /close photo viewer/i,
        hidden: true,
      }),
    ).toBeNull();
  });

  test("dorm, place and org cards read their own manifest kind", () => {
    // Committed manifest entries with Commons photos (Street View is off
    // without a key in vitest).
    const { unmount } = render(BuildingPhoto, {
      props: { kind: "place", name: "Church Among the Palms" },
    });
    const churchSrc =
      screen
        .getByRole("img", { name: /Church Among the Palms.*Commons/i })
        .getAttribute("src") ?? "";
    expect(new URL(churchSrc).hostname.endsWith(".wikimedia.org")).toBe(true);
    unmount();

    render(BuildingPhoto, {
      props: { kind: "organization", name: "UP Open University (UPOU)" },
    });
    expect(screen.getByRole("img", { name: /UPOU.*Commons/i })).toBeTruthy();
  });

  test("a name under the wrong kind finds nothing", () => {
    const { container } = render(BuildingPhoto, {
      props: { kind: "dorm", name: "Church Among the Palms" },
    });
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("BuildingPhoto runtime Street View", () => {
  // A food spot with coordinates but no manifest entry.
  const CANTEEN = {
    kind: "place" as const,
    name: "Test Canteen",
    lat: 14.165,
    lon: 121.242,
  };

  function stubMetadata(body: unknown) {
    vi.stubEnv("PUBLIC_GOOGLE_MAPS_API_KEY", "test-google-key-123");
    const fetchMock = vi.fn(
      async (_url: string) =>
        new Response(JSON.stringify(body), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetStreetViewLookupCache();
    localStorage.clear();
  });

  test("shows the confirmed pano aimed at the place, with Google credit", async () => {
    const fetchMock = stubMetadata({
      status: "OK",
      pano_id: "canteen-pano",
      location: { lat: 14.1645, lng: 121.242 },
      date: "2024-03",
      copyright: "© Google",
    });
    render(BuildingPhoto, { props: CANTEEN });

    const img = await screen.findByRole("img", {
      name: "Street View of Test Canteen",
    });
    const url = new URL(img.getAttribute("src") ?? "");
    expect(url.searchParams.get("pano")).toBe("canteen-pano");
    // Pano is south of the canteen, so the camera faces north.
    expect(url.searchParams.get("heading")).toBe("0");
    // One credit line: what it is and when it was taken. Google's own logo
    // and "© Google" already sit inside the image, so the caption does not
    // say it a third time.
    expect(screen.getByText("Street View")).toBeTruthy();
    expect(screen.queryByText(/©/)).toBeNull();
    expect(screen.getByText(/March 2024/)).toBeTruthy();
    const open = screen.getByRole("link", {
      name: /Open in Google Maps Street View/i,
    });
    expect(open.getAttribute("href")).toContain("map_action=pano");
    expect(open.getAttribute("href")).toContain("pano=canteen-pano");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/streetview/metadata",
    );
  });

  test("no coverage renders nothing, never the grey tile", async () => {
    const fetchMock = stubMetadata({ status: "ZERO_RESULTS" });
    const { container } = render(BuildingPhoto, { props: CANTEEN });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(container.querySelector("img")).toBeNull();
  });

  test("manifest entries skip the request", () => {
    const fetchMock = stubMetadata({ status: "OK", pano_id: "x" });
    render(BuildingPhoto, {
      props: { kind: "place", name: "Church Among the Palms", lat: 1, lon: 1 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

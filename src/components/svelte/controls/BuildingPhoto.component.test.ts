import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import BuildingPhoto from "@ui/controls/BuildingPhoto.svelte";

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

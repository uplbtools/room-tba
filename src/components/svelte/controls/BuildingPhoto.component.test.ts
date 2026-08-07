import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import BuildingPhoto from "@ui/controls/BuildingPhoto.svelte";

// "building:Freedom Park" ships in the committed manifest (three Street View
// headings plus Commons photos), so the real manifest is the fixture. Street
// View stays off: PUBLIC_GOOGLE_MAPS_API_KEY is not set in vitest, which is
// also the keyless production behavior the gallery must survive.
const FREEDOM_PARK = {
  name: "Freedom Park",
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
        ...FREEDOM_PARK,
        imageUrl: "https://r2.example/freedom-park.jpg",
      },
    });

    // Contributor photo first, uncredited.
    const first = screen.getByRole("img", { name: "Freedom Park" });
    expect(first.getAttribute("src")).toContain("r2.example");

    await fireEvent.click(
      screen.getByRole("button", { name: /next photo of Freedom Park/i }),
    );

    // Commons photo second (no Street View without a key), with attribution
    // linking to the file page.
    const commons = screen.getByRole("img", { name: /Wikimedia Commons/i });
    expect(commons.getAttribute("src")).toContain("upload.wikimedia.org");
    const credit = screen.getByRole("link");
    expect(credit.getAttribute("href")).toContain("commons.wikimedia.org");

    // Wraps back around to the contributor photo.
    await fireEvent.click(
      screen.getByRole("button", { name: /previous photo of Freedom Park/i }),
    );
    expect(
      screen.getByRole("img", { name: "Freedom Park" }).getAttribute("src"),
    ).toContain("r2.example");
  });
});

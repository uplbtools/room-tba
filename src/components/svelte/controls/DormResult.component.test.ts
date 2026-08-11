import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import DormResultHost from "@test/components/DormResultHost.svelte";
import type { DormData } from "@lib/types";
import { queryStore } from "@lib/store.svelte";
import { kuboDormDirectory } from "@lib/kubo-dorms";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

function dorm(overrides: Partial<DormData> = {}): DormData {
  return {
    id: 12,
    dormName: "Arable Premier Residences",
    shortName: null,
    lat: 14.1663791,
    lon: 121.2381389,
    gender: "coed",
    capacity: null,
    managingOffice: null,
    contactEmail: null,
    amenities: [],
    osmLink: null,
    description: null,
    isUpManaged: false,
    priceRange: null,
    contactPhone: [],
    facebookLink: null,
    imageUrl: null,
    version: 1,
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

function renderDormResult(testDorm: DormData) {
  queryStore.hydrateQuery({
    category: "dorm",
    type: "result",
    value: testDorm.dormName,
  });
  return render(DormResultHost, { props: { dorm: testDorm } });
}

describe("DormResult Kubo link", () => {
  beforeEach(() => {
    kuboDormDirectory.set(new Map());
    // Mounting DormResult triggers loadKuboDormDirectory(); without a stub
    // the real fetch dials localhost:3000 and kills CI (no dev server).
    // 503 keeps the store untouched, so the directory set below stays.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders a safe Kubo CTA for an API-confirmed dorm without mobile overflow", () => {
    kuboDormDirectory.set(
      new Map([
        [
          12,
          {
            roomTbaDormId: 12,
            name: "Arable Premier Residences",
            kuboSlug: "arable-premier-residences",
            listingUrl:
              "https://kubo.community/dorms/arable-premier-residences",
            reservationStatus: "unknown",
            reservationUrl: null,
            updatedAt: "2026-07-22T08:00:00.000Z",
          },
        ],
      ]),
    );
    mountAtWidth(320);
    const { container } = renderDormResult(
      dorm({ facebookLink: "https://www.facebook.com/arablepremier" }),
    );

    const link = screen.getByRole("link", {
      name: "Open Arable Premier Residences on Kubo (opens in new tab)",
    });
    expect(link).toHaveTextContent("View on Kubo");
    expect(link).toHaveClass("entity-footer__link--kubo");
    expect(link).toHaveAttribute(
      "href",
      "https://kubo.community/dorms/arable-premier-residences",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.querySelector("img")).toHaveAttribute("src", "/kubo-logo.png");
    expect(link.querySelector("img")).toHaveAttribute("alt", "");

    // The CTA lives in the entity-actions row since the live-directory
    // change, not in the dorm-details links row.
    const actions = link.closest<HTMLElement>(".entity-actions");
    expect(actions).not.toBeNull();
    expectNoHorizontalOverflow(actions!);

    const links = container.querySelector<HTMLElement>(
      ".entity-dorm-details__links",
    );
    expect(links).not.toBeNull();
    expectNoHorizontalOverflow(links!);
  });

  test("does not render a Kubo CTA for an unmapped dorm", () => {
    renderDormResult(dorm({ id: 13, dormName: "Westbrook Residences" }));

    expect(screen.queryByText("View on Kubo")).not.toBeInTheDocument();
  });

  test("uses Kubo's full image and opens it in a viewer", async () => {
    const { container } = renderDormResult(
      dorm({
        dormName: "Tuiza Bldg",
        imageUrl:
          "https://media.kubo.community/dorms/tuiza/gallery/photo.thumb.webp",
      }),
    );

    const trigger = screen.getByRole("button", {
      name: "View full photo of Tuiza Bldg",
    });
    const image = trigger.querySelector("img");
    expect(image).toHaveAttribute(
      "src",
      "https://media.kubo.community/dorms/tuiza/gallery/photo.webp",
    );

    await trigger.click();
    expect(container.querySelector("dialog")?.open).toBe(true);
  });
});

describe("DormResult curfew information", () => {
  beforeEach(() => {
    kuboDormDirectory.set(new Map());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  test("shows curfew guidance only for UP-managed dorms", () => {
    renderDormResult(dorm({ isUpManaged: true }));
    expect(
      screen.getByRole("heading", { name: "Curfew & permits" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /full policy/i })).toHaveAttribute(
      "href",
      "/wiki/campus-curfew",
    );
  });

  test("hides curfew guidance for private dorms", () => {
    renderDormResult(dorm({ isUpManaged: false }));
    expect(
      screen.queryByRole("heading", { name: "Curfew & permits" }),
    ).toBeNull();
  });
});

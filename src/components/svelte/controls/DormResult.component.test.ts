import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import DormResultHost from "@test/components/DormResultHost.svelte";
import type { DormData } from "@lib/types";
import { queryStore } from "@lib/store.svelte";
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
  test("renders a safe Kubo CTA for a mapped dorm without mobile overflow", () => {
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

    const links = container.querySelector<HTMLElement>(
      ".entity-dorm-details__links",
    );
    expect(links).not.toBeNull();
    expect(links!.querySelector("a")).toBe(link);
    expectNoHorizontalOverflow(links!);
  });

  test("does not render a Kubo CTA for an unmapped dorm", () => {
    renderDormResult(dorm({ id: 13, dormName: "Westbrook Residences" }));

    expect(screen.queryByText("View on Kubo")).not.toBeInTheDocument();
  });
});

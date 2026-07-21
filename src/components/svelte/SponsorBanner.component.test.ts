import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Sponsor, SponsorsData } from "@lib/sponsors";

vi.mock("@lib/sponsor-tracking", () => ({
  trackSponsorImpression: vi.fn(),
  trackSponsorClick: vi.fn(),
}));

const loadSponsorsMock = vi.hoisted(() =>
  vi.fn<() => Promise<SponsorsData | null>>(),
);
vi.mock("@lib/sponsors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lib/sponsors")>()),
  loadSponsors: loadSponsorsMock,
}));

import SponsorBanner from "@ui/SponsorBanner.svelte";

function sponsorsData(overrides: Partial<Sponsor> = {}): SponsorsData {
  const start = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return {
    sponsors: [
      {
        id: "test-sponsor",
        name: "Test Sponsor",
        tier: "gold",
        tagline: "Tag line",
        url: "https://example.com",
        logo: "/sponsors/test.png",
        startDate: start,
        endDate: end,
        active: true,
        category: "food",
        ...overrides,
      },
    ],
    config: {
      maxGold: 1,
      maxSilver: 3,
      maxBronze: 10,
      maxPromo: 5,
      rotationIntervalMs: 86400000,
    },
  };
}

async function settle() {
  // onMount awaits loadSponsors; flush the microtask queue plus a tick.
  await Promise.resolve();
  await Promise.resolve();
  await tick();
}

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

describe("SponsorBanner", () => {
  test("renders the rotated gold/silver sponsor with a Sponsored label", async () => {
    loadSponsorsMock.mockResolvedValue(sponsorsData());
    render(SponsorBanner);
    await settle();
    expect(screen.getByText("Sponsored")).toBeVisible();
    const link = screen.getByRole("link", {
      name: /Visit Test Sponsor, sponsor/i,
    });
    expect(link.getAttribute("rel")).toContain("sponsored");
  });

  test("renders nothing when no sponsor is active", async () => {
    loadSponsorsMock.mockResolvedValue(sponsorsData({ active: false }));
    const { container } = render(SponsorBanner);
    await settle();
    expect(container.querySelector(".sponsor-banner")).toBeNull();
  });

  test("dismiss hides the banner and persists for the session", async () => {
    loadSponsorsMock.mockResolvedValue(sponsorsData());
    const { container } = render(SponsorBanner);
    await settle();
    screen.getByRole("button", { name: /dismiss sponsor/i }).click();
    await tick();
    expect(container.querySelector(".sponsor-banner")).toBeNull();
    expect(sessionStorage.getItem("rtba-sponsor-dismissed")).toBe("1");

    // A fresh mount in the same session stays hidden.
    const second = render(SponsorBanner);
    await settle();
    expect(second.container.querySelector(".sponsor-banner")).toBeNull();
  });
});

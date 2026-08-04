import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import CommunityBrandIcon from "./CommunityBrandIcon.svelte";

describe("CommunityBrandIcon", () => {
  test("renders Messenger brand SVG", () => {
    const { container } = render(CommunityBrandIcon, {
      props: { brand: "messenger", size: 18 },
    });
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("18");
    expect(container.querySelector("radialGradient")).toBeTruthy();
  });

  test("renders Discord brand SVG", () => {
    const { container } = render(CommunityBrandIcon, {
      props: { brand: "discord" },
    });
    const path = container.querySelector("path");
    expect(path?.getAttribute("fill")).toBe("#5865F2");
  });

  test("renders Facebook brand SVG in brand blue", () => {
    const { container } = render(CommunityBrandIcon, {
      props: { brand: "facebook" },
    });
    expect(container.querySelector("circle")?.getAttribute("fill")).toBe(
      "#1877F2",
    );
  });

  test("renders Instagram brand SVG on its gradient", () => {
    const { container } = render(CommunityBrandIcon, {
      props: { brand: "instagram", size: 20 },
    });
    const gradient = container.querySelector("radialGradient");
    expect(gradient?.id).toMatch(/^instagram-gradient-/);
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe(
      `url(#${gradient?.id})`,
    );
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("20");
  });

  test("the icon is decorative; the accessible name comes from the link", () => {
    const { container } = render(CommunityBrandIcon, {
      props: { brand: "instagram" },
    });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });
});

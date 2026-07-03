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
    expect(container.querySelector("linearGradient")).toBeTruthy();
  });

  test("renders Discord brand SVG", () => {
    const { container } = render(CommunityBrandIcon, {
      props: { brand: "discord" },
    });
    const path = container.querySelector("path");
    expect(path?.getAttribute("fill")).toBe("#5865F2");
  });
});

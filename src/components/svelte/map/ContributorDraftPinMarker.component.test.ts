import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import ContributorDraftPinMarker from "./ContributorDraftPinMarker.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("ContributorDraftPinMarker", () => {
  test("renders building preview with label at 320px", () => {
    mountAtWidth(320);
    render(ContributorDraftPinMarker, {
      props: {
        preview: { kind: "building", label: "Baker Hall" },
      },
    });

    expect(screen.getByText("Baker Hall")).toBeTruthy();
    const pin = document.querySelector(
      ".contributor-draft-pin .map-entity-pin",
    );
    expect(pin).toBeTruthy();
    expect(pin?.classList.contains("building")).toBe(true);
    expect(pin?.classList.contains("active")).toBe(true);
  });
});

import { render } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import LandingModal from "./LandingModal.svelte";
import ScheduleModal from "./ScheduleModal.svelte";

describe("modal scroll chrome", () => {
  test("landing modal content uses shared scroll chrome", () => {
    render(LandingModal);
    expect(document.querySelector(".scroll-region")).toHaveClass(
      "map-chrome-scroll",
    );
  });

  test("schedule modal body uses shared scroll chrome", () => {
    render(ScheduleModal);
    expect(document.querySelector(".schedule-modal__body")).toHaveClass(
      "map-chrome-scroll",
    );
  });
});
